# Báo cáo kiểm tra 22 Asset chưa xác minh

**Ngày kiểm tra:** 18/10/2026  
**Workstream:** Kiểm tra asset chưa xác minh từ `docs/design/asset-registry.md` phần C  
**Phạm vi:** 16 file trong `public/images/hero/` + 6 file trong `public/images/promos/`  
**Phương pháp:** `grep -r` tìm tham chiếu trong `src/`, `scripts/`, `*.json`, `*.mjs` + `git ls-files` kiểm tra tracking  

---

## Tóm tắt kết quả

| Chỉ số | Giá trị |
| --- | --- |
| Tổng số file kiểm tra | **22** |
| File được tham chiếu active trong code | **22** (100%) |
| File KHÔNG được tham chiếu | **0** |
| File được track bởi git | **22** (100%) |
| File KHÔNG được track bởi git | **0** |

**Kết luận:** Tất cả 22 file đều đang được sử dụng active trong giao diện và được track đầy đủ bởi git. Không có file orphan.

---

## Chi tiết từng file

### C1. `public/images/hero/` — 16 file

| # | Tên file | Đường dẫn | Kích thước | Được tham chiếu? | Vị trí tham chiếu | Track git? | Khuyến nghị |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `banner-1-hongkong.jpg` | `public/images/hero/banner-1-hongkong.jpg` | 886 KB | ✅ Có | `HotDealsSection.tsx` (2×)<br>`TravelGuidesSection.tsx`<br>`AttractiveDestinationsSection.tsx` | ✅ Có | **Thay bằng asset có quyền** — banner ưu đãi Hong Kong có thể vi phạm bản quyền nếu dùng ảnh marketing của bên thứ ba |
| 2 | `banner-2-skyboss.jpg` | `public/images/hero/banner-2-skyboss.jpg` | 383 KB | ✅ Có | `HotDealsSection.tsx` (2×)<br>`TravelGuidesSection.tsx`<br>`AttractiveDestinationsSection.tsx` | ✅ Có | **Thay bằng asset có quyền** — banner SkyBoss có thể chứa logo/ảnh không có quyền sử dụng |
| 3 | `banner-3-loc-vang.jpg` | `public/images/hero/banner-3-loc-vang.jpg` | 379 KB | ✅ Có | `HotDealsSection.tsx` (2×)<br>`TravelGuidesSection.tsx`<br>`AttractiveDestinationsSection.tsx` | ✅ Có | **Thay bằng asset có quyền** — banner Lộc Vàng (campaign) cần xác minh quyền sử dụng |
| 4 | `banner-4-44-sale.jpg` | `public/images/hero/banner-4-44-sale.jpg` | 311 KB | ✅ Có | `HotDealsSection.tsx` (2×)<br>`TravelGuidesSection.tsx`<br>`AttractiveDestinationsSection.tsx`<br>`HowItWorksSection.tsx`<br>`DealsSection.tsx` | ✅ Có | **Thay bằng asset có quyền** — banner sale 44% (campaign số) cần xác minh quyền |
| 5 | `banner-quang-cao-ngoai-te.jpg` | `public/images/hero/banner-quang-cao-ngoai-te.jpg` | 289 KB | ✅ Có | `app/chuyen-bay-cua-toi/page.tsx`<br>`features/auth/components/AuthShell.tsx` | ✅ Có | **Thay bằng asset có quyền** — banner ngoại tệ hiển thị trên trang auth, cần xác minh quyền sử dụng |
| 6 | `download.jpg` | `public/images/hero/download.jpg` | 470 KB | ✅ Có | `HotDealsSection.tsx`<br>`TravelGuidesSection.tsx`<br>`AttractiveDestinationsSection.tsx`<br>`HowItWorksSection.tsx`<br>`DealsSection.tsx` | ✅ Có | **Thay bằng asset có quyền** — ảnh điểm đến dùng ở 5 section, tên file "download" gợi ý từ nguồn ngoài |
| 7 | `download-1.jpg` | `public/images/hero/download-1.jpg` | 3,2 KB | ✅ Có | `TravelGuidesSection.tsx`<br>`AttractiveDestinationsSection.tsx` | ✅ Có | **Thay bằng asset có quyền** — ảnh điểm đến, kích thước nhỏ (3.2KB) có thể là thumbnail |
| 8 | `download-2.jpg` | `public/images/hero/download-2.jpg` | 610 KB | ✅ Có | `TravelGuidesSection.tsx`<br>`HowItWorksSection.tsx` | ✅ Có | **Thay bằng asset có quyền** — ảnh điểm đến |
| 9 | `download-3.jpg` | `public/images/hero/download-3.jpg` | 264 KB | ✅ Có | `TravelGuidesSection.tsx`<br>`DealsSection.tsx` | ✅ Có | **Thay bằng asset có quyền** — ảnh ưu đãi |
| 10 | `download-4.jpg` | `public/images/hero/download-4.jpg` | 137 KB | ✅ Có | `HowItWorksSection.tsx`<br>`DealsSection.tsx` | ✅ Có | **Thay bằng asset có quyền** — ảnh ưu đãi |
| 11 | `download-5.jpg` | `public/images/hero/download-5.jpg` | 304 KB | ✅ Có | `HowItWorksSection.tsx`<br>`DealsSection.tsx`<br>`tai-khoan/.../UserDashboardClient.tsx` | ✅ Có | **Thay bằng asset có quyền** — ảnh ưu đãi hiển thị cả trong dashboard user |
| 12 | `download-6.jpg` | `public/images/hero/download-6.jpg` | 375 KB | ✅ Có | `HowItWorksSection.tsx`<br>`tai-khoan/.../UserDashboardClient.tsx` | ✅ Có | **Thay bằng asset có quyền** — ảnh ưu đãi hiển thị trong dashboard user |
| 13 | `f3aa27c1-7cad-4a31-8086-58654aa494b5.jpg` | `public/images/hero/f3aa27c1-7cad-4a31-8086-58654aa494b5.jpg` | 888 KB | ✅ Có | `HeroSection.tsx` (2×, bao gồm const `HERO_ARTWORK`) | ✅ Có | **Thay bằng asset có quyền** — hero artwork chính, tên UUID gợi ý từ CMS/CDN bên ngoài |
| 14 | `261ceb09-de92-4981-b4f0-eb6c37ee5720.jpg` | `public/images/hero/261ceb09-de92-4981-b4f0-eb6c37ee5720.jpg` | 798 KB | ✅ Có | `HeroSection.tsx` (carousel slide) | ✅ Có | **Thay bằng asset có quyền** — hero carousel slide, tên UUID gợi ý từ nguồn ngoài |
| 15 | `9-fare-website-2.webp` | `public/images/hero/9-fare-website-2.webp` | 98 KB | ✅ Có | `HeroSection.tsx` (carousel slide) | ✅ Có | **Thay bằng asset có quyền** — slide giá vé, tên "fare-website" gợi ý từ website marketing |
| 16 | `eng-8-fare-website-1.webp` | `public/images/hero/eng-8-fare-website-1.webp` | 96 KB | ✅ Có | `HeroSection.tsx` (carousel slide) | ✅ Có | **Thay bằng asset có quyền** — slide giá vé tiếng Anh, tên gợi ý từ website marketing |

