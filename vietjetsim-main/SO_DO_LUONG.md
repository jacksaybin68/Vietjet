# Sơ đồ Luồng Xử lý Dự án (VietjetSim)

Dưới đây là sơ đồ chi tiết các bước xử lý nghiệp vụ trong hệ thống VietjetSim sử dụng Mermaid.

## 1. Tổng quan Luồng Người Dùng & Quản Trị Viên

```mermaid
graph TD
    %% Khởi đầu
    Start((Bắt đầu)) --> Visit[Truy cập Website]
    Visit --> Auth{Đã Đăng nhập?}
    
    %% Luồng Đăng nhập/Đăng ký
    Auth -- Chưa --> Sign[Đăng ký hoặc Đăng nhập]
    Sign --> Auth
    Auth -- Rồi --> Role{Vai trò là gì?}

    %% Nhánh Người Dùng
    Role -- Người dùng --> Home[Trang chủ / Tìm kiếm chuyến bay]
    Home --> Search[Chọn chuyến bay & Hạng vé]
    Search --> PassInfo[Nhập thông tin hành khách]
    PassInfo --> Seat[Chọn vị trí chỗ ngồi]
    Seat --> Payment[Trang thanh toán hóa đơn]
    Payment --> Promo{Có mã giảm giá?}
    Promo -- Có --> UpdateTotal[Cập nhật lại tổng tiền]
    Promo -- Không --> Proceed[Tiến hành thanh toán]
    UpdateTotal --> Proceed
    Proceed --> Confirm[Xác nhận & Nhận mã Đặt vé]
    Confirm --> UserDash[Dashboard: Xem vé & Điểm thưởng]

    %% Nhánh Quản trị (Admin)
    Role -- Quản trị viên --> AdminDash[Bảng điều khiển Admin]
    AdminDash --> Overview[Thống kê Doanh thu & Tổng hợp vé]
    AdminDash --> ManageFlights[Quản lý Chuyến bay: Thêm/Sửa/Hoãn]
    AdminDash --> ManageBookings[Quản lý Đặt chỗ: Sửa thông tin/Hủy vé]
    AdminDash --> ManageTrans[Xác nhận Giao dịch ngân hàng]

    %% Luồng Khác
    UserDash --> CheckIn[Thủ tục Check-in trực tuyến]
    UserDash --> Track[Theo dõi hành trình chuyến bay]
    
    %% Kết thúc
    Confirm --> End((Kết thúc))
    CheckIn --> End
    ManageTrans --> End
```

---

## 2. Luồng Thanh toán Chi tiết

```mermaid
sequenceDiagram
    participant U as Người dùng
    participant F as Giao diện (Frontend)
    participant B as Hệ thống (Backend API)
    participant D as Cơ sở dữ liệu

    U->>F: Chọn phương thức thanh toán
    F->>B: Kiểm tra Mã giảm giá (nếu có)
    B-->>F: Trả về mức tiền được giảm
    U->>F: Nhấn nút "Thanh toán"
    F->>B: Gửi (Dữ liệu Đặt vé + Thông tin Thẻ/Bank)
    Note over B: Xử lý Giao dịch an toàn
    B->>D: Lưu bản ghi Thanh toán
    B->>D: Cập nhật Trạng thái vé = 'Đã xác nhận'
    D-->>B: Thành công
    B-->>F: Trả về Mã đặt chỗ (Booking Code)
    F-->>U: Hiển thị màn hình Thành công & Hiệu ứng Chúc mừng
```

---

## 3. Quy trình Kiểm soát Truy cập (Middleware)

```mermaid
flowchart LR
    Req[Yêu cầu truy cập] --> Mid[Middleware đánh chặn]
    Mid --> Token{Kiểm tra Token JWT}
    Token -- Hợp lệ --> Role{Kiểm tra Quyền hạn}
    Token -- Không hợp lệ --> Login[Chuyển hướng về trang Đăng nhập]
    Role -- Người dùng --> UserRoutes[Cho phép vào Dashboard Khách / Thanh toán]
    Role -- Quản trị viên --> AdminRoutes[Cho phép vào Dashboard Quản trị]
    Role -- Khác --> Deny[Từ chối truy cập - Lỗi 403]
```

---

## 4. Luồng Hoàn tiền & Hủy vé (Hoàn chỉnh)

```mermaid
sequenceDiagram
    participant U as Người dùng (Dashboard)
    participant A as Quản trị viên (Admin)
    participant S as Hệ thống (Sơ đồ Ghế)
    participant P as Cổng thanh toán/Ví

    U->>A: Gửi yêu cầu Hủy vé & Hoàn tiền
    A->>A: Kiểm tra Hạng vé (Eco/SkyBoss)
    alt Không được hoàn tiền
        A-->>U: Thông báo: Hạng vé không hỗ trợ hoàn phí
    else Được hoàn tiền
        A->>S: Giải phóng Chỗ ngồi (Seat Status = 'Trống')
        A->>P: Lệnh hoàn trả tiền/Điểm thưởng
        P-->>A: Xác nhận Giao dịch hoàn tiền
        A-->>U: Thông báo: Gửi Email xác nhận hoàn thành
    end
```

---

## 5. Luồng Xử lý Lỗi Thanh toán

```mermaid
stateDiagram-v2
    [*] --> NhậpThôngTinThẻ
    NhậpThôngTinThẻ --> KiểmTraXácThực
    KiểmTraXácThực --> GiaoDịchThànhCông: Hợp lệ
    KiểmTraXácThực --> LỗiThanhToán: Không hợp lệ/Hết hạn/Hết tiền
    
    LỗiThanhToán --> HiểnThịLỗivàNútThửLại
    HiểnThịLỗivàNútThửLại --> NhậpThôngTinThẻ: Người dùng nhấn Thử lại
    HiểnThịLỗivàNútThửLại --> HủyGiaoDịch: Đóng thông báo
    HủyGiaoDịch --> [*]
```
