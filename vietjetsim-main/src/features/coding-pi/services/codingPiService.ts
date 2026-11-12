import { getCsrfHeaders } from '@/lib/csrf-client';
import type { CodingPiToolCall } from '@/lib/coding-pi/protocol';
import type { CodingPiResult } from '@/lib/coding-pi/stream';
import { ApiRequestError, apiRequest } from '@/shared/services';
import { CODING_PI_ENDPOINT } from '../constants';
import type { CodingPiChatInput, CodingPiStatus, CodingPiStreamHandlers } from '../types';
import { readCodingPiStream } from './codingPiStream';

/**
 * Client của Coding Pi.
 *
 * `streamCodingPi` đọc SSE do `/api/coding-pi/chat` phát ra; `askCodingPi` là
 * bản không stream cho nơi không cần cập nhật từng chữ. Cả hai dùng chung cổng
 * CSRF với phần còn lại của app (`apiRequest` hoặc `getCsrfHeaders`).
 */

function emptyResult(
  content: string,
  reasoning: string,
  toolCalls: CodingPiToolCall[]
): CodingPiResult {
  return {
    content,
    reasoning,
    toolCalls,
    finishReason: null,
    usage: null,
    model: null,
  };
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
  const response = await fetch(CODING_PI_ENDPOINT, {
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

  let content = '';
  let reasoning = '';
  const toolCalls: CodingPiToolCall[] = [];
  let finalResult: CodingPiResult | null = null;

  try {
    for await (const event of readCodingPiStream(response.body)) {
      if (event.type === 'ready') {
        handlers.onReady?.({ model: event.model });
        continue;
      }
      if (event.type === 'reasoning') {
        if (event.text) {
          reasoning += event.text;
          handlers.onReasoning?.(event.text);
        }
        continue;
      }
      if (event.type === 'content') {
        if (event.text) {
          content += event.text;
          handlers.onContent?.(event.text);
        }
        continue;
      }
      if (event.type === 'tool_call') {
        toolCalls.push(event.call);
        handlers.onToolCall?.(event.call);
        continue;
      }
      if (event.type === 'done') {
        finalResult = event.result;
        handlers.onDone?.(finalResult);
        continue;
      }
      throw new Error(event.message);
    }
  } catch (error) {
    if (input.signal?.aborted) {
      return finalResult ?? emptyResult(content, reasoning, toolCalls);
    }
    throw error;
  }

  return finalResult ?? emptyResult(content, reasoning, toolCalls);
}

/** Bản không stream, dùng `apiRequest` để có sẵn CSRF và xử lý lỗi chung. */
export async function askCodingPi(input: CodingPiChatInput): Promise<CodingPiResult> {
  return apiRequest<CodingPiResult>(CODING_PI_ENDPOINT, {
    method: 'POST',
    body: { ...toRequestBody(input), stream: false },
  });
}

/** Trạng thái backend (đã có khoá chưa, model nào) — admin-only. */
export async function getCodingPiStatus(): Promise<CodingPiStatus> {
  return apiRequest<CodingPiStatus>(CODING_PI_ENDPOINT);
}
