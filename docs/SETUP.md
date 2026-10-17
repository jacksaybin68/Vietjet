# 🚀 Hướng Dẫn Setup & Build - Vietjet Air

## 📋 Yêu Cầu

- Node.js v26.7.0 hoặc cao hơn
- npm v11.19.0 hoặc cao hơn
- PostgreSQL (Neon recommended)
- Kết nối internet để tải dependencies

---

## 🔧 Cài Đặt

### 1. Cài Dependencies
```bash
cd vietjetsim-main
npm install
```

### 2. Cấu Hình Environment
```bash
# Copy tệp mẫu
cp .env.local.example .env.local

# Chỉnh sửa .env.local với thông tin của bạn:
# - DATABASE_URL: Neon PostgreSQL connection string
# - JWT_SECRET: Random 32+ character string
# - JWT_REFRESH_SECRET: Random 32+ character string
# - NEXT_PUBLIC_SITE_URL: http://localhost:4028 (hoặc domain của bạn)
```

### 3. Thiết Lập Database
```bash
# Chạy migrations trong Neon SQL Editor hoặc psql
# Áp dụng MỌI tệp trong vietjetsim-main/migrations/ theo thứ tự tên tệp (000 → 034):
# Liệt kê đầy đủ bên dưới CHỈ để đối chiếu — để chạy, dùng lệnh này, nó tự
# lấy đúng thứ tự và không bao giờ bỏ sót file mới:
#
#   for f in $(ls vietjetsim-main/migrations/*.sql | sort); do
#     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f" || break
#   done
#
# Hoặc chạy `npm run test:migrations` trong vietjetsim-main trước: nó dựng
# Postgres trong Docker, áp cả bộ 4 lần và báo lỗi nếu file nào không chạy
# lại được. Cần cho tới khi đổi đổi tên file.
# - migrations/000_core_schema.sql
# - migrations/001_bank_accounts.sql
# - migrations/001_refresh_tokens.sql
# - migrations/002_user_wallet.sql
# - migrations/003_discount_system.sql
# - migrations/003_loyalty_program.sql
# - migrations/004_security_2fa_sessions.sql
# - migrations/005_enhanced_user_profiles.sql
# - migrations/006_wallet_account_numbers.sql
# - migrations/007_phone_registration_support.sql
# - migrations/008_notifications.sql
# - migrations/009_admin_tables.sql
# - migrations/010_chat.sql
# - migrations/011_checkin_system.sql
# - migrations/012_add_booking_code.sql
# - migrations/013_booking_code_default.sql
# - migrations/014_seed_demo_data.sql   ← seed sân bay, chuyến bay, tài khoản demo
# - migrations/015_agency_discounts.sql  ← bảng agencies (tab "Đại lý")
# - migrations/016_normalize_phone_and_cleanup.sql
# - migrations/017_missing_foreign_keys.sql
# - migrations/018_passenger_contact_and_consents.sql
# - migrations/019_role_permissions.sql
# - migrations/020_refund_ticket_workflow.sql
# - migrations/021_flight_status.sql
# - migrations/022_rename_demo_email_domain.sql
# - migrations/023_passenger_types.sql
# - migrations/024_more_airports_and_flights.sql
# - migrations/025_airport_codes_and_tuy_hoa.sql  ← sửa mã IATA sai, thêm Tuy Hòa
# - migrations/026_fix_seed_flight_times.sql    ← sửa giờ bay lệch 7 giờ do múi giờ UTC
# - migrations/027_seed_a_rolling_week.sql     ← mở rộng chuyến bay lên 7 ngày
# - migrations/028_international_airports.sql   ← thêm sân bay quốc tế
# - migrations/029_seat_and_ancillary_pricing.sql ← lưu giá ghế + bảng dịch vụ đã mua,
#   để server tự tính giá thay vì tin total_price từ client
# - migrations/030_flight_fare_classes.sql    ← giá riêng cho Economy/Business mỗi
#   chuyến bay; giao diện và API cùng đọc từ đây nên giá hiển thị khớp giá thu
# - migrations/031_unique_flight_numbers.sql      ← sửa số chuyến bị cắt còn 3 chữ số
#   (LPAD cắt chuỗi dài hơn độ dài yêu cầu, khiến nhiều tuyến trùng "VJ 100")
# - migrations/032_regional_to_regional_routes.sql ← thêm 32 tuyến vùng miền
#   (Đà Nẵng–Huế, Cần Thơ–Phú Quốc, Buôn Ma Thuột–Đà Lạt…). Trước đó 0/462 cặp
#   vùng miền có chuyến bay: 027 chỉ nối mỗi sân bay với HAN và SGN.
# - migrations/033_flight_update_logs.sql  ← lịch sử sửa chuyến bay: ảnh chụp
#   dòng trước khi sửa + diff từng trường, để hoàn tác và truy vết. db.ts đã
#   đọc/ghi bảng này từ lâu nhưng không migration nào tạo ra nó, nên mọi lần sửa
#   giá vé trong bảng quản trị trả 200 rồi âm thầm hỏng.
# - migrations/034_booking_code_six_alphanumeric.sql ← mã đặt chỗ 6 ký tự chữ+số

# Không có tệp "complete schema" gộp — phải chạy lần lượt như trên.
```

