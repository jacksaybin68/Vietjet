# Asset Registry — Giao diện đối chiếu vietjetair.com

**Ngày lập:** 18/10/2026
**Cập nhật:** 19/10/2026 (bản đối soát thực tế) — đối chiếu `find public -type f` với tham chiếu thật trong `src/`/`scripts/`, xoá **62 file orphan**, gỡ **5 hotlink S3** khỏi `PromotionalBannersSection`, thay **17 tham chiếu asset rủi ro** bằng asset nội bộ.
**Mục đích:** Đăng ký mọi tài sản media (ảnh, icon, font) dùng trong giao diện công khai của `vietjetsim-main`, kèm chủ sở hữu / giấy phép, route sử dụng, kích thước và trạng thái.
**Phương pháp:** quét mọi đường dẫn `/...` trong `src/` + `scripts/`, đối chiếu sự tồn tại của file; quét ngược mọi file trong `public/` để tìm orphan.

## Tổng quan

| Chỉ số | Trước dọn (18/10) | Sau đối soát 19/10 |
| --- | --- | --- |
| Tổng file trong `public/` | 56 | **41** (đều có tham chiếu thật) |
| File **không còn tham chiếu** (orphan) | 24 | **0** (62 file đã xoá đợt 19/10) |
| File **trùng lặp byte-for-byte** | 1 cặp | **0** |
| **Hotlink** tới CDN/CMS bên ngoài trong `src/` | 5 URL S3 `vj-prod-website-cms` | **0** |
| Tham chiếu class trỏ tới file đã xoá | — | **0** (đã re-point sang asset nội bộ) |

> **Trạng thái cổng Phase -1:** 🟢 **ĐÚNG VỚI THỰC TẾ** — 41/41 file trong `public/` được tham chiếu từ code và có nguồn gốc nội bộ/AI-tự-sinh; 0 orphan, 0 hotlink, 0 file rủi ro thương hiệu còn được sử dụng.
>
> ⚠️ **Ghi chú tính trung thực:** bản registry trước đây (19/10, đã staged) tuyên bố "27/27 file, xóa sạch file cũ" trong khi working tree thực tế còn 103 file, trong đó 7 file rủi ro vẫn được tham chiếu ở 7 chỗ và 5 URL hotlink S3 còn sống trong `PromotionalBannersSection`. Bản này là kết quả sau khi hoàn tất nốt phần việc đó.

---

## A. Danh mục Asset Hiện Tại Trong `public/` (41 file — đều đang được tham chiếu)

### A1. Branding & Logo Nội Bộ (4 file)
| Tên file | Đường dẫn | Mục đích | Route sử dụng | Nguồn gốc | Kích thước | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| `logo-internal.svg` | `public/logo-internal.svg` | Wordmark vector nội bộ | Toàn site (Header, Footer, Auth, Payment) | Thiết kế nội bộ simulation | 5,3 KB | 🟢 |
| `logo-internal.png` | `public/logo-internal.png` | Logo raster nội bộ | Metadata, OpenGraph, Email, Booking | AI generated + nội bộ | 109 KB | 🟢 |
| `vj-logo.svg` | `public/images/vj-logo.svg` | Logo mark Header 4 tầng (quick-rail) | `/trang-chu` (Header) | SVG nội bộ tự vẽ | 5,3 KB | 🟢 |
| `chat-avatar.jpg` | `public/assets/images/chat-avatar.jpg` | Avatar mascot trợ lý chat | Chat widget launcher | AI generated nội bộ | 118 KB | 🟢 |