### C2. `public/images/promos/` — 6 file

| # | Tên file | Đường dẫn | Kích thước | Được tham chiếu? | Vị trí tham chiếu | Track git? | Khuyến nghị |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 17 | `1.webp` | `public/images/promos/1.webp` | 110 KB | ✅ Có | `PromotionalBannersSection.tsx`<br>`LargePromoBanners.tsx` | ✅ Có | **Thay bằng asset có quyền** — banner promo, tên số nguyên chung chung |
| 18 | `2.webp` | `public/images/promos/2.webp` | 193 KB | ✅ Có | `PromotionalBannersSection.tsx`<br>`LargePromoBanners.tsx` | ✅ Có | **Thay bằng asset có quyền** — banner promo |
| 19 | `3.webp` | `public/images/promos/3.webp` | 180 KB | ✅ Có | `PromotionalBannersSection.tsx`<br>`LargePromoBanners.tsx` | ✅ Có | **Thay bằng asset có quyền** — banner promo |
| 20 | `4.webp` | `public/images/promos/4.webp` | 183 KB | ✅ Có | `PromotionalBannersSection.tsx`<br>`LargePromoBanners.tsx` | ✅ Có | **Thay bằng asset có quyền** — banner promo |
| 21 | `5.png` | `public/images/promos/5.png` | 500 KB | ✅ Có | `PromotionalBannersSection.tsx`<br>`LargePromoBanners.tsx` | ✅ Có | **Thay bằng asset có quyền** — banner promo, PNG (không nén như WebP) |
| 22 | `6.png` | `public/images/promos/6.png` | 514 KB | ✅ Có | `PromotionalBannersSection.tsx`<br>`LargePromoBanners.tsx` | ✅ Có | **Thay bằng asset có quyền** — banner promo, PNG (không nén như WebP) |

### C3. `public/assets/images/banners/` — 1 file (bonus)

| # | Tên file | Đường dẫn | Kích thước | Được tham chiếu? | Vị trí tham chiếu | Track git? | Khuyến nghị |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 23 | `sky_space.png` | `public/assets/images/banners/sky_space.png` | 810 KB | ✅ Có | `PromotionalBannersSection.tsx` | ✅ Có | **Thay bằng asset có quyền** — banner section trang chủ, tên gợi ý cùng họ với các file đã xoá (`loc_vang.png`, `destinations.png`) |

---

## Phân tích rủi ro

### Mức độ sử dụng cao (critical)

Các file được tham chiếu ≥ 4 lần hoặc ở vị trí quan trọng:

