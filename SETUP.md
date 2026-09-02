# 🚀 Hướng Dẫn Setup & Build - VietjetSim

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
# Chạy tất cả tệp trong thứ tự:
# - migrations/000_core_schema.sql
# - migrations/001_refresh_tokens.sql
# - migrations/001_bank_accounts.sql
# - migrations/002_user_wallet.sql
# - migrations/003_loyalty_program.sql
# - migrations/004_security_2fa_sessions.sql
# - migrations/005_enhanced_user_profiles.sql
# - migrations/006_wallet_account_numbers.sql
# - migrations/007_phone_registration_support.sql
# - migrations/008_notifications.sql
# - migrations/009_admin_tables.sql

# Hoặc chạy complete schema:
# - migrations/020260320000000_complete_schema.sql
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
| user@vietjetsim.vn | user123 | User |
| admin@vietjetsim.vn | admin123 | Admin |

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
- Docs: Xem `HE_THONG_BAN_VE.md` và `LUONG_XU_LY.md`

---

*Updated: 2026-09-02*
