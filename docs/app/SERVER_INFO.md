# Vietjet Air Server - Thông Tin Chạy Thử

## 🖥️ Triển khai VPS (production)

- **URL production**: https://vietjet.shop (www redirect, HTTP→HTTPS 301)
- **Tên miền**: `vietjet.shop` (Hostinger DNS: A `@` → 156.67.214.184,
  CNAME `www` → vietjet.shop). SSL Let's Encrypt qua `certbot --nginx`
  (auto-renew bằng `certbot.timer`, hết hạn 2027-01-06)
- **Tên miền dự phòng** (nginx sẵn sàng, chưa active):
  - `vib.it.com` → `/etc/nginx/sites-available/vib.it.com` (origin cert
    2026–2041; backup cấu hình dichvucong cũ: `vib.it.com.bak-dichvucong`;
    DNS đang NXDOMAIN — chưa trỏ)
  - `hoantienve.com` → `/etc/nginx/sites-available/vietjet-hoantienve`
    (DNS trỏ 72.61.115.108 — site "CBR Mobile", chưa đổi)
- **URL production cũ (vẫn hoạt động)**: http://156.67.214.184
  (nginx site `/etc/nginx/sites-available/vietjet` → 127.0.0.1:4028)
- **VPS**: Ubuntu 24.04, srv1520932.hstgr.cloud, Node v22.23.1
- **Mã nguồn**: `/var/www/vietjet` (clone từ
  `https://github.com/jacksaybin68/Vietjet.git`, app ở `vietjetsim-main/`)
- **Process manager**: pm2, app tên `vietjet`, auto-start qua systemd
  (`pm2 save` + `pm2 startup` đã chạy)
- **Cấu hình pm2**: `/var/www/vietjet/ecosystem.config.js`
- **`.env.local`**: `NEXT_PUBLIC_SITE_URL=https://vietjet.shop`
  (biến `NEXT_PUBLIC_*` được embed lúc build — sửa xong phải `npm run build`
  lại rồi `pm2 restart vietjet`)

### Deploy lại sau khi push code

```bash
ssh root@156.67.214.184
cd /var/www/vietjet && git pull
cd vietjetsim-main && npm ci && npm run build
pm2 restart vietjet
```

### Tài khoản admin (DB production)

- `Admin` / `admin@vietjetair.vn` — quản trị (`role: admin`)
- `Booking@vietjet.shop` — mailbox Hostinger, dùng cho SMTP gửi mail
  (xem `.env.local` trên VPS, KHÔNG commit vào repo)

### Seed chuyến bay tương lai (cron tự động)

- Cron root VPS: `0 3 * * 0` (Chủ nhật 03:00) chạy idempotent
  `scripts/seed-future-flights.cjs`, log `/var/log/vietjet-seed.log`
- Credentials trong `/root/.vietjet-seed.env` (chmod 600, KHÔNG trong repo)
- Script giữ 21 ngày (khối VJ3001+); tuyến migration đã phủ thì bỏ qua
- Chạy tay khi cần:

```bash
cd /var/www/vietjet/vietjetsim-main
set -a; . /root/.vietjet-seed.env; set +a; SITE_URL=http://127.0.0.1:4028 \
  node scripts/seed-future-flights.cjs
```

### Mail gửi (SMTP Hostinger)

- Env trên VPS: `SMTP_HOST=smtp.hostinger.com`, port 465, user
  `Booking@vietjet.shop`, `MAIL_FROM="Vietjet Air <Booking@vietjet.shop>"`
- Test: `node scripts/test-mail.cjs [to@domain]`
- Email xác nhận PNR gửi tự động sau thanh toán (`src/lib/mail.ts`,
  fail-soft — lỗi SMTP không chặn response)

### Đổi tên miền chính sau này

```bash
# 1. Đổi SITE_URL rồi build lại (biến NEXT_PUBLIC_* embed lúc build)
sed -i 's|NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=https://ten-moi.com|' \
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
