# Bảng Quyết Định Asset — Phase -1

**Ngày lập:** 18/10/2026
**Mục đích:** biến 23 asset chưa xác minh + 3 asset thương hiệu thành **một lượt phê duyệt duy nhất**. Mỗi dòng trong đây cần một quyết định; sau khi chốt, `docs/design/asset-registry.md` được cập nhật và cổng Phase -1 xanh.
**Trạng thái:** chờ chủ dự án quyết định.

## Ba phương án cho mỗi asset

| Ký hiệu | Nghĩa | Hệ quả |
| --- | --- | --- |
| **T** | Thay bằng asset có quyền | An toàn nhất, cần nội dung/ảnh mới |
| **G** | Giữ, kèm giấy phép/văn bản cho phép | Phải có chứng từ; ghi vào registry |
| **X** | Xoá hẳn | Phải sửa component đang tham chiếu |

## 1. Nhóm "Hero artwork" — 4 file, 1,79 MB

Đây là phần nhìn đầu tiên của trang chủ. Nếu xoá mà không thay, hero mất hình.

| File | Kích thước | Dùng ở | Ảnh hưởng nếu xoá | Đề xuất |
| --- | --- | --- | --- | --- |
| `f3aa27c1-…-58654aa494b5.jpg` | 888 KB | `HeroSection` (artwork chính) | Hero trắng | **T** |
| `261ceb09-…-eb6c37ee5720.jpg` | 798 KB | `HeroSection` (slide) | Mất 1 slide carousel | **T** |
| `9-fare-website-2.webp` | 98 KB | `HeroSection` (slide) | Mất 1 slide | **T** |
| `eng-8-fare-website-1.webp` | 96 KB | `HeroSection` (slide) | Mất 1 slide | **T** |

**Phương án tạm không cần ảnh mới:** repo đã có token `gradient-hero` và `public/sky-clouds.svg`; hero có thể chạy bằng nền gradient + artwork SVG nội bộ trong lúc chờ ảnh.

## 2. Nhóm "Banner khuyến mãi" — 5 file, 2,14 MB

| File | Kích thước | Dùng ở | Ảnh hưởng nếu xoá | Đề xuất |
| --- | --- | --- | --- | --- |
| `banner-1-hongkong.jpg` | 886 KB | HotDeals, TravelGuides, AttractiveDestinations | 3 section mất ảnh | **T** |
| `banner-2-skyboss.jpg` | 383 KB | HotDeals, TravelGuides, AttractiveDestinations | 3 section mất ảnh | **T** |
| `banner-3-loc-vang.jpg` | 379 KB | HotDeals, TravelGuides, AttractiveDestinations | 3 section mất ảnh | **T** |
| `banner-4-44-sale.jpg` | 311 KB | HotDeals, TravelGuides, AttractiveDestinations, HowItWorks, Deals | 5 section mất ảnh | **T** |
| `banner-quang-cao-ngoai-te.jpg` | 289 KB | `/chuyen-bay-cua-toi`, `AuthShell` (auth) | Banner ngoại tệ mất | **T** |

## 3. Nhóm "Ảnh section / điểm đến" — 7 file, 2,06 MB

| File | Kích thước | Dùng ở | Ảnh hưởng nếu xoá | Đề xuất |
| --- | --- | --- | --- | --- |
| `download.jpg` | 470 KB | 5 section trang chủ | 5 section mất ảnh | **T** |
| `download-2.jpg` | 610 KB | TravelGuides, HowItWorks | 2 section mất ảnh | **T** |
| `download-3.jpg` | 264 KB | TravelGuides, Deals | 2 section mất ảnh | **T** |
| `download-4.jpg` | 137 KB | HowItWorks, Deals | 2 section mất ảnh | **T** |
| `download-5.jpg` | 304 KB | HowItWorks, Deals, `/tai-khoan` | 3 nơi mất ảnh | **T** |
| `download-6.jpg` | 375 KB | HowItWorks, `/tai-khoan` | 2 nơi mất ảnh | **T** |
| `download-1.jpg` | 3 KB | TravelGuides, AttractiveDestinations | 2 section mất ảnh | **T** |

> Đây là ảnh du lịch/điểm đến chung — thay bằng ảnh stock có giấy phép là phương án rẻ và nhanh nhất.

## 4. Nhóm "Promo" — 6 file, 1,60 MB

