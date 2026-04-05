# VietjetSim - Luồng Xử lý Dự án (Project Workflow)

Tài liệu này mô tả các luồng nghiệp vụ chính của ứng dụng VietjetSim, từ phía người dùng (User) đến quản trị viên (Admin).

---

## 1. Luồng Người Dùng (User Workflow)

### 1.1 Khám phá & Tìm kiếm (Search Flow)
1. **Trang chủ (`/homepage`)**: Người dùng xem các chương trình khuyến mãi, tin tức và biểu mẫu tìm kiếm.
2. **Tìm kiếm chuyến bay (`/flight-booking`)**: 
   - Nhập điểm đi, điểm đến, ngày đi, ngày về và số lượng hành khách.
   - Nhấn "Tìm chuyến bay".
3. **Kết quả tìm kiếm**: Hiển thị danh sách các chuyến bay khả dụng với giá vé và thời gian tương ứng.

### 1.2 Đặt vé (Booking Flow)
1. **Chọn chuyến bay**: Người dùng chọn chuyến bay phù hợp (hạng vé Eco, SkyBoss...).
2. **Thông tin hành khách (`PassengerInfoStep`)**: Nhập họ tên, ngày sinh, CMND/Hộ chiếu cho từng hành khách.
3. **Chọn chỗ ngồi (`SeatSelectionStep`)**: Xem sơ đồ máy bay và chọn vị trí ghế (ghế thường, ghế phía trước, ghế thoát hiểm).
4. **Dịch vụ bổ sung**: Chọn thêm hành lý ký gửi, suất ăn hoặc bảo hiểm (nếu có).

### 1.3 Thanh toán & Xác nhận (Payment Flow)
1. **Trang thanh toán (`/payment`)**:
   - Xem lại tóm tắt đặt chỗ (Flight Summary).
   - Chọn phương thức thanh toán (Thẻ tín dụng, Chuyển khoản ngân hàng, Ví điện tử).
2. **Xử lý giao dịch**:
   - Hệ thống kiểm tra mã giảm giá (Promo Code).
   - Xác thực thông tin thanh toán (giả lập).
3. **Hoàn tất (`/confirmation`)**:
   - Hiển thị Mã đặt chỗ (Booking Code - ví dụ: `VJXP123`).
   - Gửi xác nhận về Dashboard của người dùng.

---

## 2. Luồng Quản Trị Viên (Admin Workflow)

### 2.1 Quản lý Nội dung & Chuyến bay
1. **Tổng quan (`OverviewTab`)**: Xem số liệu thống kê doanh thu, vé đã bán, chuyến bay hoạt động.
2. **Quản lý chuyến bay (`FlightsTab`)**:
   - Thêm mới chuyến bay (Số hiệu, lộ trình, giờ bay).
   - Cập nhật trạng thái chuyến bay (Đúng giờ, Delay, Hủy chuyến).
   - Điều chỉnh giá vé theo thời điểm.

### 2.2 Quản lý Đơn hàng & Giao dịch
1. **Quản lý đặt chỗ (`BookingsTab`)**:
   - Tra cứu vé theo Mã đặt chỗ hoặc Tên khách hàng.
   - Chỉnh sửa thông tin hành khách khi có yêu cầu hỗ trợ.
   - Hủy vé hoặc đổi chuyến cho khách hàng.
2. **Xử lý thanh toán (`TransactionsTab`)**:
   - Kiểm tra trạng thái các giao dịch ngân hàng.
   - Xác nhận thanh toán thủ công cho các vé đang ở trạng thái Chờ (Pending).

### 2.3 Luồng Hoàn tiền & Hủy vé (Refund Flow)
1. **Yêu cầu (User)**: Người dùng gửi yêu cầu hủy vé từ Dashboard cá nhân.
2. **Phê duyệt (Admin)**: Quản trị viên kiểm tra điều kiện hạng vé (Eco thường không được hoàn, SkyBoss được hoàn phí).
3. **Thực thi**:
   - Admin xác nhận lệnh hoàn tiền trong `BookingsTab`.
   - Hệ thống tự động cập nhật lại trạng thái ghế (Seat) thành 'Trống'.
   - Gửi yêu cầu hoàn phí sang cổng thanh toán hoặc ví điểm thưởng của User.
   - Gửi Email xác nhận hoàn tiền thành công.

---

## 3. Luồng Quản lý Tài khoản (Account Workflow)

### 3.1 Đăng ký & Đăng nhập (`/sign-up-login`)
- **Đăng ký**: Tạo tài khoản mới bằng Email.
- **Đăng nhập**: Sử dụng JWT để duy trì phiên làm việc (Access Token & Refresh Token).
- **Phân quyền (Middleware)**:
  - User thường: Chuyển hướng về `/user-dashboard`.
  - Admin: Chuyển hướng về `/admin-dashboard`.

### 3.2 Dashboard người dùng (`/user-dashboard`)
- Xem danh sách vé đã đặt và vé sắp bay.
- Quản lý hồ sơ cá nhân, đổi mật khẩu.
- Tra cứu lịch sử thanh toán và tích lũy điểm thưởng (Loyalty).

---

## 4. Các tính năng hỗ trợ khác
- **Check-in trực tuyến (`/check-in`)**: Nhập mã đặt chỗ để làm thủ tục chuyến bay sớm và nhận thẻ lên máy bay (Boarding Pass).
- **Tra cứu hành trình (`/track`)**: Theo dõi tình trạng chuyến bay thời gian thực.
- **Hỗ trợ khách hàng (`/contact`)**: Gửi yêu cầu hỗ trợ hoặc chat trực tiếp với Admin.

---

## 4. Luồng Thông báo & Tương tác (Notification Flow)
- **Email xác nhận**: Tự động gửi ngay sau khi thanh toán thành công (kèm file vé điện tử PDF).
- **Thông báo thay đổi**: Gửi qua SMS/Email khi chuyến bay bị thay đổi lịch trình hoặc hủy chuyến bởi Admin.
- **Mã giảm giá (Promo)**: Admin tạo chiến dịch khuyến mãi, hệ thống gửi Email giới thiệu mã đến toàn bộ User.

---
*Tài liệu được cập nhật ngày: 05/04/2026*
