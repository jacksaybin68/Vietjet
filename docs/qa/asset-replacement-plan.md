# Kế hoạch thay thế 22 Asset chưa xác minh

**Ngày lập kế hoạch:** 18/10/2026  
**Workstream:** Thay thế asset chưa có quyền sử dụng trước khi launch public beta  
**Nguồn dữ liệu:** `docs/qa/asset-audit-22.md`  
**Phạm vi:** 16 file trong `public/images/hero/` + 6 file trong `public/images/promos/`  

---

## Tóm tắt ưu tiên

| Mức độ ưu tiên | Số lượng file | Mô tả | Thời gian ước tính |
| --- | --- | --- | --- |
| **P0 (Critical)** | **6 file** | Được tham chiếu nhiều nhất (≥4 refs) hoặc là hero artwork chính | **12-18 giờ** |
| **P1 (Cao)** | **10 file** | Các file hero còn lại (download-1 đến download-6, banner ngoại tệ, carousel slides) | **15-20 giờ** |
| **P2 (Trung bình)** | **6 file** | Promo banners (số nguyên 1-6) | **8-12 giờ** |
| **Tổng cộng** | **22 file** | Toàn bộ asset chưa xác minh | **35-50 giờ** |

**Rủi ro nếu bỏ qua:** Tất cả 22 file đều có dấu hiệu từ nguồn ngoài (tên UUID, "download-*", tên campaign, tên số nguyên) → **rủi ro vi phạm bản quyền/trademark cao** nếu launch public beta mà chưa thay thế.

---

## Bảng kế hoạch thay thế chi tiết

### P0 — Critical (Thay trước tiên)

| # | Tên file | Đường dẫn | Kích thước | Nhóm tham chiếu | Số refs | Gợi ý thay thế | Thời gian ước tính |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `banner-4-44-sale.jpg` | `public/images/hero/banner-4-44-sale.jpg` | 311 KB | HotDeals (×2), TravelGuides, Destinations, HowItWorks, Deals | **6** | **Stock photo** Unsplash/Pexels: tropical beach hoặc airplane silhouette với gradient warm; **hoặc tự chụp** máy bay Vietjet trên runway (cần phối hợp marketing) | 2-3h |
| 2 | `download.jpg` | `public/images/hero/download.jpg` | 470 KB | HotDeals, TravelGuides, Destinations, HowItWorks, Deals | **5** | **Stock photo** Pexels: điểm đến châu Á phổ biến (Bangkok, Singapore, Seoul) với giấy phép thương mại CC0 | 2-3h |
| 3 | `banner-1-hongkong.jpg` | `public/images/hero/banner-1-hongkong.jpg` | 886 KB | HotDeals (×2), TravelGuides, Destinations | **4** | **Stock photo** Unsplash: Hong Kong skyline hoặc Victoria Harbour (tránh logo thương hiệu); **hoặc SVG** illustration điểm đến Hong Kong nội bộ | 2-3h |
| 4 | `banner-2-skyboss.jpg` | `public/images/hero/banner-2-skyboss.jpg` | 383 KB | HotDeals (×2), TravelGuides, Destinations | **4** | **Ảnh tự chụp** ghế SkyBoss (cần phối hợp với cabin crew); **hoặc stock photo** business class seat generic (không logo hãng khác) | 2-3h |
| 5 | `banner-3-loc-vang.jpg` | `public/images/hero/banner-3-loc-vang.jpg` | 379 KB | HotDeals (×2), TravelGuides, Destinations | **4** | **Stock photo** Pexels: celebration/Tết theme với vàng/đỏ (lanterns, fireworks); **hoặc SVG** illustration Tết nội bộ | 2-3h |
| 6 | `f3aa27c1-7cad-4a31-8086-58654aa494b5.jpg` | `public/images/hero/f3aa27c1-7cad-4a31-8086-58654aa494b5.jpg` | 888 KB | HeroSection (const `HERO_ARTWORK`) | **2** (critical position) | **Stock photo** Unsplash: beach sunset với airplane wing hoặc tropical destination hero shot (high quality, ≥1920px width); **ưu tiên cao nhất** vì là hero artwork chính | 2-3h |

