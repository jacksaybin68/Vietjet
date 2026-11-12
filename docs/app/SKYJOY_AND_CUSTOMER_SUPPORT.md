# Hệ Sinh Thái Khách Hàng Thân Thiết SkyJoy & Chăm Sóc Khách Hàng (Gói 5)

Tài liệu kỹ thuật mô tả kiến trúc và cơ chế vận hành của Hệ sinh thái hội viên SkyJoy và Kênh hỗ trợ trực tuyến đa phương tiện của Vietjet Air Simulator.

---

## 1. Ví Điểm Thưởng SkyJoy Rewards (Tác vụ 5.1)

### 1.1. Cấu trúc Hạng thẻ & Hệ số Tích lũy (Tier Multipliers)
Hệ thống hội viên SkyJoy chuẩn hóa theo 4 hạng thẻ chính thức của Vietjet:
- **Hạng Red (Cơ bản)**:
  - Hệ số tích lũy: **x1.0**
  - Điểm tích lũy trọn đời yêu cầu: `0` SkyPoints
  - Quyền lợi: Tích 1 điểm thưởng trên mỗi 1.000 VND chi tiêu.
- **Hạng Silver (Bạc)**:
  - Hệ số tích lũy: **x1.2**
  - Điểm tích lũy trọn đời yêu cầu: `10,000` SkyPoints
  - Quyền lợi: Tích 1.2 điểm trên mỗi 1.000 VND, ưu tiên làm thủ tục chọn chỗ ngồi.
- **Hạng Gold (Vàng)**:
  - Hệ số tích lũy: **x1.5**
  - Điểm tích lũy trọn đời yêu cầu: `50,000` SkyPoints
  - Quyền lợi: Tích 1.5 điểm trên mỗi 1.000 VND, ưu tiên check-in, ưu tiên xử lý hành lý.
- **Hạng Diamond (Kim Cương)**:
  - Hệ số tích lũy: **x2.0**
  - Điểm tích lũy trọn đời yêu cầu: `150,000` SkyPoints
  - Quyền lợi: Tích 2.0 điểm trên mỗi 1.000 VND, miễn phí phòng chờ thương gia VIP Lounge, thẻ hành lý ưu tiên đặc biệt.

### 1.2. Cơ chế Tự động Tích điểm khi Thanh toán (Auto-Accrual)
- Hàm cốt lõi: `awardBookingLoyaltyPoints(bookingId, amountVnd, userId)` trong `src/lib/db.ts`.
- Tự động kích hoạt khi thanh toán hoàn tất:
  - Cổng thanh toán trực tiếp (`POST /api/thanh-toan`).
  - Webhook đối soát ngân hàng VietQR (`POST /api/thanh-toan/webhook/vietqr`).
  - Phê duyệt giao dịch Admin (`/api/quan-tri/giao-dich`).
- Tự động kiểm tra ngưỡng điểm trọn đời (`lifetime_points`) và nâng hạng thẻ tức thì (`tier = newTier`, ghi nhận `tier_qualified_at`).

### 1.3. Cơ chế Thanh toán kết hợp "Điểm thưởng + Tiền mặt" (Cash + Points)
- Cho phép khách hàng tùy biến số lượng điểm SkyPoint muốn trừ vào tiền vé thông qua thanh trượt hoặc các nút tỷ lệ nhanh (25%, 50%, 75%, 100% / Tối đa).
- Công thức quy đổi đồng nhất hai chiều Client & Server qua `src/lib/skypoint.ts`:
  - `skypointValueOfPoints(points, rate)`: Quy đổi điểm ra số tiền VND giảm trừ trực tiếp.
  - `skypointPointsForAmount(amountVnd, rate)`: Quy đổi số tiền ra số điểm cần thiết.
- Phần tiền mặt còn lại (`payableTotal = total - pointsDiscountVnd`) được thanh toán qua bất kỳ phương thức nào: VietQR, Thẻ nội địa ATM, Thẻ quốc tế Visa/Mastercard hoặc Chuyển khoản ngân hàng.

