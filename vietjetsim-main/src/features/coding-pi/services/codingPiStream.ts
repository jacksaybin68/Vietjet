import type { CodingPiToolCall } from '@/lib/coding-pi/protocol';
import { CODING_PI_EVENTS, createCodingPiSseParser } from '@/lib/coding-pi/stream';
import type { CodingPiResult, CodingPiStreamEvent } from '../types';

/**
 * Đọc luồng SSE của `/api/coding-pi/chat` thành các event có kiểu.
 *
 * Tách khỏi `codingPiService` để phần "hiểu event" không lẫn với phần "gọi
 * HTTP": service chỉ cần lặp qua generator này và bắn callback.
 */

function parseJson(data: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(data) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function toStreamEvent(event: string, data: string): CodingPiStreamEvent | null {
  const payload = parseJson(data);
  if (!payload) return null;

  if (event === CODING_PI_EVENTS.ready) {
    return { type: 'ready', model: typeof payload.model === 'string' ? payload.model : '' };
  }

  if (event === CODING_PI_EVENTS.reasoning) {
    return { type: 'reasoning', text: typeof payload.text === 'string' ? payload.text : '' };
  }

  if (event === CODING_PI_EVENTS.content) {
    return { type: 'content', text: typeof payload.text === 'string' ? payload.text : '' };
  }

  if (event === CODING_PI_EVENTS.toolCall) {
    const call = payload as unknown as CodingPiToolCall;
    return call.function?.name || call.function?.arguments ? { type: 'tool_call', call } : null;
  }

  if (event === CODING_PI_EVENTS.done) {
    return { type: 'done', result: payload as unknown as CodingPiResult };
  }

  if (event === CODING_PI_EVENTS.error) {
    return {
      type: 'error',
      message:
        typeof payload.error === 'string' ? payload.error : 'Coding Pi gặp lỗi khi đang trả lời.',
    };
  }

  return null;
}

/** Đọc body SSE và phát ra từng event theo thứ tự server gửi. */
export async function* readCodingPiStream(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<CodingPiStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const parser = createCodingPiSseParser();

  function* emit(events: ReturnType<typeof parser.push>) {
    for (const event of events) {
      const parsed = toStreamEvent(event.event, event.data);
      if (parsed) yield parsed;
    }
  }

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      yield* emit(parser.push(decoder.decode(value, { stream: true })));
    }
    yield* emit(parser.push(decoder.decode()));
    yield* emit(parser.flush());
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // Đang bị huỷ — không cần trả lock.
    }
  }
}