### A2. Giao diện & Trạng thái (5 file)
| Tên file | Đường dẫn | Mục đích | Route sử dụng | Nguồn gốc | Kích thước | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| `favicon.ico` | `public/favicon.ico` | Favicon site | Toàn site | Nội bộ | 409 B | 🟢 |
| `sky-clouds.svg` | `public/sky-clouds.svg` | Vector nền bầu trời | `/lam-thu-tuc`, `/chuyen-bay-cua-toi` | SVG nội bộ | 3,9 KB | 🟢 |
| `empty-flight-search.svg` | `public/assets/empty-flight-search.svg` | Trạng thái rỗng tìm vé | `/tim-ve` | SVG nội bộ | 4,4 KB | 🟢 |
| `empty-refund-requests.svg` | `public/assets/empty-refund-requests.svg` | Trạng thái rỗng hoàn vé | `/tai-khoan`, `/quan-tri` | SVG nội bộ | 6,6 KB | 🟢 |
| `empty-upcoming-flights.svg` | `public/assets/empty-upcoming-flights.svg` | Trạng thái rỗng chuyến bay | `/tai-khoan` | SVG nội bộ | 8,8 KB | 🟢 |
| `no_image.png` | `public/assets/images/no_image.png` | Fallback hình ảnh | Toàn site | Nội bộ | 21 KB | 🟢 |

### A3. Hero trang chủ & Banner có chữ in sẵn (12 file)
| Tên file | Đường dẫn | Mục đích | Route sử dụng | Nguồn gốc | Kích thước | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| `banner-bay-khap-the-gioi.jpg` | `public/images/hero/` | Slide hero "Bay khắp thế giới" | `/trang-chu` (HeroSection) | AI generated nội bộ | 735 KB | 🟢 |
| `banner-jakarta-cgk-hero.jpg` | `public/images/hero/` | Slide hero thông báo nhà ga T3 CGK | `/trang-chu` (HeroSection) | AI generated nội bộ | 228 KB | 🟢 |
| `hero-tet-celebration.jpg` | `public/images/hero/` | Slide hero Vé Tết + promo "Vé Tết hời" | `/trang-chu` (Hero, Promo) | AI generated | 1,10 MB | 🟢 |
| `hero-vietjet-holiday.jpg` | `public/images/hero/` | Slide hero Starlink/holiday | `/trang-chu` (HeroSection) | AI generated | 888 KB | 🟢 |
| `hero-sale-aerial.jpg` | `public/images/hero/` | Slide hero Vé 0đ + thẻ giá vé + promo | `/trang-chu`, `/tai-khoan` | AI generated | 863 KB | 🟢 |
| `hero-skyboss-cabin.jpg` | `public/images/hero/` | Slide hero SkyBOSS + thẻ deal | `/trang-chu` | AI generated | 746 KB | 🟢 |
| `hero-airport-exchange.jpg` | `public/images/hero/` | Banner mua ngoại tệ + khung auth SkyJoy | `/chuyen-bay-cua-toi`, `/dang-nhap`, `/trang-chu` | AI generated | 804 KB | 🟢 |
| `hero-window-clouds.jpg` | `public/images/hero/` | Banner "Khuyến cáo di chuyển" + điểm đến + promo thế giới | `/trang-chu` | AI generated | 669 KB | 🟢 |
| `hero-artwork-beach-sunset.jpg` | `public/images/hero/` | Artwork deal SGN + promo đoàn + how-it-works | `/trang-chu` | AI generated | 860 KB | 🟢 |
| `hero-bali-terraces.jpg` | `public/images/hero/` | Điểm đến/travel guide Bali + promo | `/trang-chu` | AI generated | 1,02 MB | 🟢 |
| `hero-bangkok-temple.jpg` | `public/images/hero/` | Travel guide Bangkok | `/trang-chu` | AI generated | 901 KB | 🟢 |
| `hero-singapore-bay.jpg` | `public/images/hero/` | Travel guide Singapore | `/trang-chu` | AI generated | 905 KB | 🟢 |
| `hero-hongkong-skyline.jpg` | `public/images/hero/` | Deal HAN + travel guide + promo DiDi | `/trang-chu` | AI generated | 901 KB | 🟢 |

### A4. Minh hoạ booking & mascot (3 file)
| Tên file | Đường dẫn | Mục đích | Route sử dụng | Nguồn gốc | Kích thước | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| `amy-mascot.png` | `public/images/hero/` | Mascot Amy cạnh form đặt vé + avatar chat | `/trang-chu`, chat widget | AI generated nội bộ | 519 KB | 🟢 |
| `vj-flight-attendant.png` | `public/images/hero/` | Tiếp viên minh hoạ banner chọn chỗ | Drawer chọn chỗ (booking) | AI generated nội bộ | 851 KB | 🟢 |
| `chuyen-bay-ribbon.svg` | `public/images/hero/` | Ruy băng trang chuyến bay của tôi | `/chuyen-bay-cua-toi` | SVG nội bộ | 1,9 KB | 🟢 |

