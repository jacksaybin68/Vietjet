# Báo cáo Hiện trạng Phase 1: Foundation (Tokens, Layout, Accessibility)

**Ngày:** 2026-10-18  
**Repo:** `/Users/user/orca/vietjet/Vietjet/vietjetsim-main`  
**Worker:** fast  
**Mục tiêu:** Thu thập dữ liệu hiện trạng để lập kế hoạch Phase 1 (Foundation: tokens, layout, accessibility)

---

## 1. Thang fontSize trong tailwind.config.js

| Kích thước (px) | Utility class | Có sẵn? | Ghi chú |
|-----------------|---------------|---------|----------|
| 12 | `text-xs` | ✅ | Tailwind mặc định |
| 14 | `text-sm` | ✅ | Tailwind mặc định |
| 16 | `text-base` | ✅ | Tailwind mặc định |
| 20 | `text-xl` | ✅ | Tailwind mặc định |
| 24 | `text-2xl` | ✅ | Tailwind mặc định |
| 32 | `text-3xl` | ✅ | Tailwind mặc định (32px/2rem) |
| **40** | `text-2xl2`, `text-5xl2` | ✅ | **Custom, đã thêm trong extend** |

**Nguồn:** `tailwind.config.js:6-11`

```js
fontSize: {
  // Thang chuẩn Phase 1: 12, 14, 16, 20, 24, 32, 40px.
  // text-4xl của Tailwind = 36px nên thêm 2xl2/5xl2 để thay text-[40px].
  '2xl2': ['2.5rem', { lineHeight: '3rem' }],
  '5xl2': ['2.5rem', { lineHeight: '2.75rem' }],
}
```

**Kết luận:** Thang fontSize đầy đủ, bao gồm 40px với hai utility custom (`text-2xl2`, `text-5xl2`).

---

## 2. Bảng màu (Colors)

### 2.1. Tailwind config colors (tailwind.config.js:18-85)

| Token | Giá trị | Nguồn |
|-------|---------|-------|
| `vjred` | `#EC2029` | Brand palette |
| `vjyellow` | `#FFDD00` | Brand palette |
| `vjorange` | `#F4511E` | Brand palette |
| `vjpurple` | `#8075D6` | Brand palette |
| `vjblue` | `#2563D4` | Brand palette |
| `vjdark` | `#333333` | Brand palette |
| `vjamber` | `#FBB612` | Brand palette |
| `vjbgs` | `#E9F2FB` | Brand palette |
| `vjbrown` | `#B8860B` | Brand palette |
| `vjegreen` | `#7CB342` | Brand palette |
| `vjpanelblue` | `#B3E5FC` | Brand palette |
| `surface` | `#F7F7F7` | Surface color |
| `primary.DEFAULT` | `#EC2029` | Primary scale |
| `primary.dark` | `#D91A21` | Primary scale |
| `primary.light` | `#F5717A` | Primary scale |
| `primary.deep` | `#6F0000` | Primary scale |
| `accent.DEFAULT` | `#FFDD00` | Accent scale |
| `accent.dark` | `#F9A51A` | Accent scale |
| `accent.light` | `#FBB612` | Accent scale |
| `navy.DEFAULT` | `#242424` | Navy scale |
| `navy.dark` | `#151515` | Navy scale |
| `navy.light` | `#3d3d3d` | Navy scale |
| `vj.*` | (22+ biến) | Namespace `vj` chi tiết |
| `stone.*` | (50-950) | Stone scale 10 bậc |

### 2.2. CSS Variables (:root trong tailwind.css:29-108)

| Biến CSS | Giá trị | Ghi chú |
|----------|---------|----------|
| `--primary` | `#ec2029` | Brand red |
| `--primary-dark` | `#d91a21` | |
| `--primary-light` | `#f5717a` | |
| `--primary-deep` | `#6f0000` | |
| `--accent` | `#ffdd00` | Brand yellow |
| `--accent-dark` | `#f9a51a` | |
| `--accent-light` | `#ffe97a` | |
| `--accent-secondary` | `#fbb612` | |
| `--orange` | `#f4511e` | |
| `--purple` | `#8075d6` | |
| `--blue` | `#2563d4` | |
| `--background` | `#ffffff` | |
| `--background-secondary` | `#f7f7f7` | |
| `--surface` | `#f7f7f7` | |
| `--surface-2` | `#f1f2f4` | |
| `--surface-3` | `#e7e8eb` | |
| `--foreground` | `#333333` | |
| `--foreground-muted` | `#626875` | |
| `--foreground-subtle` | `#8b9099` | |
| `--border` | `#e2e4e8` | |
| `--vj-*` | (nhiều biến) | VJ namespace |
| `--primary-rgb` | `236 32 41` | Channel cho opacity |
| `--accent-rgb` | `255 221 0` | Channel cho opacity |

