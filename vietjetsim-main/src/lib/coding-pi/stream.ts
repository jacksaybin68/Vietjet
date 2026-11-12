/**
 * Luồng SSE của Coding Pi — phần thuần, không đọc biến môi trường.
 *
 * NVIDIA NIM trả về `text/event-stream` khi `stream: true`. File này giữ:
 *  - bộ tách khối SSE (giữ được khối bị chia cắt giữa hai chunk mạng);
 *  - cách đọc một `data:` của NVIDIA (`content`, `reasoning_content`,
 *    `tool_calls`);
 *  - cách cộng dồn các delta thành câu trả lời cuối;
 *  - tên các event mà API phát ra.
 *
 * Cả route server lẫn service phía client dùng chung một định nghĩa, nên
 * đổi tên event hay đổi shape ở đây là đổi ở cả hai nơi.
 */

import {
  isRecord,
  normalizeCodingPiToolCallDeltas,
  type CodingPiToolCall,
  type CodingPiUsage,
} from './protocol';

/** Tên event API phát ra; client đọc đúng các tên này. */
export const CODING_PI_EVENTS = {
  ready: 'ready',
  reasoning: 'reasoning',
  content: 'content',
  toolCall: 'tool_call',
  done: 'done',
  error: 'error',
} as const;

export type CodingPiEventName = (typeof CODING_PI_EVENTS)[keyof typeof CODING_PI_EVENTS];

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

/** Một frame SSE do API phát ra (client đọc bằng parser ở trên). */
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
    toolCalls: normalizeCodingPiToolCallDeltas(delta.tool_calls),
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
    toolCalls: normalizeCodingPiToolCallDeltas(message.tool_calls).map(
      ({ index: _index, ...call }) => call
    ),
    finishReason: choice && typeof choice.finish_reason === 'string' ? choice.finish_reason : null,
    usage: readUsage(data.usage),
    model: typeof data.model === 'string' ? data.model : null,
  };
}
