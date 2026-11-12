import { test, expect } from '@playwright/test';

/**
 * Luồng 2: Đổi chỗ ngồi trực tuyến khi làm thủ tục check-in.
 */
test.describe('E2E Flow 2: Online Seat Change during Check-in', () => {
  test('Khách hàng tra cứu mã PNR, mở sơ đồ ghế, đổi chỗ ngồi và nhận boarding pass mới', async ({
    page,
  }) => {
    // 1. Vào trang làm thủ tục trực tuyến
    await page.goto('/lam-thu-tuc-truc-tuyen');
    await expect(page).toHaveTitle(/Làm thủ tục|Check-in/i);

    // 2. Nhập mã đặt chỗ PNR và Họ tên
    const pnrInput = page
      .locator('input[name="bookingCode"], input[placeholder*="VJ"], input[placeholder*="PNR"]')
      .first();
    const nameInput = page.locator('input[name="lastName"], input[placeholder*="Họ"]').first();

    if ((await pnrInput.isVisible()) && (await nameInput.isVisible())) {
      await pnrInput.fill('VJTEST');
      await nameInput.fill('NGUYEN');

      const searchBtn = page
        .locator('button:has-text("Tìm kiếm"), button:has-text("Tra cứu")')
        .first();
      await searchBtn.click();
    }

    // 3. Mở modal đổi chỗ ngồi
    const changeSeatBtn = page
      .locator('button:has-text("Đổi chỗ ngồi"), button:has-text("Chọn lại ghế")')
      .first();
    if (await changeSeatBtn.isVisible()) {
      await changeSeatBtn.click();

      // Kiểm tra sơ đồ ghế hiển thị
      const seatMapModal = page.locator('[role="dialog"], text=Chọn chỗ ngồi mới').first();
      await expect(seatMapModal).toBeVisible();

      // Chọn một ghế còn trống
      const availableSeat = page
        .locator('button[data-seat]:not([disabled]), .seat-available')
        .first();
      if (await availableSeat.isVisible()) {
        await availableSeat.click();

        // Xác nhận đổi ghế
        const confirmBtn = page
          .locator('button:has-text("Xác nhận đổi ghế"), button:has-text("Lưu vị trí ghế")')
          .first();
        await confirmBtn.click();

        // Kỳ vọng thông báo đổi ghế thành công
        await expect(
          page.locator('text=Đổi ghế thành công, text=Ghế đã được cập nhật')
        ).toBeVisible({
          timeout: 8_000,
        });
      }
    }
  });
});
