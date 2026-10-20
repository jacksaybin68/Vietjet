/**
 * Giao thức Coding Pi — phần thuần, không đọc biến môi trường.
 *
 * Coding Pi nói chuyện với NVIDIA NIM qua API tương thích OpenAI:
 * `POST {baseUrl}/chat/completions`. File này giữ toàn bộ phần dựng request,
 * kiểm tra dữ liệu client gửi lên và đọc luồng SSE (`reasoning_content`,
 * `content`, `tool_calls`) để cả route server lẫn service phía client dùng
 * chung một định nghĩa.
 *
 * Tách khỏi `config.ts` để client bundle không kéo theo `process.env` và
 * không bao giờ nhìn thấy khoá API.
 */

export type CodingPiRole = 'system' | 'user' | 'assistant' | 'tool';

export interface CodingPiTextPart {
  type: 'text';
  text: string;
}

export interface CodingPiImagePart {
  type: 'image_url';
  image_url: { url: string };
}

export type CodingPiContentPart = CodingPiTextPart | CodingPiImagePart;

export interface CodingPiToolCall {
  id?: string;
  type?: 'function';
  /** Chỉ có trong delta của stream; bị bỏ khỏi kết quả cuối. */
  index?: number;
  function: {
    name: string;
    arguments: string;
  };
}

export interface CodingPiMessage {
  role: CodingPiRole;
  content: string | CodingPiContentPart[] | null;
  tool_call_id?: string;
  tool_calls?: CodingPiToolCall[];
}

export interface CodingPiUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  [key: string]: unknown;
}