**Tổng cộng:** Hơn 60+ biến CSS trong `:root`.

---

## 3. Dark-mode blocks còn sót

### 3.1. CSS Variables (tailwind.css)

**Dòng 63, 68-71, 76, 95, 132:** Biến `--dark-*` còn sót trong `:root`

```css
--dark-surface-2-rgb: 36 48 74;     /* dòng 63 */
--dark-bg: #1e293b;                  /* dòng 68 */
--dark-surface: #172033;             /* dòng 69 */
--dark-surface-2: #24304a;           /* dòng 70 */
--dark-border: rgba(255, 255, 255, 0.14); /* dòng 71 */
--vj-red-dark: #d91a21;              /* dòng 76 - không phải dark-mode, là primary-dark */
--dark-surface-rgb: 23 32 51;        /* dòng 95 */
--dark-surface-2-rgb: 36 48 68;      /* dòng 132 */
```

### 3.2. CSS Selectors (tailwind.css)

**Dòng 301-302:** `.dark .vj-table-row:hover`
```css
.dark .vj-table-row:hover {
  background: var(--dark-surface-2);
}
```

**Dòng 1086-1088:** `.dark .form-field-float.has-value .form-label-float`
```css
.dark .form-field-float.has-value .form-label-float {
  background: var(--dark-surface);
}
```

### 3.3. Script xóa dark-mode

**File:** `scripts/remove-dark-mode.js` (75 dòng)

**Chức năng:**
- Đọc từ `tailwind.css.backup`
- Xóa các block `.dark { ... }`
- Xóa các dòng chứa `.dark`
- Xóa các biến `--dark-*`
- Ghi lại vào `tailwind.css`

**Kết luận:** Script đã chạy nhưng chưa hoàn toàn loại bỏ hết dark-mode remnants.

---

## 4. Components primitive (src/shared/components/ui/)

### 4.1. Danh sách file

```
Button.tsx
Card.tsx
IconButton.tsx
InputField.tsx
Section.tsx
SkeletonLoader.tsx
Pagination.tsx
AppImage.tsx
AppLogo.tsx
AppIcon.tsx
ThemeToggle.tsx
index.ts
```

### 4.2. Phân tích 2 component chính

#### Button.tsx (83 dòng)
- **Export:** `Button` component
- **Variants:** `primary`, `gold`, `outline`, `ghost`
- **Sizes:** `sm` (34px), `md` (44px), `lg` (52px)
- **Token usage:** ✅ **Dùng token CSS variables**
  - `bg-[var(--primary)]`
  - `hover:bg-[var(--primary-dark)]`
  - `bg-[var(--accent)]`
  - `border-[var(--primary)]`
  - `text-[var(--foreground-muted)]`
- **Hex cục bộ:** ❌ Có một chút (shadow rgba)

#### Card.tsx (28 dòng)
- **Export:** `Card` component
- **Props:** `hover` (boolean)
- **Token usage:** ✅ **Dùng token**
  - `border-[var(--border)]`
  - `bg-[var(--background)]`
- **Hex cục bộ:** ❌ Có (hover effects dùng rgba cố định)

**Kết luận:** Primitive components đã sử dụng token tốt, nhưng vẫn còn một số shadow/rgba cục bộ.

---

## 5. Nợ CSS: text-[Npx] và hex-class

### 5.1. Số lượng `text-[Npx]` (arbitrary font-size)

**Lệnh grep:** `grep -rn 'text-\[[0-9]' src/`

**Kết quả:** **65+ file** chứa `text-[9px]`, `text-[10px]`, `text-[11px]`, `text-[13px]`, `text-[15px]` và các kích thước khác.

**Ví dụ đại diện:**

| File | Dòng | Class |
|------|------|-------|
| `app/chuyen-bay-cua-toi/page.tsx` | 334 | `text-[13px]` |
| `app/chuyen-bay-cua-toi/page.tsx` | 342 | `text-[11px]` |
| `app/chuyen-bay-cua-toi/page.tsx` | 511 | `text-[11px]` |
| `app/chuyen-bay-cua-toi/page.tsx` | 528 | `text-[10px]` |
| `app/dang-nhap/page.tsx` | 80 | `text-[15px]` |
| `app/dang-nhap/page.tsx` | 463 | `text-[11px]` |
| `app/lam-thu-tuc/page.tsx` | 296 | `text-[13px]` |
| `app/tai-khoan/components/*.tsx` | nhiều | `text-[9px]`, `text-[10px]`, `text-[11px]` |
| `trang-chu/components/AirportPicker.tsx` | 16 | `text-[10px]` |
| `trang-chu/components/DatePicker.tsx` | 127 | `text-[10px]` |
| `trang-chu/components/PassengerPicker.tsx` | 48 | `text-[10px]` |
| `trang-chu/components/HeroSection.tsx` | 130 | `text-[10px]` |
| `trang-chu/components/PopularRoutesSection.tsx` | 151 | `text-[9px]`, `text-[10px]`, `text-[11px]` |
| `tim-ve/components/FlightCard.tsx` | 47 | `text-[11px]` |
| `tim-ve/components/BookingSummaryPanel.tsx` | 40, 48, 61, 67 | `text-[10px]`, `text-[11px]` |

