# Asset Registry — Giao diện đối chiếu vietjetair.com

**Ngày lập:** 18/10/2026
**Cập nhật:** 18/10/2026 — kiểm kê đầy đủ 56/56 file (trước đây chỉ 5 dòng)
**Mục đích:** Đăng ký mọi tài sản media (ảnh, icon, font) dùng trong giao diện công khai của `vietjetsim-main`, kèm chủ sở hữu / giấy phép, route sử dụng, kích thước và trạng thái.
**Phương pháp:** `find public -type f` + `md5` + truy vết tham chiếu trong `src/`.

## Tổng quan

| Chỉ số | Giá trị |
| --- | --- |
| Tổng file trong `public/` | **56** |
| Tổng dung lượng | **14,29 MB** (14.981.808 byte) |
| Trong đó `public/images/hero/` | 8,87 MB (36 file) |
| Trong đó `public/assets/images/` | 3,78 MB (5 file) |
| Trong đó `public/images/promos/` | 1,60 MB (6 file) |
| File **nội bộ / xác minh được** | **7** |
| File **rủi ro thương hiệu, cần quyết định** | **3** (`logo-vj.svg`, `logo.png`, `app_logo.png`) |
| File **nguồn gốc chưa xác minh** (dấu hiệu CMS/CDN) | **46** |
| File **không còn tham chiếu** (orphan) | **24** (~5,4 MB) |
| File **trùng lặp byte-for-byte** | 1 cặp |

> **Kết luận điều tra:** Cổng duyệt Phase 0 trước đây được đánh dấu "đã cam kết không tải asset từ vietjetair.com", nhưng bằng chứng tên file cho thấy phần lớn `public/images/hero/` và `public/images/promos/` có dấu hiệu lấy từ CMS/CDN của hãng (hậu tố epoch-millis, UUID, tên campaign). **Cổng này đang FAIL và phải xử lý trước mọi thay đổi UI.**

## Quy tắc sử dụng asset

1. Mỗi file trong `public/` phải có dòng đăng ký trong bảng dưới **trước khi** dùng trong component.
2. Không hotlink trực tiếp `vietjetair.com` — hiện tại `src/` không có hotlink (đã kiểm tra `grep -rn vietjetair.com src`).
3. Không đặt tên file trùng asset của vietjetair.com. Các file có tên dạng `<slug>-<epoch-ms>.<ext>` hoặc UUID phải được **đổi tên** sang tên nội bộ khi được duyệt giữ.
4. Font: dùng `KoHo` + `Be Vietnam Pro`. **Lưu ý:** repo hiện tại vẫn nạp font qua `<link href="https://fonts.googleapis.com/...">` trong `src/app/layout.tsx`, *không* qua `next/font` như tài liệu cũ ghi. Xem mục "Font" bên dưới.

## A. Đã đăng ký — nhóm nội bộ & thương hiệu (10 file)

Nhóm nội bộ (7 file) an toàn: SVG tự tạo (có `aria-label` tiếng Việt), placeholder, favicon dạng hình khối đơn giản. Nhóm thương hiệu (3 file còn lại) cần quyết định vì có dấu hiệu là logo của hãng.

| Tên file | Đường dẫn | Mục đích | Route sử dụng | Chủ sở hữu / Giấy phép | Kích thước | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| `favicon.ico` | `public/favicon.ico` | Favicon site | Toàn site (`app/layout.tsx`) | Nội bộ (SVG đơn giản, tự tạo) | 409 B | ✅ Duyệt |
| `sky-clouds.svg` | `public/sky-clouds.svg` | Nền bầu trời | `/lam-thu-tuc`, `/chuyen-bay-cua-toi` | Nội bộ (có `aria-label` tiếng Việt) | 3,9 KB | ✅ Duyệt |
| `empty-flight-search.svg` | `public/assets/empty-flight-search.svg` | Empty state | `/tim-ve` | Nội bộ | 4,4 KB | ✅ Duyệt |
| `empty-popular-routes.svg` | `public/assets/empty-popular-routes.svg` | Empty state | — (orphan) | Nội bộ | 8,0 KB | ⚠️ Xoá hoặc đăng ký |
| `empty-refund-requests.svg` | `public/assets/empty-refund-requests.svg` | Empty state | `/tai-khoan`, `/quan-tri` | Nội bộ | 6,6 KB | ✅ Duyệt |
| `empty-upcoming-flights.svg` | `public/assets/empty-upcoming-flights.svg` | Empty state | `/tai-khoan` | Nội bộ | 8,8 KB | ✅ Duyệt |
| `no_image.png` | `public/assets/images/no_image.png` | Fallback `AppImage` | Toàn site | Nội bộ | 21 KB | ✅ Duyệt |
| *(cần xác nhận)* | `public/logo.png` | Logo PNG 230×40 dùng ở `AppLogo`, email | Toàn site, mail | **Chưa xác minh** | 901 B | ⚠️ Cần review |
| *(cần xác nhận)* | `public/assets/images/app_logo.png` | Logo 957×1068 trong chat widget | Toàn site (widget) | **Chưa xác minh** | 519 KB | ⚠️ Cần review |
| `logo-vj.svg` | `public/logo-vj.svg` | Wordmark header/footer | Toàn site | **Rủi ro thương hiệu** — path vẽ chữ "vietjet" | 5,3 KB | 🔴 Cần thay/duyệt |