### A5. Promo card điểm đến (6 file — thay bộ `promos/1..6` cũ)
| Tên file | Đường dẫn | Mục đích | Route sử dụng | Nguồn gốc | Kích thước | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| `promo-vietnam.jpg` | `public/images/promos/` | Promo "Vui lễ hội, bay cùng bạn bè" | `/trang-chu` (PromotionalBannersSection) | AI generated | 1,10 MB | 🟢 |
| `promo-bali.jpg` | `public/images/promos/` | Promo "Hè rực rỡ, bay cùng Vietjet" | `/trang-chu` | AI generated | 1,02 MB | 🟢 |
| `promo-bangkok.jpg` | `public/images/promos/` | Promo "Khám phá Á Đông" | `/trang-chu` | AI generated | 901 KB | 🟢 |
| `promo-hongkong.jpg` | `public/images/promos/` | Promo "Bay cùng Vietjet, trọn vẹn niềm vui" | `/trang-chu` | AI generated | 901 KB | 🟢 |
| `promo-seoul.jpg` | `public/images/promos/` | Promo "Bay xa hơn, tiết kiệm hơn" | `/trang-chu` | AI generated | 1,24 MB | 🟢 |
| `promo-singapore.jpg` | `public/images/promos/` | Promo "Ưu đãi chớp nhoáng" | `/trang-chu` | AI generated | 905 KB | 🟢 |

### A6. Icon dịch vụ nhanh Header — quick-rail (9 file)
| Tên file | Đường dẫn | Mục đích | Route sử dụng | Nguồn gốc | Kích thước | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| `dat-ve.png` | `public/images/subservices/` | Icon "Đặt vé" | Header quick-rail | PNG nội bộ tự vẽ | 707 B | 🟢 |
| `skyshop.png` | `public/images/subservices/` | Icon "SkyShop" | Header quick-rail | PNG nội bộ | 1,1 KB | 🟢 |
| `hotel.png` | `public/images/subservices/` | Icon "Khách sạn" | Header quick-rail | PNG nội bộ | 370 B | 🟢 |
| `evoucher.png` | `public/images/subservices/` | Icon "E-Voucher" | Header quick-rail | PNG nội bộ | 470 B | 🟢 |
| `esim.png` | `public/images/subservices/` | Icon "eSIM" | Header quick-rail | PNG nội bộ | 366 B | 🟢 |
| `evisa.png` | `public/images/subservices/` | Icon "E-Visa" | Header quick-rail | PNG nội bộ | 1,5 KB | 🟢 |
| `currency.png` | `public/images/subservices/` | Icon "Mua ngoại tệ" | Header quick-rail | PNG nội bộ | 626 B | 🟢 |
| `insurance.png` | `public/images/subservices/` | Icon "Bảo hiểm" | Header quick-rail | PNG nội bộ | 551 B | 🟢 |
| `skyjoy.png` | `public/images/subservices/` | Icon "SkyJoy" | Header quick-rail | PNG nội bộ | 3,8 KB | 🟢 |

---

## B. Danh sách Đã Xoá / Hết Vòng Đời

### B1. Đợt 1 (18/10): 24 file orphan (~5,4 MB)
Ảnh Vinpearl/Hòn Tằm, biến thể `download*` không còn tham chiếu.

### B2. Đợt 2 (18/10): 26 file chưa xác minh / vi phạm thương hiệu
3 file thương hiệu gốc (`logo-vj.svg`, `logo.png`, `app_logo.png`), 16 file hero cũ (`banner-1..4`, `download*`, `9-fare-website-2`, `eng-8-fare-website-1`, 2 file UUID-đổi-tên), 6 promo cũ (`1..6.webp/png`), 1 banner cũ (`sky_space.png`).

### B3. Đợt 3 (19/10 — đối soát thực tế): 62 file đã xoá khỏi working tree
Bản staged 19/10 tuyên bố xoá nhưng file vẫn còn trên disk và trong index; đợt này xoá thật:

