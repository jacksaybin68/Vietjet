# VietjetSim — Trạng Thái Tái Cấu Trúc

**Cập nhật:** 2026-09-06  
**Trạng thái:** Phase 1–6 hoàn tất ở mức cấu trúc, kiểm thử tự động, production build và HTTP smoke test

## Tổng Quan

| Phase | Nội dung                                    | Trạng thái  |
| ----- | ------------------------------------------- | ----------- |
| 1     | Tạo cấu trúc feature/shared                 | ✅ Hoàn tất |
| 2     | Tạo barrel exports                          | ✅ Hoàn tất |
| 3     | Shared infrastructure và path aliases       | ✅ Hoàn tất |
| 4     | Di chuyển component khỏi `src/components`   | ✅ Hoàn tất |
| 5     | Cập nhật import sang feature/shared aliases | ✅ Hoàn tất |
| 6     | Type-check, lint, test, build và smoke test | ✅ Hoàn tất |

## Phase 1–3: Hạ Tầng Kiến Trúc

Dự án đã được tổ chức theo kiến trúc feature-based:

```text
src/
├── app/                         # Next.js App Router và component riêng từng route
├── features/
│   ├── auth/
│   ├── bookings/
│   ├── chat/
│   ├── flights/
│   ├── loyalty/
│   └── payments/
├── shared/
│   ├── components/
│   │   ├── feedback/
│   │   ├── layouts/
│   │   ├── navigation/
│   │   └── ui/
│   ├── constants/
│   ├── hooks/
│   ├── services/
│   └── utils/
├── lib/
└── styles/
```

Các alias chính được cấu hình trong `vietjetsim-main/tsconfig.json`:

- `@/*`
- `@/features/*`
- `@/features/auth`
- `@/features/bookings`
- `@/features/flights`
- `@/features/loyalty`
- `@/features/payments`
- `@/shared/*`
- `@/shared/components`
- `@/shared/constants`
- `@/shared/hooks`
- `@/shared/services`
- `@/shared/utils`
- `@/lib/*`

Shared infrastructure hiện có:

- HTTP client dùng chung tại `src/shared/services/httpClient.ts`.
- Error handling, validator, date formatter và currency formatter tại `src/shared/utils/`.
- Global constants tại `src/shared/constants/`.
- Barrel exports ở từng feature và nhóm shared component.

## Phase 4: Di Chuyển Component

Cây `src/components` cũ đã được loại bỏ sau khi cập nhật toàn bộ consumer. Tổng cộng 20 component legacy đã được chuyển sang ownership mới.

### Auth

```text
src/components/auth/ProtectedRoute.tsx
  → src/features/auth/components/ProtectedRoute.tsx
src/components/auth/RoleBadge.tsx
  → src/features/auth/components/RoleBadge.tsx
```

### Chat

```text
src/components/chat/OpenClawAssistant.tsx
  → src/features/chat/components/OpenClawAssistant.tsx
src/components/chat/UserChat.tsx
  → src/features/chat/components/UserChat.tsx
```

### Booking

```text
src/components/ui/PriceBreakdown.tsx
  → src/features/bookings/components/PriceBreakdown.tsx
src/components/ui/SeatMap.tsx
  → src/features/bookings/components/SeatMap.tsx
```

### Shared feedback

```text
src/components/ErrorBoundary.tsx
  → src/shared/components/feedback/ErrorBoundary.tsx
src/components/ui/ConfirmationModal.tsx
  → src/shared/components/feedback/ConfirmationModal.tsx
src/components/ui/Toast.tsx
  → src/shared/components/feedback/Toast.tsx
```

### Shared layouts và navigation

```text
src/components/NavigationOptimizer.tsx
  → src/shared/components/layouts/NavigationOptimizer.tsx
src/components/PageTransition.tsx
  → src/shared/components/layouts/PageTransition.tsx
src/components/Header.tsx
  → src/shared/components/navigation/Header.tsx
src/components/Footer.tsx
  → src/shared/components/navigation/Footer.tsx
src/components/ui/BreadcrumbNav.tsx
  → src/shared/components/navigation/BreadcrumbNav.tsx
```

### Shared UI

```text
src/components/ui/AppIcon.tsx
  → src/shared/components/ui/AppIcon.tsx
src/components/ui/AppImage.tsx
  → src/shared/components/ui/AppImage.tsx
src/components/ui/AppLogo.tsx
  → src/shared/components/ui/AppLogo.tsx
src/components/ui/Pagination.tsx
  → src/shared/components/ui/Pagination.tsx
src/components/ui/SkeletonLoader.tsx
  → src/shared/components/ui/SkeletonLoader.tsx
src/components/ui/ThemeToggle.tsx
  → src/shared/components/ui/ThemeToggle.tsx
```

Component riêng từng route vẫn nằm trong `src/app/**/components`; chúng không bị di chuyển nếu không thực sự dùng chung.

## Phase 5: Cập Nhật Import

Kết quả rà soát cuối:

