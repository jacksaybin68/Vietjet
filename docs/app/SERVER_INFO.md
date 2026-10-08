# Vietjet Air Server - Thông Tin Chạy Thử

## 🖥️ Triển khai VPS (production)

- **URL production**: http://156.67.214.184 (nginx → 127.0.0.1:4028)
- **Tên miền**: `vib.it.com` (nginx site `/etc/nginx/sites-available/vib.it.com`
  đã trỏ về Vietjet, SSL origin cert 2026–2041; backup cấu hình dichvucong cũ:
  `vib.it.com.bak-dichvucong`). **Lưu ý**: DNS `vib.it.com` đang NXDOMAIN —
  cần tạo A record `vib.it.com → 156.67.214.184` tại it.com dashboard trước
  khi truy cập được.
- **VPS**: Ubuntu 24.04, srv1520932.hstgr.cloud, Node v22.23.1
- **Mã nguồn**: `/var/www/vietjet` (clone từ
  `https://github.com/jacksaybin68/Vietjet.git`, app ở `vietjetsim-main/`)
- **Process manager**: pm2, app tên `vietjet`, auto-start qua systemd
  (`pm2 save` + `pm2 startup` đã chạy)
- **Cấu hình pm2**: `/var/www/vietjet/ecosystem.config.js`
- **Cấu hình nginx**: `/etc/nginx/sites-available/vietjet`
  (reverse proxy `server_name 156.67.214.184` → `127.0.0.1:4028`)
- **`.env.local`**: copy từ máy dev, `NEXT_PUBLIC_SITE_URL=http://156.67.214.184`
  (biến `NEXT_PUBLIC_*` được embed lúc build — sửa xong phải `npm run build`
  lại rồi `pm2 restart vietjet`)

### Deploy lại sau khi push code

```bash
ssh root@156.67.214.184
cd /var/www/vietjet && git pull
cd vietjetsim-main && npm ci && npm run build
pm2 restart vietjet
```

### Khi DNS `vib.it.com` trỏ xong

```bash
# 1. Đổi SITE_URL rồi build lại (biến NEXT_PUBLIC_* embed lúc build)
sed -i 's|NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=https://vib.it.com|' \
  /var/www/vietjet/vietjetsim-main/.env.local
cd /var/www/vietjet/vietjetsim-main && npm run build
pm2 restart vietjet
```

---

## ✅ Trạng thái: hướng dẫn đã được kiểm chứng lại

> Bản ghi chú trước nói phải dùng custom `server.js` để né "Node v26.7.0 bug".
> Kiểm chứng lại trên Node v26.7.0 (macOS): `next build` và `next start` chạy
> bình thường (`✓ Ready in 284ms`), **không cần custom server**.

### 🌐 Thông tin Server
- **URL**: http://localhost:4028 (http://127.0.0.1:4028 cũng được)
- **Port**: 4028 — mặc định trong `package.json` cho cả `dev` và `start`
- **Environment**: production nếu `npm run start`, development nếu `npm run dev`
- **Yêu cầu**: Node.js v26.7.0 trở lên (vitest@5 khai engines
  `^22.12.0 || ^24.0.0 || >=26.0.0`, nên Node 20 không chạy được test)

### 📍 Các đường dẫn quan trọng

#### Trang người dùng
- **Trang chủ**: http://localhost:4028/trang-chu
- **Đăng nhập**: http://localhost:4028/dang-nhap
- **Tìm vé**: http://localhost:4028/tim-ve
- **Tài khoản**: http://localhost:4028/tai-khoan
- **Thanh toán**: http://localhost:4028/thanh-toan

#### Trang quản trị
- **Admin Dashboard**: http://localhost:4028/quan-tri

#### API Endpoints
- **Auth - Current User**: http://localhost:4028/api/xac-thuc/toi
- **Flights**: http://localhost:4028/api/chuyen-bay
- **Bookings**: http://localhost:4028/api/dat-ve

### 🔑 Tài khoản Test

> ⚠️ Chỉ dùng được khi `DATABASE_URL` trỏ tới Postgres thật **và** đã chạy
> `migrations/014_seed_demo_data.sql` (hoặc `npm run db:seed-demo`).
> Khi `DATABASE_URL` để trống, app dùng mock in-memory trong `src/lib/neon.ts`:
> mock này seed sân bay và một hội thoại chat demo nhưng **không có bảng
> `users`**, nên mọi lần đăng nhập đều trả 401 (`Email/Số điện thoại hoặc mật
> khẩu không đúng`) bất kể thông tin nhập vào.

#### User (Người dùng thường)
```
Email: user@vietjetair.vn
Password: user123
```

#### Admin (Quản trị viên)
```
Email: admin@vietjetair.vn
Password: admin123
```

### 🛠️ Lệnh quản lý

#### Dừng server
```bash
# Tìm process ID đang giữ port 4028
lsof -ti:4028

# Kill process
kill -9 <PID>
```

#### Chạy production
```bash
cd <thư-mục-clone>/vietjetsim-main
npm run build
npm run start          # next start -p 4028
```

#### Chạy development
```bash
npm run dev            # next dev --turbo -p 4028
```

> `server.js` ở gốc app là custom server cũ dùng để né lỗi Next.js CLI trên Node
> v26.7.0. Lỗi đó không còn tái hiện, nên dùng `npm run start` như trên.

### ⚠️ Lưu ý quan trọng

1. **Node.js**: cần v26.7.0 trở lên; `vitest@5` không hỗ trợ Node 20
2. **Database**: `DATABASE_URL` để trống thì dùng mock in-memory (không có bảng
   `users` → không đăng nhập được); muốn có dữ liệu + tài khoản demo phải chạy
   migrations trong `migrations/` lên Neon PostgreSQL
3. **JWT Secrets**: cấu hình trong `.env.local` (`cp .env.local.example .env.local`)
4. **Port**: 4028; `next.config.mjs` giữ nguyên `distDir` mặc định `.next`

### 📊 Build Output
```
✓ Compiled successfully in 14.8s
✓ Generating static pages (72/72)
Route (app) — 83 route (gồm 58 API route handler)
```

### 🎨 Tính năng đã kiểm tra
- ✅ Server khởi động thành công
- ✅ HTML rendering OK
- ✅ API endpoints phản hồi
- ✅ Static assets loading
- ✅ Metadata & SEO tags
- ✅ Vietjet branding (màu đỏ #EC2029, vàng #FFD400)

---
**Kiểm chứng lại lần cuối**: 2026-09-24 (Node v26.7.0, macOS)
**Kết quả**: `npm ci` ✅ · `npm run type-check` ✅ · `npm run lint` ✅ (0 error) ·
`npm test` ✅ (29 file / 319 test) · `npm run build` ✅ (83 route)