**Thống kê ước lượng:**
- **`text-[9px]`:** ~15 lần
- **`text-[10px]`:** ~80+ lần
- **`text-[11px]`:** ~60+ lần
- **`text-[13px]`:** ~20+ lần
- **`text-[15px]`:** ~15+ lần
- **Tổng cộng:** **200+ lần** sử dụng arbitrary font-size

### 5.2. Số lượng hex-class (bg/text/border-[#...])

**Lệnh grep:** `grep -rnE '(bg|text|border|from|to|via)-\[#[0-9a-fA-F]{3,8}\]' src/`

**Kết quả:** **37+ file** chứa hex-class inline.

**Ví dụ đại diện:**

| File | Dòng | Class |
|------|------|-------|
| `app/error.tsx` | 14 | `from-[#1A2948] via-[#1e325a] to-[#EC2029]/20` |
| `app/error.tsx` | 23, 29, 50, 58 | `text-[#EC2029]`, `text-[#1A2948]` |
| `app/chuyen-bay-cua-toi/page.tsx` | 275 | `bg-[#fdeff5]` |
| `app/chuyen-bay-cua-toi/page.tsx` | 334 | `text-[#555555]` |
| `app/dang-nhap/page.tsx` | 81, 84, 88, 96 | `text-[#555960]`, `text-[#333]`, `text-[#939598]` |
| `app/dang-nhap/page.tsx` | 282 | `border-[#d8dade]`, `text-[#333]`, `hover:border-[#b8bbc1]` |
| `app/dang-nhap/page.tsx` | 297, 310, 395, 400, 463, 493 | nhiều `#` colors |
| `app/gioi-thieu/page.tsx` | 24, 27, 32, 47, 50, 51 | `text-[#1A2948]`, `text-[#333333]`, `text-[#6D6E71]`, `text-[#EC2029]` |
| `app/lien-he/page.tsx` | 44, 59, 68, 82, 97, 111, 117 | nhiều `#` cho form inputs |
| `app/tai-khoan/components/*.tsx` | nhiều | `text-[#1A2948]`, `text-[#EC2029]`, `bg-[#FFDD00]`, `bg-[#10B981]` |
| `trang-chu/components/AirportPicker.tsx` | 14, 16, 17, 201, 202, 245, 256, 263, 269, 281, 290, 291, 298, 301 | nhiều `#` colors |
| `trang-chu/components/DatePicker.tsx` | 122, 124, 127, 131, 136, 201 | `border-[#e4e4e4]`, `text-[#555555]`, `text-[#767676]`, `text-[#222222]` |
| `trang-chu/components/HeroSection.tsx` | 128, 130, 137, 140, 142, 143, 225, 382, 460, 476 | nhiều `#` colors |
| `trang-chu/components/PassengerPicker.tsx` | 46, 48, 49, 86, 108, 113, 116, 119, 127, 131 | nhiều `#` colors |

**Thống kê ước lượng:**
- **`text-[#...]`:** ~150+ lần
- **`bg-[#...]`:** ~50+ lần
- **`border-[#...]`:** ~40+ lần
- **`from-[#...]` / `to-[#...]` / `via-[#...]`:** ~20+ lần
- **`hover:*-[#...]`:** ~30+ lần
- **Tổng cộng:** **300+ lần** sử dụng hex-class inline

**Các hex phổ biến:**
- `#EC2029` (vjred)
- `#1A2948` (navy)
- `#FFDD00` (vjyellow)
- `#333333` / `#333` (text dark)
- `#555555` / `#6c6c6c` (text muted)
- `#d8dade` / `#b8bbc1` (borders)
- `#e4e4e4` (light border)

---

## 6. Skip link (Accessibility)

### 6.1. Có skip link không?

✅ **CÓ**

**Vị trí:** `src/app/layout.tsx:84-89`

```tsx
<a
  href="#main-content"
  className="vj-skip-link sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[var(--primary)] focus:px-4 focus:py-2 focus:font-bold focus:text-white"
>
  Bỏ qua tới nội dung chính
</a>
```

**CSS comment:** `src/styles/tailwind.css:188-194`