- **UUID/CMS (7):** `261ceb09-*.jpg`, `549bc956-*.jpg`, `a4116607*-{,-1}.jpg`, `b3ead847-*.png`, `f3aa27c1*-{,-1}.jpg`, `eng12mybookingbanner690x600-*.jpg`
- **Vinpearl / Hòn Tằm (9):** 8 `vinpearl*.png` + `hontamnhatrang-*.png`
- **`download*` (18):** `download.{jpg,png,svg,webp}`, `download-1..7.*`, `download 2.{jpg,png,svg}`
- **Hero/promo cũ đã thay (14):** `banner-1-hongkong.jpg`, `banner-2-skyboss.jpg`, `banner-3-loc-vang.jpg`, `banner-4-44-sale.jpg`, `banner-quang-cao-ngoai-te.jpg`, `9-fare-website-2.webp`, `eng-8-fare-website-1.webp`, `promos/1..5.webp/png`, `promos/6.png`
- **Bản copy/khác (7):** `banners/hero-sale-aerial.jpg` (trùng byte với `images/hero/`), `banners/destinations.png`, `banners/services.png`, `banners/loc_vang.png`, `banners/sky_space.png`, `hero-seoul-palace.jpg`, `hero-vietjet-skyboss.jpg`, `vj-hero-plane.png`, `app_logo.{png,svg}`, `empty-popular-routes.svg`

### B4. Hotlink đã gỡ (5 URL)
`PromotionalBannersSection.tsx` từng tải trực tiếp 5 ảnh từ `vj-prod-website-cms.s3.ap-southeast-1.amazonaws.com` (vi phạm cổng "0 hotlink"). Toàn bộ đã thay bằng `promo-seoul/bali/bangkok/singapore/vietnam.jpg` nội bộ. Kiểm chứng: `grep -rn amazonaws src/` → 0 kết quả.

---

## C. Tham chiếu đã re-point (19/10)

| File | Từ (file cũ đã xoá) | Sang (asset nội bộ) |
| --- | --- | --- |
| `HeroSection.tsx` | `banner-3-loc-vang.jpg` | `hero-sale-aerial.jpg` |
| `HeroSection.tsx` | `banner-2-skyboss.jpg` | `hero-skyboss-cabin.jpg` |
| `LargePromoBanners.tsx` | `9-fare-website-2.webp` | `hero-window-clouds.jpg` |
| `LargePromoBanners.tsx` | `eng-8-fare-website-1.webp` | `hero-tet-celebration.jpg` |
| `LargePromoBanners.tsx` | `banner-quang-cao-ngoai-te.jpg` | `hero-airport-exchange.jpg` |
| `chuyen-bay-cua-toi/page.tsx` (×2) | `banner-quang-cao-ngoai-te.jpg` | `hero-airport-exchange.jpg` |
| `AuthShell.tsx` | `eng12mybookingbanner690x600-*.jpg` | `hero-airport-exchange.jpg` |
| `PromotionalBannersSection.tsx` (×5) | hotlink S3 | `promo-seoul/bali/bangkok/singapore/vietnam.jpg` |
| `PromotionalBannersSection.tsx` (×5) | `promos/1..5.webp/png` | `hero-artwork-beach-sunset / tet-celebration / hongkong-skyline / window-clouds / bali-terraces.jpg` |

## D. Quy trình duyệt asset mới

1. Thêm file vào `public/` **phải** kèm dòng đăng ký ở mục A (nguồn gốc + route dùng).
2. Chạy quét orphan trước khi commit: mọi file không có tham chiếu trong `src/`/`scripts/` phải xoá hoặc bổ sung tham chiếu.
3. Cấm mọi URL ảnh ngoài (hotlink) trong `src/` — chỉ `next/image` với `remotePatterns` đã khai báo, và chỉ cho nguồn đã duyệt.
4. Không dùng lại tên file kiểu CMS (`uuid.jpg`, `epoch-millis.png`, `download*`) — đặt tên theo vai trò (`hero-*`, `promo-*`, `subservices/*`).