1. **`banner-4-44-sale.jpg`** — 6 tham chiếu (HotDeals ×2, TravelGuides, Destinations, HowItWorks, Deals)
2. **`download.jpg`** — 5 tham chiếu (HotDeals, TravelGuides, Destinations, HowItWorks, Deals)
3. **`banner-1-hongkong.jpg`** — 4 tham chiếu (HotDeals ×2, TravelGuides, Destinations)
4. **`banner-2-skyboss.jpg`** — 4 tham chiếu (HotDeals ×2, TravelGuides, Destinations)
5. **`banner-3-loc-vang.jpg`** — 4 tham chiếu (HotDeals ×2, TravelGuides, Destinations)
6. **`f3aa27c1-7cad-4a31-8086-58654aa494b5.jpg`** — hero artwork chính (const `HERO_ARTWORK`)

### Dấu hiệu nguồn ngoài

- **Tên UUID:** `f3aa27c1-...`, `261ceb09-...` → gợi ý từ CMS/CDN (Contentful, Strapi, hoặc DAM)
- **Tên "download":** 8 file `download*.jpg` → gợi ý tải từ nguồn khác (web scraping?)
- **Tên campaign:** `banner-*-hongkong`, `banner-*-skyboss`, `banner-*-loc-vang`, `banner-*-44-sale` → có thể từ marketing materials vietjetair.com
- **Tên số nguyên:** `1.webp`, `2.webp`, ... `6.png` → bulk download hoặc placeholder

### File hiển thị trên trang auth/user-facing

- `banner-quang-cao-ngoai-te.jpg` — hiển thị trên `AuthShell.tsx` và `/chuyen-bay-cua-toi`
- `download-5.jpg`, `download-6.jpg` — hiển thị trong `UserDashboardClient.tsx`

---

## Khuyến nghị hành động

### Ngay lập tức (trước khi public beta)

1. **Không xoá bất kỳ file nào** — tất cả đều đang được sử dụng active.
2. **Thay thế toàn bộ 22 file** bằng asset có quyền sử dụng rõ ràng:
   - Stock photos (Unsplash, Pexels với giấy phép thương mại)
   - Ảnh tự chụp (thuê photographer)
   - Ảnh được cấp phép từ đối tác (có hợp đồng ghi rõ quyền sử dụng)
3. **Ưu tiên thay thế 6 file critical** (banner-4-44-sale, download, 4 banner ưu đãi) trước.
4. **Kiểm tra nội dung ảnh** — nếu chứa:
   - Logo thương hiệu bên thứ ba (khách sạn, điểm đến, đối tác) → cần giấy phép
   - Hình ảnh con người nhận diện được → cần model release
   - Kiến trúc/địa danh có bản quyền → cần property release

### Trung hạn (sau khi thay thế)

5. **Đổi tên file** theo quy tắc nội bộ:
   - Từ: `f3aa27c1-7cad-4a31-8086-58654aa494b5.jpg`
   - Sang: `hero-artwork-beach-sunset.jpg` (mô tả nội dung)
6. **Cập nhật `docs/design/asset-registry.md`** phần C → chuyển sang phần A (nội bộ) hoặc thêm cột "Giấy phép" với thông tin nguồn.
7. **Tạo quy trình kiểm duyệt asset mới** — không cho phép commit asset vào `public/` nếu chưa có dòng trong asset registry.

### Dài hạn (best practices)

8. **Tối ưu kích thước:**
   - `5.png` (500KB), `6.png` (514KB) → nén sang WebP (giảm ~60-70%)
   - `f3aa27c1-...jpg` (888KB), `261ceb09-...jpg` (798KB) → responsive images + WebP
9. **Sử dụng CDN** với image optimization (Cloudinary, Imgix, hoặc Next.js Image Optimization).
10. **Tạo placeholder blur** cho tất cả ảnh lớn (> 300KB) để cải thiện LCP.

---

## Ghi chú kỹ thuật

- **Phương pháp kiểm tra:** `grep -r '<tên-file>' vietjetsim-main/src/ vietjetsim-main/scripts/ ...`
- **Git tracking:** `git ls-files public/images/hero/*.jpg public/images/hero/*.webp public/images/promos/*`
- **Không tìm thấy:** path động (template string, biến env) — đã kiểm tra bằng cách đọc các file component chính.
- **False negative risk:** thấp — đã grep cả `src/`, `scripts/`, `package.json`, `next.config.mjs`.

---

## Kết luận

**Trạng thái:** Tất cả 22 file đều đang được sử dụng active (100%) và được track bởi git. **Không có file orphan.**

**Rủi ro pháp lý:** Cao — 22/22 file có dấu hiệu từ nguồn ngoài chưa xác minh quyền.

**Hành động tiếp theo:**
1. Liên hệ legal/compliance để xác định mức độ rủi ro cụ thể.
2. Chuẩn bị kế hoạch thay thế 22 asset trước khi launch public beta.
3. Cập nhật asset registry sau khi thay thế xong.

---

**Gợi ý tiếp theo:**

1. Chạy `scripts/ui-check.cjs` để kiểm tra các component sử dụng 22 asset này có fallback/placeholder hay không.
2. Tạo issue tracking cho việc thay thế 22 asset (ưu tiên 6 file critical trước).
3. Liên hệ team design/marketing để lấy danh sách nguồn stock photo được phê duyệt (Unsplash Pro, Adobe Stock, Getty Images).