export interface CodingPiToolDefinition {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export type CodingPiToolChoice =
  | 'auto'
  | 'none'
  | 'required'
  | { type: 'function'; function: { name: string } };

export const MAX_CODING_PI_HISTORY = 20;
export const MAX_CODING_PI_MESSAGES = 40;
export const MAX_CODING_PI_CONTEXT = 120_000;
export const MAX_CODING_PI_PROMPT = 120_000;
export const MAX_CODING_PI_IMAGES = 4;
export const MAX_CODING_PI_TOOLS = 32;

export const CODING_PI_SYSTEM_PROMPT = `Bạn là Coding Pi — trợ lý lập trình trong Vietjet Web Studio.
Dự án: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Neon Postgres.
Trả lời bằng tiếng Việt, ngắn gọn và chính xác. Khi đề xuất sửa code, đưa diff hoặc
đoạn code tối thiểu kèm đường dẫn tệp; không tự nhận đã sửa tệp nếu chưa được yêu cầu.
Nếu thiếu ngữ cảnh, nói rõ cần đọc tệp nào thay vì đoán.`;

/** Lỗi dữ liệu đầu vào — route đổi thành HTTP 400 thay vì 500. */
export class CodingPiValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CodingPiValidationError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toImagePart(value: unknown): CodingPiImagePart | null {
  let url = '';
  if (typeof value === 'string') url = value.trim();
  else if (isRecord(value)) {
    if (typeof value.url === 'string') url = value.url.trim();
    else if (isRecord(value.image_url) && typeof value.image_url.url === 'string') {
      url = value.image_url.url.trim();
    }
  }
  if (!url) return null;
  if (!/^(https?:\/\/|data:image\/)/i.test(url)) return null;
  // Một ảnh base64 cỡ 6 MB đã là ~8 triệu ký tự; chặn phần còn lại để không
  // đẩy nguyên một tệp ảnh qua body JSON của route.
  if (url.length > 8_000_000) return null;
  return { type: 'image_url', image_url: { url } };
}

export function normalizeCodingPiImages(value: unknown): CodingPiImagePart[] {
  if (value === undefined || value === null) return [];
  const items = Array.isArray(value) ? value : [value];
  const images: CodingPiImagePart[] = [];
  for (const item of items) {
    const image = toImagePart(item);
    if (image) images.push(image);
    if (images.length >= MAX_CODING_PI_IMAGES) break;
  }
  return images;
}

/** Chuỗi hoặc mảng part (text + image). Trả null khi không có nội dung dùng được. */
export function normalizeCodingPiContent(value: unknown): string | CodingPiContentPart[] | null {
  if (typeof value === 'string') {
    return value.trim() ? value : null;
  }
  if (!Array.isArray(value)) return null;

  const parts: CodingPiContentPart[] = [];
  for (const item of value) {
    if (typeof item === 'string') {
      if (item.trim()) parts.push({ type: 'text', text: item });
      continue;
    }
    if (!isRecord(item)) continue;
    if (item.type === 'text' && typeof item.text === 'string' && item.text.trim()) {
      parts.push({ type: 'text', text: item.text });
      continue;
    }
    if (item.type === 'image_url') {
      const image = toImagePart(item);
      if (image) parts.push(image);
    }
  }
  return parts.length ? parts : null;
}

function normalizeToolCallDeltas(value: unknown): CodingPiToolCall[] {
  if (!Array.isArray(value)) return [];
  const calls: CodingPiToolCall[] = [];
  for (const [index, item] of value.entries()) {
    if (!isRecord(item) || !isRecord(item.function)) continue;
    const name = typeof item.function.name === 'string' ? item.function.name : '';
    const args = typeof item.function.arguments === 'string' ? item.function.arguments : '';
    if (!name && !args) continue;
    calls.push({
      id: typeof item.id === 'string' && item.id ? item.id : undefined,
      type: 'function',
      index: typeof item.index === 'number' ? item.index : index,
      function: { name, arguments: args },
    });
  }
  return calls;
}

/** Lịch sử hội thoại do client gửi: chỉ nhận user/assistant, bỏ lượt rỗng. */
export function normalizeCodingPiHistory(value: unknown): CodingPiMessage[] {
  if (!Array.isArray(value)) return [];
  const messages: CodingPiMessage[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    if (item.role !== 'user' && item.role !== 'assistant') continue;
    const content = normalizeCodingPiContent(item.content);
    if (content === null) continue;
    messages.push({ role: item.role, content });
  }
  return messages.slice(-MAX_CODING_PI_HISTORY);
}

/**
 * Mảng `messages` đầy đủ cho API consumer (hỗ trợ tool result và assistant
 * gọi tool). `history` của giao diện là một tập con và đi qua hàm riêng ở trên.
 */
export function normalizeCodingPiMessages(value: unknown): CodingPiMessage[] {
  if (!Array.isArray(value)) return [];
  const messages: CodingPiMessage[] = [];

  for (const item of value) {
    if (!isRecord(item)) continue;
    const role = item.role;
    if (role !== 'system' && role !== 'user' && role !== 'assistant' && role !== 'tool') {
      continue;
    }

    const content = normalizeCodingPiContent(item.content);

    if (role === 'assistant') {
      const toolCalls = normalizeToolCallDeltas(item.tool_calls);
      if (content === null && toolCalls.length === 0) continue;
      messages.push({
        role,
        content,
        ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
      });
      continue;
    }

    if (role === 'tool') {
      if (typeof item.tool_call_id !== 'string' || !item.tool_call_id.trim()) continue;
      if (content === null) continue;
      messages.push({
        role,
        content,
        tool_call_id: item.tool_call_id,
      });
      continue;
    }

    if (content === null) continue;
    messages.push({ role, content });
  }

  return messages.slice(-MAX_CODING_PI_MESSAGES);
}

export interface CodingPiMessageInput {
  prompt?: unknown;
  context?: unknown;
  history?: unknown;
  images?: unknown;
  messages?: unknown;
}

/**
 * Dựng mạch hội thoại gửi lên NVIDIA:
 *  - `messages` (nếu có) thắng `prompt`/`history` — dành cho API consumer;
 *  - ngược lại giữ đúng shape cũ của `/api/claude/chat`: prompt + context +
 *    history, thêm ảnh vào lượt user cuối.
 *
 * System prompt của Coding Pi luôn đứng đầu khi client chưa tự gửi system.
 */
export function buildCodingPiMessages(input: CodingPiMessageInput): CodingPiMessage[] {
  const supplied = normalizeCodingPiMessages(input.messages);
  if (supplied.length > 0) {
    return supplied.some((message) => message.role === 'system')
      ? supplied
      : [{ role: 'system', content: CODING_PI_SYSTEM_PROMPT }, ...supplied];
  }

  const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
  if (!prompt) return [];

  const context =
    typeof input.context === 'string' ? input.context.slice(0, MAX_CODING_PI_CONTEXT) : '';
  const images = normalizeCodingPiImages(input.images);
  const userText = (
    context ? `${prompt}\n\nNội dung tệp đang mở:\n\n<file>\n${context}\n</file>` : prompt
  ).slice(0, MAX_CODING_PI_PROMPT);

  const userContent: string | CodingPiContentPart[] = images.length
    ? [{ type: 'text', text: userText }, ...images]
    : userText;

  return [
    { role: 'system', content: CODING_PI_SYSTEM_PROMPT },
    ...normalizeCodingPiHistory(input.history),
    { role: 'user', content: userContent },
  ];
}

function normalizeTools(value: unknown): CodingPiToolDefinition[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new CodingPiValidationError('tools phải là một mảng.');
  }
  if (value.length > MAX_CODING_PI_TOOLS) {
    throw new CodingPiValidationError(`Chỉ hỗ trợ tối đa ${MAX_CODING_PI_TOOLS} tool.`);
  }

