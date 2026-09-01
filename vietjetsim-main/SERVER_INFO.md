# VietjetSim Server - Thông Tin Chạy Thử

## ✅ Trạng thái: ĐANG CHẠY

### 🌐 Thông tin Server
- **URL chính**: http://127.0.0.1:3008
- **Port**: 3008
- **Environment**: Production
- **Server Type**: Custom Node.js HTTP Server (workaround cho Node v26.7.0 bug)

### 📍 Các đường dẫn quan trọng

#### Trang người dùng
- **Trang chủ**: http://127.0.0.1:3008/trang-chu
- **Đăng nhập**: http://127.0.0.1:3008/dang-nhap
- **Tìm vé**: http://127.0.0.1:3008/tim-ve
- **Tài khoản**: http://127.0.0.1:3008/tai-khoan
- **Thanh toán**: http://127.0.0.1:3008/thanh-toan

#### Trang quản trị
- **Admin Dashboard**: http://127.0.0.1:3008/quan-tri

#### API Endpoints
- **Auth - Current User**: http://127.0.0.1:3008/api/xac-thuc/toi
- **Flights**: http://127.0.0.1:3008/api/chuyen-bay
- **Bookings**: http://127.0.0.1:3008/api/dat-ve

### 🔑 Tài khoản Test

#### User (Người dùng thường)
```
Email: user@vietjetsim.vn
Password: user123
```

#### Admin (Quản trị viên)
```
Email: admin@vietjetsim.vn
Password: admin123
```

### 🛠️ Lệnh quản lý

#### Dừng server
```bash
# Tìm process ID
lsof -ti:3008

# Kill process
kill -9 <PID>
```

#### Khởi động lại
```bash
cd /Users/user/orca/Vietjet/vietjetsim-main
NODE_ENV=production PORT=3008 node server.js
```

#### Build lại (nếu có thay đổi code)
```bash
npm run build
```

### ⚠️ Lưu ý quan trọng

1. **Node.js v26.7.0 Bug**: Có lỗi `uv_interface_addresses` với Next.js CLI, đã workaround bằng custom server
2. **Database**: Đã kết nối với Neon PostgreSQL
3. **JWT Secrets**: Đã cấu hình trong `.env.local`
4. **Port 4028**: Port mặc định bị chiếm, đã chuyển sang 3008

### 📊 Build Output
```
✓ Compiled successfully in 33.0s
✓ Generating static pages (61/61)
Route (app)                                    Size  First Load JS
├ ○ /trang-chu                              5.42 kB         219 kB
├ ○ /quan-tri                                187 kB         374 kB
├ ○ /tai-khoan                              17.7 kB         216 kB
└ ... (61 routes total)
```

### 🎨 Tính năng đã kiểm tra
- ✅ Server khởi động thành công
- ✅ HTML rendering OK
- ✅ API endpoints phản hồi
- ✅ Static assets loading
- ✅ Metadata & SEO tags
- ✅ Vietjet branding (màu đỏ #EC2029, vàng #FFD400)

---
**Thời gian khởi động**: 2026-08-31 15:51 (UTC+7)
**Process ID**: 85346
