/**
 * Ollama provider cho OpenClaw Assistant.
 *
 * Trợ lý admin (`POST /api/tro-ly-ai/tro-chuyen`) trước đây chỉ biết một
 * backend: gateway OpenClaw (`NEXT_PUBLIC_OPENCLAW_API_URL`, mặc định
 * http://localhost:18789). Module này bổ sung backend thứ hai là Ollama chạy
 * cùng máy chủ — `/api/chat` — để trợ lý vẫn trả lời được khi không có gateway,
 * bằng model local (vd `qwen3:1.7b`).
 *
 * Cấu hình:
 *   OLLAMA_BASE_URL   gốc server Ollama, mặc định http://localhost:11434
 *                     (`OLLAMA_HOST` cũng được nhận, thiếu scheme cũng được)
 *   OLLAMA_MODEL      model dùng cho chat, mặc định qwen3:1.7b
 *   OLLAMA_TIMEOUT_MS thời gian chờ một lượt, mặc định 60000
 *   OLLAMA_THINK      'false' để tắt chế độ suy nghĩ của model qwen3
 *   OPENCLAW_PROVIDER 'ollama' | 'openclaw' — ép backend, bỏ qua suy luận
 *
 * Không có biến nào được đặt ⇒ provider vẫn là 'openclaw', đúng hành vi cũ.
 *
 * Phần dựng/đọc payload tách thành hàm thuần để test được mà không cần Ollama.
 */

export type AssistantRole = 'system' | 'user' | 'assistant';

export interface AssistantMessage {
  role: AssistantRole;
  content: string;
}

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  timeoutMs: number;
  /** null = không gửi trường `think` (Ollama cũ không biết trường này). */
  think: boolean | null;
}

export type AssistantProvider = 'ollama' | 'openclaw';

/**
 * Môi trường chỉ được đọc dưới dạng chuỗi. Dùng `Record` thay cho
 * `NodeJS.ProcessEnv` để test truyền được một object literal — `ProcessEnv` của
 * Next bắt buộc phải có `NODE_ENV`.
 */
export type EnvLike = Record<string, string | undefined>;

export const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';
export const DEFAULT_OLLAMA_MODEL = 'qwen3:1.7b';
export const DEFAULT_OLLAMA_TIMEOUT_MS = 60_000;

const ASSISTANT_ROLES: AssistantRole[] = ['system', 'user', 'assistant'];

/**
 * `AbortSignal.timeout` không có trên mọi môi trường chạy test (jsdom), nên
 * timeout được dựng bằng AbortController và timer luôn được xoá sau khi xong —
 * nếu không, mỗi lượt chat để lại một handle mở.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** '1'/'true'/'yes'/'on' → true, '0'/'false'/'no'/'off' → false, rỗng → null. */
function parseOptionalBoolean(value: string | undefined): boolean | null {
  const raw = (value ?? '').trim().toLowerCase();
  if (!raw) return null;
  return ['1', 'true', 'yes', 'on'].includes(raw);
}

/**
 * `OLLAMA_HOST` là biến chính thức của Ollama (`127.0.0.1:11434`, không scheme),
 * nên cả hai biến đều được chấp nhận và đều được thêm scheme khi thiếu.
 */
export function normalizeOllamaBaseUrl(raw: string | undefined): string {
  const value = (raw ?? '').trim();
  if (!value) return DEFAULT_OLLAMA_BASE_URL;
  const withScheme = /^https?:\/\//i.test(value) ? value : `http://${value}`;
  return withScheme.replace(/\/+$/, '');
}

export function getOllamaConfig(env: EnvLike = process.env): OllamaConfig {
  const timeout = Number((env.OLLAMA_TIMEOUT_MS ?? '').trim());
  return {
    baseUrl: normalizeOllamaBaseUrl(env.OLLAMA_BASE_URL || env.OLLAMA_HOST),
    model: (env.OLLAMA_MODEL ?? '').trim() || DEFAULT_OLLAMA_MODEL,
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_OLLAMA_TIMEOUT_MS,
    think: parseOptionalBoolean(env.OLLAMA_THINK),
  };
}

/**
 * Ollama chỉ được coi là "đã cấu hình" khi người vận hành nói rõ qua biến môi
 * trường. Mặc định localhost là hợp lý cho `getOllamaConfig`, nhưng nếu lấy nó
 * làm căn cứ chọn provider thì mọi môi trường đều tự nhảy sang Ollama.
 */
export function isOllamaConfigured(env: EnvLike = process.env): boolean {
  return Boolean((env.OLLAMA_BASE_URL || env.OLLAMA_HOST || env.OLLAMA_MODEL || '').trim());
}

export function isOpenClawGatewayConfigured(env: EnvLike = process.env): boolean {
  return Boolean((env.OPENCLAW_API_KEY || env.NEXT_PUBLIC_OPENCLAW_API_URL || '').trim());
}

export function getOpenClawGatewayUrl(env: EnvLike = process.env): string {
  return (env.NEXT_PUBLIC_OPENCLAW_API_URL ?? '').trim() || 'http://localhost:18789';
}

/**
 * Provider cho lượt chat kế tiếp. `OPENCLAW_PROVIDER` thắng mọi suy luận để
 * người vận hành luôn ghim được backend; còn lại thì có biến Ollama là dùng
 * Ollama, không có thì giữ nguyên gateway như trước.
 */
export function resolveAssistantProvider(env: EnvLike = process.env): AssistantProvider {
  const explicit = (env.OPENCLAW_PROVIDER ?? '').trim().toLowerCase();
  if (explicit === 'ollama' || explicit === 'openclaw') return explicit;
  return isOllamaConfigured(env) ? 'ollama' : 'openclaw';
}

