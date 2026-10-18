# Phản Biện Kế Hoạch Đối Chiếu Giao Diện Vietjetair.com

**Ngày lập:** 18/10/2026
**Đối tượng phản biện:** `docs/plans/KE_HOACH_DOI_CHIEU_VIETJETAIR_2026-10-18.md`
**Phương pháp:** đối chiếu từng mục của kế hoạch với trạng thái thực tế của `vietjetsim-main/` (grep, `find`, `md5`, `git ls-files`, đọc `package.json`).
**Kết luận ngắn:** Kế hoạch đúng hướng và trung thực về liêm chính, nhưng **đánh giá thấp quy mô nợ kỹ thuật** và **bỏ sót blocker lớn nhất là tính hợp lệ của asset**. Nếu triển khai nguyên trạng, cổng duyệt Phase 0 sẽ được đánh dấu "đạt" trong khi thực tế chưa đạt.

## 1. Điểm mạnh cần giữ

- Mục 1 định nghĩa "100%" là 100% hạng mục đã liệt kê, không phải sao chép nguyên trạng — minh bạch và đúng pháp lý.
- Có mục "Ngoài phạm vi" rõ ràng (API thật, thanh toán thật, CMS nội bộ).
- Thứ tự phụ thuộc hợp lý: Foundation (Phase 1) trước Chrome (Phase 2) trước Trang chủ/Tìm vé (Phase 3).
- Bảng rủi ro có nội dung thực chất, đặc biệt rủi ro "CSS token bị pha tạp" và "dirty worktree chồng chéo".

## 2. Năm vấn đề chặn (blocker)

### B1. Asset registry ở mức ~9% và cổng duyệt Phase 0 đang FAIL âm thầm

Đo được:

| Chỉ số | Kế hoạch giả định | Thực tế |
| --- | --- | --- |
| Số dòng trong `docs/design/asset-registry.md` | đủ cho mọi asset | 5 dòng (trước khi cập nhật) |
| Số file trong `public/` | — | **56** |
| File đăng ký | 56 | 5 |
| `public/images/promos/` | "chưa tracked, cần đăng ký" | **đã tracked** (`git ls-files` xác nhận 6 file) |
| `public/images/hero/` | không đề cập | **36 file, 8,87 MB, không có dòng đăng ký nào** |

- `public/images/promos/*.webp|png` **đã được commit**, trái với mô tả "chưa tracked" trong tài liệu.
- `public/images/hero/` chứa các file có dấu hiệu lấy từ CMS/CDN của hãng: hậu tố epoch-millis (`vinpearlresortnhatrang-1769013852892.png`), UUID (`261ceb09-de92-4981-b4f0-eb6c37ee5720.jpg`), tên campaign (`eng12mybookingbanner690x600-1779349916540.jpg`).
- Điều này **mâu thuẫn trực tiếp** với mục 1 và rủi ro #1 của chính kế hoạch, đồng thời với checklist Phase 0 "không tải asset từ vietjetair.com vào repo".

**Khuyến nghị:** tách một phase mới **"Phase -1 — Asset compliance"** làm blocker cứng trước mọi việc UI. Chi tiết trạng thái từng file xem `docs/design/asset-registry.md`.

### B2. Kiểm kê viewport không nhất quán và baseline không đạt yêu cầu

- Mục 2 liệt kê 4 viewport: `390×844`, `768×1024`, `1280×900`, `1440×1000`.
- `scripts/ui-check.cjs` chỉ có capture mobile `390×844` + desktop mặc định; baseline thực tế chạy `1440×900` — tức **viewport thứ năm, không có trong danh sách của kế hoạch**.
- Mobile mới chụp cho `trang-chu` và `tim-ve`.
- **`768×1024` (tablet) chưa được test ở bất kỳ đâu** — đây lại là breakpoint dễ vỡ nhất với header nhiều tầng + drawer + hero.
- Tài liệu tự mâu thuẫn: mục 2 nói "desktop + mobile" nhưng Phase 0 nói "bốn viewport".

**Khuyến nghị:** chốt một bộ canonical duy nhất (đề xuất `390×844`, `768×1024`, `1440×900`; bỏ `1280×900` để tránh trùng lặp vô nghĩa), mở rộng `ui-check.cjs` cho đủ bộ trước khi tuyên bố baseline đạt.

### B3. "Chuẩn hoá token" thực chất là refactor toàn repo

- Kế hoạch yêu cầu `--surface-muted`, `--text`, `--text-muted`, `--brand-red`, `--brand-gold`.
- Thực tế `src/styles/tailwind.css` đã có hệ tên khác: `--surface/--surface-2/--surface-3`, `--foreground/--foreground-muted/--foreground-subtle`, `--border`, `--primary/--accent`, cộng thêm bộ trùng lặp `--vj-*` và `tailwind.config.js` có cả `vjred/vjyellow/...` lẫn `primary/accent/vj`.
- Nợ đo được trong `src/`: **648 lần `text-[Npx]`**, **390 class dùng hex tuỳ ý** (`bg|text|border|from|to|via-[#…]`).

**Khuyến nghị:** đổi từ "chuẩn hoá/đổi tên token" sang **"map sang token hiện có + thêm alias"**; tách thành phase riêng có số baseline và yêu cầu giảm theo batch, kèm rule lint chặn phát sinh mới.

### B4. Font đang tự mâu thuẫn trong repo

- `src/styles/tailwind.css` dòng 1: *"@import Google Fonts moved to next/font for zero render-blocking"*.
- `src/app/layout.tsx` dòng 66–75: vẫn dùng `<link href="https://fonts.googleapis.com/...">` kèm `eslint-disable @next/next/no-page-custom-font`.
- `docs/design/asset-registry.md` cũng khẳng định "qua `next/font`".

