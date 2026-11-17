/**
 * Tiện ích dùng chung cho 3 spec E2E.
 *
 * Nguyên tắc: mọi bước trong spec phải khẳng định ĐÚNG hành vi người dùng
 * thấy, chứ không kiểm tra một điều kiện "cho qua". Vì vậy helper ở đây
 * chỉ gom những thao tác lặp lại nhiều lần (đăng nhập, tìm chuyến bay,
 * điền hồ sơ hành khách) — không ẩn giấy bất kỳ khẳng định nào.
 */

import { expect, type APIRequestContext, type Page } from '@playwright/test';

/** Tài khoản admin có sẵn trong mock DB in-memory (`src/lib/neon.ts`). */
export const ADMIN_EMAIL = 'admin@vietjetair.vn';
export const ADMIN_PASSWORD = 'admin123';

/** Họ của hành khách dùng cho các spec tự tạo đơn. */
export const TEST_LAST_NAME = 'E2ETEST';

/**
 * Đăng nhập bằng API để lấy cookie phiên + CSRF.
 *
 * Dùng `request` (APIRequestContext) thay vì UI vì luồng đăng nhập chỉ là
 * tiền đề cho phần nghiệp vụ cần kiểm chứng — và điền form UI làm spec
 * chậm + dễ vỡ khi bố cục trang đăng nhập đổi.
 */
export async function loginAsAdmin(
  request: APIRequestContext,
  email: string = ADMIN_EMAIL,
  password: string = ADMIN_PASSWORD
): Promise<void> {
  const response = await request.post('/api/xac-thuc/dang-nhap', {
    data: { email, password },
  });
  expect(response.ok(), `Đăng nhập "${email}" thất bại: ${response.status()}`).toBe(true);
}

/**
 * Đọc token CSRF từ cookie của context.
 *
 * `src/proxy.ts` cấp cookie `csrf_token` cho mọi request, nên sau khi điền
 * form tra cứu (một GET) thì context đã có cookie này.
 */
export async function csrfToken(request: APIRequestContext): Promise<string> {
  const cookies = await request.storageState();
  const cookie = cookies.cookies.find((c) => c.name === 'csrf_token');
  return cookie?.value ?? '';
}

/** Ngày bay hợp lệ trong tương lai (định dạng `YYYY-MM-DD`). */
export function futureDate(daysAhead = 1): string {
  const date = new Date(Date.now() + daysAhead * 86_400_000);
  // `toISOString()` đưa sang UTC — lệch ngày so với lịch Việt Nam, nên dựng
  // thẳng từ các thành phần ngày địa phương.
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Tìm chuyến bay HAN → SGN trên trang kết quả và trả về `data-testid` của
 * thẻ chuyến bay đầu tiên.
 */
export async function openFirstFlightResult(page: Page): Promise<string> {
  await page.goto(`/tim-ve?from=HAN&to=SGN&depart=${futureDate(1)}&pax=1`);
  const card = page.locator('[data-testid="flight-result-card"]').first();
  await expect(card, 'Trang kết quả phải hiện ít nhất một chuyến bay').toBeVisible({
    timeout: 20_000,
  });
  return (await card.getAttribute('data-testid')) ?? '';
}

/**
 * Điền hồ sơ hành khách ở bước 2 của luồng đặt vé.
 *
 * Trả về tên đầy đủ đã gõ — tên này dùng lại làm "Họ" khi tra cứu check-in,
 * nên nó phải khớp chính xác với tên lưu trong DB (khớp không phân biệt
 * hoa thường và dấu, theo `normalizeName` của `/api/checkin`).
 */
export async function fillPassengerInfo(page: Page): Promise<string> {
  const lastName = TEST_LAST_NAME;
  const firstName = 'NGUYEN';

  await expect(page.locator('#passenger-0-name')).toBeVisible({ timeout: 15_000 });
  await page.locator('#passenger-0-name').fill(lastName);
  await page.locator('#passenger-0-firstName').fill(firstName);
  await page.locator('#passenger-0-dob').fill('1990-01-15');
  await page.locator('#passenger-0-phone').fill('0912345678');
  await page.locator('#passenger-0-email').fill('e2e-passenger@vietjetsim.vn');
  await page.locator('#passenger-0-idNumber').fill('001088012345');

  // Đồng ý điều khoản là bắt buộc — API từ chối đơn thiếu `policyAccepted`.
  await page.locator('input[type="checkbox"][required]').last().check();

  return `${lastName} ${firstName}`;
}
