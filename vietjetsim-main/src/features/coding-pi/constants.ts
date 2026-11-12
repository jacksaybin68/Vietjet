import { API_ENDPOINTS } from '@/shared/constants';

/**
 * Endpoint của Coding Pi. Khai báo ở `API_ENDPOINTS` để mọi nơi gọi trỏ
 * cùng một đường dẫn — đổi route là đổi một chỗ.
 *
 * API này admin-only, cần quyền `system:config` (cùng cổng với
 * `/api/editor/files`).
 */
export const CODING_PI_ENDPOINT = API_ENDPOINTS.CODING_PI.CHAT;
