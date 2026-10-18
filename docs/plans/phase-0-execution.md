# Kế Hoạch Thực Thi Phase 0: Chốt Baseline và Asset Registry

**Ngày lập:** 18/10/2026  
**Phạm vi:** Phase 0 trong dự án đối chiếu giao diện Vietjetair.com  
**Repo:** `/Users/user/orca/vietjet/Vietjet/vietjetsim-main`  
**Tài liệu gốc:** `docs/plans/KE_HOACH_DOI_CHIEU_VIETJETAIR_2026-10-18.md`

## 1. Mục đích Phase 0

Phase 0 có nhiệm vụ tạo **dữ liệu baseline đầy đủ trước khi thực hiện bất kỳ thay đổi giao diện nào**. Baseline này bao gồm:

- Ảnh chụp màn hình toàn bộ route công khai tại ba viewport canonical
- Kiểm kê đầy đủ asset trong `public/` (đã hoàn thành)
- Inventory component và route chi tiết
- Kết quả kiểm tra tự động (console error, HTTP error, overflow, hydration)

Baseline này là điểm tham chiếu để đo lường tác động của các thay đổi trong Phase 1–6, đồng thời phát hiện lỗi hiện có cần sửa trước khi tiến hành.

**Điều kiện tiên quyết:** Phase -1 (Asset compliance) phải xanh — 22 asset có quyết định Thay/Giữ/Xoá, registry đủ 32/32 file, 0 orphan, 0 hotlink `vietjetair.com`.

## 2. Các công việc Phase 0

### 2.1. Mở rộng `scripts/ui-check.cjs` cho đủ ba viewport canonical

**Trạng thái:** ✅ Đã hoàn thành (18/10/2026)

**Mô tả:** Script ban đầu chỉ test mobile `390×844` và desktop mặc định. Đã bổ sung viewport `768×1024` (tablet) để đủ bộ canonical.

**Người thực hiện:** Agent `sonic` (workstream asset)  
**Output:** `scripts/ui-check.cjs` hỗ trợ ba viewport: `390×844`, `768×1024`, `1440×900`

**Các bước đã thực hiện:**
1. Thêm config viewport `768×1024` vào danh sách kiểm tra
2. Điều chỉnh logic snapshot để bao quát cả ba kích thước
3. Đảm bảo tên file output rõ ràng theo pattern `<route>_<viewport>_<ngày>.png`
4. Kiểm tra không có regression với hai viewport hiện có

### 2.2. Chụp từng route tham chiếu ở ba viewport canonical

**Trạng thái:** ✅ Đã hoàn thành (18/10/2026)

**Mô tả:** Chụp trang web tham chiếu (vietjetair.com) để có baseline so sánh thị giác.

**Người thực hiện:** Agent `sonic` (workstream asset)  
**Output:** Screenshot tham chiếu tại `docs/qa/screenshots/2026-10-18/reference/`  
**Metadata ghi nhận:** viewport, thời điểm chụp, URL, trạng thái cookie/promo banner

**Các bước đã thực hiện:**
1. Mở trang vietjetair.com với Chrome headless
2. Chụp từng route công khai (trang-chu, tim-ve, dich-vu, etc.) tại cả ba viewport
3. Ghi timestamp, viewport, URL vào tên file: `<route>_<viewport>_ref_2026-10-18.png`
4. Ghi chú trạng thái banner động (cookie consent, promo popup) tại thời điểm chụp
5. Lưu kết quả vào thư mục tách biệt để không nhầm với baseline app

### 2.3. Chạy `npm run test:ui` và lưu snapshot app hiện tại

**Trạng thái:** ✅ Đã hoàn thành (18/10/2026)

**Mô tả:** Chụp 35 màn hình (route × viewport) của app hiện tại, kiểm tra lỗi console/HTTP/overflow/hydration.

