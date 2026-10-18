# Asset Registry — Giao diện đối chiếu vietjetair.com

**Ngày lập:** 18/10/2026
**Cập nhật:** 18/10/2026 — kiểm kê đầy đủ 56/56 file, sau đó dọn 24 file orphan (còn 32 file)
**Mục đích:** Đăng ký mọi tài sản media (ảnh, icon, font) dùng trong giao diện công khai của `vietjetsim-main`, kèm chủ sở hữu / giấy phép, route sử dụng, kích thước và trạng thái.
**Phương pháp:** `find public -type f` + `md5` + truy vết tham chiếu trong `src/`, `scripts/`, `*.json`.

## Tổng quan

| Chỉ số | Trước dọn | Sau dọn |
| --- | --- | --- |
| Tổng file trong `public/` | 56 | **32** |
| Tổng dung lượng | 14,29 MB | **8,92 MB** (−5,37 MB) |
| File **không còn tham chiếu** (orphan) | 24 | **0** |
| File **trùng lặp byte-for-byte** | 1 cặp | 0 |
| File **nội bộ / đã xác minh** | 7 | **6** |
| File **rủi ro thương hiệu** | 3 | **3** |
| File **nguồn gốc chưa xác minh** | 46 | **23** |

> **Trạng thái cổng Phase -1:** dọn orphan ✅ · xác minh quyền asset ❌ (còn 23 file chưa xác minh) · 3 asset thương hiệu chờ quyết định ❌.
> **Khôi phục file đã xoá:** `git checkout <commit>^ -- <đường-dẫn-file>` (24 file vẫn còn trong lịch sử git).

## Quy tắc sử dụng asset

1. Mỗi file trong `public/` phải có dòng đăng ký trong bảng dưới **trước khi** dùng trong component.
2. Không hotlink trực tiếp `vietjetair.com` — đã kiểm tra `grep -rn vietjetair.com src`, hiện **0 hotlink**.
3. Đổi tên file có dạng `<slug>-<epoch-ms>.<ext>` hoặc UUID sang tên nội bộ khi được duyệt giữ.
4. Font: repo hiện nạp `KoHo` + `Be Vietnam Pro` qua `<link>` Google Fonts trong `src/app/layout.tsx`, **không** qua `next/font` (xem mục "Font").

## A. Nhóm nội bộ (6 file) — an toàn

SVG tự tạo (có `aria-label` tiếng Việt), placeholder, favicon dạng hình khối đơn giản.

| Tên file | Đường dẫn | Mục đích | Route sử dụng | Giấy phép | Kích thước | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| `favicon.ico` | `public/favicon.ico` | Favicon site | Toàn site | Nội bộ (SVG đơn giản) | 409 B | ✅ |
| `sky-clouds.svg` | `public/sky-clouds.svg` | Nền bầu trời | `/lam-thu-tuc`, `/chuyen-bay-cua-toi` | Nội bộ | 3,9 KB | ✅ |
| `empty-flight-search.svg` | `public/assets/empty-flight-search.svg` | Empty state | `/tim-ve` | Nội bộ | 4,4 KB | ✅ |
| `empty-refund-requests.svg` | `public/assets/empty-refund-requests.svg` | Empty state | `/tai-khoan`, `/quan-tri` | Nội bộ | 6,6 KB | ✅ |
| `empty-upcoming-flights.svg` | `public/assets/empty-upcoming-flights.svg` | Empty state | `/tai-khoan` | Nội bộ | 8,8 KB | ✅ |
| `no_image.png` | `public/assets/images/no_image.png` | Fallback `AppImage` | Toàn site | Nội bộ | 21 KB | ✅ |

## B. Rủi ro thương hiệu (3 file) — chờ quyết định

