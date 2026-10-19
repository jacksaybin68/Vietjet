# Kế Hoạch Thực Thi Phase 1 — Foundation: tokens, layout, accessibility

**Ngày lập:** 18/10/2026  
**Phase:** Phase 1 trong chuỗi 6 phase đối chiếu giao diện Vietjetair  
**Repo:** `/Users/user/orca/vietjet/Vietjet/vietjetsim-main`  
**Tài liệu gốc:** `docs/plans/KE_HOACH_DOI_CHIEU_VIETJETAIR_2026-10-18.md`

## 1. Mục đích Phase 1

Phase 1 thiết lập nền tảng design token, spacing scale, typography scale và accessibility trước khi thay đổi giao diện hàng loạt ở các phase sau. Mục tiêu là **có dữ liệu trước khi thay giao diện, tránh token drift** khi đổi component.

Phase này **KHÔNG được sửa layout công khai** ngoài phạm vi đã duyệt; chỉ chuẩn hoá token, primitive component và bổ sung accessibility.

## 2. Tổng hợp nợ kỹ thuật hiện tại

Theo `docs/plans/KE_HOACH_DOI_CHIEU_VIETJETAIR_2026-10-18.md` mục 3.6:

- **612 lần `text-[Npx]`** trong `src/` (kích thước tuỳ ý thay vì dùng Tailwind utility)
- **301 class hex tuỳ ý** trong `src/` (màu hard-code thay vì token)
- **Token trùng lặp:** repo có cả `--surface/--foreground/--primary/--accent` và `--vj-*/vjred/vjyellow` trong `tailwind.config.js`
- **Dark-mode token còn sót** trong `src/styles/tailwind.css` (comment ghi "brand only ships a light presentation", nhưng CSS chưa dọn)
- **Skip link đã có** (layout.tsx:87-92, WCAG 2.4.1 compliant, cần kiểm tra landmark/heading/label)
- **Font loading mâu thuẫn:** `src/styles/tailwind.css` dòng 1 comment "đã chuyển sang `next/font`", nhưng `src/app/layout.tsx` dòng 66–75 vẫn dùng `<link>` Google Fonts
- **fontSize 40px đã có:** `text-2xl2` và `text-5xl2` = 2.5rem, chỉ cần migrate `text-[40px]`

## 3. Sáu mục công việc Phase 1

### Mục 1: Map sang token hiện có (KHÔNG rename hàng loạt)

**Mô tả:** Repo đã có hai hệ token (`--surface/--foreground/--primary/--accent` và `--vj-*/vjred/vjyellow`). Chốt một hệ duy nhất, thêm alias CSS variable nếu cần để giữ tương thích ngược. **KHÔNG được rename hàng loạt** vì sẽ chạm 648 `text-[Npx]` + 390 hex-class và gây regression.

**Người làm:** Frontend lead hoặc design system owner  
**Output:**
- File `src/styles/tailwind.css` và `tailwind.config.js` đã chốt token canonical
- Document mapping trong `docs/design/design-tokens.md` (nếu chưa có)
- Test `npm run lint && npm run type-check` pass

**Files liên quan:**
- `src/styles/tailwind.css`
- `tailwind.config.js`
- (tùy chọn) `docs/design/design-tokens.md`

**Estimated time:** 3 giờ (2h audit + map, 1h document)

---

### Mục 2: Dọn token dark-mode còn sót

**Mô tả:** Dùng script có sẵn `scripts/remove-dark-mode.js` để loại bỏ `.dark {...}` blocks, `--dark-*` variables và các dòng có `.dark` class trong `src/styles/tailwind.css`. Script đọc từ backup và ghi vào file chính.

**Người làm:** Developer có quyền sửa CSS globals  
**Output:**
- File `src/styles/tailwind.css` không còn dark-mode CSS
- Log diff trước/sau (số dòng giảm)
- Test `npm run build` pass, UI không thay đổi (vì brand chỉ ship light mode)