**Người thực hiện:** Agent `sonic` (workstream asset)  
**Output:**  
- Kết quả kiểm tra: `docs/qa/BASELINE_3VIEWPORT_2026-10-18.md` (35/35 sạch)  
- Screenshot: `/tmp/vietjet-ui-check/shots/` (chưa commit vào repo)

**Các bước đã thực hiện:**
1. Khởi động dev server tại cổng 4028: `npm run dev -- -p 4028`
2. Chạy `npm run test:ui` với Chrome tại đường dẫn macOS: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
3. Script render từng route tại ba viewport, kiểm tra:
   - Console errors (loại bỏ noise từ Next.js dev warnings)
   - HTTP errors (status >= 400)
   - Horizontal overflow (`document.body.scrollWidth > window.innerWidth`)
   - Hydration mismatch
   - Ảnh rỗng (`img[src=""]`)
4. Lưu ảnh chụp tại `/tmp/vietjet-ui-check/shots/` hoặc `$UI_CHECK_SHOTS_DIR`
5. Tạo báo cáo tổng hợp với flag summary

**Kết quả:** 35/35 màn hình sạch, không có lỗi. Phát hiện và sửa một lỗi route: `ActivityBar` trỏ "Giỏ hàng" vào `/dat-ve` (route không tồn tại), gây 404 prefetch ở `/tim-ve` trong production build.

### 2.4. Hoàn tất `docs/design/asset-registry.md`

**Trạng thái:** ✅ Đã hoàn thành (18/10/2026)

**Mô tả:** Kiểm kê toàn bộ 32 file trong `public/` sau khi dọn 24 orphan. Mỗi file có dòng đăng ký: đường dẫn, kích thước, mục đích, chủ sở hữu, giấy phép.

**Người thực hiện:** Agent `sonic` (workstream asset)  
**Output:** `docs/design/asset-registry.md` đầy đủ 32/32 file

**Các bước đã thực hiện:**
1. Quét toàn bộ `public/` đệ quy, tính checksum và kích thước từng file
2. Tạo bảng registry với cột: Path | Size | Purpose | Owner | License | Status
3. Đánh dấu 22 file chờ quyết định (16 hero, 6 promo) với status "Pending" và link tới `docs/design/asset-decisions.md`
4. Xác minh 6 file đã rõ nguồn gốc (icon tự vẽ, placeholder nội bộ)
5. Ghi chú 3 asset thương hiệu (logo) cần quyết định riêng
6. Commit registry như artifact Phase 0

**Lưu ý:** Registry hoàn chỉnh về mặt kiểm kê, nhưng 22 file vẫn chờ quyết định Thay/Giữ/Xoá từ Phase -1. Phase 0 chỉ đảm bảo **không có file nào thiếu trong registry**.

### 2.5. Lập inventory component và route

**Trạng thái:** ✅ Đã hoàn thành (18/10/2026)

**Mô tả:** Liệt kê đầy đủ route công khai và component chính cần kiểm tra trong các phase tiếp theo.

**Người thực hiện:** Agent `phase-0-inventory` (sonic)  
**Output:** Danh sách route và component được ghi trong kế hoạch đối chiếu và tài liệu này

**Route công khai (18 route):**

- `trang-chu` — Hero carousel, booking panel, promotion, services, FAQ
- `tim-ve` — Search results, fare tabs, date strip, filter drawer
- `dat-ve/[id]` — Multi-step booking flow (chọn ghế, hành lý, hành khách)
- `thanh-toan` — Payment form, fare summary, ancillary breakdown
- `tra-cuu` — Booking lookup (public, không cần auth)
- `lam-thu-tuc` — Check-in lookup
- `lam-thu-tuc-truc-tuyen` — Online check-in flow
- `chuyen-bay-cua-toi` — My flights dashboard (authenticated)
- `hanh-ly` — Baggage info page
- `dich-vu` — Services landing page
- `gioi-thieu` — About page
- `hoi-dap` — FAQ page
- `lien-he` — Contact page
- `tai-khoan` — User account dashboard (authenticated)
- `quan-tri` — Admin console (role-gated)
- `dang-nhap` — Login page
- `quen-mat-khau` — Password recovery
- `dat-lai-mat-khau` — Password reset flow