**Tổng thời gian P0:** 12-18 giờ (bao gồm tìm kiếm, tải về, resize, test trên UI)

---

### P1 — Cao (Thay tiếp theo)

| # | Tên file | Đường dẫn | Kích thước | Nhóm tham chiếu | Số refs | Gợi ý thay thế | Thời gian ước tính |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 7 | `banner-quang-cao-ngoai-te.jpg` | `public/images/hero/banner-quang-cao-ngoai-te.jpg` | 289 KB | AuthShell, /chuyen-bay-cua-toi | **2** (auth-facing) | **Stock photo** Pexels: currency/travel money theme; **hoặc SVG** illustration ngoại tệ nội bộ (tránh logo ngân hàng) | 1.5-2h |
| 8 | `download-1.jpg` | `public/images/hero/download-1.jpg` | 3.2 KB | TravelGuides, Destinations | **2** | **Stock photo** Unsplash: điểm đến châu Á (thumbnail size); nén WebP | 1-1.5h |
| 9 | `download-2.jpg` | `public/images/hero/download-2.jpg` | 610 KB | TravelGuides, HowItWorks | **2** | **Stock photo** Pexels: điểm đến châu Á | 1-1.5h |
| 10 | `download-3.jpg` | `public/images/hero/download-3.jpg` | 264 KB | TravelGuides, Deals | **2** | **Stock photo** Unsplash: ưu đãi/travel deal theme | 1-1.5h |
| 11 | `download-4.jpg` | `public/images/hero/download-4.jpg` | 137 KB | HowItWorks, Deals | **2** | **Stock photo** Pexels: ưu đãi/travel deal theme | 1-1.5h |
| 12 | `download-5.jpg` | `public/images/hero/download-5.jpg` | 304 KB | HowItWorks, Deals, UserDashboard | **3** (dashboard-facing) | **Stock photo** Unsplash: ưu đãi hiển thị trong dashboard user (chọn ảnh professional hơn) | 1.5-2h |
| 13 | `download-6.jpg` | `public/images/hero/download-6.jpg` | 375 KB | HowItWorks, UserDashboard | **2** (dashboard-facing) | **Stock photo** Pexels: ưu đãi hiển thị trong dashboard user | 1.5-2h |
| 14 | `261ceb09-de92-4981-b4f0-eb6c37ee5720.jpg` | `public/images/hero/261ceb09-de92-4981-b4f0-eb6c37ee5720.jpg` | 798 KB | HeroSection (carousel slide) | **1** | **Stock photo** Unsplash: hero carousel slide (tropical beach hoặc airplane) | 1.5-2h |
| 15 | `9-fare-website-2.webp` | `public/images/hero/9-fare-website-2.webp` | 98 KB | HeroSection (carousel slide) | **1** | **SVG illustration** nội bộ: fare/pricing theme; **hoặc stock photo** nén WebP | 1.5-2h |
| 16 | `eng-8-fare-website-1.webp` | `public/images/hero/eng-8-fare-website-1.webp` | 96 KB | HeroSection (carousel slide) | **1** | **SVG illustration** nội bộ: fare/pricing theme (English version); **hoặc stock photo** nén WebP | 1.5-2h |

**Tổng thời gian P1:** 15-20 giờ

---

### P2 — Trung bình (Thay sau cùng)

