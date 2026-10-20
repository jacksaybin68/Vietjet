import { getCsrfHeaders } from '@/lib/csrf-client';
import {
  createCodingPiSseParser,
  type CodingPiMessage,
  type CodingPiResult,
  type CodingPiToolCall,
  type CodingPiToolChoice,
  type CodingPiToolDefinition,
} from '@/lib/coding-pi/protocol';
import { ApiRequestError, apiRequest } from '@/shared/services';

/**
 * Client của Coding Pi.
 *
 * `streamCodingPi` đọc SSE do `/api/coding-pi/chat` phát ra; `askCodingPi` là
 * bản không stream cho nơi không cần cập nhật từng chữ. Cả hai dùng chung cổng
 * CSRF với phần còn lại của app (`apiRequest` hoặc `getCsrfHeaders`).
 */

export interface CodingPiChatInput {
  prompt?: string;
  context?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  messages?: CodingPiMessage[];
  images?: Array<string | { url: string } | { type: 'image_url'; image_url: { url: string } }>;
  tools?: CodingPiToolDefinition[];
  toolChoice?: CodingPiToolChoice;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  enableThinking?: boolean;
  signal?: AbortSignal;
}

export interface CodingPiStreamHandlers {
  onReady?: (info: { model: string }) => void;
  onReasoning?: (text: string) => void;
  onContent?: (text: string) => void;
  onToolCall?: (call: CodingPiToolCall) => void;
  onDone?: (result: CodingPiResult) => void;
}

export interface CodingPiStatus {
  provider: 'nvidia';
  configured: boolean;
  model: string;
  baseUrl: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  thinking: boolean;
  timeoutMs: number;
}

function parseJson<T>(data: string): T | null {
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

async function readErrorMessage(
  response: Response
): Promise<{ message: string; payload: unknown }> {
  const text = await response.text().catch(() => '');
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (typeof record.error === 'string' && record.error) {
      return { message: record.error, payload };
    }
    if (typeof record.message === 'string' && record.message) {
      return { message: record.message, payload };
    }
  }
  return {
    message: `Yêu cầu thất bại (${response.status})`,
    payload,
  };
}

function toRequestBody(input: CodingPiChatInput): Record<string, unknown> {
  const { signal: _signal, ...body } = input;
  return body as Record<string, unknown>;
}

/** Gửi một lượt chat và cập nhật UI theo từng event SSE. */
export async function streamCodingPi(
  input: CodingPiChatInput,
  handlers: CodingPiStreamHandlers = {}
): Promise<CodingPiResult> {
  const response = await fetch('/api/coding-pi/chat', {
    method: 'POST',
    credentials: 'include',
    signal: input.signal,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...getCsrfHeaders(),
    },
    body: JSON.stringify({ ...toRequestBody(input), stream: true }),
  });

  if (!response.ok) {
    const { message, payload } = await readErrorMessage(response);
    throw new ApiRequestError(response.status, message, payload);
  }
  if (!response.body) {
    throw new Error('Máy chủ không trả về luồng phản hồi.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parser = createCodingPiSseParser();

  let content = '';
  let reasoning = '';
  const toolCalls: CodingPiToolCall[] = [];
  let finalResult: CodingPiResult | null = null;

  const consume = (events: ReturnType<typeof parser.push>) => {
    for (const event of events) {
      const payload = parseJson<Record<string, unknown>>(event.data);

      if (event.event === 'error') {
        const message =
          payload && typeof payload.error === 'string'
            ? payload.error
            : 'Coding Pi gặp lỗi khi đang trả lời.';
        throw new Error(message);
      }

      if (event.event === 'ready') {
        handlers.onReady?.({
          model: payload && typeof payload.model === 'string' ? payload.model : '',
        });
        continue;
      }

      if (event.event === 'reasoning') {
        const text = payload && typeof payload.text === 'string' ? payload.text : '';
        if (text) {
          reasoning += text;
          handlers.onReasoning?.(text);
        }
        continue;
      }

      if (event.event === 'content') {
        const text = payload && typeof payload.text === 'string' ? payload.text : '';
        if (text) {
          content += text;
          handlers.onContent?.(text);
        }
        continue;
      }

      if (event.event === 'tool_call' && payload) {
        const call = payload as unknown as CodingPiToolCall;
        if (call.function?.name || call.function?.arguments) {
          toolCalls.push(call);
          handlers.onToolCall?.(call);
        }
        continue;
      }

      if (event.event === 'done' && payload) {
        finalResult = payload as unknown as CodingPiResult;
        handlers.onDone?.(finalResult);
      }
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      consume(parser.push(decoder.decode(value, { stream: true })));
    }
    consume(parser.push(decoder.decode()));
    consume(parser.flush());
  } catch (error) {
    if (input.signal?.aborted) {
      return (
        finalResult ?? {
          content,
          reasoning,
          toolCalls,
          finishReason: null,
          usage: null,
          model: null,
        }
      );
    }
    throw error;
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // Đang bị huỷ — không cần trả lock.
    }
  }

  return (
    finalResult ?? {
      content,
      reasoning,
      toolCalls,
      finishReason: null,
      usage: null,
      model: null,
    }
  );
}

/** Bản không stream, dùng `apiRequest` để có sẵn CSRF và xử lý lỗi chung. */
export async function askCodingPi(input: CodingPiChatInput): Promise<CodingPiResult> {
  return apiRequest<CodingPiResult>('/api/coding-pi/chat', {
    method: 'POST',
    body: { ...toRequestBody(input), stream: false },
  });
}

/** Trạng thái backend (đã có khoá chưa, model nào) — admin-only. */
export async function getCodingPiStatus(): Promise<CodingPiStatus> {
  return apiRequest<CodingPiStatus>('/api/coding-pi/chat');
}
