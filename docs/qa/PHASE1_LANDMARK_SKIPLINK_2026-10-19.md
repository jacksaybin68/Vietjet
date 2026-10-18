# Phase 1 — Landmark & skip link: hồ sơ đo lường

**Ngày:** 19/10/2026
**Phạm vi:** Phase 1 mục 6 (accessibility) — skip link + `<main>` landmark, phần "cách A"
**Kế hoạch gốc:** `docs/plans/KE_HOACH_DOI_CHIEU_VIETJETAIR_2026-10-18.md`
**Repo:** `vietjetsim-main/`

## 1. Khiếm khuyết đo được trước khi sửa

Skip link đã tồn tại (`src/app/layout.tsx`, `href="#main-content"`), nhưng đích
`#main-content` là `<main>` do **layout** render, và layout bọc
`<PageTransition>{children}</PageTransition>` — mà mỗi trang tự render `<Header />` ở đầu
`children`. Ba hệ quả, cả ba đều đo được:

**(a) `<main>` lồng nhau.** HTML chỉ cho một `<main>` mỗi document. Đếm trong HTML thật
của `/trang-chu` (`curl | grep -o '<main'`): **3**.

| # | Thẻ | Nguồn |
|---|---|---|
| 1 | `<main id="main-content">` | layout |
| 2 | `<main class="min-h-screen bg-white …">` | `src/app/trang-chu/loading.tsx` |
| 3 | `<main class="min-h-screen bg-[var(--background)] …">` | `src/app/trang-chu/page.tsx` |

**(b) Skip link không bỏ qua được gì.** Vì `#main-content` nằm *trước* `<Header />` trong
DOM, Tab kế tiếp sau khi kích hoạt skip link rơi đúng vào announcement bar / logo — tức là
đúng thứ mà skip link sinh ra để bỏ qua.

**(c) Hai `<main>` lồng nhau nữa nằm ngoài `src/app/`.** Lần khảo sát đầu chỉ quét
`src/app/**` nên bỏ sót:

- `src/features/flights/components/FlightResultsStep.tsx` (`<main class="md:col-span-9 …">`)
  → lồng trong `<main>` của `/tim-ve`.
- `src/features/admin/components/AdminDashboardClient.tsx` (`<main class="flex-1 …">`)
  → lồng trong `<main>` của `/quan-tri`.

Với `/tim-ve`, một bộ đếm theo *thứ tự text* của thẻ vẫn báo "không lồng": nội dung đã
resolve được React stream trong `<div hidden id="S:1">` ở **cuối** tài liệu, còn `<main>`
cha đã đóng ở giữa. Chỉ khi lần theo đúng chỗ React gắn lại mảnh stream (`<!--$?-->` +
`<template id="B:1">` … `$RC`) mới thấy nó là con của `<main>` cha. Đếm theo text là đếm
sai thứ.

## 2. Quy ước chốt lại

Mỗi trang có **đúng một** `<main id="main-content">`, **sau** `<Header />` của chính nó,
và nó **không** chứa chrome lặp lại (header/footer). Layout không cung cấp landmark.
Bề mặt nào sở hữu `<main>` phụ thuộc chỗ **render** chrome, không phụ thuộc chỗ route:
header của `/quan-tri` do `AdminDashboardClient` render, nên `main#main-content` là panel
tab **bên trong** component đó, không phải wrapper ở `src/app/quan-tri/page.tsx`.

## 3. Đã đổi

