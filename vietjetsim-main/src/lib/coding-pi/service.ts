/**
 * Service Coding Pi — tầng server-only điều phối một lượt chat.
 *
 * Route HTTP chỉ làm ba việc: xác thực, kiểm tra body, rồi gọi service này.
 * Mọi thứ liên quan tới NVIDIA (timeout, huỷ, đọc stream, ghép event) nằm ở
 * đây nên có thể test mà không cần dựng HTTP server.
 */

import type { CodingPiConfig } from './config';
import { buildCodingPiPayload, CODING_PI_PROVIDER, type CodingPiRequest } from './protocol';
import {
  CODING_PI_EVENTS,
  createCodingPiAccumulator,
  createCodingPiSseParser,
  encodeCodingPiSseEvent,
  parseCodingPiCompletion,
  parseCodingPiStreamData,
  type CodingPiResult,
} from './stream';
import { codingPiTimeoutMessage, CodingPiUpstreamError, openCodingPiUpstream } from './provider';

/** Header của response SSE. */
export const CODING_PI_SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
} as const;

export interface CodingPiChatOptions {
  request: CodingPiRequest;
  config: CodingPiConfig;
  /** Tín hiệu huỷ của client. */
  clientSignal?: AbortSignal;
  /** Bơm `fetch` để test — mặc định là `globalThis.fetch`. */
  fetchImpl?: typeof fetch;
}

/** Trạng thái cấu hình mà `GET /api/coding-pi/chat` trả về. */
export interface CodingPiStatusPayload {
  provider: string;
  configured: boolean;
  model: string;
  baseUrl: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  thinking: boolean;
  timeoutMs: number;
}

export function getCodingPiStatusPayload(
  config: CodingPiConfig,
  configured: boolean
): CodingPiStatusPayload {
  return {
    provider: CODING_PI_PROVIDER,
    configured,
    model: config.model,
    baseUrl: config.baseUrl,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    topP: config.topP,
    thinking: config.enableThinking,
    timeoutMs: config.timeoutMs,
  };
}

/** Kết quả cuối cùng kèm provider — shape giống hệt event `done`. */
export function toCodingPiResponseBody(result: CodingPiResult, model: string) {
  return {
    provider: CODING_PI_PROVIDER,
    ...result,
    model: result.model || model,
  };
}

/** Một lượt chat không stream: đọc JSON của NVIDIA rồi trả về kết quả. */
export async function completeCodingPiChat(options: CodingPiChatOptions): Promise<CodingPiResult> {
  const { request, config, clientSignal, fetchImpl } = options;
  const payload = buildCodingPiPayload(request);
  const session = await openCodingPiUpstream({ config, payload, clientSignal, fetchImpl });

  try {
    const text = await session.response.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new CodingPiUpstreamError('NVIDIA API trả về dữ liệu không phải JSON.', 502);
    }
    return parseCodingPiCompletion(data);
  } catch (error) {
    if (error instanceof CodingPiUpstreamError) throw error;
    if (session.timedOut) {
      throw new CodingPiUpstreamError(codingPiTimeoutMessage(config.timeoutMs), 504);
    }
    console.error('Coding Pi non-stream read error:', error);
    throw new CodingPiUpstreamError('Không đọc được phản hồi từ NVIDIA API.', 502);
  } finally {
    session.dispose();
  }
}

/**
 * Một lượt chat dạng stream: trả về `ReadableStream` phát các event
 * `ready`, `reasoning`, `content`, `tool_call`, `done` — và `error` nếu hỏng
 * giữa chừng (HTTP đã là 200 nên không đổi được status).
 */
export async function streamCodingPiChat(
  options: CodingPiChatOptions
): Promise<ReadableStream<Uint8Array>> {
  const { request, config, clientSignal, fetchImpl } = options;
  const payload = buildCodingPiPayload(request);
  const session = await openCodingPiUpstream({ config, payload, clientSignal, fetchImpl });

  const reader = session.response.body?.getReader();
  if (!reader) {
    session.dispose();
    throw new CodingPiUpstreamError('NVIDIA API không trả về luồng dữ liệu.', 502);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const sse = createCodingPiSseParser();
  const accumulator = createCodingPiAccumulator();
  let cancelled = false;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (!cancelled) controller.enqueue(encoder.encode(encodeCodingPiSseEvent(event, data)));
      };

      const consume = (events: ReturnType<typeof sse.push>) => {
        for (const event of events) {
          const chunk = parseCodingPiStreamData(event.data);
          if (!chunk || chunk.done) continue;
          accumulator.add(chunk);
          if (chunk.reasoning) send(CODING_PI_EVENTS.reasoning, { text: chunk.reasoning });
          if (chunk.content) send(CODING_PI_EVENTS.content, { text: chunk.content });
          for (const call of chunk.toolCalls) send(CODING_PI_EVENTS.toolCall, call);
        }
      };

      try {
        send(CODING_PI_EVENTS.ready, { model: request.model });
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          consume(sse.push(decoder.decode(value, { stream: true })));
        }
        consume(sse.push(decoder.decode()));
        consume(sse.flush());

        const result = accumulator.result();
        send(CODING_PI_EVENTS.done, toCodingPiResponseBody(result, request.model));
        controller.close();
      } catch (streamError) {
        const interrupted =
          session.timedOut || (streamError instanceof Error && streamError.name === 'AbortError');
        if (!clientSignal?.aborted && !cancelled) {
          console.error('Coding Pi stream error:', streamError);
          try {
            send(CODING_PI_EVENTS.error, {
              error: session.timedOut
                ? codingPiTimeoutMessage(config.timeoutMs)
                : interrupted
                  ? 'Luồng phản hồi từ NVIDIA API bị ngắt.'
                  : 'Không đọc được luồng phản hồi từ NVIDIA API.',
            });
          } catch {
            // Client đã đóng kết nối; không còn gì để gửi.
          }
        }
        try {
          controller.close();
        } catch {
          // Stream đã đóng.
        }
      } finally {
        session.dispose();
        try {
          reader.releaseLock();
        } catch {
          // Còn một read đang chờ khi bị huỷ — bỏ qua.
        }
      }
    },
    cancel() {
      cancelled = true;
      session.cancel();
      void reader.cancel().catch(() => undefined);
    },
  });
}
