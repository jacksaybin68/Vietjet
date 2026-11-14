import { apiRequest } from '@/shared/services';
import {
  PUBLIC_PAGE_LAYOUT_ENDPOINT,
  VISUAL_EDITOR_ENDPOINT,
} from '../constants';
import type { PageLayout } from '../types';

/** Phản hồi của endpoint quản trị. */
export interface LayoutResponse {
  ok: boolean;
  pagePath: string;
  layout: PageLayout | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

/** Phản hồi của endpoint công khai. */
export interface PublicLayoutResponse {
  ok: boolean;
  pagePath: string;
  layout: PageLayout | null;
}

/**
 * Đọc bố cục của một trang (cần phiên quản trị).
 *
 * Endpoint này trả 500 nếu DB lỗi; `VisualEditorView` bắt lỗi và dùng bố
 * cục mặc định, nên trình soạn thảo vẫn mở được.
 */
export async function fetchPageLayout(pagePath: string): Promise<LayoutResponse> {
  return apiRequest<LayoutResponse>(
    `${VISUAL_EDITOR_ENDPOINT}?page=${encodeURIComponent(pagePath)}`
  );
}

/** Lưu bố cục của một trang. */
export async function savePageLayout(
  pagePath: string,
  layout: PageLayout
): Promise<LayoutResponse> {
  return apiRequest<LayoutResponse>(VISUAL_EDITOR_ENDPOINT, {
    method: 'PUT',
    body: { pagePath, layout },
  });
}

/**
 * Đọc bố cục của một trang từ phía khách (không cần phiên).
 *
 * Dùng `fetch` thẳng thay vì `apiRequest` vì endpoint này công khai: nếu
 * endpoint lỗi, trang chủ phải vẫn render được với bố cục mặc định, nên
 * lỗi được trả về dưới dạng `null` thay vì ném exception.
 */
export async function fetchPublicPageLayout(
  pagePath: string
): Promise<PublicLayoutResponse | null> {
  try {
    const response = await fetch(
      `${PUBLIC_PAGE_LAYOUT_ENDPOINT}?page=${encodeURIComponent(pagePath)}`,
      {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      }
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as PublicLayoutResponse;
    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
}
