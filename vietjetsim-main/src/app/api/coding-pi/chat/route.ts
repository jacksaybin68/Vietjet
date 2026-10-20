import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import {
  buildCodingPiPayload,
  CodingPiValidationError,
  createCodingPiAccumulator,
  createCodingPiSseParser,
  encodeCodingPiSseEvent,
  parseCodingPiCompletion,
  parseCodingPiRequest,
  parseCodingPiStreamData,
} from '@/lib/coding-pi/protocol';
import { getCodingPiConfig, isCodingPiConfigured } from '@/lib/coding-pi/config';

/**
 * Coding Pi — proxy server-side tới NVIDIA NIM.
 *
 *   GET  /api/coding-pi/chat   trạng thái cấu hình (admin)
 *   POST /api/coding-pi/chat   chat, mặc định stream SSE
 *
 * Khoá `NVIDIA_API_KEY` chỉ nằm ở server. Route dùng chung cổng quyền với
 * `/api/editor/files` (`system:config`) vì công cụ duy nhất gọi nó là editor.
 *
 * POST trả SSE với các event:
 *   ready     { model }
 *   reasoning { text }              phần suy nghĩ (reasoning_content)
 *   content   { text }              phần trả lời
 *   tool_call { id?, index?, function: { name, arguments } }
 *   done      { content, reasoning, toolCalls, finishReason, usage, model }
 *   error     { error }             lỗi giữa stream (HTTP đã là 200)
 *
 * `stream: false` trả JSON một lần với cùng shape như event `done`.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_ERROR_DETAIL = 400;

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function upstreamFailure(status: number, bodyText: string, model: string) {
  const payload = safeJson(bodyText);
  const record =
    payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
  const nested =
    record && record.error && typeof record.error === 'object'
      ? (record.error as Record<string, unknown>)
      : null;
  const detail =
    (nested && typeof nested.message === 'string' && nested.message) ||
    (record && typeof record.message === 'string' && record.message) ||
    (record && typeof record.detail === 'string' && record.detail) ||
    bodyText.trim().slice(0, MAX_ERROR_DETAIL);

  if (status === 401 || status === 403) {
    return {
      status: 502,
      message: 'NVIDIA API từ chối khoá. Kiểm tra NVIDIA_API_KEY trên máy chủ.',
    };
  }
  if (status === 404) {
    return { status: 502, message: `Không tìm thấy model ${model} trên NVIDIA API.` };
  }
  if (status === 429) {
    return { status: 429, message: 'NVIDIA API đang giới hạn tần suất. Thử lại sau ít phút.' };
  }
  if (status >= 500) {
    return { status: 502, message: 'NVIDIA API đang gặp sự cố. Thử lại sau ít phút.' };
  }
  return {
    status: 400,
    message: detail || `NVIDIA API trả về mã ${status}.`,
  };
}

function timeoutMessage(timeoutMs: number): string {
  return `NVIDIA API không phản hồi trong ${Math.round(timeoutMs / 1000)} giây.`;
}

/** GET: cho editor biết backend đã cấu hình chưa và đang dùng model nào. */
export async function GET(req: NextRequest) {
  const { error, response } = await verifyAdminRequest(req);
  if (error) return response;

  const config = getCodingPiConfig();
  return NextResponse.json({
    provider: 'nvidia',
    configured: isCodingPiConfigured(),
    model: config.model,
    baseUrl: config.baseUrl,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    topP: config.topP,
    thinking: config.enableThinking,
    timeoutMs: config.timeoutMs,
  });
}