| # | Tên file | Đường dẫn | Kích thước | Nhóm tham chiếu | Số refs | Gợi ý thay thế | Thời gian ước tính |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 17 | `1.webp` | `public/images/promos/1.webp` | 110 KB | PromotionalBanners, LargePromoBanners | **2** | **Stock photo** Unsplash: promo banner theme; nén WebP | 1-1.5h |
| 18 | `2.webp` | `public/images/promos/2.webp` | 193 KB | PromotionalBanners, LargePromoBanners | **2** | **Stock photo** Pexels: promo banner theme; nén WebP | 1-1.5h |
| 19 | `3.webp` | `public/images/promos/3.webp` | 180 KB | PromotionalBanners, LargePromoBanners | **2** | **Stock photo** Unsplash: promo banner theme; nén WebP | 1-1.5h |
| 20 | `4.webp` | `public/images/promos/4.webp` | 183 KB | PromotionalBanners, LargePromoBanners | **2** | **Stock photo** Pexels: promo banner theme; nén WebP | 1-1.5h |
| 21 | `5.png` | `public/images/promos/5.png` | 500 KB | PromotionalBanners, LargePromoBanners | **2** | **Stock photo** Unsplash: promo banner; **nén sang WebP** (giảm ~60-70% xuống ~150-200KB) | 1.5-2h |
| 22 | `6.png` | `public/images/promos/6.png` | 514 KB | PromotionalBanners, LargePromoBanners | **2** | **Stock photo** Pexels: promo banner; **nén sang WebP** (giảm ~60-70% xuống ~150-200KB) | 1.5-2h |

**Tổng thời gian P2:** 8-12 giờ

---

## Ghi chú rủi ro

### Rủi ro pháp lý nếu bỏ qua thay thế

1. **Vi phạm bản quyền ảnh:**
   - Tất cả 22 file có dấu hiệu từ nguồn ngoài chưa xác minh quyền.
   - Tên UUID (`f3aa27c1-...`, `261ceb09-...`) gợi ý từ CMS/CDN bên thứ ba (Contentful, Strapi, hoặc DAM).
   - Tên "download-*" (8 file) gợi ý tải từ nguồn không rõ ràng.
   - Tên campaign (`banner-*-hongkong`, `banner-*-skyboss`, `banner-*-loc-vang`, `banner-*-44-sale`) có thể từ marketing materials của vietjetair.com → nếu không có hợp đồng cấp phép, có thể vi phạm bản quyền.

2. **Vi phạm trademark:**
   - Nếu ảnh chứa logo thương hiệu bên thứ ba (khách sạn, điểm đến, đối tác) mà không có giấy phép → rủi ro cao.
   - `banner-2-skyboss.jpg` có thể chứa logo/branding SkyBoss → cần xác minh quyền sử dụng.

3. **Vi phạm quyền chân dung (model release):**
   - Nếu ảnh chứa hình ảnh con người nhận diện được mà không có model release → rủi ro trung bình.

4. **Vi phạm quyền tài sản (property release):**
   - Nếu ảnh chứa kiến trúc/địa danh có bản quyền (ví dụ: Eiffel Tower ban đêm, một số bảo tàng) mà không có property release → rủi ro thấp-trung bình.

### Rủi ro kỹ thuật

5. **Breaking changes khi thay thế:**
   - 6 file P0 được tham chiếu ở nhiều component (4-6 refs mỗi file) → cần test kỹ sau khi thay.
   - `f3aa27c1-...jpg` là const `HERO_ARTWORK` trong HeroSection → thay đổi có thể ảnh hưởng layout hero.

6. **Performance regression:**
   - Nếu chọn ảnh mới có kích thước lớn hơn (>1MB) mà không tối ưu → LCP tăng.
   - `5.png` (500KB) và `6.png` (514KB) cần nén sang WebP khi thay thế.

---

## Quy trình thay thế (từng file)

### Bước 1: Chuẩn bị asset mới