  const tools: CodingPiToolDefinition[] = [];
  for (const item of value) {
    if (!isRecord(item) || !isRecord(item.function)) {
      throw new CodingPiValidationError('Mỗi tool phải có dạng { type: "function", function: … }.');
    }
    const name = typeof item.function.name === 'string' ? item.function.name.trim() : '';
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(name)) {
      throw new CodingPiValidationError(
        'Tên tool chỉ gồm chữ, số, gạch dưới/gạch nối và dài 1–64 ký tự.'
      );
    }
    const description =
      typeof item.function.description === 'string' ? item.function.description : undefined;
    const parameters = isRecord(item.function.parameters) ? item.function.parameters : undefined;
    tools.push({
      type: 'function',
      function: {
        name,
        ...(description ? { description } : {}),
        ...(parameters ? { parameters } : {}),
      },
    });
  }
  return tools;
}

function normalizeToolChoice(value: unknown): CodingPiToolChoice | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') {
    if (value === 'auto' || value === 'none' || value === 'required') return value;
    throw new CodingPiValidationError('toolChoice phải là auto, none, required hoặc một function.');
  }
  if (isRecord(value) && value.type === 'function' && isRecord(value.function)) {
    const name = typeof value.function.name === 'string' ? value.function.name.trim() : '';
    if (name) return { type: 'function', function: { name } };
  }
  throw new CodingPiValidationError('toolChoice không hợp lệ.');
}

function readNumber(
  value: unknown,
  fallback: number,
  field: string,
  min: number,
  max: number,
  integer = false
): number {
  if (value === undefined || value === null || value === '') return fallback;
  const number = typeof value === 'number' ? value : Number(value);
  if (
    !Number.isFinite(number) ||
    number < min ||
    number > max ||
    (integer && !Number.isInteger(number))
  ) {
    throw new CodingPiValidationError(`${field} phải nằm trong khoảng ${min}–${max}.`);
  }
  return number;
}

export interface CodingPiDefaults {
  model: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  seed: number;
  enableThinking: boolean;
}

export interface CodingPiRequest {
  messages: CodingPiMessage[];
  stream: boolean;
  model: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  seed: number;
  enableThinking: boolean;
  tools: CodingPiToolDefinition[];
  toolChoice?: CodingPiToolChoice;
}

/**
 * Kiểm tra body của `POST /api/coding-pi/chat`. Client là dữ liệu không tin
 * cậy: mọi trường đều bị kiểm tra kiểu và biên trước khi đi tới NVIDIA.
 */
export function parseCodingPiRequest(body: unknown, defaults: CodingPiDefaults): CodingPiRequest {
  if (!isRecord(body)) {
    throw new CodingPiValidationError('Body phải là một object JSON.');
  }

  const messages = buildCodingPiMessages({
    prompt: body.prompt,
    context: body.context,
    history: body.history,
    images: body.images,
    messages: body.messages,
  });
  if (!messages.some((message) => message.role === 'user')) {
    throw new CodingPiValidationError('Cần prompt hoặc messages có ít nhất một lượt user.');
  }

  const manualModel = typeof body.model === 'string' ? body.model.trim() : '';
  if (manualModel && !/^[A-Za-z0-9._:/-]{1,120}$/.test(manualModel)) {
    throw new CodingPiValidationError('model không hợp lệ.');
  }

  const stream = typeof body.stream === 'boolean' ? body.stream : true;
  const tools = normalizeTools(body.tools);
  const toolChoice = tools.length
    ? normalizeToolChoice(body.toolChoice ?? body.tool_choice)
    : undefined;

  return {
    messages,
    stream,
    model: manualModel || defaults.model,
    maxTokens: readNumber(
      body.maxTokens ?? body.max_tokens,
      defaults.maxTokens,
      'maxTokens',
      1,
      32_768,
      true
    ),
    temperature: readNumber(body.temperature, defaults.temperature, 'temperature', 0, 2),
    topP: readNumber(body.topP ?? body.top_p, defaults.topP, 'topP', 0, 1),
    seed: readNumber(body.seed, defaults.seed, 'seed', 0, 2_147_483_647, true),
    enableThinking:
      typeof (body.enableThinking ?? body.enable_thinking) === 'boolean'
        ? Boolean(body.enableThinking ?? body.enable_thinking)
        : defaults.enableThinking,
    tools,
    ...(toolChoice ? { toolChoice } : {}),
  };
}