| File | Kích thước | Dùng ở | Ảnh hưởng nếu xoá | Đề xuất |
| --- | --- | --- | --- | --- |
| `promos/1.webp` | 110 KB | LargePromoBanners, PromotionalBannersSection | 2 section + PopularRoutes | **T** |
| `promos/2.webp` | 193 KB | LargePromoBanners, PromotionalBannersSection | 2 section promo mất ảnh | **T** |
| `promos/3.webp` | 180 KB | LargePromoBanners, PromotionalBannersSection | 2 section promo mất ảnh | **T** |
| `promos/4.webp` | 183 KB | LargePromoBanners, PromotionalBannersSection | 2 section promo mất ảnh | **T** |
| `promos/5.png` | 500 KB | LargePromoBanners, PromotionalBannersSection | 2 section promo mất ảnh | **T** |
| `promos/6.png` | 514 KB | LargePromoBanners, PromotionalBannersSection | 2 section promo mất ảnh | **T** |

> Lưu ý kiến trúc: `/trang-chu` mount **cả** `LargePromoBanners` **và** `PromotionalBannersSection` liền nhau (`page.tsx:25-26`), cả hai đều dùng 6 ảnh này. Cân nhắc gộp thành một section trước khi đầu tư ảnh mới.

## 5. Nhóm "Nền section" — 1 file, 810 KB

| File | Kích thước | Dùng ở | Ảnh hưởng nếu xoá | Đề xuất |
| --- | --- | --- | --- | --- |
| `assets/images/banners/sky_space.png` | 810 KB | PromotionalBannersSection | Mất nền section | **T** (SVG/gradient nội bộ) |

## 6. Nhóm "Thương hiệu" — 3 file

Đây là nhóm **rủi ro cao nhất và không phải câu hỏi bản quyền ảnh mà là nhãn hiệu**. Chỉ chủ dự án xác nhận được mối quan hệ với hãng.

| File | Kích thước | Dùng ở | Bằng chứng | Đề xuất |
| --- | --- | --- | --- | --- |
| `logo-vj.svg` | 5,3 KB | Header, Footer, AuthShell, PaymentClient, FlightResultsStep, PassengerInfoStep, FlightsTab, UserDashboardClient — **toàn site** | Path SVG vẽ chữ "vietjet"; `tailwind.config.js` ghi palette "lấy từ bundle vietjetair.com" | Cần xác nhận |
| `logo.png` | 901 B | `AppLogo`, `layout.tsx`, `lib/mail.ts` (email) | 230×40, cùng nội dung wordmark | Cần xác nhận |
| `assets/images/app_logo.png` | 519 KB | `UserChat` (widget toàn site) | 957×1068, nguồn chưa rõ | Cần xác nhận |

**Hai đường đi:**

- **Có uỷ quyền** (dự án mô phỏng được hãng cho phép, hoặc bạn là chủ thể có quyền): chọn **G**, kèm văn bản/email vào `docs/design/` và ghi chú nguồn trong registry.
- **Không có uỷ quyền**: chọn **T** — thay bằng wordmark riêng (ví dụ "VietjetSim"). Cần sửa cả `lib/mail.ts` (email) và `app/layout.tsx` (favicon/metadata) chứ không chỉ component.

## 7. Cổng duyệt sau khi chốt

| Hạng mục | Ngưỡng | Hiện tại |
| --- | --- | --- |
| Nhóm 1–5 (ảnh/banner/promo/nền) đã quyết | 21/21 | 0/21 |
| Nhóm 6 (thương hiệu) đã quyết | 3/3 | 0/3 |
| Asset nguồn gốc không rõ | 0 | 23 |
| Không còn asset dùng mà chưa đăng ký | 0 | 0 |
| Không hotlink `vietjetair.com` | 0 | 0 |

Khi cả 5 dòng trên xanh, Phase -1 hoàn tất và Phase 0 được mở.

## 8. Việc kèm theo khi chọn **T**

1. Đặt tên file mới theo quy ước nội bộ (không epoch-millis, không UUID).
2. Thêm dòng đăng ký vào `docs/design/asset-registry.md` (chủ sở hữu + giấy phép + kích thước).
3. Nén/đổi định dạng: các ảnh hiện tại 300–900 KB; mục tiêu `webp` < 150 KB cho ảnh section.
4. Chạy `npm run test:ui` (cần cổng 4028 trống) để xác nhận không vỡ layout và không còn `IMG SRC RỖNG`.