1. **Tìm nguồn ảnh có quyền sử dụng:**
   - **Stock photos miễn phí với giấy phép thương mại:**
     - [Unsplash](https://unsplash.com) — CC0 (Public Domain), free for commercial use
     - [Pexels](https://pexels.com) — Pexels License, free for commercial use
     - [Pixabay](https://pixabay.com) — Pixabay License, free for commercial use
   - **Stock photos trả phí (nếu cần quality cao hơn):**
     - Adobe Stock, Shutterstock, Getty Images
   - **Ảnh tự chụp:**
     - Thuê photographer chụp máy bay Vietjet, ghế SkyBoss, sân bay (cần phối hợp marketing/PR).
     - Đảm bảo có model release nếu chụp con người.
   - **SVG illustration nội bộ:**
     - Thuê designer vẽ SVG cho các banner campaign (Tết, ngoại tệ, fare/pricing).

2. **Kiểm tra giấy phép:**
   - Đọc kỹ license của stock photo (CC0, Pexels License, hoặc custom license).
   - Đảm bảo không có điều khoản cấm sử dụng thương mại hoặc yêu cầu attribution (nếu không muốn ghi credit).
   - Nếu ảnh chứa con người/kiến trúc nhận diện được, kiểm tra model release/property release.

3. **Tải về và tối ưu:**
   - Tải ảnh về với kích thước phù hợp:
     - Hero artwork (`f3aa27c1-...jpg`): ≥1920px width, tỉ lệ 16:9 hoặc 21:9
     - Banner ưu đãi: ≥1200px width, tỉ lệ 4:3 hoặc 16:9
     - Promo banners: ≥800px width, tỉ lệ 1:1 hoặc 4:3
   - Nén ảnh:
     - JPG: sử dụng [TinyJPG](https://tinyjpg.com) hoặc ImageOptim (giảm ~30-50% size)
     - PNG → WebP: sử dụng `cwebp` CLI hoặc [Squoosh](https://squoosh.app) (giảm ~60-70% size)
   - Đổi tên file theo quy ước nội bộ:
     - Từ: `f3aa27c1-7cad-4a31-8086-58654aa494b5.jpg`
     - Sang: `hero-artwork-beach-sunset.jpg` (mô tả nội dung, kebab-case)

### Bước 2: Cập nhật tham chiếu trong code

4. **Tìm tất cả tham chiếu:**
   - Từ báo cáo `docs/qa/asset-audit-22.md`, lấy danh sách component tham chiếu file cũ.
   - Ví dụ với `banner-4-44-sale.jpg`:
     ```
     HotDealsSection.tsx (2 refs)
     TravelGuidesSection.tsx
     AttractiveDestinationsSection.tsx
     HowItWorksSection.tsx
     DealsSection.tsx
     ```

5. **Thay thế path trong code:**
   - Mở từng file component, tìm `banner-4-44-sale.jpg`, thay bằng `hero-banner-sale-tropical.jpg` (tên mới).
   - Nếu sử dụng const (như `HERO_ARTWORK`), cập nhật const:
     ```ts
     // Trước:
     const HERO_ARTWORK = "/images/hero/f3aa27c1-7cad-4a31-8086-58654aa494b5.jpg";
     // Sau:
     const HERO_ARTWORK = "/images/hero/hero-artwork-beach-sunset.jpg";
     ```

6. **Copy file mới vào `public/`:**
   ```bash
   cp ~/Downloads/hero-artwork-beach-sunset.jpg public/images/hero/
   ```

7. **Xóa file cũ:**
   ```bash
   git rm public/images/hero/f3aa27c1-7cad-4a31-8086-58654aa494b5.jpg
   ```

### Bước 3: Kiểm tra và commit

8. **Test trên UI:**
   - Chạy dev server: `npm run dev`
   - Mở trang chứa component đã sửa (ví dụ: trang chủ cho HeroSection).
   - Kiểm tra:
     - Ảnh hiển thị đúng (không bị 404)
     - Layout không bị vỡ (aspect ratio đúng)
     - Performance không giảm (check LCP trong DevTools)

9. **Cập nhật asset registry:**
   - Mở `docs/design/asset-registry.md`.
   - Xóa dòng file cũ khỏi **Phần C** (asset chưa xác minh).
   - Thêm dòng file mới vào **Phần A** (asset nội bộ) hoặc **Phần B** (asset bên ngoài có quyền):
     ```markdown
     | hero-artwork-beach-sunset.jpg | public/images/hero/ | 650 KB | Hero artwork chính | Unsplash CC0 | [link](https://unsplash.com/photos/...) |
     ```

10. **Commit thay đổi:**
    ```bash
    git add public/images/hero/hero-artwork-beach-sunset.jpg
    git add src/components/home/HeroSection.tsx
    git add docs/design/asset-registry.md
    git commit -m "feat(assets): thay hero artwork bằng ảnh Unsplash CC0
    
    - Thay f3aa27c1-...jpg bằng hero-artwork-beach-sunset.jpg
    - Nguồn: Unsplash CC0 (link: https://unsplash.com/photos/...)
    - Giảm size từ 888KB xuống 650KB
    - Refs: #ISSUE_NUMBER"
    ```

### Bước 4: Lặp lại cho 21 file còn lại

11. **Theo thứ tự ưu tiên:**
    - P0 (6 file) → P1 (10 file) → P2 (6 file)
    - Sau mỗi batch (ví dụ: xong P0), tạo PR riêng để review dễ hơn.

---

## Checklist theo mức độ ưu tiên

### P0 — Critical (Deadline: tuần 1)

- [ ] `banner-4-44-sale.jpg` (6 refs) → stock photo tropical/airplane
- [ ] `download.jpg` (5 refs) → stock photo điểm đến châu Á
- [ ] `banner-1-hongkong.jpg` (4 refs) → stock photo Hong Kong skyline
- [ ] `banner-2-skyboss.jpg` (4 refs) → ảnh tự chụp ghế SkyBoss hoặc stock photo business class
- [ ] `banner-3-loc-vang.jpg` (4 refs) → stock photo Tết theme hoặc SVG illustration
- [ ] `f3aa27c1-...jpg` (hero artwork) → stock photo hero shot high quality
- [ ] Test toàn bộ trang chủ sau khi thay P0
- [ ] Tạo PR "feat(assets): thay 6 asset P0 bằng stock photos có quyền"

### P1 — Cao (Deadline: tuần 2)

- [ ] `banner-quang-cao-ngoai-te.jpg` → stock photo currency/travel money
- [ ] `download-1.jpg` → stock photo điểm đến (thumbnail)
- [ ] `download-2.jpg` → stock photo điểm đến
- [ ] `download-3.jpg` → stock photo ưu đãi
- [ ] `download-4.jpg` → stock photo ưu đãi
- [ ] `download-5.jpg` → stock photo ưu đãi (dashboard-facing)
- [ ] `download-6.jpg` → stock photo ưu đãi (dashboard-facing)
- [ ] `261ceb09-...jpg` → stock photo hero carousel
- [ ] `9-fare-website-2.webp` → SVG illustration hoặc stock photo nén WebP
- [ ] `eng-8-fare-website-1.webp` → SVG illustration hoặc stock photo nén WebP
- [ ] Test trang auth + dashboard user sau khi thay P1
- [ ] Tạo PR "feat(assets): thay 10 asset P1 bằng stock photos có quyền"

### P2 — Trung bình (Deadline: tuần 3)

- [ ] `1.webp` → stock photo promo banner
- [ ] `2.webp` → stock photo promo banner
- [ ] `3.webp` → stock photo promo banner
- [ ] `4.webp` → stock photo promo banner
- [ ] `5.png` → stock photo promo banner, nén WebP
- [ ] `6.png` → stock photo promo banner, nén WebP
- [ ] Test PromotionalBannersSection sau khi thay P2
- [ ] Tạo PR "feat(assets): thay 6 asset P2 bằng stock photos có quyền"

### Sau khi hoàn thành toàn bộ

- [ ] Chạy lighthouse audit để kiểm tra LCP không tăng
- [ ] Cập nhật `docs/design/asset-registry.md` — xóa **Phần C** (đã thay hết)
- [ ] Tạo quy trình kiểm duyệt asset mới (pre-commit hook hoặc CI check)
- [ ] Đóng issue tracking thay thế 22 asset

---

## Timeline ước tính

| Tuần | Công việc | Giờ | Owner |
| --- | --- | --- | --- |
| **Tuần 1** | Thay 6 file P0 + test + PR | 12-18h | Designer + Frontend Dev |
| **Tuần 2** | Thay 10 file P1 + test + PR | 15-20h | Designer + Frontend Dev |
| **Tuần 3** | Thay 6 file P2 + test + PR | 8-12h | Designer + Frontend Dev |
| **Tuần 4** | Final audit + CI setup | 4-6h | DevOps + QA |
| **Tổng** | **35-50 giờ** | **~1 tháng** (nếu làm part-time) |

**Ghi chú:** Nếu làm full-time (8h/ngày) → hoàn thành trong **1-1.5 tuần**.

---

## Gợi ý nguồn stock photos

### Unsplash (CC0, miễn phí thương mại)

- **Điểm đến châu Á:**
  - [Hong Kong](https://unsplash.com/s/photos/hong-kong)
  - [Bangkok](https://unsplash.com/s/photos/bangkok)
  - [Singapore](https://unsplash.com/s/photos/singapore)
  - [Seoul](https://unsplash.com/s/photos/seoul)
- **Máy bay/Du lịch:**
  - [Airplane](https://unsplash.com/s/photos/airplane)
  - [Airport](https://unsplash.com/s/photos/airport)
  - [Travel](https://unsplash.com/s/photos/travel)
- **Beach/Sunset (hero artwork):**
  - [Beach sunset](https://unsplash.com/s/photos/beach-sunset)
  - [Tropical beach](https://unsplash.com/s/photos/tropical-beach)

### Pexels (Pexels License, miễn phí thương mại)

- **Ưu đãi/Promo:**
  - [Sale](https://www.pexels.com/search/sale/)
  - [Discount](https://www.pexels.com/search/discount/)
  - [Shopping](https://www.pexels.com/search/shopping/)
- **Ngoại tệ:**
  - [Currency](https://www.pexels.com/search/currency/)
  - [Money](https://www.pexels.com/search/money/)
- **Tết/Celebration:**
  - [Lantern](https://www.pexels.com/search/lantern/)
  - [Fireworks](https://www.pexels.com/search/fireworks/)
  - [Chinese new year](https://www.pexels.com/search/chinese%20new%20year/)

### Pixabay (Pixabay License, miễn phí thương mại)

- Tương tự Unsplash/Pexels, nhưng thư viện nhỏ hơn.
- Ưu điểm: có thể tìm thấy ảnh unique hơn (ít bị trùng với competitor).

---

## Liên hệ

- **Legal/Compliance:** Xác định mức độ rủi ro pháp lý cụ thể trước khi launch public beta.
- **Marketing/PR:** Cung cấp ảnh tự chụp (máy bay Vietjet, ghế SkyBoss, sân bay) nếu có.
- **Design team:** Vẽ SVG illustration cho các banner campaign (Tết, ngoại tệ, fare/pricing) nếu muốn branding nhất quán hơn stock photos.

---

**Gợi ý tiếp theo:**

1. **Tạo issue tracking** trên GitHub/GitLab với checklist từ file này (label: `P0`, `P1`, `P2`, `assets`, `legal-risk`).
2. **Liên hệ legal/compliance** ngay để xác định deadline cứng (ví dụ: phải hoàn thành P0 trước ngày X nếu muốn launch beta).
3. **Phân công owner** cho từng mức ưu tiên (Designer tìm ảnh + Frontend Dev cập nhật code + QA test UI).