---

## 🏗️ Build

### Development Build
```bash
# Chạy dev server với hot reload
npm run dev
# Mở http://localhost:4028
```

### Production Build
```bash
# Build cho production
npm run build

# Chạy production server
npm run start
```

### Giữ lịch bay không bao giờ hết hạn

Migrations seed một cửa sổ ngày cố định. Khi cửa sổ đó qua, mọi tìm kiếm trả về
rỗng. Script sau mở lại cửa sổ **21 ngày** cho các tuyến hub và quốc tế:

```bash
cd vietjetsim-main

# Biến môi trường bắt buộc trên database thật — không có một địa chỉ admin duy nhất.
# Migration 022 LUÔN đưa tài khoản demo về @vietjetair.vn: nếu địa chỉ đích đã bị
# chiếm, nó xoá dòng seed cũ chứ không bỏ qua như trước. Tài khoản thật của bạn
# vẫn nằm ở địa chỉ riêng, mật khẩu đặt qua scripts/reset-admin.cjs.
SEED_ADMIN_EMAIL=admin@vietjetair.vn \
SEED_ADMIN_PASSWORD=admin123 \
npm run db:seed-flights

# Cửa sổ dài hơn nếu cần (mặc định 21 ngày)
SEED_FLIGHT_DAYS=30 SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... npm run db:seed-flights
```

Script an toàn khi chạy lại: nó xoá các chuyến do chính nó tạo trước, nên chạy
định kỳ không nhân bản dữ liệu. Nên bật cron hằng tuần — cửa sổ vẫn hết hạn nếu
không ai chạy lại:

```cron
# crontab -e — mở rộng lịch bay mỗi chủ nhật 03:00
0 3 * * 0 cd /duong/dan/vietjetsim-main && SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... npm run db:seed-flights >> /tmp/seed-flights.log 2>&1
```

**Nâng `SEED_FLIGHT_DAYS` phải kèm migration 032.** Tuyến vùng miền (Đà Nẵng–Huế,
Cần Thơ–Phú Quốc…) do migration `032` seed, mặc định phủ 30 ngày. Hai nửa mạng
phải hết hạn cùng lúc — lệch nhau thì khách tìm được một tuyến mà không tìm được
tuyến khác, cùng ngày, cùng bảng chọn sân bay. Khi quá hạn, chạy lại:

```bash
node scripts/apply-migration.cjs migrations/032_regional_to_regional_routes.sql
node scripts/apply-migration.cjs migrations/031_unique_flight_numbers.sql
```

Lệnh thứ hai dọn số bay trùng trong ngày — cần chạy sau mỗi lần seed lại, vì các
seed cũ để lại hàng chung số hiệu giữa hai khoang.

---