export async function POST(req: NextRequest) {
  const { error, response } = await verifyAdminRequest(req, 'system:config');
  if (error) return response;

  const config = getCodingPiConfig();
  if (!config.apiKey) {
    return NextResponse.json(
      { error: 'Chưa cấu hình NVIDIA_API_KEY trên máy chủ.' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body phải là JSON hợp lệ.' }, { status: 400 });
  }

  let chatRequest;
  try {
    chatRequest = parseCodingPiRequest(body, config);
  } catch (parseError) {
    if (parseError instanceof CodingPiValidationError) {
      return NextResponse.json({ error: parseError.message }, { status: 400 });
    }
    throw parseError;
  }

  const payload = buildCodingPiPayload(chatRequest);
  const abort = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    abort.abort();
  }, config.timeoutMs);
  const onClientAbort = () => abort.abort();
  req.signal.addEventListener('abort', onClientAbort);

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    clearTimeout(timer);
    req.signal.removeEventListener('abort', onClientAbort);
  };

  let upstream: Response;
  try {
    upstream = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: chatRequest.stream ? 'text/event-stream' : 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: abort.signal,
      cache: 'no-store',
    });
  } catch (fetchError) {
    cleanup();
    if (req.signal.aborted) {
      return NextResponse.json({ error: 'Yêu cầu đã bị huỷ.' }, { status: 499 });
    }
    if (timedOut || (fetchError instanceof Error && fetchError.name === 'AbortError')) {
      return NextResponse.json({ error: timeoutMessage(config.timeoutMs) }, { status: 504 });
    }
    return NextResponse.json(
      { error: 'Không thể kết nối tới NVIDIA API. Kiểm tra kết nối mạng của máy chủ.' },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => '');
    cleanup();
    const failure = upstreamFailure(upstream.status, text, chatRequest.model);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }

  if (!chatRequest.stream) {
    try {
      const text = await upstream.text();
      const data = safeJson(text);
      if (!data) {
        return NextResponse.json(
          { error: 'NVIDIA API trả về dữ liệu không phải JSON.' },
          { status: 502 }
        );
      }
      const result = parseCodingPiCompletion(data);
      return NextResponse.json({
        provider: 'nvidia',
        ...result,
        model: result.model || chatRequest.model,
      });
    } catch (readError) {
      if (timedOut) {
        return NextResponse.json({ error: timeoutMessage(config.timeoutMs) }, { status: 504 });
      }
      console.error('Coding Pi non-stream read error:', readError);
      return NextResponse.json(
        { error: 'Không đọc được phản hồi từ NVIDIA API.' },
        { status: 502 }
      );
    } finally {
      cleanup();
    }
  }

  const reader = upstream.body?.getReader();
  if (!reader) {
    cleanup();
    return NextResponse.json({ error: 'NVIDIA API không trả về luồng dữ liệu.' }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const sse = createCodingPiSseParser();
  const accumulator = createCodingPiAccumulator();
  let cancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (!cancelled) controller.enqueue(encoder.encode(encodeCodingPiSseEvent(event, data)));
      };

      const consume = (events: ReturnType<typeof sse.push>) => {
        for (const event of events) {
          const chunk = parseCodingPiStreamData(event.data);
          if (!chunk || chunk.done) continue;
          accumulator.add(chunk);
          if (chunk.reasoning) send('reasoning', { text: chunk.reasoning });
          if (chunk.content) send('content', { text: chunk.content });
          for (const call of chunk.toolCalls) send('tool_call', call);
        }
      };

      try {
        send('ready', { model: chatRequest.model });
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          consume(sse.push(decoder.decode(value, { stream: true })));
        }
        consume(sse.push(decoder.decode()));
        consume(sse.flush());

        const result = accumulator.result();
        send('done', {
          provider: 'nvidia',
          ...result,
          model: result.model || chatRequest.model,
        });
        controller.close();
      } catch (streamError) {
        const interrupted =
          timedOut || (streamError instanceof Error && streamError.name === 'AbortError');
        if (!req.signal.aborted && !cancelled) {
          console.error('Coding Pi stream error:', streamError);
          try {
            send('error', {
              error: timedOut
                ? timeoutMessage(config.timeoutMs)
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
        cleanup();
        try {
          reader.releaseLock();
        } catch {
          // Còn một read đang chờ khi bị huỷ — bỏ qua.
        }
      }
    },
    cancel() {
      cancelled = true;
      abort.abort();
      cleanup();
      void reader.cancel().catch(() => undefined);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