### 1.4. Lịch sử Biến động Số dư Minh bạch
- Giao diện `LoyaltyTab.tsx` trong trang cá nhân (`/tai-khoan`) hiển thị:
  - Thẻ nhận diện thương hiệu SkyJoy theo màu sắc hạng thẻ chuẩn (Red `#E31837`, Silver `#E2E8F0`, Gold `#FFDD00`, Diamond `#06B6D4`).
  - Thanh tiến trình phấn đấu lên hạng thẻ tiếp theo (`calculateTierProgress`).
  - Danh sách chi tiết từng giao dịch (`loyalty_transactions`): Ngày giờ, mã loại (`earn`, `redeem`, `bonus`, `adjust`), mô tả giao dịch, số điểm biến động (+/-) và phân trang rõ ràng.

---

## 2. Kênh Hỗ Trợ Đa Phương Tiện & Trợ Lý AI (Tác vụ 5.2)

### 2.1. Hệ thống Live Chat Hai Chiều (Khách hàng <-> Admin)
- Hỗ trợ cả khách vãng lai (Guest Checkout / Guest Support) và người dùng đã đăng nhập.
- **Realtime Typing Indicator**: Cập nhật chỉ số gõ phím tức thì qua `updateChatPresence` và polling tối ưu.
- **Unread Badge Counter**: Bộ đếm tin nhắn chưa đọc độc lập hai chiều (`unread_by_admin`, `unread_by_user`), tự động xóa khi mở cuộc trò chuyện (`/api/tro-chuyen/danh-dau-da-doc`).

### 2.2. Cuộc Gọi Thoại Trực Tuyến (WebRTC Voice Call)
- Tích hợp cuộc gọi thoại 2 chiều trực tiếp trên trình duyệt (`VoiceCallModal.tsx`).
- Vòng đời cuộc gọi chuẩn:
  1. `initiate`: Phát tín hiệu chuông reo và âm thanh `callSounds.ts`.
  2. `ringing`: Thông báo pop-up cuộc gọi đến cho nhân viên quản trị.
  3. `connected`: Bắt đầu đếm thời lượng cuộc gọi (`duration_seconds`), bật/tắt microphone.
  4. `ended`: Tự động gửi tin nhắn tổng kết cuộc gọi kèm thời lượng vào khung chat.

### 2.3. Chatbot AI Giải Đáp Chính Sách Thông Minh (SkyBot)
- Engine xử lý thông minh `src/lib/chatbot-ai.ts` tích hợp trong API Chat (`/api/tro-chuyen`).
- Giải đáp tự động 24/7 theo 3 nhóm nghiệp vụ chính của Vietjet:
  1. **Chính sách Hành lý**:
     - Hành lý xách tay 7kg tiêu chuẩn (56x36x23cm) + túi nhỏ (40x30x10cm).
     - Hành lý ký gửi các gói 20kg, 30kg, 40kg và ưu đãi mua trước trên web.
     - Quy định chất lỏng (nội địa vs quốc tế) và quy định an toàn pin sạc dự phòng.
  2. **Thủ tục Giấy tờ bay & Check-in**:
     - Quy định CCCD/Hộ chiếu hợp lệ cho người lớn.
     - Quy định bắt buộc Giấy khai sinh bản chính / trích lục có dấu đỏ cho trẻ em dưới 14 tuổi.
     - Thời gian mở check-in trực tuyến trước 24 tiếng đến 60 phút.
  3. **Điều kiện Hoàn / Hủy / Đổi vé**:
     - Vé Eco: Không hoàn tiền, đổi ngày/giờ bay có thu phí + chênh lệch.
     - Vé Deluxe: Miễn phí đổi ngày, hoàn bảo lưu định danh theo điều kiện.
     - Vé SkyBoss: Miễn phí đổi vé, hoàn bảo lưu định danh đến 2 năm, phòng chờ VIP Lounge.