```css
/* Đích của skip link. Chừa chỗ cho announcement bar + header sticky: không có
   nó thì tiêu đề trang nằm ngay dưới thanh điều hướng vừa được bỏ qua.

   `.vj-skip-link` (class trong `src/app/layout.tsx`) KHÔNG có định nghĩa ở đây:
   liên kết đó tự ẩn/hiện bằng tiện ích Tailwind (`sr-only focus:not-sr-only …`).
   Một bản CSS che nó bằng `transform: translateY(-300%)` sẽ đẩy nó ra ngoài màn
   hình cả khi đã focus, vì `transform` không bị `not-sr-only` ghi đè. */
```

**Test:** `src/test/hero-banner.test.tsx:7-11`

```ts
describe('RootLayout skip link (Phase 1 a11y)', () => {
  it('layout chứa skip link tới #main-content', () => {
    const layoutSrc = fs.readFileSync(path.join(__dirname, '..', 'app', 'layout.tsx'), 'utf-8');
    expect(layoutSrc).toContain('href="#main-content"');
    expect(layoutSrc).toContain('id="main-content"');
  });
});
```

**Kết luận:** Skip link đã được implement và test.

---

## 7. Font loading hiện tại

### 7.1. Method

❌ **KHÔNG dùng next/font**  
✅ **Dùng Google Fonts qua `<link>`**

**Vị trí:** `src/app/layout.tsx:67-77`

```tsx
{/* KoHo is VietJet's primary body font; Be Vietnam Pro for headings */}
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
{/* `@next/next/no-page-custom-font` targets the Pages Router's
    `pages/_document.js`; this app is App Router only, so the rule fires as
    a false positive. Switching to `next/font` would change how the KoHo /
    Be Vietnam Pro CSS variables are wired into tailwind.config.js. */}
{/* eslint-disable-next-line @next/next/no-page-custom-font */}
<link
  href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&family=KoHo:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap"
  rel="stylesheet"
/>
```

**Comment từ tailwind.css:1-3:**

```css
/* Google Fonts được nạp bằng <link> trong src/app/layout.tsx, KHÔNG qua next/font:
 * chuyển sang next/font sẽ đổi cách biến CSS của KoHo / Be Vietnam Pro nối vào
 * tailwind.config.js. Sửa comment này phải đi kèm sửa thật ở layout.tsx. */
```

### 7.2. Font families trong tailwind.config.js

```js
fontFamily: {
  sans: ['KoHo', 'Be Vietnam Pro', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  display: ['Be Vietnam Pro', 'KoHo', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  heading: ['Be Vietnam Pro', 'KoHo', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  koho: ['KoHo', 'Be Vietnam Pro', 'ui-sans-serif', 'system-ui', 'sans-serif'],
}
```

**Kết luận:** Font loading dùng Google Fonts link, không dùng next/font để tránh thay đổi cách kết nối CSS variables.

---

## 8. Tóm tắt số liệu chính

| Chỉ số | Số lượng | Trạng thái |
|--------|----------|------------|
| **text-[Npx]** | ~200+ | ⚠️ Cần migrate sang utility |
| **Hex-class inline** | ~300+ | ⚠️ Cần migrate sang token |
| **Dark-mode blocks còn sót** | 2 selectors + 8 biến | ⚠️ Cần xóa hoàn toàn |
| **Skip link** | 1 | ✅ Đã có |
| **fontSize 40px utility** | 2 (text-2xl2, text-5xl2) | ✅ Đã có |
| **CSS Variables (--*)** | 60+ | ✅ Đã đầy đủ |
| **Primitive components dùng token** | Button, Card | ✅ Đã dùng, còn rgba cục bộ |

---

## 9. Gợi ý tiếp theo

1. **Lập kế hoạch migration `text-[Npx]`**: Tạo utility hoặc component wrapper cho các font-size 9px, 10px, 11px, 13px, 15px không có trong thang Tailwind chuẩn.
2. **Lập kế hoạch migration hex-class**: Tạo mapping table từ hex phổ biến (#EC2029, #1A2948, #333, #555, #d8dade...) sang token CSS variable tương ứng.
3. **Xóa sạch dark-mode remnants**: Chạy lại `scripts/remove-dark-mode.js` hoặc sửa thủ công 2 selector `.dark` và 8 biến `--dark-*` còn sót.
4. **Verify skip link**: Test thủ công bằng keyboard (Tab đầu tiên) để đảm bảo skip link hoạt động đúng và focus visible.
5. **Document token usage**: Tạo style guide/token reference để dev biết dùng `text-[var(--foreground-muted)]` thay vì `text-[#626875]`.
6. **Audit primitive components**: Review tất cả components trong `src/shared/components/ui/` để đảm bảo không có hex/rgba cố định ngoài token.