**Files liên quan:**
- `src/styles/tailwind.css`
- `scripts/remove-dark-mode.js`

**Estimated time:** 1 giờ (chạy script + kiểm tra)

---

### Mục 3: Chuẩn hoá primitive components

**Mô tả:** Rà và chuẩn hoá 6 primitive component trong `src/shared/components/ui/`: `Button`, `InputField`, `Section`, `Card`, `IconButton`, `Skeleton`. Đảm bảo mỗi component dùng token từ mục 1, có variant/size props rõ ràng, không hard-code màu/spacing.

**Lưu ý:** `PageHero` nằm ở `src/shared/components/navigation/PageHero.tsx`, **KHÔNG phải `ui/`**, nên không nằm trong scope mục này.

**Người làm:** Frontend developer + design system owner  
**Output:**
- 6 file component đã chuẩn hoá: `Button.tsx`, `InputField.tsx`, `Section.tsx`, `Card.tsx`, `IconButton.tsx`, `Skeleton.tsx`
- Storybook hoặc dev page demo các variant (nếu có)
- Test unit cho từng component pass

**Files liên quan:**
- `src/shared/components/ui/Button.tsx`
- `src/shared/components/ui/InputField.tsx`
- `src/shared/components/ui/Section.tsx`
- `src/shared/components/ui/Card.tsx`
- `src/shared/components/ui/IconButton.tsx`
- `src/shared/components/ui/Skeleton.tsx`

**Estimated time:** 8 giờ (1–1.5h mỗi component)

---

### Mục 4: Scale spacing và fontSize, thêm lint rule

**Mô tả:**
1. Chốt spacing scale: `4/8/12/16/24/32/48/64/96` trong `tailwind.config.js` (`theme.extend.spacing`).
2. `extend fontSize` cho 40px (vd: `'2xl2': '40px'` hoặc `'5xl2': '40px'`) để tránh `text-[40px]`.
3. Thay spacing tuỳ ý tại **component công khai** (không phải admin/auth) theo batch nhỏ, ưu tiên các file có nhiều `text-[Npx]`/hex-class nhất.
4. Thêm ESLint rule hoặc comment warning chặn `text-[Npx]` và hex color class mới phát sinh (có thể dùng custom rule hoặc `eslint-plugin-tailwindcss`).

**Người làm:** Frontend lead + developer batch  
**Output:**
- `tailwind.config.js` đã có spacing scale và fontSize 40px
- ESLint config hoặc `.eslintrc.js` có rule cảnh báo `text-[Npx]`/hex
- 3–5 file component công khai đã chuyển sang scale (ví dụ: `Header.tsx`, `Footer.tsx`, `FlightCard.tsx`)
- Baseline nợ CSS giảm (đo bằng `grep -r 'text-\[' src/ | wc -l` và `grep -r '#[0-9A-Fa-f]\{6\}' src/ | wc -l`)

**Files liên quan:**
- `tailwind.config.js`
- `.eslintrc.js` hoặc `eslint.config.js`
- Batch component: `src/shared/components/navigation/Header.tsx`, `Footer.tsx`, `src/features/flights/components/FlightCard.tsx` (ví dụ)

**Estimated time:** 6 giờ (2h config, 4h batch refactor)

---

### Mục 5: Chốt font loading và sửa mâu thuẫn

**Mô tả:** Hiện tại `src/styles/tailwind.css` dòng 1 comment "đã chuyển sang `next/font`", nhưng `src/app/layout.tsx` dòng 66–75 vẫn dùng `<link>` Google Fonts. Chốt một hướng:

**Phương án A (khuyến nghị):** Giữ `<link>` Google Fonts, sửa comment trong `tailwind.css` cho khớp.  
**Phương án B:** Chuyển sang `next/font/google`, **bắt buộc kiểm tra:**
- Dấu tiếng Việt hiển thị đúng (subset `vietnamese` hoặc `latin-ext`)
- CLS (Cumulative Layout Shift) không tăng
- Font weight/style đầy đủ (KoHo: 300, 400, 500, 600, 700; Be Vietnam Pro: 400, 500, 600, 700)