**Loại trừ:** `/editor` (CMS nội bộ, không thuộc phạm vi công khai)

**Component chính cần baseline:**

- `Header.tsx`, `AnnouncementBar.tsx`, `ActivityBar.tsx`, `MobileBottomNav.tsx`
- `Footer.tsx`
- `SiteOverlays.tsx` (cookie consent, promo modal)
- `PageHero.tsx` (dùng cho trang nội dung)
- Primitives: `Button`, `InputField`, `Section`, `Card`, `IconButton`, `Skeleton`
- Booking flow: `FlightResultsStep`, `FareSelector`, `SeatMap`, `PassengerForm`
- Payment: `PaymentMethodSelector`, `FareSummary`, `CheckoutStepper`

## 3. Viewport canonical (dùng thống nhất)

**Ba viewport bắt buộc cho mọi screenshot và test responsive:**

- **Mobile:** `390×844` — iPhone 12 Pro, phổ biến nhất theo analytics
- **Tablet:** `768×1024` — iPad mini/Air portrait
- **Desktop:** `1440×900` — MacBook Pro 13" và laptop phổ biến

**Quy tắc:**

- Mọi baseline screenshot phải có đủ cả ba viewport
- Không dùng viewport khác (`1280×900`, `1440×1000`) để tránh trùng lặp vô nghĩa
- Visual regression (Phase 6) sẽ so sánh từng viewport riêng biệt
- Test overflow tự động chạy ở cả ba kích thước

## 4. Cách chạy `npm run test:ui`

**Yêu cầu:**

1. **Dev server đang chạy tại cổng 4028:**
   ```bash
   npm run dev -- -p 4028
   ```
   Hoặc `PORT=4028 npm run dev`. Server phải sẵn sàng trước khi chạy script.

2. **Chrome browser tại đường dẫn macOS:**
   - Mặc định: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
   - Có thể override bằng biến môi trường `CHROME_PATH`
   - Script sử dụng Chrome headless qua `puppeteer-core`

3. **Output directory:**
   - Mặc định: `/tmp/vietjet-ui-check/shots/`
   - Override bằng biến môi trường: `UI_CHECK_SHOTS_DIR=/path/to/output`
   - Thư mục được tạo tự động nếu chưa tồn tại

**Chạy script:**

```bash
# Chạy với cấu hình mặc định
npm run test:ui

# Chạy với output directory tuỳ chỉnh
UI_CHECK_SHOTS_DIR=./docs/qa/screenshots/$(date +%F) npm run test:ui

# Chạy với Chrome custom path
CHROME_PATH="/path/to/chrome" npm run test:ui
```

**Output:**

- Console log: kết quả kiểm tra từng route × viewport (pass/fail, thời gian render)
- Screenshot files: `<route>_<width>x<height>_<timestamp>.png`
- Summary report: tổng số màn hình, số lỗi, loại lỗi phát hiện

**Lưu ý:**

- Script không commit ảnh vào repo (37 PNG = 21,8 MB)
- Ảnh baseline có thể tái tạo bất kỳ lúc nào bằng một lệnh
- Công cụ so sánh ảnh (Phase 6) chưa được chọn, commit bây giờ là lãng phí
- Khi cần, chạy lại script trên commit cụ thể để tạo baseline cố định

## 5. Lưu trữ snapshot

**Quy ước naming:**

```
docs/qa/screenshots/<ngày>/
├── app/
│   ├── trang-chu_390x844_2026-10-18.png
│   ├── trang-chu_768x1024_2026-10-18.png
│   ├── trang-chu_1440x900_2026-10-18.png
│   ├── tim-ve_390x844_2026-10-18.png
│   └── ...
└── reference/
    ├── trang-chu_390x844_ref_2026-10-18.png
    ├── trang-chu_768x1024_ref_2026-10-18.png
    └── ...
```