| File | Việc |
|---|---|
| `src/app/layout.tsx` | `<main id="main-content">` → `<div>` (giữ skip link) |
| `trang-chu/page.tsx` | `<Header/>` + `<main>` + `<Footer/>` (main không còn bọc chrome) |
| `trang-chu/loading.tsx` | skeleton `<main>` → `<div>` (skeleton không phải landmark) |
| `dich-vu`, `tra-cuu`, `lam-thu-tuc`, `chuyen-bay-cua-toi`, `dat-ve/[id]` | thêm `id="main-content"` |
| `gioi-thieu`, `hoi-dap`, `lien-he` | wrapper nội dung `<div>` → `<main id="main-content">` |
| `thanh-toan`, `tai-khoan`, `tim-ve` | bọc phần nội dung trong `<main id="main-content">` |
| `quan-tri/page.tsx` + `AdminDashboardClient.tsx` | landmark dời vào panel tab, sau `<header>` của console |
| `AuthShell.tsx` | khung form → `<main id="main-content">` (phủ `/dang-nhap`, `/quen-mat-khau`, `/dat-lai-mat-khau`) |
| `editor/page.tsx` | ngoại lệ cuối cùng: root `<div>` → `<main id="main-content">` |
| `FlightResultsStep.tsx`, `AdminDashboardClient.tsx` | `<main>` nội bộ → `<div>` (hết lồng nhau) |

## 4. Bằng chứng sau khi sửa

Đếm trong HTML thật (`DIST_DIR=.next-uicheck npm run build && next start -p 4029`):

| Route | `<main>` | `id="main-content"` |
|---|---|---|
| `/trang-chu` | 1 | 1 |
| `/dich-vu`, `/tra-cuu`, `/gioi-thieu`, `/hoi-dap`, `/lien-he` | 1 | 1 |
| `/chuyen-bay-cua-toi`, `/quen-mat-khau`, `/tim-ve?from=…` | 1 | 1 |
| `/lam-thu-tuc`, `/dang-nhap`, `/dat-lai-mat-khau` | 0 | 0 |

Ba dòng cuối là **đúng**, không phải lỗi: các route đó đọc `useSearchParams` nên HTML thô
chỉ chứa fallback `Suspense` (`Đang tải…` hoặc `null`); landmark tới sau hydration. Đây là
lý do phép kiểm landmark phải nằm trong `ui-check` (đo DOM sống) chứ không phải `curl`.

Cổng `npm run test:ui` — 35 màn hình × 3 viewport:

- Lần chạy đầu với phép kiểm mới: **2/35 cờ** — `/quan-tri` desktop + tablet,
  `#main-content KHÔNG nằm sau <header>`. Đúng lỗi thật ở mục 1(b): `<main>` tầng trang bao
  cả header của console. Đã sửa ở mục 3.
- Lần chạy lại: **35/35 sạch**.

Các cổng khác:

- `npm run lint` — sạch, **26 s** (trước đó > 600 s vì eslint quét `.next-uicheck/`;
  đã thêm vào `ignores`).
- `npm run type-check` — sạch.
- `npm test` — **761/761**, 73 file. Trong đó `src/test/hero-banner.test.tsx` (do workstream
  song song viết) khẳng định 12+1 bề mặt render `<Header />` đều có `main#main-content`.

## 5. Giới hạn đã biết

- **Ba route trên** không có landmark trong khoảng trước hydration. Với `/dang-nhap` và
  `/dat-lai-mat-khau`, `fallback={null}` nghĩa là cả trang trống cho tới khi hydrate —
  vấn đề có trước thay đổi này, không phải do nó, nhưng trước đây `<main>` của layout che
  mất. Muốn hết hẳn thì phải đưa phần đọc `searchParams` lên server component, ngoài phạm
  vi Phase 1.
- **Bằng chứng hành vi của skip link** (Tab → Enter → Tab tiếp theo rơi vào nội dung) chưa
  được kiểm tự động; cả hai cổng chỉ khẳng định *cấu trúc* làm cho hành vi đó đúng:
  `#main-content` tồn tại, duy nhất, và nằm sau `<header>`.

## 6. Lệnh tái lập

```bash
cd vietjetsim-main
DIST_DIR=.next-uicheck npm run build
DIST_DIR=.next-uicheck npx next start -p 4029
UI_CHECK_BASE_URL=http://127.0.0.1:4029 node scripts/ui-check.cjs
git checkout -- next-env.d.ts tsconfig.json && rm -rf .next-uicheck
```