**Người làm:** Frontend lead + QA  
**Output:**
- `src/styles/tailwind.css` và `src/app/layout.tsx` đồng bộ
- Test thủ công: tiếng Việt hiển thị đúng ở cả 3 viewport canonical (`390×844`, `768×1024`, `1440×900`)
- Lighthouse CLS score không giảm

**Files liên quan:**
- `src/styles/tailwind.css`
- `src/app/layout.tsx`

**Estimated time:** 3 giờ (1h quyết định + implement, 2h test)

---

### Mục 6: Rà semantic heading, landmark, skip link, focus, alt, label

**Mô tả:** Kiểm tra accessibility cho các route công khai:

1. **Semantic heading:** `<h1>` duy nhất mỗi trang, hierarchy `h1 → h2 → h3` không nhảy cấp.
2. **Landmark:** `<header>`, `<nav>`, `<main>`, `<footer>`, `<aside>` đúng ngữ nghĩa.
3. **Skip link:** Đã có trong `src/app/layout.tsx` (commit gần đây), kiểm tra hoạt động đúng (`Tab` đầu tiên → nhảy tới `#main-content`).
4. **Focus visible:** Tất cả button/link/input có `focus:outline` hoặc `focus:ring` rõ ràng (dùng gold outline + red ring theo thiết kế).
5. **Alt text:** Tất cả `<img>` có `alt` (trừ decorative thì `alt=""`).
6. **Form label:** Tất cả `<input>`, `<select>`, `<textarea>` có `<label>` hoặc `aria-label`.

**Người làm:** Accessibility specialist hoặc frontend developer + QA  
**Output:**
- Checklist audit cho 5–10 route công khai quan trọng (trang chủ, tìm vé, đặt vé, thanh toán, tra cứu)
- Fix list: danh sách issue tìm được và PR sửa
- Test keyboard navigation: `Tab`, `Shift+Tab`, `Enter`, `Escape` hoạt động đúng

**Files liên quan:**
- `src/app/layout.tsx` (skip link, landmarks)
- `src/shared/components/navigation/Header.tsx`, `Footer.tsx`
- `src/shared/components/ui/Button.tsx`, `InputField.tsx`
- Các page component: `src/app/trang-chu/page.tsx`, `src/app/tim-ve/page.tsx`, `src/app/dat-ve/[id]/page.tsx`, etc.

**Estimated time:** 6 giờ (3h audit, 3h fix)

---

## 4. Tổng hợp estimated time

| Mục | Estimated time |
| --- | --- |
| Mục 1: Map token | 3 giờ |
| Mục 2: Dọn dark-mode | 1 giờ |
| Mục 3: Chuẩn hoá primitives | 8 giờ |
| Mục 4: Scale + lint rule | 6 giờ |
| Mục 5: Font loading | 3 giờ |
| Mục 6: Accessibility audit | 6 giờ |
| **Tổng** | **27 giờ** |

## 5. Cổng duyệt Phase 1

Phase 1 **chỉ được coi là hoàn thành** khi:

1. ✅ `npm run lint` pass (0 error)
2. ✅ `npm run type-check` pass (0 TS error)
3. ✅ `npm run build` pass
4. ✅ Nợ CSS (`text-[Npx]`, hex-class) **giảm ít nhất 10%** so với baseline (612 `text-[Npx]` → ≤550; 301 hex-class → ≤270)
5. ✅ Layout công khai **không đổi ngoài phạm vi đã duyệt** (so sánh screenshot với baseline Phase 0 tại 3 viewport canonical)
6. ✅ Skip link hoạt động (`Tab` đầu tiên → nhảy `#main-content`)
7. ✅ Keyboard navigation không bị broken ở trang chủ, tìm vé, đặt vé
8. ✅ Lighthouse Accessibility score ≥90 cho trang chủ và tìm vé

