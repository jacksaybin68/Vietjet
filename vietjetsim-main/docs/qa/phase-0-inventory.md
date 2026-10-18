# Phase 0 Inventory – Vietjet Simulator

**Ngày tạo:** 2026-10-18  
**Mục đích:** Thu thập inventory toàn bộ route công khai, component dùng chung, và npm scripts để chuẩn bị Phase 1 (kiểm tra UI).

---

## 1. NPM Scripts

| Tên script | Lệnh |
|------------|------|
| `dev` | `next dev --turbo -p 4028` |
| `build` | `next build` |
| `start` | `next start -p 4028` |
| `lint` | `eslint .` |
| `lint:fix` | `eslint . --fix` |
| `lint:css-debt` | `node scripts/css-debt.cjs` |
| `format` | `prettier --write "src/**/*.{ts,tsx,css,md,json}"` |
| `serve` | `next start` |
| `type-check` | `tsc --noEmit` |
| `test` | `vitest run` |
| `test:watch` | `vitest` |
| `test:smoke` | `node scripts/smoke-test.cjs` |
| `test:ui` | `node scripts/ui-check.cjs` |
| `test:mail` | `node scripts/test-mail.cjs` |
| `test:migrations` | `node scripts/test-migrations.cjs` |
| `test:wallet-e2e` | `node scripts/wallet-e2e.cjs` |
| `clean` | `node -e "const fs=require('fs');['.next','tsconfig.tsbuildinfo'].forEach(p=>fs.rmSync(p,{recursive:true,force:true}));console.log('da xoa .next va tsconfig.tsbuildinfo')"` |
| `db:check` | `ts-node src/lib/dbCheck.ts` |
| `db:setup-admin` | `node scripts/setup-admin.cjs` |
| `db:reset-admin` | `node scripts/reset-admin.cjs` |
| `db:clean-test-bookings` | `node scripts/clean-test-bookings.cjs` |
| `db:seed-demo` | `node scripts/seed-demo-accounts.cjs` |
| `db:preview-flights` | `node scripts/preview-flight-schedule.cjs` |
| `db:seed-flights` | `node scripts/seed-future-flights.cjs` |
| `db:seed-schedule` | `node scripts/seed-schedule-until.cjs` |
| `db:bridge` | `node scripts/neon-http-bridge.cjs` |

---

## 2. Route Công Khai

| Route Path | File | Loại |
|------------|------|------|
| `/` | `src/app/page.tsx` | Public |
| `/trang-chu` | `src/app/trang-chu/page.tsx` | Public |
| `/tim-ve` | `src/app/tim-ve/page.tsx` | Public |
| `/lam-thu-tuc` | `src/app/lam-thu-tuc/page.tsx` | Public |
| `/chuyen-bay-cua-toi` | `src/app/chuyen-bay-cua-toi/page.tsx` | Public |
| `/hoi-dap` | `src/app/hoi-dap/page.tsx` | Public |
| `/tra-cuu` | `src/app/tra-cuu/page.tsx` | Public |
| `/thanh-toan` | `src/app/thanh-toan/page.tsx` | Public |
| `/lien-he` | `src/app/lien-he/page.tsx` | Public |
| `/lam-thu-tuc-truc-tuyen` | `src/app/lam-thu-tuc-truc-tuyen/page.tsx` | Public |
| `/hanh-ly` | `src/app/hanh-ly/page.tsx` | Public |
| `/gioi-thieu` | `src/app/gioi-thieu/page.tsx` | Public |
| `/dich-vu` | `src/app/dich-vu/page.tsx` | Public |
| `/dat-ve/[id]` | `src/app/dat-ve/[id]/page.tsx` | Public |
| `/dang-nhap` | `src/app/dang-nhap/page.tsx` | Auth |
| `/quen-mat-khau` | `src/app/quen-mat-khau/page.tsx` | Auth |
| `/dat-lai-mat-khau` | `src/app/dat-lai-mat-khau/page.tsx` | Auth |
| `/tai-khoan` | `src/app/tai-khoan/page.tsx` | User |
| `/quan-tri` | `src/app/quan-tri/page.tsx` | Admin |
| `/editor` | `src/app/editor/page.tsx` | CMS (nội bộ) |

**Tổng số route:** 21  
**Route công khai (public):** 15  
**Route auth/admin/CMS:** 6

---

## 3. Component Dùng Chung

### 3.1. UI Components (`src/shared/components/ui/`)

| Tên Component | File |
|---------------|------|
| `Section` | `Section.tsx` |
| `InputField` | `InputField.tsx` |
| `IconButton` | `IconButton.tsx` |
| `Card` | `Card.tsx` |
| `Button` | `Button.tsx` |
| `AppImage` | `AppImage.tsx` |
| `AppLogo` | `AppLogo.tsx` |
| `ThemeToggle` | `ThemeToggle.tsx` |
| `SkeletonLoader` | `SkeletonLoader.tsx` |
| `Pagination` | `Pagination.tsx` |
| `AppIcon` | `AppIcon.tsx` |

**Tổng số UI component:** 11

### 3.2. Navigation Components (`src/shared/components/navigation/`)

| Tên Component | File |
|---------------|------|
| `ActivityBar` | `ActivityBar.tsx` |
| `Header` | `Header.tsx` |
| `AnnouncementBar` | `AnnouncementBar.tsx` |
| `Footer` | `Footer.tsx` |
| `MobileBottomNav` | `MobileBottomNav.tsx` |
| `PageHero` | `PageHero.tsx` |
| `BreadcrumbNav` | `BreadcrumbNav.tsx` |

**Tổng số navigation component:** 7

---

## 4. Trạng Thái `npm run test:ui`

### Script: `scripts/ui-check.cjs`

**Mô tả:**  
- Script kiểm tra giao diện thật (UI gate) bằng Chrome headless qua Chrome DevTools Protocol (CDP)
- Chụp ảnh màn hình các route chính ở 3 viewport: desktop (1440×900), tablet (768×1024), mobile (390×844)
- Kiểm tra các lỗi UI: element chồng lấn, khoảng cách âm, phần tử nằm ngoài viewport

**Cấu hình:**
- **Port dev server:** 4028 (mặc định từ `UI_CHECK_BASE_URL` hoặc `http://localhost:4028`)
- **Viewports:**
  - Desktop: 1440×900 (mobile: false)
  - Tablet: 768×1024 (mobile: true)
  - Mobile: 390×844 (mobile: true)
- **Chrome path:** `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` (Mac)
- **CDP port:** 9333
- **Screenshots dir:** `/tmp/vietjet-ui-check/shots/` (mặc định)

**Yêu cầu để chạy:**
1. Dev server phải đang chạy trên cổng 4028 (`npm run dev`)
2. Chrome/Chromium phải được cài đặt tại đường dẫn mặc định hoặc đặt `CHROME_PATH`
3. Database phải có sẵn các tài khoản test:
   - Admin: `admin@vietjetair.vn` / `admin123`
   - User: `user@vietjetair.vn` / `user123`
4. Dữ liệu chuyến bay phải có sẵn cho ngày mai (script tự tính `TOMORROW`)

**Kết luận:** Script `test:ui` có thể chạy được nếu đáp ứng đủ các yêu cầu trên.

---

## Gợi ý tiếp theo:

1. **Chạy thử `npm run test:ui`** để xác nhận môi trường đã sẵn sàng (dev server + Chrome + DB seed)
2. **Seed dữ liệu test** bằng `npm run db:seed-demo` và `npm run db:seed-flights` nếu chưa có
3. **Lập kế hoạch Phase 1** với danh sách 15 route công khai cần kiểm tra UI ở 3 viewport