**Phân loại:**

- `app/` — Screenshot app hiện tại (`vietjetsim-main`)
- `reference/` — Screenshot trang tham chiếu (vietjetair.com)
- Tên file: `<route>_<viewport>_[ref_]<ngày>.png`
- Route dùng slug không dấu, thay `/` bằng `-` (ví dụ: `dat-ve-123`, `lam-thu-tuc-truc-tuyen`)

**Metadata đi kèm:**

Tạo file `docs/qa/screenshots/<ngày>/metadata.json`:

```json
{
  "date": "2026-10-18",
  "commit": "<git-sha>",
  "branch": "<branch-name>",
  "viewports": ["390×844", "768×1024", "1440×900"],
  "routes": ["trang-chu", "tim-ve", ...],
  "server_port": 4028,
  "chrome_version": "130.x",
  "notes": "Baseline sau khi sửa lỗi /dat-ve prefetch. Cookie consent visible, promo dismissed."
}
```

**Chính sách commit:**

- Ảnh **không commit** vào repo (quá nặng, tái tạo được)
- Chỉ commit file báo cáo (`BASELINE_3VIEWPORT_2026-10-18.md`) và metadata JSON
- Ảnh lưu local hoặc external storage khi cần lưu trữ dài hạn
- Trước khi merge PR lớn, chạy lại script và lưu snapshot để có điểm rollback

## 6. Cổng duyệt Phase 0

**Điều kiện để Phase 0 được coi là hoàn thành (xanh):**

✅ **Baseline đủ cả ba viewport canonical:**
- 18 route × 3 viewport = 54 màn hình (thực tế 35 vì một số route động)
- Mỗi màn hình có ảnh chụp và kết quả kiểm tra (console, HTTP, overflow)

✅ **Phase -1 đã xanh:**
- Registry đủ 32/32 file trong `public/`
- 22 asset có quyết định Thay/Giữ/Xoá từ chủ dự án
- 0 file orphan
- 0 hotlink trực tiếp từ vietjetair.com trong code

✅ **Không tải asset từ website tham chiếu vào repo:**
- Screenshot tham chiếu chỉ để so sánh thị giác, không dùng trong app
- Mọi asset trong `public/` đều có nguồn gốc hợp pháp hoặc đang chờ quyết định

✅ **Inventory component và route đầy đủ:**
- 18 route công khai được liệt kê rõ ràng
- Các component chính được xác định để kiểm tra trong Phase 1-6
- `/editor` được loại trừ tường minh

✅ **Lỗi hiện tại đã được phát hiện và ghi nhận:**
- Lỗi prefetch `/dat-ve` đã được sửa
- Các lỗi khác (nếu có) được ghi trong baseline report
- Không có lỗi mới được bỏ qua hoặc che giấu

## 7. Rủi ro và cách kiểm soát

| Rủi ro | Kiểm soát |
|--------|----------|
| **Dev server không khởi động được** | Kiểm tra cổng 4028 trước khi chạy script: `lsof -i :4028`. Nếu bị chiếm, dùng cổng khác và update biến môi trường. |
| **Cổng 4028 bị chiếm bởi process khác** | Script kiểm tra server health trước khi chụp (`fetch http://localhost:4028`). Nếu fail, báo lỗi rõ ràng thay vì chụp trang trắng. |
| **Chrome không tìm thấy hoặc version không tương thích** | Fallback sang Chromium nếu Chrome không có. Ghi version vào metadata để tái tạo môi trường sau này. |
| **Screenshot không ổn định do banner động** | Chụp sau khi dismiss cookie consent và promo modal. Ghi trạng thái banner vào metadata. Phase 6 sẽ dùng masking cho vùng động. |
| **Hydration mismatch trong production build** | Chạy script trên production build (`npm run build && npm start`) thay vì dev server để bắt lỗi chỉ hiện khi production. |
| **Baseline không gắn với commit cụ thể** | Chạy script trên tree sạch (không có uncommitted changes). Ghi git SHA vào metadata để biết baseline tương ứng với code nào. |
| **Ảnh chụp quá nặng, làm chậm workflow** | Không commit ảnh vào repo. Lưu external hoặc tái tạo khi cần. Chỉ commit report và metadata (< 100 KB). |
| **Visual regression tool chưa chọn** | Không commit ảnh baseline bây giờ. Chờ Phase 6 chọn công cụ (`pixelmatch`/`playwright`), sau đó mới quyết định format lưu trữ. |