## 6. Rủi ro và cách kiểm soát

| Rủi ro | Kiểm soát |
| --- | --- |
| **Rename hàng loạt chạm 648 `text-[Npx]` + 390 hex-class** | Map alias thay vì rename; refactor từng batch nhỏ, không chạm toàn repo cùng lúc. |
| **Chuyển `next/font` ảnh hưởng CLS/dấu tiếng Việt** | Test thủ công với tiếng Việt ở 3 viewport; đo CLS trước/sau; nếu regression thì rollback về `<link>`. |
| **Token drift giữa các phase** | Chốt token canonical ở Phase 1 và document trong `docs/design/`; các phase sau **chỉ được dùng token đã chốt**, không tự thêm. |
| **Accessibility fix làm vỡ layout** | Review visual trước/sau mỗi fix; chỉ sửa semantic/ARIA, không đổi CSS layout trừ khi cần thiết cho focus visible. |
| **Lint rule quá strict chặn code hợp lệ** | Dùng warning thay vì error; cho phép disable per-line với comment giải thích. |
| **Script `remove-dark-mode.js` xoá nhầm CSS** | Chạy trên backup trước (`tailwind.css.backup`); review diff trước khi commit; test build sau khi chạy. |

## 7. Thứ tự thực thi

Các mục **phải thực hiện tuần tự** do phụ thuộc:

```
Mục 1 (Map token) → Mục 2 (Dọn dark-mode) → Mục 3 (Primitives) → Mục 4 (Scale + lint)
                                                                    ↓
                                                   Mục 5 (Font) + Mục 6 (A11y) song song
```

- Mục 1 phải xong trước Mục 2 vì cần biết token nào canonical để giữ lại.
- Mục 2 phải xong trước Mục 3 vì primitive components sẽ reference token đã dọn.
- Mục 3 phải xong trước Mục 4 vì refactor batch cần primitive đã chuẩn để thay thế.
- Mục 5 và Mục 6 có thể chạy song song sau khi Mục 4 xong, vì không phụ thuộc nhau.

## 8. Lưu ý đặc biệt

1. **PageHero không nằm trong `ui/`:** File `src/shared/components/navigation/PageHero.tsx` thuộc navigation/, không phải primitive component. Mục 3 **KHÔNG bao gồm** PageHero.

2. **Không sửa admin/auth:** Phase 1 chỉ refactor component công khai (header, footer, trang chủ, tìm vé, v.v.). Admin console và auth flow giữ nguyên.

3. **Baseline nợ CSS:** Đo trước khi bắt đầu Phase 1:
   ```bash
   grep -r 'text-\[' src/ | wc -l  # baseline: 612
   grep -r '#[0-9A-Fa-f]\{6\}' src/ --include='*.tsx' --include='*.ts' | wc -l  # baseline: 301
   ```

4. **Visual regression:** Mỗi PR trong Phase 1 phải chụp ảnh route bị ảnh hưởng ở 3 viewport canonical và so với baseline Phase 0. Nếu có diff ngoài phạm vi đã duyệt → block PR.

5. **Font subset:** Nếu chọn Phương án B (next/font), bắt buộc dùng subset `vietnamese` hoặc `latin-ext` cho cả KoHo và Be Vietnam Pro.

**Gợi ý tiếp theo:**

1. **Bắt đầu Mục 1 ngay:** Audit token hiện tại trong `tailwind.css` và `tailwind.config.js`, chốt hệ canonical và viết mapping document trong 3 giờ.
2. **Tạo baseline nợ CSS:** Chạy 2 lệnh grep ở mục 8.3 và ghi kết quả vào đầu file này hoặc `docs/qa/phase-1-baseline.md` để có số liệu so sánh.
3. **Review script dark-mode trước khi chạy:** Đọc `scripts/remove-dark-mode.js`, đảm bảo có backup `tailwind.css.backup`, chạy thử trên môi trường dev trước khi commit.