export interface CodingPiPayload {
  model: string;
  messages: CodingPiMessage[];
  stream: boolean;
  temperature: number;
  top_p: number;
  max_tokens: number;
  seed: number;
  parallel_tool_calls: boolean;
  chat_template_kwargs: { enable_thinking: boolean };
  tools?: CodingPiToolDefinition[];
  tool_choice?: CodingPiToolChoice;
}

/** Payload gửi thẳng tới NVIDIA NIM (OpenAI-compatible chat completions). */
export function buildCodingPiPayload(request: CodingPiRequest): CodingPiPayload {
  return {
    model: request.model,
    messages: request.messages,
    stream: request.stream,
    temperature: request.temperature,
    top_p: request.topP,
    max_tokens: request.maxTokens,
    seed: request.seed,
    parallel_tool_calls: true,
    chat_template_kwargs: { enable_thinking: request.enableThinking },
    ...(request.tools.length ? { tools: request.tools } : {}),
    ...(request.toolChoice ? { tool_choice: request.toolChoice } : {}),
  };
}

export interface CodingPiSseEvent {
  /** `message` khi phía gửi không đặt tên sự kiện (chuẩn SSE). */
  event: string;
  data: string;
}

export interface CodingPiSseParser {
  push(chunk: string): CodingPiSseEvent[];
  flush(): CodingPiSseEvent[];
}

function parseSseBlock(block: string): CodingPiSseEvent | null {
  let event = 'message';
  const data: string[] = [];

  for (const rawLine of block.split('\n')) {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
    if (!line || line.startsWith(':')) continue;

    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);

    if (field === 'event') event = value;
    else if (field === 'data') data.push(value);
  }

  return data.length ? { event, data: data.join('\n') } : null;
}

/**
 * Bộ tách SSE theo khối, giữ được khối bị chia cắt giữa hai chunk mạng —
 * đúng là điều xảy ra khi NVIDIA trả một object JSON dài.
 */
export function createCodingPiSseParser(): CodingPiSseParser {
  let buffer = '';
  const BLOCK_SEPARATOR = /\r?\n\r?\n/;

  const take = (block: string, out: CodingPiSseEvent[]) => {
    const event = parseSseBlock(block);
    if (event) out.push(event);
  };

  return {
    push(chunk: string): CodingPiSseEvent[] {
      buffer += chunk;
      const events: CodingPiSseEvent[] = [];
      for (;;) {
        const match = BLOCK_SEPARATOR.exec(buffer);
        if (!match || match.index === undefined) break;
        take(buffer.slice(0, match.index), events);
        buffer = buffer.slice(match.index + match[0].length);
      }
      return events;
    },
    flush(): CodingPiSseEvent[] {
      const events: CodingPiSseEvent[] = [];
      if (buffer.trim()) take(buffer, events);
      buffer = '';
      return events;
    },
  };
}

/** Một frame SSE do route Coding Pi phát ra (client đọc bằng parser ở trên). */
export function encodeCodingPiSseEvent(event: string, data: unknown): string {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  const lines = payload.split('\n').map((line) => `data: ${line}`);
  return `event: ${event}\n${lines.join('\n')}\n\n`;
}

export interface CodingPiParsedChunk {
  content: string;
  reasoning: string;
  toolCalls: CodingPiToolCall[];
  finishReason: string | null;
  usage: CodingPiUsage | null;
  model: string | null;
  /** `data: [DONE]` — không phải object JSON. */
  done: boolean;
}

