/**
 * Provider NVIDIA NIM — tầng server-only của Coding Pi.
 *
 * File này là nơi duy nhất chạm vào `NVIDIA_API_KEY` và gọi ra ngoài. Nó trả
 * lỗi dưới dạng `CodingPiUpstreamError` (kèm HTTP status tương ứng) để route
 * chỉ việc đổi thành JSON, không cần biết chi tiết lỗi của NVIDIA.
 *
 * Khoá nằm ở server: client bundle không bao giờ import tệp này.
 */

import type { CodingPiConfig } from './config';
import type { CodingPiPayload } from './protocol';

/** Lỗi từ phía NVIDIA (hoặc mạng) — `status` là HTTP status sẽ trả về. */
export class CodingPiUpstreamError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'CodingPiUpstreamError';
    this.status = status;
  }
}

const MAX_ERROR_DETAIL = 400;

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Dịch lỗi của NVIDIA sang thông điệp tiếng Việt + HTTP status.
 * 401/403 → 502 (khoá sai), 404 → 502 (sai model), 429 → 429, 5xx → 502.
 */
export function describeCodingPiUpstreamFailure(
  status: number,
  bodyText: string,
  model: string
): { status: number; message: string } {
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

export function codingPiTimeoutMessage(timeoutMs: number): string {
  return `NVIDIA API không phản hồi trong ${Math.round(timeoutMs / 1000)} giây.`;
}

export interface CodingPiUpstreamOptions {
  config: CodingPiConfig;
  payload: CodingPiPayload;
  /** Tín hiệu huỷ của client (đóng tab, ngắt kết nối). */
  clientSignal?: AbortSignal;
  /** Bơm `fetch` để test — mặc định là `globalThis.fetch`. */
  fetchImpl?: typeof fetch;
}

export interface CodingPiUpstreamSession {
  response: Response;
  /** Đã hết thời gian chờ (khác với client tự huỷ). */
  timedOut: boolean;
  /** Dọn timer và listener. */
  dispose(): void;
  /** Huỷ request đang mở và dọn tài nguyên. */
  cancel(): void;
}

/**
 * Mở một request tới NVIDIA. Trả về session để tầng trên đọc body; lỗi
 * trước khi có body nào được trả về dưới dạng `CodingPiUpstreamError`.
 */
export async function openCodingPiUpstream(
  options: CodingPiUpstreamOptions
): Promise<CodingPiUpstreamSession> {
  const { config, payload, clientSignal, fetchImpl } = options;
  const doFetch = fetchImpl ?? globalThis.fetch;

  const abort = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    abort.abort();
  }, config.timeoutMs);
  const onClientAbort = () => abort.abort();
  if (clientSignal?.aborted) abort.abort();
  else clientSignal?.addEventListener('abort', onClientAbort);

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    clearTimeout(timer);
    clientSignal?.removeEventListener('abort', onClientAbort);
  };
  let response: Response;
  try {
    response = await doFetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: payload.stream ? 'text/event-stream' : 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: abort.signal,
      cache: 'no-store',
    });
  } catch (fetchError) {
    dispose();
    if (clientSignal?.aborted) {
      throw new CodingPiUpstreamError('Yêu cầu đã bị huỷ.', 499);
    }
    if (timedOut || (fetchError instanceof Error && fetchError.name === 'AbortError')) {
      throw new CodingPiUpstreamError(codingPiTimeoutMessage(config.timeoutMs), 504);
    }
    throw new CodingPiUpstreamError(
      'Không thể kết nối tới NVIDIA API. Kiểm tra kết nối mạng của máy chủ.',
      502
    );
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    dispose();
    const failure = describeCodingPiUpstreamFailure(response.status, text, payload.model);
    throw new CodingPiUpstreamError(failure.message, failure.status);
  }

  return {
    response,
    get timedOut() {
      return timedOut;
    },
    dispose,
    cancel() {
      abort.abort();
      dispose();
    },
  };
}