| Tên file | Đường dẫn | Mục đích | Route sử dụng | Vấn đề | Kích thước | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| `logo-vj.svg` | `public/logo-vj.svg` | Wordmark header/footer | Toàn site | Path vẽ chữ "vietjet"; palette ghi chú "lấy từ bundle vietjetair.com" | 5,3 KB | 🟡 Đã quyết định: Thay (T) |
| `logo.png` | `public/logo.png` | Logo PNG 230×40 | Toàn site, mail | Nguồn chưa xác minh | 901 B | 🟡 Đã quyết định: Thay (T) |
| `app_logo.png` | `public/assets/images/app_logo.png` | Logo 957×1068 trong chat widget | Toàn site (widget) | Nguồn chưa xác minh | 519 KB | 🟡 Đã quyết định: Thay (T) |

## B1. Đã quyết định thay (T) — chờ implement

| Tên file | Đường dẫn | Quyết định | Lý do | Ước tính thời gian | Trạng thái implement |
| --- | --- | --- | --- | --- | --- |
| `logo-vj.svg` | `public/logo-vj.svg` | T (Thay) | Rủi ro trademark cao nhất, comment "lấy từ vietjetair.com" | 2-3 ngày | Chờ team design |
| `logo.png` | `public/logo.png` | T (Thay) | Đồng bộ branding với logo-vj.svg | 1-2 ngày | Chờ team design |
| `app_logo.png` | `public/assets/images/app_logo.png` | T (Thay) | Chỉ dùng chat widget, dễ thay | 1 ngày | Chờ team design |


## C. Nguồn gốc chưa xác minh (22 file)

> **Ghi chú:** 3 asset thương hiệu (`logo-vj.svg`, `logo.png`, `app_logo.png`) đã được quyết định Thay (T) — xem phần B1. Các file còn lại trong phần C là 22 asset hero/promo chưa xác định.

Dấu hiệu: tên file dạng `<slug>-<epoch-millis>`, UUID, hoặc tên campaign CMS. Cần chọn **thay bằng asset có quyền** / **giữ kèm giấy phép** / **xoá** cho từng file.

### C1. `public/images/hero/` — 16 file, 6,00 MB

| Tên file | Kích thước | Mục đích | Route sử dụng | Trạng thái |
| --- | --- | --- | --- | --- |
| `banner-1-hongkong.jpg` | 886 KB | Banner ưu đãi | `/trang-chu` | 🔴 |
| `banner-2-skyboss.jpg` | 383 KB | Banner ưu đãi | `/trang-chu` | 🔴 |
| `banner-3-loc-vang.jpg` | 379 KB | Banner ưu đãi | `/trang-chu` | 🔴 |
| `banner-4-44-sale.jpg` | 311 KB | Banner ưu đãi | `/trang-chu` | 🔴 |
| `banner-quang-cao-ngoai-te.jpg` | 289 KB | Banner ngoại tệ | `/chuyen-bay-cua-toi`, auth | 🔴 |
| `download.jpg` | 470 KB | Ảnh điểm đến | `/trang-chu` (5 section) | 🔴 |
| `download-1.jpg` | 3,2 KB | Ảnh điểm đến | `/trang-chu` | 🔴 |
| `download-2.jpg` | 610 KB | Ảnh điểm đến | `/trang-chu` | 🔴 |
| `download-3.jpg` | 264 KB | Ảnh ưu đãi | `/trang-chu` | 🔴 |
| `download-4.jpg` | 137 KB | Ảnh ưu đãi | `/trang-chu` | 🔴 |
| `download-5.jpg` | 304 KB | Ảnh ưu đãi | `/trang-chu`, `/tai-khoan` | 🔴 |
| `download-6.jpg` | 375 KB | Ảnh ưu đãi | `/trang-chu`, `/tai-khoan` | 🔴 |
| `hero-vietjet-holiday.jpg` (đổi tên từ `f3aa27c1-…-58654aa494b5.jpg`, Phase -1 mục 5) | 888 KB | Hero artwork | `/trang-chu` | 🔴 |
| `hero-vietjet-skyboss.jpg` (đổi tên từ `261ceb09-…-eb6c37ee5720.jpg`, Phase -1 mục 5) | 798 KB | Hero carousel slide | `/trang-chu` | 🔴 |
| `9-fare-website-2.webp` | 98 KB | Hero carousel slide | `/trang-chu` | 🔴 |
| `eng-8-fare-website-1.webp` | 96 KB | Hero carousel slide | `/trang-chu` | 🔴 |