- Không còn import tới `@/components`.
- Không còn import tới cây `src/components` cũ.
- Thư mục `src/components` đã được xóa.
- 67 file TypeScript/TSX hiện dùng alias `@/features/*` hoặc `@/shared/*`.
- `src/features/` và `src/shared/` hiện có tổng cộng 72 file.
- Dynamic import của chat và các consumer liên quan đã chuyển sang feature mới.
- `git diff --check` không phát hiện whitespace error.

## Phase 6: Xác Minh

### ESLint

Lệnh kiểm tra:

```bash
ESLINT_USE_FLAT_CONFIG=false npx eslint src
```

Kết quả:

```text
0 errors
392 warnings
```

142 lỗi `prettier/prettier` đã được xử lý bằng cách chỉ định dạng đúng 6 file có lỗi:

- `src/app/chuyen-bay-cua-toi/page.tsx`
- `src/app/dang-nhap/page.tsx`
- `src/app/editor/page.tsx`
- `src/app/lam-thu-tuc/page.tsx`
- `src/app/trang-chu/components/HeroSection.tsx`
- `src/app/trang-chu/components/PromotionalBannersSection.tsx`

392 cảnh báo còn lại chủ yếu thuộc các nhóm `no-explicit-any`, unused variables, React hook dependencies và khuyến nghị tối ưu ảnh. Chúng không làm ESLint thất bại và chưa được thay đổi trong đợt dọn lỗi này.

Cấu hình hiện vẫn dùng `.eslintrc` theo chế độ tương thích legacy của ESLint 9. Việc chuyển sang `eslint.config.js` chưa nằm trong phạm vi tái cấu trúc này.

### TypeScript

Lệnh:

```bash
npm run type-check
```

Kết quả: **thành công, 0 type error**.

### Vitest

Lệnh:

```bash
npx vitest run --reporter=dot
```

Kết quả:

```text
Test Files  10 passed (10)
Tests       96 passed (96)
```

### Production build

Lệnh:

```bash
npm run build
```

Kết quả:

```text
Compiled successfully
Generating static pages: 66/66
Routes trong build output: 73
First Load JS shared by all: 103 kB
```

Production build hoàn tất mà không có lỗi compile hoặc type-check.

### Runtime smoke test

Ứng dụng được khởi động bằng:

```bash
npm run dev
```

Năm route chính được kiểm tra bằng HTTP GET, không gửi biểu mẫu và không thay đổi dữ liệu:

| Route         | HTTP | Kích thước response | Kết quả |
| ------------- | ---: | ------------------: | ------- |
| `/trang-chu`  |  200 |            396561 B | ✅ Pass |
| `/tim-ve`     |  200 |            178544 B | ✅ Pass |
| `/thanh-toan` |  200 |            160809 B | ✅ Pass |
| `/dang-nhap`  |  200 |             42887 B | ✅ Pass |
| `/quan-tri`   |  200 |             47421 B | ✅ Pass |

Không phát hiện `Error`, `TypeError`, `ReferenceError`, `Module not found` hoặc `Failed to compile` trong log dev server. Server đã được dừng và cổng 4028 đã được giải phóng sau khi kiểm tra.

Smoke test chỉ xác nhận route render thành công ở tầng HTTP. Các thao tác trình duyệt có trạng thái như đăng nhập thật, tìm chuyến bay với dữ liệu thật, tạo booking, thanh toán và thao tác quản trị không được thực hiện để tránh mutation dữ liệu.

## Tiêu Chí Hoàn Thành

- [x] Cấu trúc feature/shared đã được tạo.
- [x] Barrel exports và path aliases đã được cấu hình.
- [x] Component dùng chung đã được chuyển sang ownership mới.
- [x] Feature chat đã được bổ sung.
- [x] Cây `src/components` legacy đã được xóa.
- [x] Không còn import tới đường dẫn component cũ.
- [x] ESLint toàn `src` đạt 0 lỗi.
- [x] TypeScript đạt 0 lỗi.
- [x] 96/96 test đạt.
- [x] Production build thành công.
- [x] 5/5 route chính đạt HTTP smoke test.
- [x] Không phát hiện breaking change qua các kiểm tra tự động đã chạy.

## Technical Debt Còn Lại

Các mục dưới đây được ghi nhận nhưng không thuộc phạm vi Phase 4–6 đã hoàn tất:

1. 392 cảnh báo ESLint chưa được xử lý.
2. Cấu hình ESLint legacy cần được chuyển sang flat config trước ESLint 10.
3. QA tương tác đầy đủ trên trình duyệt với dữ liệu thật chưa được thực hiện.
4. Working tree còn nhiều thay đổi UI/API chưa commit; báo cáo này không khẳng định chúng đã sẵn sàng để phát hành độc lập.

## Kết Luận

Phase 4–6 đã hoàn tất ở mức migration kiến trúc, import cleanup, lint errors, type safety, automated tests, production build và HTTP runtime smoke test. Cấu trúc legacy không còn consumer và không phát hiện lỗi hồi quy qua các cổng xác minh đã chạy.