## B. Tài sản nguồn gốc CHƯA xác minh (46 file)

Dấu hiệu nhận biết: tên file dạng `<slug>-<epoch-millis>` (ví dụ `vinpearlresortnhatrang-1769013852892.png`), UUID thuần (`261ceb09-de92-4981-b4f0-eb6c37ee5720.jpg`), tên campaign CMS (`eng12mybookingbanner690x600-1779349916540.jpg`, `eng-8-fare-website-1.webp`). Đây là mẫu đặt tên của CDN/CMS vietjetair.com.

### B1. `public/images/hero/` — 36 file, 8,87 MB

| Tên file | Kích thước | Mục đích | Route sử dụng | Trạng thái |
| --- | --- | --- | --- | --- |
| `banner-1-hongkong.jpg` | 886 KB | Banner ưu đãi | `/trang-chu` | 🔴 Chưa xác minh |
| `banner-2-skyboss.jpg` | 383 KB | Banner ưu đãi | `/trang-chu` | 🔴 Chưa xác minh |
| `banner-3-loc-vang.jpg` | 379 KB | Banner ưu đãi | `/trang-chu` | 🔴 Chưa xác minh |
| `banner-4-44-sale.jpg` | 311 KB | Banner ưu đãi | `/trang-chu` | 🔴 Chưa xác minh |
| `banner-quang-cao-ngoai-te.jpg` | 289 KB | Banner ngoại tệ | `/chuyen-bay-cua-toi`, auth | 🔴 Chưa xác minh |
| `download.jpg` | 470 KB | Ảnh điểm đến | `/trang-chu` (5 section) | 🔴 Chưa xác minh |
| `download-1.jpg` | 3,2 KB | Ảnh điểm đến | `/trang-chu` | 🔴 Chưa xác minh |
| `download-2.jpg` | 610 KB | Ảnh điểm đến | `/trang-chu` | 🔴 Chưa xác minh |
| `download-3.jpg` | 264 KB | Ảnh ưu đãi | `/trang-chu` | 🔴 Chưa xác minh |
| `download-4.jpg` | 137 KB | Ảnh ưu đãi | `/trang-chu` | 🔴 Chưa xác minh |
| `download-5.jpg` | 304 KB | Ảnh ưu đãi | `/trang-chu`, `/tai-khoan` | 🔴 Chưa xác minh |
| `download-6.jpg` | 375 KB | Ảnh ưu đãi | `/trang-chu`, `/tai-khoan` | 🔴 Chưa xác minh |
| `f3aa27c1-7cad-4a31-8086-58654aa494b5.jpg` | 888 KB | Hero artwork (banner chính) | `/trang-chu` | 🔴 Chưa xác minh |
| `261ceb09-de92-4981-b4f0-eb6c37ee5720.jpg` | 798 KB | Hero carousel slide | `/trang-chu` | 🔴 Chưa xác minh |
| `9-fare-website-2.webp` | 98 KB | Hero carousel slide | `/trang-chu` | 🔴 Chưa xác minh |
| `eng-8-fare-website-1.webp` | 96 KB | Hero carousel slide | `/trang-chu` | 🔴 Chưa xác minh |
| `a411660730569060103117000-1786518529015.jpg` | 190 KB | — (orphan) | — | 🔴 Xoá |
| `b3ead847-b9a8-40ba-9aa7-18e4d08b28ea.png` | 952 KB | — (orphan) | — | 🔴 Xoá |
| `download.png` | 519 KB | **Trùng `app_logo.png`** | — | 🔴 Xoá (dedupe) |
| `download 2.svg` | 5,3 KB | — (orphan, wordmark) | — | 🔴 Xoá |
| `download.svg` | 5,3 KB | — (orphan, wordmark) | — | 🔴 Xoá |
| `download-1.svg` | 2,6 KB | — (orphan, icon) | — | 🔴 Xoá |
| `download-2.svg` | 755 B | — (orphan) | — | 🔴 Xoá |
| `download-3.svg` | 4,0 KB | — (orphan) | — | 🔴 Xoá |
| `download-1.webp` | 39 KB | — (orphan) | — | 🔴 Xoá |
| `download-2.webp` | 158 KB | — (orphan) | — | 🔴 Xoá |
| `download-3.webp` | 19 KB | — (orphan) | — | 🔴 Xoá |
| `download.webp` | 13 KB | — (orphan) | — | 🔴 Xoá |
| `download-7.jpg` | 83 KB | — (orphan) | — | 🔴 Xoá |
| `eng12mybookingbanner690x600-1779349916540.jpg` | 339 KB | — (orphan) | — | 🔴 Xoá |
| `hontamnhatrang-1769503329631.png` | 117 KB | — (orphan) | — | 🔴 Xoá |
| `vinpearlbeachfrontnhatrang-1769013800533.png` | 106 KB | — (orphan) | — | 🔴 Xoá |
| `vinpearlempirenhatrang-1769013832340.png` | 105 KB | — (orphan) | — | 🔴 Xoá |
| `vinpearlnamhoian-1769013836079.png` | 121 KB | — (orphan) | — | 🔴 Xoá |
| `vinpearlresortnhatrang-1769013852892.png` | 113 KB | — (orphan) | — | 🔴 Xoá |
| `vinpearlresortspaphuquoc-1769013852898.png` | 115 KB | — (orphan) | — | 🔴 Xoá |

