/**
 * Endpoint của trình soạn thảo trực quan.
 *
 * Tách khỏi `API_ENDPOINTS` trong `src/shared/constants` vì đây là endpoint
 * riêng của feature, và feature này đã tự gọi fetch trực tiếp (không qua
 * `apiRequest`) cho phía công khai.
 */

/** Endpoint quản trị: đọc/ghi bố cục trang. */
export const VISUAL_EDITOR_ENDPOINT = '/api/editor/layout';

/** Endpoint công khai: trang chủ đọc bố cục đã lưu. */
export const PUBLIC_PAGE_LAYOUT_ENDPOINT = '/api/cong-khai/boc-trang';
