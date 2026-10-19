# Kế Hoạch Đối Chiếu Giao Diện Vietjetair.com

**Ngày lập:** 18/10/2026  
**Cập nhật gần nhất:** 19/10/2026 — đo lại số liệu và ghi trạng thái từng phase  
**Phạm vi:** giao diện khách hàng của `vietjetsim-main`  
**Nguồn tham chiếu:** [Vietjet Air – trang chủ công khai](https://www.vietjetair.com/vi)  
**Trạng thái:** Đã chỉnh theo phản biện `docs/plans/PHAN_BIEN_KE_HOACH_DOI_CHIEU_2026-10-18.md` (18/10/2026)

**Bộ viewport canonical (dùng thống nhất toàn tài liệu):** `390×844`, `768×1024`, `1440×900`. Không dùng `1280×900` hay `1440×1000` để tránh trùng lặp vô nghĩa.

## Trạng thái thực thi (đọc trước)

| Phase | Trạng thái 19/10/2026 | Hồ sơ |
| --- | --- | --- |
| **-1** Asset compliance | 🟢 **hoàn tất — đã đối soát thực tế 19/10**: 41/41 file trong `public/` đều có tham chiếu thật; xoá nốt 62 orphan còn sót; gỡ 5 hotlink S3; thay 17 tham chiếu asset rủi ro bằng asset nội bộ | `docs/design/asset-registry.md`, `docs/design/asset-decisions.md` |
| **0** Baseline 3 viewport | 🟢 cổng xanh — **35/35 màn hình sạch**; còn 1 quyết định: bộ 37 PNG mới **không** commit trong khi bộ 16 PNG cũ (14 MB) vẫn nằm trong git | `docs/qa/BASELINE_3VIEWPORT_2026-10-18.md` |
| **1** Foundation (token/layout/a11y) | 🟢 **đang hoàn thiện** — mục 1-2 (token/dark mode cleanup) ✅; mục 4 (spacing scale & ratchet) ✅; mục 5 (font sync) ✅; mục 6 (landmark + skip link) ✅; mục 3 (primitives) | `docs/qa/PHASE1_LANDMARK_SKIPLINK_2026-10-19.md`, `docs/plans/phase-1-execution.md` |
| **2** Chrome công khai | ⚪ chưa có hồ sơ đo lường | §5 Phase 2 |
| **3** Trang chủ / tìm vé | ⚪ chưa có hồ sơ đo lường | §5 Phase 3 |
| **4** Đặt vé / hậu đặt vé | ⚪ chưa có hồ sơ đo lường | §5 Phase 4 |
| **5** Nội dung / tài khoản / admin | ⚪ chưa có hồ sơ đo lường | §5 Phase 5 |
| **6** QA, regression, tối ưu | 🟡 ba viewport ✅, landmark + skip link ✅; còn chọn công cụ diff ảnh, interaction cookie/promo/menu, Lighthouse | §5 Phase 6 |

**Cổng kỹ thuật — XANH ĐỦ 6/6 (đo 19/10 chiều, sau khi chốt batch):** `npm run lint` ✅ 0 error / 0 warning · `npm run type-check` ✅ · `npm test` ✅ (**84 file / 829 test**) · `npm run lint:css-debt` ✅ **486/162, giảm 256 so với baseline cũ 648/256** (baseline đã hạ để khoá) · `npm run build` ✅ · `npm run test:ui` ✅ **35/35 màn hình** (gồm phép thử skip-link; probe chồng lấn đã bỏ qua cây mờ dần).

> **Ba tài liệu thực thi đi kèm kế hoạch này** (đọc khi cần chi tiết công việc, thời lượng, người làm): `docs/plans/phase-0-execution.md` (đã commit), `docs/plans/phase-1-execution.md` và `vietjetsim-main/docs/qa/phase-1-current-state.md` — **hai file sau còn untracked tại 19/10/2026**.

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
- Mỗi route công khai có screenshot baseline tại **cả ba viewport canonical**; kết quả visual regression được duyệt **khi công cụ diff ảnh được chọn** (Phase 6 mục 2). Trước lúc đó tiêu chí này chưa đo được vì repo chỉ có `puppeteer-core` để chụp, không có gì để so sánh.
- 100% control tương tác được keyboard: focus rõ, `Escape` đóng overlay/drawer, các trường có label. **Skip link và landmark đã đo được** (Phase 1 mục 6); phần `Escape`/overlay còn ở Phase 2 mục 3 và Phase 6 mục 1.
- Header, footer, form tìm vé, modal cookie/promo và card được lấy từ component dùng chung; không copy CSS rời rạc.
- Các hành vi giả lập vẫn giữ API/route hiện tại và không thay đổi logic booking, auth, wallet hay RBAC.

## 3. Bản đồ hiện trạng

### Những phần đã có nền tảng tốt

- Token đỏ/gold, `KoHo`/`Be Vietnam Pro`, header nhiều tầng, rail dịch vụ và hero booking đã tồn tại.
- Trang chủ có carousel, form chuyến bay, danh mục dịch vụ, ưu đãi, điểm đến, FAQ và footer.
- Bộ `scripts/ui-check.cjs` đã render **35 màn hình** (12 route × ba viewport canonical, riêng `/quan-tri` chỉ desktop + tablet) và kiểm tra console, exception, HTTP, overflow, ảnh rỗng, cấu trúc landmark và hành vi skip link.
- Kết quả booking, thanh toán, check-in, chuyến bay của tôi, tài khoản và admin đã tách theo feature.
- Primitives `Button`, `InputField`, `Section`, `Card`, `IconButton`, `Skeleton` đã có trong `src/shared/components/ui/`.
- Chuỗi cookie → promo đã hoạt động trong `src/shared/components/feedback/SiteOverlays.tsx`.
- **73 file test (vitest) / 761 test** bao phủ auth, booking, payment, wallet, RBAC, CSRF, cộng thêm ba script tích hợp trong `scripts/` (`test:smoke`, `test:wallet-e2e`, `test:ui`).

### Khoảng cách cần khép lại

1. Header/announce/utility/nav cần được đo theo cùng breakpoint với tham chiếu, thay vì chỉnh bằng cảm nhận.
2. Hero cần giữ artwork là nội dung chính; text trong ảnh không được lặp lại bằng DOM nhìn thấy.
3. Component card, section spacing và typography còn dùng nhiều utility/hex cục bộ (đo được: **648 lần `text-[Npx]`, 400 class hex tuỳ ý** trong `src/`; trần này được giữ bằng ratchet `npm run lint:css-debt`).
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
- Kích thước chuẩn: 12, 14, 16, 20, 24, 32, 40px. Dải này **không khớp hoàn toàn** thang Tailwind (`text-4xl` = 36px, không có 40px) → Phase 1 phải `extend fontSize` cho các giá trị thiếu, nếu không cổng "tránh `text-[Npx]`" không đo được. *(Đã làm một phần: `tailwind.config.js` đã có `2xl2`/`5xl2` = 40px.)*
- Tránh `text-[Npx]` khi Tailwind đã có utility tương ứng; trần nợ hiện tại là **648 lần `text-[Npx]`** và **400 class hex tuỳ ý**, ghi trong `vietjetsim-main/scripts/css-debt-baseline.json` và ép bằng `npm run lint:css-debt`.
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

**Cổng duyệt:** registry đủ **32/32** file (sau khi xoá 24 orphan), 0 orphan, 0 hotlink `vietjetair.com`, 0 file nguồn gốc không rõ. *(Điều kiện thứ tự "không mở Phase 0 khi cổng này chưa xanh" đã được đảo tạm thời theo quyết định của chủ dự án — xem ghi chú ở Phase 0.)*

**Trạng thái 19/10/2026:**

| Mục | Trạng thái | Ghi chú |
| --- | --- | --- |
| 1 — 23 file nguồn gốc chưa xác minh | ✅ **hoàn tất** | Đã thay toàn bộ bằng 11 hero ảnh và 6 promo cards tự sinh AI hợp lệ, xóa sạch file cũ |
| 2 — 3 asset thương hiệu | ✅ **hoàn tất** | Đã thay bằng `logo-internal.svg`, `logo-internal.png`, `chat-avatar.jpg` và cập nhật mọi tham chiếu |
| 3 — xoá 24 orphan | ✅ **hoàn tất** | `public/` đợt 1 dọn 24 orphan, đợt 2 dọn toàn bộ 26 file cũ |
| 4 — xoá file trùng byte | ✅ **hoàn tất** | `hero/download.png` == `app_logo.png` đã dọn |
| 5 — đổi tên / chuẩn hoá file nội bộ | ✅ **hoàn tất** | Quy ước tên rõ ràng: `hero-*`, `promo-*`, `logo-internal.*` |
| 6 — mâu thuẫn font | ✅ **hoàn tất** | Comment `src/styles/tailwind.css` dòng 1 đã khớp `layout.tsx` |

**Cổng Phase -1: ĐÃ XANH — đối soát thực tế 19/10: 41/41 file trong `public/` đều có tham chiếu trong code và nguồn gốc rõ ràng (bản ghi trước đây tuyên bố "27/27, xóa sạch file cũ" nhưng working tree lúc đó còn 103 file, 7 tham chiếu rủi ro và 5 hotlink S3 còn sống — đã xử lý xong, chi tiết ở `docs/design/asset-registry.md` mục B3/B4/C).**

### Phase 0 — Chốt baseline và asset registry

**Mục tiêu:** có dữ liệu trước khi thay giao diện.

1. ✅ Mở rộng `scripts/ui-check.cjs` cho đủ ba viewport canonical (`390×844`, `768×1024`, `1440×900`) — trước đó chỉ có mobile `390×844` và desktop mặc định.
2. ✅ Chụp từng route tham chiếu ở ba viewport canonical; ghi viewport, thời điểm, URL, trạng thái cookie/promo.
3. ✅ Chạy `npm run test:ui` — **35/35 màn hình sạch**; ảnh nằm ở thư mục tạm (`UI_CHECK_SHOTS_DIR`), hồ sơ ở `docs/qa/BASELINE_3VIEWPORT_2026-10-18.md`.
4. ✅ Hoàn tất `docs/design/asset-registry.md` (kiểm kê 32/32 file sau dọn — phần quyền/nguồn xử lý ở Phase -1).
5. ✅ Lập inventory component và route, theo `src/app` thực tế: `trang-chu`, `tim-ve`, `dat-ve/[id]`, `thanh-toan`, `tra-cuu`, `lam-thu-tuc`, `lam-thu-tuc-truc-tuyen` (alias 307 → `/lam-thu-tuc`), `chuyen-bay-cua-toi`, `hanh-ly` (redirect → `/dich-vu?service=baggage`), `dich-vu`, `gioi-thieu`, `hoi-dap`, `lien-he`, `tai-khoan`, `quan-tri`, auth (`dang-nhap`, `quen-mat-khau`, `dat-lai-mat-khau`). **Lưu ý: `dat-ve` không tồn tại như một route độc lập — chỉ có `dat-ve/[id]`** — đúng lớp lỗi đã sinh link chết ở `ActivityBar` (xem dưới). **Loại trừ tường minh `/editor` (CMS) khỏi phạm vi công khai** — cả `/hanh-ly` (redirect thuần) và `/editor` đều không render `<Header />`.

**Cổng duyệt:** baseline đủ cả ba viewport canonical; Phase -1 đã xanh; không tải asset từ website tham chiếu vào repo.

> ⚠️ **Phase 0 chạy trước Phase -1 theo quyết định tường minh của chủ dự án** (18/10/2026), tức đảo thứ tự ghi ở mục 6. Baseline chỉ dùng để **đo**, không dùng để duyệt giao diện: mọi thay đổi UI vẫn phải chờ Phase -1 xanh, vì baseline dựng trên 23 asset chưa rõ quyền có thể phải dựng lại sau khi thay asset. Ghi lại ở đây để người đọc sau không hiểu nhầm đây là sơ suất về thứ tự.

**Cách tái tạo** (không đè `.next` mà dev server đang giữ ở cổng 4028):

```bash
cd vietjetsim-main
DIST_DIR=.next-uicheck npm run build
DIST_DIR=.next-uicheck npx next start -p 4029
UI_CHECK_BASE_URL=http://127.0.0.1:4029 node scripts/ui-check.cjs
git checkout -- next-env.d.ts tsconfig.json   # build ghi lại hai file này theo distDir vừa dùng
rm -rf .next-uicheck
```

**Hai điểm còn lại của Phase 0, cần chủ dự án quyết định:**

- **Ảnh chụp không được commit.** Bộ 37 PNG nặng 21,8 MB, tái tạo được bằng lệnh trên, và công cụ so sánh ảnh còn chưa chọn (Phase 6) — commit bây giờ là trả giá trước khi biết dùng để làm gì. **Nhưng chính sách đang không nhất quán:** bộ 16 PNG cũ (14 MB, 2 viewport, 14 màn hình) vẫn nằm trong git ở `docs/qa/screenshots/2026-10-18/` dù đã bị `BASELINE_3VIEWPORT_2026-10-18.md` thay thế. Cần chốt một trong hai: **xoá bộ 16 PNG cũ** hoặc **commit bộ 37 PNG mới** — không giữ cả hai kiểu.
- **Baseline chưa gắn với một commit.** Lần chụp 18/10 chạy trên working tree còn thay đổi chưa commit của workstream asset. Từ 19/10 `src/` đã tĩnh (commit `3f3ec3a` trở đi): chụp lại một lần là khoá được baseline vào một commit cụ thể.

Khiếm khuyết tìm được và đã sửa trong lần chụp đầu: `ActivityBar` trỏ "Giỏ hàng" vào `/dat-ve` — route không tồn tại (chỉ có `/dat-ve/[id]`), nên `next/link` prefetch RSC nhận 404 ở cả ba viewport của `/tim-ve`. `next dev` không prefetch nên lỗi chỉ hiện trong bản production, đúng như cảnh báo trong `AGENTS.md`. Đã bỏ link chết và hằng số `ROUTES.CHECKOUT` cùng trỏ vào đó; sau khi sửa còn 0/35 flag.

### Phase 1 — Foundation: tokens, layout, accessibility

**Files trọng tâm:** `src/styles/tailwind.css`, `tailwind.config.js`, `src/app/layout.tsx`, `src/shared/components/ui/*`, `src/shared/components/navigation/PageHero.tsx`.

1. **Map sang token hiện có thay vì đổi tên:** repo đã có `--surface/--surface-2/--surface-3`, `--foreground/--foreground-muted/--foreground-subtle`, `--border`, `--primary/--accent` (kèm bộ trùng `--vj-*` và `vjred/vjyellow` trong `tailwind.config.js`). Chốt một hệ duy nhất, thêm alias nếu cần; **không rename hàng loạt** vì sẽ chạm 648 `text-[Npx]` + 400 hex-class.
2. Dọn token dark-mode còn sót trong `tailwind.css` (repo có `scripts/remove-dark-mode.js`, comment "brand only ships a light presentation").
3. Chuẩn hoá primitive `Button`, `InputField`, `Section`, `Card`, `IconButton`, `Skeleton` trong `ui/`; **`PageHero` nằm ở `src/shared/components/navigation/PageHero.tsx`, không phải `ui/`**.
4. Đặt một scale spacing: 4/8/12/16/24/32/48/64/96; `extend fontSize` cho 40px *(đã có `2xl2`/`5xl2`)*; thay spacing tuỳ ý tại component công khai theo batch nhỏ, kèm **ratchet** `vietjetsim-main/scripts/css-debt.cjs` (`npm run lint:css-debt`) chặn hex/`text-[Npx]` phát sinh mới. **Quyết định 18/10/2026: dùng ratchet thay cho "rule lint" nêu trong kế hoạch ban đầu** — một rule lint toàn cục sẽ nổ ngay trên 648 + 400 chỗ đã có, còn ratchet chỉ chặn nợ mới tăng và buộc phải hạ dần.
5. Chốt font loading: sửa mâu thuẫn `tailwind.css` dòng 1 (ghi "đã chuyển sang `next/font`") ↔ `layout.tsx` dòng 66–75 (vẫn dùng `<link>` Google Fonts). Nếu chuyển `next/font`, phải kiểm tra dấu tiếng Việt, subset và CLS.
6. ✅ **Đã xong 19/10/2026** (chỉ riêng mục này của Phase 1): rà semantic heading, landmark, skip link, focus visible, alt text và form label. Skip link ở `src/app/layout.tsx`; đích `#main-content` do **từng trang** đặt sau `<Header />` của nó — layout cố ý không đặt landmark. Gỡ hết `<main>` lồng nhau (`/trang-chu` 3 → 1, `FlightResultsStep`, `AdminDashboardClient`); `/quan-tri` lấy landmark là panel tab *bên trong* `AdminDashboardClient` vì header console do chính component đó render; skeleton `loading.tsx`/`Suspense` không phải landmark. Bằng chứng: `docs/qa/PHASE1_LANDMARK_SKIPLINK_2026-10-19.md`.

**Cổng duyệt:** `npm run lint`, `npm run type-check`, `npm run lint:css-debt` (ratchet — **không được tăng**); nợ CSS (`text-[Npx]`, hex-class) giảm so với `vietjetsim-main/scripts/css-debt-baseline.json`; layout công khai không đổi ngoài phạm vi đã duyệt.

**Cổng phụ đã có sẵn và đang xanh:** `npm test` (73 file / 761 test) và `npm run test:ui` (35/35, gồm 4 cờ cấu trúc landmark + 1 phép thử hành vi skip link trên DOM sống).

> **Ghi chú nợ hiện tại:** Phase 1 mục 4 chưa bắt đầu nên nợ CSS **chưa giảm**. File nhiều `text-[Npx]` nhất: `FlightResultsStep.tsx` (63), `FlightsTab.tsx` (49), `RefundRequestsTab.tsx` (44), `DiscountsTab.tsx` (43). File nhiều hex nhất: `Toast.tsx` (38), `SecurityTab.tsx` (34), `dang-nhap/page.tsx` (32), `lien-he/page.tsx` (31).

**Trạng thái 19/10/2026:** mục 6 ✅ · mục 1–5 ❌ **chưa làm**. Chi tiết công việc và thời lượng: `docs/plans/phase-1-execution.md`; hiện trạng workstream: `vietjetsim-main/docs/qa/phase-1-current-state.md` *(cả hai còn untracked)*.

### Phase 2 — Chrome công khai: announcement, header, footer, overlays

**Files trọng tâm:** `src/shared/components/navigation/Header.tsx`, `AnnouncementBar.tsx`, `ActivityBar.tsx`, `Footer.tsx`, `MobileBottomNav.tsx`, `src/shared/components/feedback/SiteOverlays.tsx`.

1. Phân tầng rõ: announce bar → utility row → primary red nav → services rail.
2. Gắn active state, hover, focus, menu account và sticky behavior theo viewport.
3. Hoàn thiện mobile drawer: menu, login/register, dịch vụ nhanh, đóng khi navigation/click ngoài/`Escape`.
4. Đồng nhất footer: cột link, ứng dụng, liên hệ, legal, responsive accordion ở mobile.
5. Cookie/promo: **nền tảng đã có** trong `src/shared/components/feedback/SiteOverlays.tsx` (`vj-cookie-consent`, `vj-promo-dismissed`; promo chỉ hiện sau khi có quyết định cookie). Việc cần làm là **kiểm thử + bổ sung interaction test** cho chuỗi này, đảm bảo mở/đóng không làm lệch scroll và không che control đang focus.

**Cổng duyệt:** header/footer/overlay được visual-compare ở cả ba viewport canonical; tab order hoàn chỉnh.

**Trạng thái 19/10/2026:** chưa có hồ sơ đo lường cho phase này (chưa có ảnh đối chiếu header/footer/overlay).

### Phase 3 — Trang chủ và tìm vé

**Files trọng tâm:** `src/app/trang-chu/components/*`, `src/app/tim-ve/components/*`, `src/features/flights/components/FlightResultsStep.tsx`.

1. Hero carousel: crop theo breakpoint, vùng safe cho booking panel, indicators/previous/next, pause reduced motion.
2. Booking panel: ba service tab, loại hành trình, currency, airport picker, date, passenger, voucher, cheapest toggle, CTA. Không đổi query params hiện tại.
3. Chuẩn hoá section sequence: promotion, services, fares/routes, destination, travel guide, FAQ, awards/stats.
4. Tìm vé: date strip, fare tabs, filter drawer mobile, flight card, booking summary sticky và empty/error state.
5. Dùng dữ liệu trong hệ thống cho giá, tuyến, banner; dữ liệu placeholder phải được đánh dấu rõ.

**Cổng duyệt:** search từ hero → `/tim-ve` đúng query; chọn fare → booking flow không hồi quy; mọi card responsive không overflow.

**Trạng thái 19/10/2026:** chưa có hồ sơ đo lường cho phase này.

### Phase 4 — Luồng đặt vé và hậu đặt vé

**Files trọng tâm:** `src/features/bookings/components/*`, `src/features/payments/components/*`, `src/app/thanh-toan/page.tsx`, `src/app/tra-cuu/page.tsx`, `src/app/lam-thu-tuc/page.tsx`, `src/app/chuyen-bay-cua-toi/page.tsx`.

1. Đồng nhất progress/stepper, fare summary, ancillary selection, seat map, passenger form và validation state.
2. Thanh toán: hierarchy giá/tax/discount rõ ràng; trạng thái pending/success/failure có visual system thống nhất.
3. Lookup, check-in và my flights: public vs authenticated state rõ, skeleton/loading/error có cùng ngôn ngữ thị giác.
4. Không đổi những ràng buộc security/CSRF/payment. **Không có "E2E" đúng nghĩa** trong repo: 73 file test hiện có là vitest unit/integration (`payment.test.ts`, `booking.test.ts`, `rbac-enforcement.test.ts`, `csrf.test.ts`…), còn phần kiểm thử tích hợp nằm ở `scripts/` (`test:smoke`, `test:wallet-e2e`, `test:ui`). Ghi rõ script nào chứng minh "booking flow không hồi quy" và giữ tất cả phải xanh.

**Cổng duyệt:** test booking, payment, wallet, check-in; screenshot từng trạng thái thành công/lỗi/empty.

**Trạng thái 19/10/2026:** chưa có hồ sơ đo lường cho phase này.

### Phase 5 — Nội dung, tài khoản và admin

**Files trọng tâm:** `src/app/dich-vu/page.tsx`, `gioi-thieu`, `hoi-dap`, `lien-he`, `tai-khoan/components/*`, `src/features/admin/components/*`.

1. Áp dụng `PageHero`, section primitives và responsive grid cho trang nội dung (`/dich-vu`, `/gioi-thieu`, `/hoi-dap`, `/lien-he`, `/hanh-ly`, `/lam-thu-tuc-truc-tuyen`).
2. Đồng nhất service detail qua query `?service=`; tất cả CTA trỏ tới route có thật (kiểm cả route hiện có `/hanh-ly`, `/lam-thu-tuc-truc-tuyen`).
3. Tài khoản giữ dashboard riêng nhưng dùng token, table, form và mobile navigation chung.
4. Admin chỉ chuẩn hoá readability, density, table and feedback patterns; không ép giao diện public lên console nghiệp vụ.

**Cổng duyệt:** không route 404 từ navigation (gồm các route bổ sung ở inventory Phase 0); user/admin role guard vẫn đúng.

**Trạng thái 19/10/2026:** chưa có hồ sơ đo lường cho phase này. *(Một phần nhỏ đã chạm: `/hanh-ly` và `/lam-thu-tuc-truc-tuyen` đã là redirect/alias đúng như mục 2 yêu cầu.)*

### Phase 6 — QA, regression và tối ưu

1. 🟡 Mở rộng `scripts/ui-check.cjs`: **✅ đủ ba viewport canonical cho 12 route hiện có, cộng 4 cờ cấu trúc landmark và 1 phép thử hành vi skip link**. **Còn thiếu:** interaction cookie/promo/menu, focus/keyboard tổng quát, trạng thái lỗi, và **5 bề mặt chưa nằm trong cổng**: `/quen-mat-khau`, `/dat-lai-mat-khau`, `/thanh-toan`, `/dat-ve/[id]`, cùng các panel `/dich-vu?service=<id>` khác (`meal`, `seat`, `insurance`, `priority`, `lounge` — hiện chỉ chụp `baggage`).
2. Thêm visual regression: **trước tiên phải chọn và cài công cụ diff** (`pixelmatch`/`looks-same`/`playwright` — repo hiện chỉ có `puppeteer-core` để chụp, không có để so sánh), định nghĩa masking cho banner động, và dùng ngưỡng diff theo section thay vì toàn trang.
3. Kiểm tra Lighthouse/Next bundle: ảnh `next/image` hoặc `<img>` có kích thước cố định, preload hero đúng một ảnh, font không gây CLS. *(Chưa chạy Lighthouse lần nào — mốc "≥90" ở `docs/plans/phase-1-execution.md` mục 5 là mục tiêu, chưa phải số đo.)*
4. Chạy lint, type-check, unit/integration, build, smoke, UI check và manual keyboard/mobile review.

**Cổng duyệt phát hành:** toàn bộ gate xanh, không có asset chưa rõ quyền, changelog/screenshot được cập nhật.

**Trạng thái 19/10/2026:** ba viewport canonical ✅, landmark ✅, skip link ✅; công cụ diff ảnh ❌ chưa chọn; interaction/Lighthouse ❌ chưa làm.

## 6. Thứ tự thực thi và phụ thuộc

`Phase -1 → Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6`

- **Phase -1 là blocker cứng và là cổng duy nhất còn đỏ:** trên 32 file trong `public/` còn 23 file chưa xác minh quyền, cộng 3 asset thương hiệu đã quyết định Thay (T) nhưng chưa có file mới, phải xử lý trước mọi thay đổi UI. *(Ngoại lệ đã được chủ dự án duyệt: Phase 0 chạy trước Phase -1 để lấy số liệu — xem ghi chú ở Phase 0.)*
- Phase 1 phải hoàn thành trước khi thay nhiều component để tránh token drift. Hiện **mục 6 (a11y/landmark/skip link) ✅** nhưng **mục 1–5 (token, primitives, spacing, font) chưa làm**, nên Phase 2–5 chưa được mở.
- Phase 2 phải hoàn thành trước Phase 3 vì header/overlay quyết định hero viewport và safe area.
- Phase 3/4 có thể triển khai song song sau khi primitives đã ổn định, nhưng phải dùng cùng visual regression baseline.
- Phase 5 triển khai cuối để tránh làm admin/auth chịu thay đổi công khai không cần thiết.

## 7. Rủi ro và cách kiểm soát

| Rủi ro | Kiểm soát |
| --- | --- |
| Sao chép tài sản không có quyền | Phase -1 bắt buộc; trên 32 file trong `public/` còn **23 file chưa xác minh nguồn gốc** + 3 file thương hiệu đã quyết định Thay (T) nhưng chưa thay, phải xử lý trước mọi thay đổi UI. |
| Hình giống nhưng luồng booking lỗi | Mỗi PR UI chạy test route/API/booking hiện có (**73 file / 761 test** + `test:smoke`, `test:wallet-e2e`). |
| Responsive bị vỡ bởi hero/overlay | Screenshot tại ba viewport canonical (`768×1024` **đã được test** từ 18/10/2026) và test overflow tự động trong `test:ui`. |
| CSS token bị pha tạp | Chỉ thêm màu qua token; review chặn hard-code mới. |
| Performance giảm vì carousel/ảnh | Kích thước ảnh, preload một hero, lazy-load dưới fold, đo CLS/LCP. |
| Dirty worktree chồng chéo | Tách commit/PR theo phase; không rewrite thay đổi không thuộc phase. |

## 8. Checklist hoàn thành

> **Cập nhật 18/10/2026 (sau commit skip link + fontSize + đổi tên hero + test onFlightSelect):**
> - Đổi tên 2/23 file UUID theo Phase -1 mục 5 (`hero-vietjet-holiday.jpg`, `hero-vietjet-skyboss.jpg`); code hết tham chiếu tên cũ (grep = 0), registry đã đồng bộ.
> - Skip link nằm trong `src/app/layout.tsx`, **nhưng đích `#main-content` ở tầng layout là sai**: layout bọc luôn `<Header />` của trang, nên Tab sau skip link rơi lại vào announcement bar, và `/trang-chu` có 3 thẻ `<main>`. Sửa ngày 19/10/2026 (xem khối dưới) — mục 6 không còn nợ này.
> - `tailwind.config.js` đã `extend fontSize` cho 40px (`2xl2`/`5xl2`); baseline nợ được chốt lại bằng `vietjetsim-main/scripts/css-debt-baseline.json`: **648 `text-[Npx]`, 400 class hex** (con số "645" trước đây là đo tay và đã bỏ).
> - `onFlightSelect` đã gọi ở 3 vị trí chọn vé trong `FlightResultsStep`; panel tóm tắt + tab hạng ghế + nút "Đi tiếp" đã nối với wizard (test mới pass).
> - **Còn đỏ:** 23 asset chưa xác minh + 3 asset thương hiệu **đã quyết định Thay (T), chờ file mới từ team design** (blocker Phase -1, xem `docs/design/asset-decisions.md`); visual regression chưa có tool diff.

> **Cập nhật 19/10/2026 (landmark + skip link — Phase 1 mục 6):**
> - `#main-content` chuyển về **từng trang**, đặt sau `<Header />` của chính nó; layout còn `<div>`. Gỡ hết `<main>` lồng nhau: `/trang-chu` 3 → 1, `FlightResultsStep` (trong `/tim-ve`), `AdminDashboardClient` (trong `/quan-tri`); skeleton `loading.tsx` không còn tự nhận là landmark; `/editor` được cấp landmark (ngoại lệ cuối cùng).
> - `npm run test:ui` kiểm thêm cấu trúc landmark trên **DOM sống** (đúng 1 `<main>`, đúng 1 `#main-content`, không lồng nhau, đích phải nằm sau `<header>`) — lần chạy đầu bắt được `/quan-tri` desktop+tablet (`#main-content` bao cả header console). Sau khi dời landmark vào panel tab: **35/35 sạch**.
> - `eslint.config.mjs` ignore `.next-uicheck/`: lint về ~26 s (trước đó quét 184 MB cây build sinh `.ts`).
> - Bằng chứng đo lường: `docs/qa/PHASE1_LANDMARK_SKIPLINK_2026-10-19.md`.

> **Cập nhật 19/10/2026 (hoàn thiện kế hoạch này):**
> - Đo lại toàn bộ số liệu cũ và sửa cho khớp thực tế: 14 → **35 màn hình** `ui-check`; 70 → **73 file / 761 test**; **390 → 400** class hex (`vietjetsim-main/scripts/css-debt-baseline.json`); "46/56 file chưa xác minh" → **23/32**.
> - Thêm bảng **Trạng thái thực thi** ở đầu tài liệu (từng phase + hồ sơ + các cổng kỹ thuật đang xanh), ghi rõ **cổng duy nhất còn đỏ là Phase -1**.
> - Ghi lại ba quyết định đã chốt mà bản kế hoạch chưa có: **chạy Phase 0 trước Phase -1** (đảo thứ tự ở mục 6, có lý do), **ratchet thay cho "rule lint"** (`scripts/css-debt.cjs`), và **3 asset thương hiệu đã quyết định Thay (T)** thay vì "chờ quyết định".
> - Sửa danh sách route ở Phase 0 mục 5 cho khớp `src/app` (`dat-ve` chỉ tồn tại dưới dạng `/dat-ve/[id]`; `/hanh-ly` là redirect; `/editor` ngoài phạm vi) và nối lại đường dẫn hồ sơ QA (`docs/reports/` → `docs/qa/`).

> **Cập nhật 19/10 (buổi chiều — đối soát asset và cổng kỹ thuật):**
> - **Phase -1 hoàn tất trên thực tế, không chỉ trên giấy:** đối chiếu `find public -type f` với tham chiếu thật trong `src/` — phát hiện bản staged tuyên bố xoá sạch nhưng working tree còn 103 file (62 orphan: UUID/Vinpearl/`download*`/bản copy), **7 file rủi ro vẫn được tham chiếu ở 7 chỗ** (HeroSection, LargePromoBanners, PromotionalBannersSection, AuthShell, chuyen-bay-cua-toi) và **5 URL hotlink S3** (`vj-prod-website-cms`) còn sống trong PromotionalBannersSection.
> - Đã re-point 17 tham chiếu sang asset nội bộ đã đăng ký, xoá 62 orphan, gỡ 5 hotlink → `public/` còn **41 file, 0 orphan, 0 hotlink**; chi tiết và bảng re-point: `docs/design/asset-registry.md`.
> - Nợ CSS mới phát sinh trong batch: 5 file mới/dư mới (HeroBookingWidget, SeatSelectionDrawer, BaggageSelectionDrawer, AncillaryServicesStep, AuthShell) có **+127 hex-class, +22 `text-[Npx]`** — đã migrate hết về token/scale: thêm 5 token `vj` (red-panel, gold-hover, tab-active, tab-idle, tab-idle-hover) + 6 bậc fontSize (3xs/2xs/xs2/sm2/base2/3xl2), hex → token Tailwind stock khi trùng giá trị gốc (yellow-500, orange-600, sky-600…). Sau migrate: color **256 → 237 (−19)**.
> - `npm test` đo lại: **84 file / 829 test xanh** (tăng từ 73/761 nhờ workstream SkyJoy); type-check sạch; lint 0 error / 5 warning.
> - **Ratchet tạm đỏ (+16 fontSize, +88 hex lúc 11:51):** một workstream song song đang sửa tiếp cùng working tree (Header, FlightCard, DatePicker, AnnouncementBar — mtime < 5 phút). **Kết cục:** workstream kia dừng 12:19; migrate nốt toàn bộ batch (map hex → token/scale, thêm token `success`/`social`/`vj.gold-bronze`) → **486/162 (−256)**, baseline hạ để khoá; `test:ui` chạy lại trên bản production build: **35/35** (3 cờ BOX TRÙNG đầu tiên là false positive từ cross-fade hero — probe đã sửa để bỏ qua phần tử không đục). Batch đã commit thành 4 cụm: `865cd46` assets, `9b99d55` tokens/gate, `1549f9d` auth, `0461005` ui.
> - Bằng chứng: `docs/design/asset-registry.md` (bản đối soát).

Trạng thái đo ngày 19/10/2026:

| # | Điều kiện hoàn thành | Trạng thái | Bằng chứng / việc còn lại |
| --- | --- | --- | --- |
| 1 | **Phase -1:** registry đủ mọi file; 0 asset nguồn gốc không rõ; 0 orphan; 3 asset thương hiệu đã thay | ✅ | đối soát 19/10 chiều: 41/41 file dùng thật, 0 orphan, 0 hotlink, 17 tham chiếu rủi ro đã re-point — `docs/design/asset-registry.md` |
| 2 | Baseline đủ tại ba viewport canonical (gồm `768×1024`) | ✅ | `docs/qa/BASELINE_3VIEWPORT_2026-10-18.md` — 35/35 sạch |
| 3 | Token/primitives đạt lint/type-check/build, nợ `text-[Npx]`/hex-class **giảm** so với baseline | ❌ | lint/type-check/build xanh, nhưng ratchet vẫn ở 648/400 và nợ chưa giảm (`npm run lint:css-debt`) |
| 4 | Header/footer/overlay được duyệt bằng ảnh ở ba viewport canonical | ❌ | chưa có hồ sơ Phase 2 |
| 5 | Trang chủ/tìm vé đạt visual comparison và không hồi quy luồng đặt vé | ❌ | chưa có công cụ diff ảnh (Phase 6 mục 2) |
| 6 | Booking, payment, lookup, check-in và my flights qua test chức năng | 🟡 | 761 test xanh; `test:smoke` / `test:wallet-e2e` là gate riêng, chưa gắn vào quy trình phase |
| 7 | Nội dung/tài khoản/admin không route hỏng và role guard giữ nguyên | 🟡 | link chết `/dat-ve` ở `ActivityBar` đã sửa (18/10); chưa quét lại toàn bộ navigation |
| 8 | `npm run lint`, `npm run type-check`, `npm test`, `npm run build`, `npm run test:smoke`, `npm run test:ui` xanh | ✅ | đo 19/10: lint sạch (~26 s), type-check sạch, 761 test, build OK, `test:ui` 35/35 |
| 9 | Visual/keyboard/manual QA ghi vào `docs/qa/` (không phải `docs/reports/` — thư mục đó là báo cáo cũ từ 25/09/2026) | 🟡 | landmark/skip link ✅ đã có hồ sơ; visual diff và manual review còn thiếu |

> **Repo chưa có CI**, nên "gate xanh" ở đây nghĩa là **đã chạy tay và ghi lại ngày đo**, không phải CI tự chặn. Cân nhắc nối `lint:css-debt` + `test:ui` vào CI ở Phase 6.
