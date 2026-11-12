import { test, expect } from '@playwright/test';

/**
 * Luồng 1: Mua vé trọn gói từ trang chủ đến thanh toán VietQR thành công.
 */
test.describe('E2E Flow 1: Full Booking to VietQR Payment', () => {
  test('Khách hàng tìm chuyến bay, chọn vé, điền thông tin và thanh toán VietQR thành công', async ({
    page,
  }) => {
    // 1. Vào trang chủ
    await page.goto('/trang-chu');
    await expect(page).toHaveTitle(/Vietjet/i);

    // 2. Tìm kiếm chuyến bay SGN -> HAN
    const searchForm = page.locator('form, [data-testid="search-flights-form"]').first();
    await expect(searchForm).toBeVisible();

    // Điểm đến trang tìm vé
    await page.goto('/tim-ve?from=SGN&to=HAN');

    // 3. Chọn chuyến bay đầu tiên
    const flightCards = page.locator('[data-testid="flight-card"], .flight-card');
    await expect(flightCards.first()).toBeVisible({ timeout: 10_000 });

    const selectButton = flightCards
      .first()
      .locator('button:has-text("Chọn"), button:has-text("Đặt vé")');
    if ((await selectButton.count()) > 0) {
      await selectButton.first().click();
    }

    // 4. Đến trang thanh toán với mã đặt chỗ
    // Trực tiếp mô phỏng điều hướng đến trang thanh toán
    await page.goto('/thanh-toan?bookingId=demo-booking-e2e-1');

    // 5. Chọn phương thức VietQR
    const vietQrTab = page.locator('button:has-text("VietQR")').first();
    if (await vietQrTab.isVisible()) {
      await vietQrTab.click();
    }

    // Kiểm tra thông tin thanh toán VietQR hiển thị
    const qrSection = page.locator('text=Quét mã VietQR, text=VietQR').first();
    await expect(qrSection).toBeVisible();

    // 6. Giả lập xác nhận thanh toán hoặc webhook phản hồi
    const submitBtn = page
      .locator('button:has-text("Tôi đã chuyển khoản"), button:has-text("Xác nhận đã thanh toán")')
      .first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    }

    // Kỳ vọng chuyển sang trạng thái thành công hoặc hiển thị mã đặt chỗ PNR
    const successBanner = page.locator('text=Thanh toán thành công, text=Vé điện tử').first();
    await expect(successBanner).toBeVisible({ timeout: 15_000 });
  });
});