### C2. `public/images/promos/` — 6 file, 1,60 MB

| Tên file | Kích thước | Mục đích | Route sử dụng | Trạng thái |
| --- | --- | --- | --- | --- |
| `1.webp` | 110 KB | Banner promo | `/trang-chu` | 🔴 |
| `2.webp` | 193 KB | Banner promo | `/trang-chu` | 🔴 |
| `3.webp` | 180 KB | Banner promo | `/trang-chu` | 🔴 |
| `4.webp` | 183 KB | Banner promo | `/trang-chu` | 🔴 |
| `5.png` | 500 KB | Banner promo | `/trang-chu` | 🔴 |
| `6.png` | 514 KB | Banner promo | `/trang-chu` | 🔴 |

### C3. `public/assets/images/banners/` — 1 file, 810 KB

| Tên file | Kích thước | Mục đích | Route sử dụng | Trạng thái |
| --- | --- | --- | --- | --- |
| `sky_space.png` | 810 KB | Banner section | `/trang-chu` | 🔴 |

> `sky_space.png` cùng họ đặt tên với `loc_vang.png` / `destinations.png` / `services.png` (đã xoá ở nhóm D), nên xếp vào nhóm chưa xác minh thay vì nhóm nội bộ.

## D. Đã xoá (24 file orphan, ~5,37 MB)

Không có tham chiếu trong `src/`, `scripts/`, `*.json` và không có path động — đã xác minh trước khi xoá. Khôi phục: `git checkout <commit>^ -- <đường-dẫn>`.

| Nhóm | Số file | Ghi chú |
| --- | --- | --- |
| `public/assets/empty-popular-routes.svg` | 1 | Empty state không dùng |
| `public/assets/images/banners/` | 3 | `destinations.png`, `loc_vang.png`, `services.png` |
| `public/images/hero/` | 20 | Gồm 5 ảnh Vinpearl, `hontamnhatrang-*`, `eng12mybooking*`, `a411660730569060103117000-*`, `b3ead847-*`, các biến thể `download*.svg/webp/png`, `download-7.jpg` |
| Trùng lặp | 1 | `images/hero/download.png` == `assets/images/app_logo.png` (md5 `4bc18d5e…`) |

## E. Font

| Font | Nguồn | Cách nạp THỰC TẾ | Sử dụng |
| --- | --- | --- | --- |
| `KoHo` | Google Fonts | `<link>` trong `src/app/layout.tsx` | Giao diện, đoạn ngắn |
| `Be Vietnam Pro` | Google Fonts | `<link>` trong `src/app/layout.tsx` | Heading, nội dung dài |

> **Mâu thuẫn cần sửa:** `src/styles/tailwind.css` dòng 1 ghi *"@import Google Fonts moved to next/font for zero render-blocking"* nhưng `src/app/layout.tsx` vẫn dùng `<link>` kèm `eslint-disable @next/next/no-page-custom-font`. Cần chốt một hướng (khuyến nghị: chuyển sang `next/font`) và cập nhật cả hai file.

## F. Cổng duyệt Phase -1

| Cổng | Ngưỡng | Hiện tại | Đạt? |
| --- | --- | --- | --- |
| Mọi file `public/` có dòng đăng ký | 32/32 | 32/32 | ✅ |
| Không file orphan | 0 | 0 | ✅ |
| Không hotlink `vietjetair.com` trong `src/` | 0 | 0 | ✅ |
| Không file trùng lặp byte | 0 | 0 | ✅ |
| Không asset nguồn gốc không rõ | 0 | 23 | ❌ |
| Asset thương hiệu đã quyết định | 3/3 | 0/3 | ❌ |
| Kích thước ảnh đã đo và ghi nhận | 32/32 | 32/32 | ✅ |