## 🧪 Kiểm Tra

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
npm run lint:fix
```

### Formatting
```bash
npm run format
```

### Database Connection
```bash
npm run db:check
```

---

## 📚 API Endpoints Mới

### 1. Lấy Thông Tin Thành Viên
```bash
curl -X GET http://localhost:4028/api/thanh-vien \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json"
```

**Response**:
```json
{
  "success": true,
  "membership": {
    "id": "...",
    "tier": "Gold",
    "currentPoints": 15000,
    "lifetimePoints": 500000,
    "enrolledAt": "2026-01-15T10:30:00Z"
  },
  "program": {...},
  "tiers": [...]
}
```

---

### 2. Lấy Lịch Sử Thanh Toán
```bash
curl -X GET "http://localhost:4028/api/thanh-toan/lich-su?page=1&limit=20" \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json"
```

**Response**:
```json
{
  "success": true,
  "payments": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

---

### 3. Đổi Điểm Thưởng
```bash
curl -X POST http://localhost:4028/api/thanh-vien/doi-diem \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "points": 5000,
    "description": "Mua vé máy bay"
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Đổi điểm thành công",
  "transaction": {...},
  "loyalty": {...}
}
```

---

## 🔑 Test Accounts (Development)

| Email | Password | Role |
|-------|----------|------|
| user@vietjetair.vn | user123 | User |
| `Admin` | `Deohieusao123@` | Admin |

> Đặt lại bằng `node scripts/reset-admin.cjs` (giữ nguyên `user_id` nên dữ liệu cũ không đứt liên kết).

> ⚠️ Chỉ sử dụng trong development. Thay đổi cho production.

---

## 🐛 Troubleshooting

### Lỗi: "Cannot find module 'next'"
**Giải pháp**: `npm install` để cài dependencies

### Lỗi: "DATABASE_URL not set"
**Giải pháp**: Thêm `DATABASE_URL` vào `.env.local` hoặc sử dụng mock database cho development

### Lỗi: "Invalid or expired token"
**Giải pháp**: Đăng nhập lại để lấy JWT token mới

### Lỗi: "Insufficient loyalty points"
**Giải pháp**: User không có đủ điểm thưởng để đổi. Cần tích lũy thêm.

---

## 📊 Project Structure

```
vietjetsim-main/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── thanh-vien/          ← Membership endpoints
│   │   │   ├── thanh-toan/          ← Payment endpoints
│   │   │   └── ...
│   │   ├── layout.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── db.ts                    ← Database functions
│   │   ├── auth.ts
│   │   ├── loyalty.ts
│   │   └── ...
│   ├── components/
│   ├── contexts/
│   ├── hooks/
│   └── types/
├── migrations/                       ← Database migrations
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── next.config.mjs
├── .env.local                       ← Environment config
└── .env.local.example
```

---

## 🚀 Deployment

### Vercel
```bash
# Đẩy lên GitHub
git push origin main

# Vercel sẽ tự động deploy khi push lên main
# Hoặc sử dụng vercel CLI:
npm i -g vercel
vercel
```

### Docker
```bash
# Tạo Dockerfile nếu cần
# Xây dựng image
docker build -t vietjetsim .

# Chạy container
docker run -p 4028:4028 -e DATABASE_URL=... vietjetsim
```

### Manual (Server)
```bash
# SSH vào server
ssh user@your-server.com

# Clone repo
git clone <repo-url>
cd vietjetsim-main

# Cài dependencies
npm install --production

# Build
npm run build

# Chạy server với process manager (PM2)
npm install -g pm2
pm2 start npm --name "vietjetsim" -- start
pm2 save
```

---

## 📝 Environment Variables - Chi Tiết

```env
# ============ Database ============
# Neon PostgreSQL connection string
# Format: postgresql://user:password@host/database
DATABASE_URL=postgresql://...

# ============ Authentication ============
# JWT secret (tối thiểu 32 ký tự, sử dụng: openssl rand -hex 32)
JWT_SECRET=your-random-64-char-hex-string-here

# JWT refresh secret (tối thiểu 32 ký tự)
JWT_REFRESH_SECRET=another-random-64-char-hex-string-here

# ============ Public/Client ============
# Site URL (sẽ sử dụng để generate links, redirects)
NEXT_PUBLIC_SITE_URL=http://localhost:4028

# Optional: OpenClaw AI API
NEXT_PUBLIC_OPENCLAW_API_URL=

# ============ Server-only ============
# OpenClaw API key (không share với client)
OPENCLAW_API_KEY=

# ============ Ollama (LLM local cho trợ lý OpenClaw) ============
# Trợ lý admin (/api/tro-ly-ai/tro-chuyen) tự chuyển sang Ollama khi có một
# trong các biến OLLAMA_* dưới đây; không đặt gì thì vẫn dùng gateway OpenClaw.
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:0.6b
# OPENCLAW_PROVIDER=ollama        # ép backend: 'ollama' | 'openclaw'
# OLLAMA_TIMEOUT_MS=60000
# OLLAMA_THINK=false              # tắt chế độ suy nghĩ của qwen3

# ============ Optional ============
# NODE_ENV=production (tự động set bởi Next.js)
```

---

## ✅ Checklist Trước Deploy

- [ ] Đã cài dependencies: `npm install`
- [ ] Đã cấu hình `.env.local`
- [ ] Đã setup database (migrations)
- [ ] Đã test dev server: `npm run dev`
- [ ] Đã chạy type-check: `npm run type-check`
- [ ] Đã chạy linting: `npm run lint`
- [ ] Đã build: `npm run build`
- [ ] Đã test production build: `npm run start`
- [ ] Đã kiểm tra logs
- [ ] Đã backup database

---

## 🆘 Support

- Tài liệu: Xem `README.md`
- Issues: GitHub Issues
- Docs: Xem `../app/HE_THONG_BAN_VE.md` và `../app/LUONG_XU_LY.md`

---

*Updated: 2026-09-02*