function deltaText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return '';
  return value
    .map((part) => (isRecord(part) && typeof part.text === 'string' ? part.text : ''))
    .join('');
}

function readUsage(value: unknown): CodingPiUsage | null {
  return isRecord(value) ? (value as CodingPiUsage) : null;
}

/**
 * Đọc một `data:` của NVIDIA. Trả null cho dòng không phải JSON để một chunk
 * lỗi không làm gãy cả stream.
 */
export function parseCodingPiStreamData(data: string): CodingPiParsedChunk | null {
  const trimmed = data.trim();
  if (!trimmed) return null;
  if (trimmed === '[DONE]') {
    return {
      content: '',
      reasoning: '',
      toolCalls: [],
      finishReason: null,
      usage: null,
      model: null,
      done: true,
    };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (!isRecord(payload)) return null;

  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const choice = isRecord(choices[0]) ? choices[0] : null;
  const delta = choice && isRecord(choice.delta) ? choice.delta : {};

  const reasoningValue = delta.reasoning_content ?? delta.reasoning;
  return {
    content: deltaText(delta.content),
    reasoning: deltaText(reasoningValue),
    toolCalls: normalizeToolCallDeltas(delta.tool_calls),
    finishReason: choice && typeof choice.finish_reason === 'string' ? choice.finish_reason : null,
    usage: readUsage(payload.usage),
    model: typeof payload.model === 'string' ? payload.model : null,
    done: false,
  };
}

export interface CodingPiResult {
  content: string;
  reasoning: string;
  toolCalls: CodingPiToolCall[];
  finishReason: string | null;
  usage: CodingPiUsage | null;
  model: string | null;
}

export interface CodingPiAccumulator {
  add(chunk: CodingPiParsedChunk): void;
  result(): CodingPiResult;
}

/**
 * Ghép các delta thành câu trả lời cuối. Tool call đến theo `index`; `name`
 * chỉ có ở delta đầu còn `arguments` bị chia thành nhiều mảnh — nối theo
 * đúng thứ tự, không thay thế.
 */
export function createCodingPiAccumulator(): CodingPiAccumulator {
  let content = '';
  let reasoning = '';
  let finishReason: string | null = null;
  let usage: CodingPiUsage | null = null;
  let model: string | null = null;
  const calls: Array<CodingPiToolCall | undefined> = [];

  return {
    add(chunk: CodingPiParsedChunk) {
      content += chunk.content;
      reasoning += chunk.reasoning;
      if (chunk.finishReason) finishReason = chunk.finishReason;
      if (chunk.usage) usage = chunk.usage;
      if (chunk.model) model = chunk.model;

      for (const call of chunk.toolCalls) {
        const index = call.index ?? calls.length;
        const existing = calls[index];
        if (!existing) {
          calls[index] = {
            ...(call.id ? { id: call.id } : {}),
            type: 'function',
            index,
            function: { name: call.function.name, arguments: call.function.arguments },
          };
          continue;
        }
        if (call.id) existing.id = call.id;
        existing.function.name += call.function.name;
        existing.function.arguments += call.function.arguments;
      }
    },
    result(): CodingPiResult {
      return {
        content,
        reasoning,
        toolCalls: calls
          .filter((call): call is CodingPiToolCall => Boolean(call))
          .map(({ index: _index, ...call }) => call),
        finishReason,
        usage,
        model,
      };
    },
  };
}

/** Đọc phản hồi không stream (`stream: false`). */
export function parseCodingPiCompletion(data: unknown): CodingPiResult {
  if (!isRecord(data)) {
    return {
      content: '',
      reasoning: '',
      toolCalls: [],
      finishReason: null,
      usage: null,
      model: null,
    };
  }

  const choices = Array.isArray(data.choices) ? data.choices : [];
  const choice = isRecord(choices[0]) ? choices[0] : null;
  const message = choice && isRecord(choice.message) ? choice.message : {};

  return {
    content: deltaText(message.content),
    reasoning: deltaText(message.reasoning_content ?? message.reasoning),
    toolCalls: normalizeToolCallDeltas(message.tool_calls).map(
      ({ index: _index, ...call }) => call
    ),
    finishReason: choice && typeof choice.finish_reason === 'string' ? choice.finish_reason : null,
    usage: readUsage(data.usage),
    model: typeof data.model === 'string' ? data.model : null,
  };
}
