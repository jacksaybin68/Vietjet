# Kế Hoạch Đối Chiếu Giao Diện Vietjetair.com

**Ngày lập:** 18/10/2026  
**Phạm vi:** giao diện khách hàng của `vietjetsim-main`  
**Nguồn tham chiếu:** [Vietjet Air – trang chủ công khai](https://www.vietjetair.com/vi)  
**Trạng thái:** Chờ phê duyệt để triển khai

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
- Không tràn ngang tại `390×844`, `768×1024`, `1280×900`, `1440×1000`.
- Mỗi route công khai có screenshot baseline desktop + mobile và kết quả visual regression được duyệt.
- 100% control tương tác được keyboard: focus rõ, `Escape` đóng overlay/drawer, các trường có label.
- Header, footer, form tìm vé, modal cookie/promo và card được lấy từ component dùng chung; không copy CSS rời rạc.
- Các hành vi giả lập vẫn giữ API/route hiện tại và không thay đổi logic booking, auth, wallet hay RBAC.

## 3. Bản đồ hiện trạng

### Những phần đã có nền tảng tốt

- Token đỏ/gold, `KoHo`/`Be Vietnam Pro`, header nhiều tầng, rail dịch vụ và hero booking đã tồn tại.
- Trang chủ có carousel, form chuyến bay, danh mục dịch vụ, ưu đãi, điểm đến, FAQ và footer.
- Bộ `scripts/ui-check.cjs` đã render 14 màn hình và kiểm tra console, exception, HTTP, overflow và ảnh rỗng.
- Kết quả booking, thanh toán, check-in, chuyến bay của tôi, tài khoản và admin đã tách theo feature.

### Khoảng cách cần khép lại

1. Header/announce/utility/nav cần được đo theo cùng breakpoint với tham chiếu, thay vì chỉnh bằng cảm nhận.
2. Hero cần giữ artwork là nội dung chính; text trong ảnh không được lặp lại bằng DOM nhìn thấy.
3. Component card, section spacing và typography còn dùng nhiều utility/hex cục bộ.
4. Cookie consent và promo phải là một chuỗi trải nghiệm, không che lẫn nhau hoặc cản form trên mobile.
5. Các trang phụ cần cùng khung công khai và chuẩn page hero; admin/auth vẫn tách biệt.
6. Tất cả asset phải có manifest nguồn/quyền dùng trước khi đưa vào `public/`.

## 4. Hệ thiết kế đích

### Màu và bề mặt

- `brand.red`: `#EC2029`; hover/action dark: `#D91A21`; red deep: `#6F0000`.
- `brand.gold`: `#F9A51A → #FBB612 → #FFDD00`; dùng cho CTA chính, indicator và trạng thái chọn.
- `ink`: `#333333`, `#6C6C6C`, `#939393`; surface: `#FFFFFF`, `#F7F7F7`, viền `#E2E4E8`.
- Red/gold được khai báo tập trung ở `src/styles/tailwind.css` và `tailwind.config.js`; component không thêm mã hex trừ màu minh hoạ đặc thù đã được review.

### Typography và hình dạng

- `KoHo` cho giao diện/đoạn ngắn; `Be Vietnam Pro` cho heading và nội dung dài.
- Kích thước chuẩn: 12, 14, 16, 20, 24, 32, 40px; tránh `text-[Npx]` nếu Tailwind đã có thang phù hợp.
- Input 48–52px, card 8–12px, CTA vàng 48–52px, pill chỉ dùng cho chip/badge/trip selector.
- Focus dùng gold outline + red ring; tương phản text đạt WCAG AA.

### Motion

- Carousel: chuyển opacity/translate 350–600ms, dừng khi `prefers-reduced-motion`.
- Menu/drawer/accordion: transform + opacity, không animate height toàn trang khi tránh được.
- Hover chỉ nâng nhẹ hoặc đổi border/color; không dùng motion gây thay đổi vị trí thao tác.

## 5. Các phase triển khai

### Phase 0 — Chốt baseline và asset registry

**Mục tiêu:** có dữ liệu trước khi thay giao diện.

1. Chụp từng route tham chiếu ở bốn viewport chuẩn; ghi viewport, thời điểm, URL, trạng thái cookie/promo.
2. Chạy `npm run test:ui`, lưu snapshot app hiện tại trong `docs/qa/screenshots/<ngày>/`.
3. Tạo `docs/design/asset-registry.md`: tên file, mục đích, chủ sở hữu/giấy phép, route sử dụng, kích thước tối ưu.
4. Lập inventory component và route: `trang-chu`, `tim-ve`, `dat-ve`, `thanh-toan`, `tra-cuu`, `lam-thu-tuc`, `chuyen-bay-cua-toi`, `dich-vu`, `gioi-thieu`, `hoi-dap`, `lien-he`, auth và dashboard.

**Cổng duyệt:** baseline đủ desktop/mobile; không tải asset từ website tham chiếu vào repo.

### Phase 1 — Foundation: tokens, layout, accessibility

**Files trọng tâm:** `src/styles/tailwind.css`, `tailwind.config.js`, `src/app/layout.tsx`, `src/shared/components/ui/*`.

1. Chuẩn hoá token semantic: `--surface`, `--surface-muted`, `--text`, `--text-muted`, `--border`, `--brand-red`, `--brand-gold`.
2. Chuẩn hoá primitive `Button`, `InputField`, `Section`, `Card`, `PageHero`, `IconButton`, `Skeleton`.
3. Đặt một scale spacing: 4/8/12/16/24/32/48/64/96; thay spacing tuỳ ý tại component công khai theo batch nhỏ.
4. Khóa font loading qua `next/font` hoặc quyết định giữ external font có fallback/`font-display` được kiểm thử.
5. Rà semantic heading, landmark, skip link, focus visible, alt text và form label.

**Cổng duyệt:** `npm run lint`, `npm run type-check`, desktop/mobile không thay đổi layout ngoài phạm vi đã duyệt.

### Phase 2 — Chrome công khai: announcement, header, footer, overlays

**Files trọng tâm:** `src/shared/components/navigation/Header.tsx`, `AnnouncementBar.tsx`, `ActivityBar.tsx`, `Footer.tsx`, `MobileBottomNav.tsx`, `src/shared/components/feedback/SiteOverlays.tsx`.

1. Phân tầng rõ: announce bar → utility row → primary red nav → services rail.
2. Gắn active state, hover, focus, menu account và sticky behavior theo viewport.
3. Hoàn thiện mobile drawer: menu, login/register, dịch vụ nhanh, đóng khi navigation/click ngoài/`Escape`.
4. Đồng nhất footer: cột link, ứng dụng, liên hệ, legal, responsive accordion ở mobile.
5. Cookie xuất hiện trước; promo chỉ sau quyết định cookie hoặc trong phiên tiếp theo. Đảm bảo mở/đóng không làm lệch scroll và không che control đang focus.

**Cổng duyệt:** header/footer/overlay được visual-compare ở cả bốn viewport; tab order hoàn chỉnh.

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
4. Không đổi những ràng buộc security/CSRF/payment; test E2E hiện có phải tiếp tục pass.

**Cổng duyệt:** test booking, payment, wallet, check-in; screenshot từng trạng thái thành công/lỗi/empty.

### Phase 5 — Nội dung, tài khoản và admin

**Files trọng tâm:** `src/app/dich-vu/page.tsx`, `gioi-thieu`, `hoi-dap`, `lien-he`, `tai-khoan/components/*`, `src/features/admin/components/*`.

1. Áp dụng `PageHero`, section primitives và responsive grid cho trang nội dung.
2. Đồng nhất service detail qua query `?service=`; tất cả CTA trỏ tới route có thật.
3. Tài khoản giữ dashboard riêng nhưng dùng token, table, form và mobile navigation chung.
4. Admin chỉ chuẩn hoá readability, density, table and feedback patterns; không ép giao diện public lên console nghiệp vụ.

**Cổng duyệt:** không route 404 từ navigation; user/admin role guard vẫn đúng.

### Phase 6 — QA, regression và tối ưu

1. Mở rộng `scripts/ui-check.cjs`: desktop/mobile cho route còn thiếu, interaction cookie/promo/menu, focus/keyboard và trạng thái lỗi.
2. Thêm visual regression dựa trên snapshot được duyệt, với ngưỡng diff theo section thay vì toàn trang khi banner có nội dung động.
3. Kiểm tra Lighthouse/Next bundle: ảnh `next/image` hoặc `<img>` có kích thước cố định, preload hero đúng một ảnh, font không gây CLS.
4. Chạy lint, type-check, unit/integration, build, smoke, UI check và manual keyboard/mobile review.

**Cổng duyệt phát hành:** toàn bộ gate xanh, không có asset chưa rõ quyền, changelog/screenshot được cập nhật.

## 6. Thứ tự thực thi và phụ thuộc

`Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6`

- Phase 1 phải hoàn thành trước khi thay nhiều component để tránh token drift.
- Phase 2 phải hoàn thành trước Phase 3 vì header/overlay quyết định hero viewport và safe area.
- Phase 3/4 có thể triển khai song song sau khi primitives đã ổn định, nhưng phải dùng cùng visual regression baseline.
- Phase 5 triển khai cuối để tránh làm admin/auth chịu thay đổi công khai không cần thiết.

## 7. Rủi ro và cách kiểm soát

| Rủi ro | Kiểm soát |
| --- | --- |
| Sao chép tài sản không có quyền | Asset registry bắt buộc; chỉ dùng asset nội bộ/được cấp quyền. |
| Hình giống nhưng luồng booking lỗi | Mỗi PR UI chạy test route/API/booking hiện có. |
| Responsive bị vỡ bởi hero/overlay | Screenshot tại bốn viewport và test overflow tự động. |
| CSS token bị pha tạp | Chỉ thêm màu qua token; review chặn hard-code mới. |
| Performance giảm vì carousel/ảnh | Kích thước ảnh, preload một hero, lazy-load dưới fold, đo CLS/LCP. |
| Dirty worktree chồng chéo | Tách commit/PR theo phase; không rewrite thay đổi không thuộc phase. |

## 8. Checklist hoàn thành

- [ ] Baseline và asset registry được duyệt.
- [ ] Token/primitives đạt lint/type-check/build.
- [ ] Header/footer/overlay desktop-mobile được duyệt bằng ảnh.
- [ ] Trang chủ/tìm vé đạt visual comparison và không hồi quy luồng đặt vé.
- [ ] Booking, payment, lookup, check-in và my flights qua test chức năng.
- [ ] Nội dung/tài khoản/admin không route hỏng và role guard giữ nguyên.
- [ ] `npm run lint`, `npm run type-check`, `npm test`, `npm run build`, `npm run test:smoke`, `npm run test:ui` xanh.
- [ ] Visual/keyboard/manual QA được ghi vào `docs/reports/`.