/**
 * Thứ tự backend sẽ thử: provider đã chọn trước, backend còn lại sau — nhưng chỉ
 * khi backend đó thực sự có cấu hình. Nhờ vậy một backend chết không làm hỏng
 * lượt chat khi backend kia còn sống, mà cũng không sinh request rác tới một
 * gateway chưa từng được đặt.
 */
export function getProviderAttempts(
  provider: AssistantProvider,
  env: EnvLike = process.env
): AssistantProvider[] {
  if (provider === 'ollama') {
    return isOpenClawGatewayConfigured(env) ? ['ollama', 'openclaw'] : ['ollama'];
  }
  return isOllamaConfigured(env) ? ['openclaw', 'ollama'] : ['openclaw'];
}

/**
 * Lọc lịch sử do client gửi lên thành message hợp lệ. Client là dữ liệu không
 * tin cậy, và Ollama 400 khi một message thiếu role hoặc content rỗng.
 */
export function toAssistantMessages(value: unknown): AssistantMessage[] {
  if (!Array.isArray(value)) return [];
  const messages: AssistantMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const { role, content } = item as { role?: unknown; content?: unknown };
    if (typeof role !== 'string' || !ASSISTANT_ROLES.includes(role as AssistantRole)) continue;
    if (typeof content !== 'string' || !content.trim()) continue;
    messages.push({ role: role as AssistantRole, content: content.trim() });
  }
  return messages;
}

/** Bỏ message rỗng/sai role trước khi gửi: Ollama 400 khi content rỗng. */
export function normalizeAssistantMessages(messages: AssistantMessage[]): AssistantMessage[] {
  return messages
    .filter(
      (message) =>
        message &&
        ASSISTANT_ROLES.includes(message.role) &&
        typeof message.content === 'string' &&
        message.content.trim().length > 0
    )
    .map((message) => ({ role: message.role, content: message.content.trim() }));
}

export interface OllamaChatPayload {
  model: string;
  messages: AssistantMessage[];
  stream: false;
  think?: boolean;
}

/** Payload cho `POST {baseUrl}/api/chat` (native API, không phải /v1 OpenAI). */
export function buildOllamaChatPayload(
  messages: AssistantMessage[],
  config: OllamaConfig
): OllamaChatPayload {
  return {
    model: config.model,
    messages: normalizeAssistantMessages(messages),
    stream: false,
    ...(config.think === null ? {} : { think: config.think }),
  };
}

/**
 * Đọc câu trả lời của Ollama. `/api/chat` trả `message.content`; giữ thêm
 * `response` để dùng lại được nếu ai đó trỏ vào `/api/generate`.
 */
export function parseOllamaReply(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const record = data as { message?: { content?: unknown }; response?: unknown };
  if (typeof record.message?.content === 'string') return record.message.content.trim();
  if (typeof record.response === 'string') return record.response.trim();
  return '';
}

export function parseOllamaError(data: unknown, status: number): string {
  if (data && typeof data === 'object') {
    const error = (data as { error?: unknown }).error;
    if (typeof error === 'string' && error.trim()) return error.trim();
  }
  return `Ollama trả về mã ${status}`;
}

/** Lỗi từ phía Ollama, mang theo status để route quyết định fallback. */
export class OllamaError extends Error {
  constructor(
    message: string,
    readonly status = 502
  ) {
    super(message);
    this.name = 'OllamaError';
  }
}

export interface AssistantAnswer {
  content: string;
  model: string | null;
}

/** Gọi một lượt chat tới Ollama. Ném `OllamaError` khi không dùng được. */
export async function askOllama(
  messages: AssistantMessage[],
  env: EnvLike = process.env
): Promise<AssistantAnswer> {
  const config = getOllamaConfig(env);
  const payload = buildOllamaChatPayload(messages, config);

  let response: Response;
  try {
    response = await fetchWithTimeout(
      `${config.baseUrl}/api/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store',
      },
      config.timeoutMs
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new OllamaError(`Không kết nối được Ollama tại ${config.baseUrl}: ${reason}`, 503);
  }

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new OllamaError(parseOllamaError(data, response.status), response.status);
  }

  const content = parseOllamaReply(data);
  if (!content) throw new OllamaError('Ollama trả về câu trả lời rỗng', 502);

  const model = (data as { model?: unknown } | null)?.model;
  return { content, model: typeof model === 'string' && model ? model : config.model };
}

export interface OllamaModelList {
  baseUrl: string;
  reachable: boolean;
  models: string[];
}

/** `GET /api/tags` — dùng cho trang trạng thái, không bao giờ ném lỗi. */
export async function listOllamaModels(
  env: EnvLike = process.env,
  timeoutMs = 3000
): Promise<OllamaModelList> {
  const config = getOllamaConfig(env);
  try {
    const response = await fetchWithTimeout(
      `${config.baseUrl}/api/tags`,
      { cache: 'no-store' },
      timeoutMs
    );
    if (!response.ok) return { baseUrl: config.baseUrl, reachable: false, models: [] };

    const data = (await response.json()) as { models?: Array<{ name?: unknown }> };
    const models = Array.isArray(data.models)
      ? data.models
          .map((model) => (typeof model?.name === 'string' ? model.name : ''))
          .filter(Boolean)
      : [];
    return { baseUrl: config.baseUrl, reachable: true, models };
  } catch {
    return { baseUrl: config.baseUrl, reachable: false, models: [] };
  }
}