### B2. `public/images/promos/` — 6 file, 1,60 MB

| Tên file | Kích thước | Mục đích | Route sử dụng | Trạng thái |
| --- | --- | --- | --- | --- |
| `1.webp` | 110 KB | Banner promo | `/trang-chu` | 🔴 Chưa xác minh |
| `2.webp` | 193 KB | Banner promo | `/trang-chu` | 🔴 Chưa xác minh |
| `3.webp` | 180 KB | Banner promo | `/trang-chu` | 🔴 Chưa xác minh |
| `4.webp` | 183 KB | Banner promo | `/trang-chu` | 🔴 Chưa xác minh |
| `5.png` | 500 KB | Banner promo | `/trang-chu` | 🔴 Chưa xác minh |
| `6.png` | 514 KB | Banner promo | `/trang-chu` | 🔴 Chưa xác minh |

### B3. `public/assets/images/banners/` — 4 file, 3,42 MB

| Tên file | Kích thước | Mục đích | Route sử dụng | Trạng thái |
| --- | --- | --- | --- | --- |
| `sky_space.png` | 810 KB | Banner section | `/trang-chu` | 🔴 Chưa xác minh |
| `destinations.png` | 887 KB | — (orphan) | — | 🔴 Xoá |
| `loc_vang.png` | 946 KB | — (orphan) | — | 🔴 Xoá |
| `services.png` | 780 KB | — (orphan) | — | 🔴 Xoá |

## C. Font

| Font | Nguồn | Cách nạp THỰC TẾ trong repo | Sử dụng |
| --- | --- | --- | --- |
| `KoHo` | Google Fonts | `<link>` trong `src/app/layout.tsx` (KHÔNG phải `next/font`) | Giao diện, đoạn ngắn |
| `Be Vietnam Pro` | Google Fonts | `<link>` trong `src/app/layout.tsx` (KHÔNG phải `next/font`) | Heading, nội dung dài |

> **Mâu thuẫn cần sửa:** `src/styles/tailwind.css` dòng 1 ghi *"@import Google Fonts moved to next/font for zero render-blocking"* nhưng `src/app/layout.tsx` vẫn dùng thẻ `<link>` kèm `eslint-disable @next/next/no-page-custom-font`. Tài liệu này trước đây cũng ghi sai là `next/font`. Cần chọn một hướng (khuyến nghị: chuyển sang `next/font`) và cập nhật cả hai file.

## D. Việc cần làm (Phase -1)

- [x] Kiểm kê đủ 56/56 file trong `public/`.
- [x] Truy vết tham chiếu `src/` cho từng file → xác định 24 orphan.
- [x] Phát hiện 1 cặp trùng lặp byte (`app_logo.png` == `images/hero/download.png`).
- [ ] Quyết định cho 46 file nhóm B: **thay bằng asset có quyền** / **giữ kèm giấy phép** / **xoá**.
- [ ] Xoá 24 file orphan (giảm ~5,4 MB) hoặc đăng ký lý do giữ.
- [ ] Đổi tên các file được giữ sang quy ước nội bộ (bỏ epoch-millis / UUID).
- [ ] Xác nhận quyền dùng `logo-vj.svg`, `logo.png`, `app_logo.png` (rủi ro thương hiệu).
- [ ] Chốt hướng nạp font và đồng bộ `tailwind.css` + `layout.tsx`.

## E. Cổng duyệt Phase 0 (đo được)

| Cổng | Ngưỡng | Hiện tại | Đạt? |
| --- | --- | --- | --- |
| Mọi file `public/` có dòng đăng ký | 56/56 | 56/56 (đã đăng ký, nhưng 46 chưa xác minh quyền) | ⚠️ Một phần |
| Không asset nguồn gốc không rõ | 0 file | 46 file | ❌ |
| Không hotlink `vietjetair.com` trong `src/` | 0 | 0 | ✅ |
| Không file orphan | 0 | 24 | ❌ |
| Kích thước ảnh đã đo và ghi nhận | 56/56 | 56/56 | ✅ |
