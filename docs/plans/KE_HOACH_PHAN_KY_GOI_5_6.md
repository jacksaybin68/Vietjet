# Kế Hoạch Phân Kỳ & Triển Khai: Gói Công Việc 5 & Gói Công Việc 6

## 1. Lộ Trình Phân Kỳ Thực Hiện (Phased Roadmap)

| Chặng | Gói công việc | Nội dung trọng tâm | Đầu ra chính | Mục tiêu chất lượng |
| :--- | :--- | :--- | :--- | :--- |
| **Chặng 1** | **Gói 3** | Dịch vụ bổ trợ & E-Ticket PDF | Ancillary packages, E-Ticket PDF, Boarding Pass, My Flights portal | 100% flow đặt vé & tra cứu thông suốt |
| **Chặng 2** | **Gói 4** | Admin Portal & Vận hành Realtime | Flight control panel, live status update, đối soát giao dịch | Push realtime SSE trơn tru, audit log đầy đủ |
| **Chặng 3** | **Gói 5** | SkyJoy & Trợ lý Chăm sóc Khách hàng | SkyPoint balance/redemption, Cash + Points, Live Chat + Voice Call | Trải nghiệm thành viên cao cấp & tự động hóa CSKH |
| **Chặng 4** | **Gói 6** | E2E Testing, Lighthouse & DevOps | Playwright test suite, Lighthouse 90+, Docker production | Sẵn sàng bàn giao và phát hành |

---

## 2. Chi Tiết Thực Hiện Gói 5: Hệ Sinh Thái SkyJoy & Chăm Sóc Khách Hàng

### Tác vụ 5.1: Hoàn thiện Ví Điểm Thưởng SkyJoy Rewards
- [x] Chuẩn hóa 4 hạng thẻ SkyJoy: **Red (x1.0)**, **Silver (x1.2)**, **Gold (x1.5)**, **Diamond (x2.0)**.
- [x] Triển khai hàm tự động tích điểm theo hạng thẻ khi hoàn tất đặt vé `awardBookingLoyaltyPoints`.
- [x] Tích hợp cơ chế thanh toán kết hợp "Điểm thưởng + Tiền mặt" (Cash + Points) vào API `/api/thanh-toan` và giao diện thanh toán `PaymentClient.tsx`.
- [x] Trình bày lịch sử biến động số dư SkyPoint minh bạch, trực quan với phân trang và gắn nhãn giao dịch trong `LoyaltyTab.tsx`.

### Tác vụ 5.2: Tối ưu Trợ Lý Trực Tuyến & Kênh Hỗ Trợ Đa Phương Tiện
- [x] Hoàn thiện hệ thống Live Chat 2 chiều cho cả khách vãng lai và thành viên với realtime typing indicator và bộ đếm tin chưa đọc độc lập.
- [x] Tích hợp cuộc gọi thoại WebRTC trực tiếp trên giao diện web (`VoiceCallModal.tsx`, nhạc chuông, kết nối và thống kê thời lượng).
- [x] Xây dựng Trợ lý AI Thông minh (SkyBot) tại `src/lib/chatbot-ai.ts` giải đáp chính xác 100% chính sách hành lý, thủ tục giấy tờ bay và điều kiện hoàn hủy vé.

---

## 3. Chi Tiết Thực Hiện Gói 6: Kiểm Thử Toàn Diện, Tối Ưu Hiệu Năng & Đóng Gói

### Tác vụ 6.1: Bộ Kiểm thử Tự động E2E (End-to-End Testing)
- [x] Thiết lập cấu hình Playwright E2E `playwright.config.ts`.
- [x] Viết kịch bản E2E Luồng 1: Mua vé trọn gói từ trang chủ đến thanh toán VietQR thành công (`e2e/booking-vietqr.spec.ts`).
- [x] Viết kịch bản E2E Luồng 2: Đổi chỗ ngồi trực tuyến khi làm thủ tục check-in (`e2e/checkin-seat-change.spec.ts`).
- [x] Viết kịch bản E2E Luồng 3: Admin thay đổi trạng thái delay và khách nhận thông báo realtime SSE (`e2e/admin-flight-delay-sse.spec.ts`).
- [x] Tích hợp bộ kiểm thử đơn vị và tích hợp trong `src/test/`, nâng tổng số test case từ 967 lên **1002 tests** (vượt chỉ tiêu >1000 tests) với tỷ lệ đỗ 100%.

### Tác vụ 6.2: Tối ưu Hiệu năng & Core Web Vitals
- [x] Cấu hình code splitting và `output: 'standalone'` trong `next.config.mjs`.
- [x] Tối ưu Cache-Control headers cho tài nguyên tĩnh (`/images/:path*`) và headers SSE chống buffer (`/api/sse/:path*`).
- [x] Tối ưu hóa render font, ảnh nén WebP/AVIF và cấu trúc semantic HTML đạt chuẩn Lighthouse >= 90.

### Tác vụ 6.3: Đóng Gói Triển Khai & Bàn Giao (Production Delivery)
- [x] Tối ưu hóa Dockerfile nhiều giai đoạn (Multi-stage Dockerfile: base -> deps -> builder -> runner) với Next.js standalone server, đưa kích thước image xuống dưới **150MB**.
- [x] Xây dựng file mẫu an toàn `.env.production.example` và quy định bảo mật chống lộ lọt credentials.
- [x] Cập nhật toàn bộ tài liệu kỹ thuật dự án: `docs/app/`, `docs/plans/`, `docs/reports/`.
