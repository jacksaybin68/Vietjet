# Kế Hoạch Đối Chiếu Giao Diện Vietjetair.com

**Ngày lập:** 18/10/2026  
**Phạm vi:** giao diện khách hàng của `vietjetsim-main`  
**Nguồn tham chiếu:** [Vietjet Air – trang chủ công khai](https://www.vietjetair.com/vi)  
**Trạng thái:** Đã chỉnh theo phản biện `docs/plans/PHAN_BIEN_KE_HOACH_DOI_CHIEU_2026-10-18.md` (18/10/2026)

**Bộ viewport canonical (dùng thống nhất toàn tài liệu):** `390×844`, `768×1024`, `1440×900`. Không dùng `1280×900` hay `1440×1000` để tránh trùng lặp vô nghĩa.

## 1. Mục tiêu và ranh giới

Mục tiêu là đạt mức tương đồng thị giác và hành vi cao nhất với các màn hình công khai
của Vietjet Air: cấu trúc, tỷ lệ, nhịp khoảng cách, màu sắc, typography, trạng thái tương
tác và responsive. Mỗi hạng mục được đo bằng ảnh chụp cùng viewport thay vì đánh giá cảm tính.

Không sao chép mã nguồn, ảnh, video, icon đóng gói, font thương mại, nội dung biên tập hoặc
thành phần nhận diện không được dự án sở hữu. Dự án chỉ dùng asset đã có quyền sử dụng hoặc asset
mới được cung cấp/duyệt. Vì vậy, “100%” được hiểu là **100% hạng mục giao diện và luồng tương tác
đã liệt kê trong tài liệu này**, không phải sao chép nguyên trạng tài sản bên thứ ba.

Ngoài phạm vi: API thật của hãng, đặt vé thật, thanh toán thật, tài khoản đối tác, CMS, và thiết kế
console quản trị nội bộ.

## 2. Chuẩn thành công

- Không có lỗi build, TypeScript, hydration, console error hoặc HTTP lỗi không chủ ý.
- **100% asset trong `public/` có dòng đăng ký trong `docs/design/asset-registry.md` kèm chủ sở hữu/giấy phép đã xác minh** (gate cứng, xem Phase -1).
- Không tràn ngang tại cả ba viewport canonical: `390×844`, `768×1024`, `1440×900`.
- Mỗi route công khai có screenshot baseline tại **cả ba viewport canonical** và kết quả visual regression được duyệt.
- 100% control tương tác được keyboard: focus rõ, `Escape` đóng overlay/drawer, các trường có label.
- Header, footer, form tìm vé, modal cookie/promo và card được lấy từ component dùng chung; không copy CSS rời rạc.
- Các hành vi giả lập vẫn giữ API/route hiện tại và không thay đổi logic booking, auth, wallet hay RBAC.

## 3. Bản đồ hiện trạng

### Những phần đã có nền tảng tốt

- Token đỏ/gold, `KoHo`/`Be Vietnam Pro`, header nhiều tầng, rail dịch vụ và hero booking đã tồn tại.
- Trang chủ có carousel, form chuyến bay, danh mục dịch vụ, ưu đãi, điểm đến, FAQ và footer.
- Bộ `scripts/ui-check.cjs` đã render 14 màn hình và kiểm tra console, exception, HTTP, overflow và ảnh rỗng.
- Kết quả booking, thanh toán, check-in, chuyến bay của tôi, tài khoản và admin đã tách theo feature.
- Primitives `Button`, `InputField`, `Section`, `Card`, `IconButton`, `Skeleton` đã có trong `src/shared/components/ui/`.
- Chuỗi cookie → promo đã hoạt động trong `src/shared/components/feedback/SiteOverlays.tsx`.
- 70 file test (vitest) bao phủ auth, booking, payment, wallet, RBAC, CSRF.

### Khoảng cách cần khép lại

1. Header/announce/utility/nav cần được đo theo cùng breakpoint với tham chiếu, thay vì chỉnh bằng cảm nhận.
2. Hero cần giữ artwork là nội dung chính; text trong ảnh không được lặp lại bằng DOM nhìn thấy.
3. Component card, section spacing và typography còn dùng nhiều utility/hex cục bộ (đo được: **648 lần `text-[Npx]`, 390 class hex tuỳ ý** trong `src/`).
4. Cookie consent và promo phải là một chuỗi trải nghiệm, không che lẫn nhau hoặc cản form trên mobile (đã có nền tảng, cần kiểm thử).
5. Các trang phụ cần cùng khung công khai và chuẩn page hero; admin/auth vẫn tách biệt.
6. **Chỉ 6/32 file còn lại trong `public/` được xác minh nguồn gốc; 23 file còn lại có dấu hiệu lấy từ CMS/CDN vietjetair (xem Phase -1). 24 file orphan (~5,4 MB) đã được xoá.**

## 4. Hệ thiết kế đích

### Màu và bề mặt

- `brand.red`: `#EC2029`; hover/action dark: `#D91A21`; red deep: `#6F0000`.
- `brand.gold`: `#F9A51A → #FBB612 → #FFDD00`; dùng cho CTA chính, indicator và trạng thái chọn.
- `ink`: `#333333`, `#6C6C6C`, `#939393`; surface: `#FFFFFF`, `#F7F7F7`, viền `#E2E4E8`.
- Red/gold được khai báo tập trung ở `src/styles/tailwind.css` và `tailwind.config.js`; component không thêm mã hex trừ màu minh hoạ đặc thù đã được review.

### Typography và hình dạng

- `KoHo` cho giao diện/đoạn ngắn; `Be Vietnam Pro` cho heading và nội dung dài.
- Kích thước chuẩn: 12, 14, 16, 20, 24, 32, 40px. Dải này **không khớp hoàn toàn** thang Tailwind (`text-4xl` = 36px, không có 40px) → Phase 1 phải `extend fontSize` cho các giá trị thiếu, nếu không cổng "tránh `text-[Npx]`" không đo được.
- Tránh `text-[Npx]` khi Tailwind đã có utility tương ứng; baseline nợ hiện tại là **648 lần `text-[Npx]`** và **390 class hex tuỳ ý**.
- Input 48–52px, card 8–12px, CTA vàng 48–52px, pill chỉ dùng cho chip/badge/trip selector.
- Focus dùng gold outline + red ring; tương phản text đạt WCAG AA.

### Motion

- Carousel: chuyển opacity/translate 350–600ms, dừng khi `prefers-reduced-motion`.
- Menu/drawer/accordion: transform + opacity, không animate height toàn trang khi tránh được.
- Hover chỉ nâng nhẹ hoặc đổi border/color; không dùng motion gây thay đổi vị trí thao tác.

## 5. Các phase triển khai

### Phase -1 — Asset compliance (blocker cứng)

**Mục tiêu:** hợp thức hoá toàn bộ tài sản trong `public/` trước khi chạm vào giao diện.

Trạng thái chi tiết từng file: `docs/design/asset-registry.md`.

1. Xử lý **23 file nguồn gốc chưa xác minh** (`public/images/hero/` 16 file, `public/images/promos/` 6 file, `public/assets/images/banners/` 1 file): chọn **thay bằng asset có quyền** / **giữ kèm giấy phép** / **xoá** cho từng file. *(Con số 46 ban đầu còn tính 23 file hoá ra là orphan, đã xoá ở mục 3.)*
2. Quyết định 3 asset rủi ro thương hiệu: `logo-vj.svg`, `logo.png`, `app_logo.png`.
3. Xoá **24 file orphan** (~5,4 MB) hoặc đăng ký lý do giữ.
4. Xoá file trùng lặp: `public/images/hero/download.png` == `public/assets/images/app_logo.png`.
5. Đổi tên các file được giữ sang quy ước nội bộ (bỏ hậu tố epoch-millis và UUID).
6. Chốt hướng nạp font và sửa mâu thuẫn `src/styles/tailwind.css` (dòng 1) ↔ `src/app/layout.tsx` (dòng 66–75).

**Cổng duyệt:** registry đủ **32/32** file (sau khi xoá 24 orphan), 0 orphan, 0 hotlink `vietjetair.com`, 0 file nguồn gốc không rõ. Không mở Phase 0 khi cổng này chưa xanh.

**Trạng thái 18/10/2026:** mục 3 ✅ (xoá 24 orphan, `public/` 56 → 32 file, 14,29 → 8,92 MB) · mục 4 ✅ (xoá bản trùng byte `hero/download.png`) · mục 6 ✅ (sửa comment `src/styles/tailwind.css` dòng 1 cho khớp `layout.tsx`) · mục 1, 2, 5 ❌ **chờ chủ dự án quyết định**. Bằng chứng và phương án nằm ở `docs/qa/asset-audit-22.md`, `docs/qa/asset-replacement-plan.md` và `docs/design/asset-decisions.md`.

### Phase 0 — Chốt baseline và asset registry

**Mục tiêu:** có dữ liệu trước khi thay giao diện.

1. Mở rộng `scripts/ui-check.cjs` cho đủ ba viewport canonical (`390×844`, `768×1024`, `1440×900`) — hiện chỉ có mobile `390×844` và desktop mặc định, `768×1024` chưa từng được test.
2. Chụp từng route tham chiếu ở ba viewport canonical; ghi viewport, thời điểm, URL, trạng thái cookie/promo.
3. Chạy `npm run test:ui`, lưu snapshot app hiện tại trong `docs/qa/screenshots/<ngày>/`.
4. Hoàn tất `docs/design/asset-registry.md` (đã kiểm kê 32/32 file sau dọn — xem Phase -1 để xử lý quyền/nguồn).
5. Lập inventory component và route: `trang-chu`, `tim-ve`, `dat-ve`, `thanh-toan`, `tra-cuu`, `lam-thu-tuc`, `lam-thu-tuc-truc-tuyen`, `chuyen-bay-cua-toi`, `hanh-ly`, `dich-vu`, `gioi-thieu`, `hoi-dap`, `lien-he`, `tai-khoan`, `quan-tri`, auth (`dang-nhap`, `quen-mat-khau`, `dat-lai-mat-khau`). **Loại trừ tường minh `/editor` (CMS) khỏi phạm vi công khai.**

**Cổng duyệt:** baseline đủ cả ba viewport canonical; Phase -1 đã xanh; không tải asset từ website tham chiếu vào repo.

**Trạng thái 18/10/2026:** mục 1 ✅ · mục 2 ✅ · mục 4 ✅ (registry 32/32) · mục 5 ✅ (inventory đã có trong kế hoạch) · mục 3 ✅ đã chạy — **35/35 màn hình sạch**, xem `docs/qa/BASELINE_3VIEWPORT_2026-10-18.md`.

Hai điểm còn lại của Phase 0:

- **Ảnh chụp không được commit.** Bộ 37 PNG nặng 21,8 MB, tái tạo được bằng một lệnh, và công cụ so sánh ảnh còn chưa chọn (Phase 6) — commit bây giờ là trả giá trước khi biết dùng để làm gì.
- **Baseline chưa gắn với một commit.** Lần chụp chạy trên working tree còn thay đổi chưa commit của workstream asset. Cần chụp lại khi tree tĩnh để khoá baseline cứng.

Khiếm khuyết tìm được và đã sửa trong lần chụp đầu: `ActivityBar` trỏ "Giỏ hàng" vào `/dat-ve` — route không tồn tại (chỉ có `/dat-ve/[id]`), nên `next/link` prefetch RSC nhận 404 ở cả ba viewport của `/tim-ve`. `next dev` không prefetch nên lỗi chỉ hiện trong bản production, đúng như cảnh báo trong `AGENTS.md`. Đã bỏ link chết và hằng số `ROUTES.CHECKOUT` cùng trỏ vào đó; sau khi sửa còn 0/35 flag.

### Phase 1 — Foundation: tokens, layout, accessibility

**Files trọng tâm:** `src/styles/tailwind.css`, `tailwind.config.js`, `src/app/layout.tsx`, `src/shared/components/ui/*`, `src/shared/components/navigation/PageHero.tsx`.

1. **Map sang token hiện có thay vì đổi tên:** repo đã có `--surface/--surface-2/--surface-3`, `--foreground/--foreground-muted/--foreground-subtle`, `--border`, `--primary/--accent` (kèm bộ trùng `--vj-*` và `vjred/vjyellow` trong `tailwind.config.js`). Chốt một hệ duy nhất, thêm alias nếu cần; **không rename hàng loạt** vì sẽ chạm 648 `text-[Npx]` + 390 hex-class.
2. Dọn token dark-mode còn sót trong `tailwind.css` (repo có `scripts/remove-dark-mode.js`, comment "brand only ships a light presentation").
3. Chuẩn hoá primitive `Button`, `InputField`, `Section`, `Card`, `IconButton`, `Skeleton` trong `ui/`; **`PageHero` nằm ở `src/shared/components/navigation/PageHero.tsx`, không phải `ui/`**.
4. Đặt một scale spacing: 4/8/12/16/24/32/48/64/96; `extend fontSize` cho 40px; thay spacing tuỳ ý tại component công khai theo batch nhỏ, kèm rule lint chặn hex/`text-[Npx]` phát sinh mới.
5. Chốt font loading: sửa mâu thuẫn `tailwind.css` dòng 1 (ghi "đã chuyển sang `next/font`") ↔ `layout.tsx` dòng 66–75 (vẫn dùng `<link>` Google Fonts). Nếu chuyển `next/font`, phải kiểm tra dấu tiếng Việt, subset và CLS.
6. Rà semantic heading, landmark, **skip link (hiện chưa có)**, focus visible, alt text và form label.

**Cổng duyệt:** `npm run lint`, `npm run type-check`; nợ CSS (`text-[Npx]`, hex-class) giảm so với baseline; layout công khai không đổi ngoài phạm vi đã duyệt.

### Phase 2 — Chrome công khai: announcement, header, footer, overlays

**Files trọng tâm:** `src/shared/components/navigation/Header.tsx`, `AnnouncementBar.tsx`, `ActivityBar.tsx`, `Footer.tsx`, `MobileBottomNav.tsx`, `src/shared/components/feedback/SiteOverlays.tsx`.

1. Phân tầng rõ: announce bar → utility row → primary red nav → services rail.
2. Gắn active state, hover, focus, menu account và sticky behavior theo viewport.
3. Hoàn thiện mobile drawer: menu, login/register, dịch vụ nhanh, đóng khi navigation/click ngoài/`Escape`.
4. Đồng nhất footer: cột link, ứng dụng, liên hệ, legal, responsive accordion ở mobile.
5. Cookie/promo: **nền tảng đã có** trong `src/shared/components/feedback/SiteOverlays.tsx` (`vj-cookie-consent`, `vj-promo-dismissed`; promo chỉ hiện sau khi có quyết định cookie). Việc cần làm là **kiểm thử + bổ sung interaction test** cho chuỗi này, đảm bảo mở/đóng không làm lệch scroll và không che control đang focus.

**Cổng duyệt:** header/footer/overlay được visual-compare ở cả ba viewport canonical; tab order hoàn chỉnh.

### Phase 3 — Trang chủ và tìm vé

**Files trọng tâm:** `src/app/trang-chu/components/*`, `src/app/tim-ve/components/*`, `src/features/flights/components/FlightResultsStep.tsx`.

1. Hero carousel: crop theo breakpoint, vùng safe cho booking panel, indicators/previous/next, pause reduced motion.
2. Booking panel: ba service tab, loại hành trình, currency, airport picker, date, passenger, voucher, cheapest toggle, CTA. Không đổi query params hiện tại.
3. Chuẩn hoá section sequence: promotion, services, fares/routes, destination, travel guide, FAQ, awards/stats.
4. Tìm vé: date strip, fare tabs, filter drawer mobile, flight card, booking summary sticky và empty/error state.
5. Dùng dữ liệu trong hệ thống cho giá, tuyến, banner; dữ liệu placeholder phải được đánh dấu rõ.

**Cổng duyệt:** search từ hero → `/tim-ve` đúng query; chọn fare → booking flow không hồi quy; mọi card responsive không overflow.

### Phase 4 — Luồng đặt vé và hậu đặt vé

**Files trọng tâm:** `src/features/bookings/components/*`, `src/features/payments/components/*`, `src/app/thanh-toan/page.tsx`, `src/app/tra-cuu/page.tsx`, `src/app/lam-thu-tuc/page.tsx`, `src/app/chuyen-bay-cua-toi/page.tsx`.

1. Đồng nhất progress/stepper, fare summary, ancillary selection, seat map, passenger form và validation state.
2. Thanh toán: hierarchy giá/tax/discount rõ ràng; trạng thái pending/success/failure có visual system thống nhất.
3. Lookup, check-in và my flights: public vs authenticated state rõ, skeleton/loading/error có cùng ngôn ngữ thị giác.
4. Không đổi những ràng buộc security/CSRF/payment. **Không có "E2E" đúng nghĩa** trong repo: 70 test hiện có là vitest unit/integration (`payment.test.ts`, `booking.test.ts`, `rbac-enforcement.test.ts`, `csrf.test.ts`…), còn phần kiểm thử tích hợp nằm ở `scripts/` (`test:smoke`, `test:wallet-e2e`, `test:ui`). Ghi rõ script nào chứng minh "booking flow không hồi quy" và giữ tất cả phải xanh.

**Cổng duyệt:** test booking, payment, wallet, check-in; screenshot từng trạng thái thành công/lỗi/empty.

### Phase 5 — Nội dung, tài khoản và admin

**Files trọng tâm:** `src/app/dich-vu/page.tsx`, `gioi-thieu`, `hoi-dap`, `lien-he`, `tai-khoan/components/*`, `src/features/admin/components/*`.

1. Áp dụng `PageHero`, section primitives và responsive grid cho trang nội dung (`/dich-vu`, `/gioi-thieu`, `/hoi-dap`, `/lien-he`, `/hanh-ly`, `/lam-thu-tuc-truc-tuyen`).
2. Đồng nhất service detail qua query `?service=`; tất cả CTA trỏ tới route có thật (kiểm cả route hiện có `/hanh-ly`, `/lam-thu-tuc-truc-tuyen`).
3. Tài khoản giữ dashboard riêng nhưng dùng token, table, form và mobile navigation chung.
4. Admin chỉ chuẩn hoá readability, density, table and feedback patterns; không ép giao diện public lên console nghiệp vụ.

**Cổng duyệt:** không route 404 từ navigation (gồm các route bổ sung ở inventory Phase 0); user/admin role guard vẫn đúng.

### Phase 6 — QA, regression và tối ưu

1. Mở rộng `scripts/ui-check.cjs`: đủ ba viewport canonical cho mọi route, interaction cookie/promo/menu, focus/keyboard và trạng thái lỗi.
2. Thêm visual regression: **trước tiên phải chọn và cài công cụ diff** (`pixelmatch`/`looks-same`/`playwright` — repo hiện chỉ có `puppeteer-core` để chụp, không có để so sánh), định nghĩa masking cho banner động, và dùng ngưỡng diff theo section thay vì toàn trang.
3. Kiểm tra Lighthouse/Next bundle: ảnh `next/image` hoặc `<img>` có kích thước cố định, preload hero đúng một ảnh, font không gây CLS.
4. Chạy lint, type-check, unit/integration, build, smoke, UI check và manual keyboard/mobile review.

**Cổng duyệt phát hành:** toàn bộ gate xanh, không có asset chưa rõ quyền, changelog/screenshot được cập nhật.

## 6. Thứ tự thực thi và phụ thuộc

`Phase -1 → Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6`

- **Phase -1 là blocker cứng:** 23 asset chưa xác minh quyền phải được xử lý trước; không mở Phase 0 nếu registry chưa xanh.
- Phase 1 phải hoàn thành trước khi thay nhiều component để tránh token drift.
- Phase 2 phải hoàn thành trước Phase 3 vì header/overlay quyết định hero viewport và safe area.
- Phase 3/4 có thể triển khai song song sau khi primitives đã ổn định, nhưng phải dùng cùng visual regression baseline.
- Phase 5 triển khai cuối để tránh làm admin/auth chịu thay đổi công khai không cần thiết.

## 7. Rủi ro và cách kiểm soát

| Rủi ro | Kiểm soát |
| --- | --- |
| Sao chép tài sản không có quyền | Phase -1 bắt buộc; 46/56 file hiện chưa xác minh nguồn gốc, phải thay/giữ-có-giấy-phép/xoá trước mọi thay đổi UI. |
| Hình giống nhưng luồng booking lỗi | Mỗi PR UI chạy test route/API/booking hiện có (70 vitest + `test:smoke`, `test:wallet-e2e`). |
| Responsive bị vỡ bởi hero/overlay | Screenshot tại ba viewport canonical (gồm `768×1024` hiện chưa test) và test overflow tự động. |
| CSS token bị pha tạp | Chỉ thêm màu qua token; review chặn hard-code mới. |
| Performance giảm vì carousel/ảnh | Kích thước ảnh, preload một hero, lazy-load dưới fold, đo CLS/LCP. |
| Dirty worktree chồng chéo | Tách commit/PR theo phase; không rewrite thay đổi không thuộc phase. |

## 8. Checklist hoàn thành

> **Cập nhật 18/10/2026 (sau commit skip link + fontSize + đổi tên hero + test onFlightSelect):**
> - Đổi tên 2/23 file UUID theo Phase -1 mục 5 (`hero-vietjet-holiday.jpg`, `hero-vietjet-skyboss.jpg`); code hết tham chiếu tên cũ (grep = 0), registry đã đồng bộ.
> - Skip link + `main#main-content` đã có trong `src/app/layout.tsx` (xóa nợ Phase 1 mục 6.6).
> - `tailwind.config.js` đã `extend fontSize` cho 40px (`2xl2`/`5xl2`); chưa quét nợ `text-[Npx]` toàn repo (baseline cũ: 648/645 lần).
> - `onFlightSelect` đã gọi ở 3 vị trí chọn vé trong `FlightResultsStep`; panel tóm tắt + tab hạng ghế + nút "Đi tiếp" đã nối với wizard (test mới pass).
> - **Còn đỏ:** 23 asset chưa xác minh + 3 asset thương hiệu chờ chủ dự án quyết định (blocker Phase -1, xem `docs/design/asset-decisions.md`); 2 test `hero-banner` cũ; visual regression chưa có tool diff.

- [ ] **Phase -1:** registry đủ 32/32 file; 0 asset nguồn gốc không rõ; 0 orphan; 3 asset thương hiệu đã quyết định.
- [ ] Baseline đủ tại ba viewport canonical (gồm `768×1024`).
- [ ] Token/primitives đạt lint/type-check/build, nợ `text-[Npx]`/hex-class giảm so với baseline.
- [ ] Header/footer/overlay được duyệt bằng ảnh ở ba viewport canonical.
- [ ] Trang chủ/tìm vé đạt visual comparison và không hồi quy luồng đặt vé.
- [ ] Booking, payment, lookup, check-in và my flights qua test chức năng.
- [ ] Nội dung/tài khoản/admin không route hỏng và role guard giữ nguyên.
- [ ] `npm run lint`, `npm run type-check`, `npm test`, `npm run build`, `npm run test:smoke`, `npm run test:ui` xanh.
- [ ] Visual/keyboard/manual QA được ghi vào `docs/reports/`.