**Khuyến nghị:** Phase 1 mục 4 phải ghi rõ trạng thái mâu thuẫn này và **chốt một hướng**, kèm rủi ro khi chuyển `next/font` (dấu tiếng Việt, subset, CLS).

### B5. Phase 6 giả định có công cụ visual regression — chưa tồn tại

- `package.json` **không có** `pixelmatch`, `looks-same`, `playwright`, `jest-image-snapshot`. Chỉ có `puppeteer-core` để **chụp**, không có để **so sánh**.
- Phase 6 mục 2 nói "thêm visual regression dựa trên snapshot được duyệt, ngưỡng diff theo section" — cách làm đúng, nhưng thiếu hẳn task "chọn & cài công cụ, định nghĩa masking cho banner động".

**Khuyến nghị:** thêm dependency này như một task tường minh của Phase 6, có quyết định công cụ.

## 3. Điểm kế hoạch viết như "làm mới" nhưng thực tế đã xong

| Nội dung kế hoạch | Trạng thái thực tế |
| --- | --- |
| Phase 2.5 — cookie xuất hiện trước, promo sau quyết định cookie | **Đã có** trong `src/shared/components/feedback/SiteOverlays.tsx` (`vj-cookie-consent`, `vj-promo-dismissed`; promo chỉ hiện khi `hasCookieDecision`) |
| Phase 1 — primitives `Button/InputField/Section/Card/IconButton/Skeleton` | **Đã có** trong `src/shared/components/ui/` |
| Phase 1 — `PageHero` trong `ui/` | Nằm ở `src/shared/components/navigation/PageHero.tsx` (kế hoạch và baseline ghi sai vị trí) |
| Phase 4 — "test E2E hiện có phải pass" | Có **70 file test** (`payment.test.ts`, `booking.test.ts`, `rbac-enforcement.test.ts`, `csrf.test.ts`…) nhưng là vitest unit/integration, không phải E2E. E2E thật nằm ở `scripts/` (`test:smoke`, `test:wallet-e2e`, `test:ui`) |

**Khuyến nghị:** đổi các mục cookie/promo/primitives từ "xây" sang "kiểm thử bổ sung"; sửa thuật ngữ "E2E" và chỉ rõ script nào chứng minh "booking flow không hồi quy".

## 4. Lỗ hổng và điểm mơ hồ khác

- **Skip link chưa tồn tại**: không thấy skip-link trong `src/app/layout.tsx` hay `Header.tsx`, dù Phase 1 mục 5 yêu cầu. Cần task cụ thể kèm test keyboard.
- **Token dark-mode còn sót**: `tailwind.css` vẫn định nghĩa block dark (`--dark-*`, override `--surface`…) trong khi repo có `scripts/remove-dark-mode.js` và comment "brand only ships a light presentation". Đây chính là "token drift" mà kế hoạch cảnh báo → nên dọn trong Phase 1.
- **Inventory route thiếu**: kế hoạch bỏ sót route đang tồn tại `/lam-thu-tuc-truc-tuyen`, `/hanh-ly`, `/quen-mat-khau`, `/dat-lai-mat-khau` và `/editor`. Cần bổ sung, hoặc **loại trừ `/editor` (CMS) tường minh**.
- **Thang typography không khớp Tailwind**: mục 4 yêu cầu "tránh `text-[Npx]` nếu Tailwind đã có thang phù hợp", nhưng trong dải 12/14/16/20/24/32/40 thì **40px không có utility tương ứng** (`text-4xl` = 36px). Cần `extend fontSize` hoặc ghi rõ ngoại lệ — nếu không, cổng này không đo được.
- **Thiếu gate định lượng**: mọi phase đều "duyệt bằng ảnh" (định tính) nhưng không có ngưỡng cho nợ CSS. Đề xuất chốt baseline (648 `text-[Npx]`, 390 hex-class) và yêu cầu giảm theo phase.
- **Định nghĩa cổng "baseline đủ desktop/mobile"** không nêu số viewport, dẫn tới việc baseline hiện tại (2 viewport) vẫn được coi là đạt.

## 5. Sáu chỉnh sửa đề xuất cho tài liệu

1. Thêm **Phase -1 — Asset compliance** (đăng ký đủ 56 file, phân loại nguồn/giấy phép 46 file chưa xác minh, quyết định 24 file orphan, xử lý 3 asset rủi ro thương hiệu) làm hard blocker.
2. Chốt **một bộ viewport canonical** dùng thống nhất cho mục 2 và Phase 0; mở rộng `ui-check.cjs` trước khi công nhận baseline.
3. Đổi "chuẩn hoá token" → **"map sang token hiện có + thêm alias"**, kèm baseline số đếm và rule lint.
4. Thêm **dependency tường minh** ở Phase 6: chọn + cài công cụ visual diff, định nghĩa masking.
5. **Sửa các chi tiết sai**: vị trí `PageHero`, ngữ nghĩa "E2E", trạng thái cookie/promo, và mâu thuẫn font.
6. **Bổ sung inventory route** đang thiếu và loại trừ `/editor` tường minh.

## 6. Kết luận

Kế hoạch có thể triển khai được sau khi vá 6 điểm trên. Ưu tiên tuyệt đối là **Phase -1 (asset compliance)**: mọi hạng mục UI phía sau đều vô nghĩa về mặt pháp lý nếu xây trên 46 asset chưa rõ quyền.