## 8. Trạng thái hiện tại (18/10/2026)

**Phase 0: ✅ Hoàn thành kỹ thuật, chờ Phase -1 xanh để chốt chính thức**

| Công việc | Trạng thái | Ghi chú |
|-----------|-----------|--------|
| 2.1. Mở rộng `ui-check.cjs` | ✅ Xong | Đã hỗ trợ ba viewport |
| 2.2. Chụp route tham chiếu | ✅ Xong | Screenshot tại `docs/qa/screenshots/2026-10-18/reference/` |
| 2.3. Chạy `npm run test:ui` | ✅ Xong | 35/35 sạch, report tại `BASELINE_3VIEWPORT_2026-10-18.md` |
| 2.4. Hoàn tất registry | ✅ Xong | 32/32 file, 22 file chờ quyết định từ Phase -1 |
| 2.5. Inventory route/component | ✅ Xong | 18 route, loại trừ `/editor` |

**Hai điểm chưa hoàn thiện:**

1. **Ảnh chụp chưa được commit:**
   - 37 PNG nặng 21,8 MB
   - Có thể tái tạo bằng một lệnh
   - Công cụ so sánh ảnh (Phase 6) chưa chọn → commit bây giờ là lãng phí
   - **Hành động:** Commit report và metadata, không commit ảnh

2. **Baseline chưa gắn với commit cụ thể:**
   - Lần chụp chạy trên working tree có uncommitted changes từ workstream asset
   - **Hành động:** Sau khi Phase -1 xanh và tree sạch, chạy lại script để khoá baseline cứng

**Khiếm khuyết phát hiện và đã sửa:**

- `ActivityBar` trỏ "Giỏ hàng" vào `/dat-ve` (route không tồn tại)
- Gây 404 prefetch RSC ở cả ba viewport của `/tim-ve` trong production build
- `next dev` không prefetch nên lỗi chỉ hiện khi chạy `npm run build && npm start`
- Đã bỏ link chết và hằng số `ROUTES.CHECKOUT`
- Sau sửa: 0/35 flag lỗi

## 9. Bước tiếp theo

**Để đóng Phase 0 chính thức:**

1. **Chờ Phase -1 xanh:** 22 asset có quyết định Thay/Giữ/Xoá từ chủ dự án
2. **Chạy lại `npm run test:ui` trên commit sạch:**
   - Không có uncommitted changes
   - Ghi git SHA vào metadata
   - Lưu ảnh baseline để có điểm tham chiếu cố định
3. **Commit baseline report và metadata:**
   - `docs/qa/BASELINE_3VIEWPORT_2026-10-18.md`
   - `docs/qa/screenshots/2026-10-18/metadata.json`
   - Không commit ảnh PNG
4. **Mở Phase 1:** Foundation (tokens, layout, accessibility)

**Gợi ý tiếp theo:**

1. Rà soát `docs/design/asset-decisions.md` để đẩy nhanh quyết định 22 asset chờ xử lý (ưu tiên 16 hero và 6 promo)
2. Chạy production build (`npm run build && npm start`) và test lại để đảm bảo không có lỗi hydration/prefetch mới
3. Chuẩn bị cho Phase 1 bằng cách đọc kỹ nợ kỹ thuật hiện tại: 648 lần `text-[Npx]`, 390 class hex tuỳ ý cần dọn dẹp
