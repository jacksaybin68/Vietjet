# Bằng chứng: 3 Asset thương hiệu + Mâu thuẫn Font + Viewport

**Ngày:** 2026-10-18  
**Mục đích:** Thu thập bằng chứng về 3 asset thương hiệu (`logo-vj.svg`, `logo.png`, `app_logo.png`), mâu thuẫn font Google Fonts, và cấu hình viewport trong `scripts/ui-check.cjs` để phục vụ Phase -1.

---

## 1. Ba Asset Thương Hiệu

### 1.1 Bảng Tổng Hợp

| File | Kích thước | Tham chiếu (file:dòng) | Git Origin | License hints |
|------|------------|------------------------|------------|---------------|
| **logo-vj.svg** | 5.2 KB | • `Header.tsx:102`<br>• `Footer.tsx:41`<br>• `UserDashboardClient.tsx`<br>• `PaymentClient.tsx`<br>• `FlightResultsStep.tsx`<br>• `PassengerInfoStep.tsx`<br>• `AuthShell.tsx`<br>• `FlightsTab.tsx` | Commit `3db7c9d` (2026-10-18 21:16)<br>Author: Cline<br>Message: `feat(tim-ve): hoàn thành giao diện đặt vé mới + sửa lỗi code quality`<br><br>Commit gốc: `81d19f9` (2026-04-14 00:48)<br>Author: jacksaybin68<br>Message: `feat: complete UI rebranding, SEO optimization, and Booking API integration` | **Không có**<br><br>Ghi chú trong `docs/design/asset-registry.md`: "Path vẽ chữ 'vietjet'; palette ghi chú 'lấy từ bundle vietjetair.com'" |
| **logo.png** | 901 B | • `layout.tsx:37,50,54` (metadata)<br>• `AppLogo.tsx:15` (component default)<br>• `mail.ts:43` (email template)<br>• `chat-widget.test.tsx`<br>• `mail-template.test.ts`<br>• `app-image.test.tsx`<br>• `PassengerInfoStep.tsx` | Commit `3fc214a` (2026-09-10 02:59)<br>Author: User<br>Message: `会话开始之前的代码备份`<br><br>Commit gốc: `81d19f9` (2026-04-14 00:48)<br>Author: jacksaybin68<br>Message: `feat: complete UI rebranding, SEO optimization, and Booking API integration` | **Không có**<br><br>Ghi chú trong `docs/design/asset-registry.md`: "Nguồn chưa xác minh"<br><br>Nhắc đến trong `.env.local.example:63`: "Logo dùng trong email (file public/logo.png). Ghi đè khi dùng CDN." |
| **app_logo.png** | 507 KB | • `UserChat.tsx:490` (chat widget)<br>• `chat-widget.test.tsx`<br>• `app-image.test.tsx` | Commit `a211d9c` (2026-09-26 23:38)<br>Author: Cline<br>Message: `feat(chat): thay icon launcher bang nhan vat Vietjet Air`<br><br>Commit gốc: `d51acb0` (2026-04-03 19:04)<br>Author: HoanVe User<br>Message: `chore: initial commit of base project` | **Không có**<br><br>Ghi chú trong `docs/design/asset-registry.md`: "Logo 957×1068 trong chat widget" · "Nguồn chưa xác minh" |

### 1.2 Chi Tiết Tham Chiếu

#### `logo-vj.svg` (5.2 KB)

**Tham chiếu trong src/:**
- `src/shared/components/navigation/Header.tsx:102` → `src="/logo-vj.svg"`
- `src/shared/components/navigation/Footer.tsx:41` → `<img src="/logo-vj.svg" alt="Vietjet Air" className="h-10 w-auto" loading="lazy" />`
- `src/app/tai-khoan/components/UserDashboardClient.tsx`
- `src/features/payments/components/PaymentClient.tsx`
- `src/features/flights/components/FlightResultsStep.tsx`
- `src/features/bookings/components/PassengerInfoStep.tsx`
- `src/features/auth/components/AuthShell.tsx`
- `src/features/admin/components/FlightsTab.tsx`

**Git log:**
```
3db7c9d | 2026-10-18 21:16:02 +0700 | Cline | feat(tim-ve): hoàn thành giao diện đặt vé mới + sửa lỗi code quality
e05eeba | 2026-10-18 21:01:38 +0700 | Cline | cline checkpoint session=1792330391817_1ax13 run=1
...
81d19f9 | 2026-04-14 00:48:22 +0700 | jacksaybin68 | feat: complete UI rebranding, SEO optimization, and Booking API integration
```

**License/nguồn trong repo:** Không tìm thấy văn bản cho phép hoặc email uỷ quyền. Ghi chú trong `docs/design/asset-registry.md` nói rằng palette "lấy từ bundle vietjetair.com".

#### `logo.png` (901 B, 230×40)

**Tham chiếu trong src/:**
- `src/app/layout.tsx:37` → `url: '/logo.png'` (metadata)
- `src/app/layout.tsx:50` → `images: ['/logo.png']` (OpenGraph)
- `src/app/layout.tsx:54` → `apple: [{ url: '/logo.png' }]` (Apple touch icon)
- `src/shared/components/ui/AppLogo.tsx:15` → `src = '/logo.png'` (component default prop)
- `src/lib/mail.ts:43` → `return \`\${siteUrl(env)}/logo.png\`;` (email template logo URL)
- `src/test/chat-widget.test.tsx`
- `src/test/mail-template.test.ts`
- `src/test/app-image.test.tsx`
- `src/features/bookings/components/PassengerInfoStep.tsx`

**Git log:**
```
3fc214a | 2026-09-10 02:59:07 +0700 | User | 会话开始之前的代码备份
81d19f9 | 2026-04-14 00:48:22 +0700 | jacksaybin68 | feat: complete UI rebranding, SEO optimization, and Booking API integration
5951d30 | 2026-04-05 01:34:53 +0700 | HoanVe User | \feat: add new features and utilities\
```

**License/nguồn trong repo:** Không tìm thấy. Có nhắc đến trong `.env.local.example:63`: "Logo dùng trong email (file public/logo.png). Ghi đè khi dùng CDN." nhưng không có văn bản cho phép.

#### `app_logo.png` (507 KB, 957×1068)

**Tham chiếu trong src/:**
- `src/features/chat/components/UserChat.tsx:490` → `src="/assets/images/app_logo.png"` (chat widget launcher)
- `src/test/chat-widget.test.tsx`
- `src/test/app-image.test.tsx`

**Git log:**
```
a211d9c | 2026-09-26 23:38:52 +0700 | Cline | feat(chat): thay icon launcher bang nhan vat Vietjet Air
d51acb0 | 2026-04-03 19:04:52 +0700 | HoanVe User | chore: initial commit of base project
```

**License/nguồn trong repo:** Không tìm thấy. `docs/design/asset-registry.md` ghi "Nguồn chưa xác minh".

---

## 2. Mâu Thuẫn Font Google Fonts

### 2.1 Bằng Chứng Mâu Thuẫn

**File:** `src/styles/tailwind.css` (dòng 1)
```css
/* @import Google Fonts moved to next/font for zero render-blocking */
```

**File:** `src/app/layout.tsx` (dòng 66-77)
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

### 2.2 Phân Tích

1. **Comment trong `tailwind.css` nói rằng** `@import Google Fonts` đã được **chuyển sang `next/font`** để tránh render-blocking.
2. **Thực tế trong `layout.tsx`:** vẫn dùng **`<link>` trực tiếp** với Google Fonts CDN (dòng 74-77), **KHÔNG dùng `next/font`**.
3. **ESLint warning bị tắt** (dòng 73) với lý do là "false positive" vì App Router, nhưng **không giải thích tại sao không chuyển sang `next/font`** như comment đã tuyên bố.
4. **Comment giải thích:** "Switching to `next/font` would change how the KoHo / Be Vietnam Pro CSS variables are wired into tailwind.config.js" → tức là **chưa chuyển** vì lo ảnh hưởng tích hợp Tailwind, mâu thuẫn với nhận định trong `tailwind.css`.

**Kết luận:** Có mâu thuẫn giữa tuyên bố "đã chuyển sang `next/font`" (trong `tailwind.css:1`) và thực tế "vẫn dùng `<link>` vì lo ảnh hưởng Tailwind config" (trong `layout.tsx:69-72`).

---

## 3. Viewport trong `scripts/ui-check.cjs`

### 3.1 Cấu Hình Hiện Tại

**File:** `vietjetsim-main/scripts/ui-check.cjs` (dòng 60-64)

```javascript
const VIEWPORTS = [
  { label: 'desktop', width: 1440, height: 900, mobile: false },
  { label: 'tablet', width: 768, height: 1024, mobile: true },
  { label: 'mobile', width: 390, height: 844, mobile: true },
];
```

### 3.2 So Sánh với Yêu Cầu

**Bộ viewport canonical trong kế hoạch đối chiếu:**
- `390×844` (mobile)
- `768×1024` (tablet)
- `1440×900` (desktop)

**Hiện có trong `ui-check.cjs`:**
- ✅ `390×844` — có (mobile)
- ✅ `768×1024` — có (tablet)
- ✅ `1440×900` — có (desktop)

**Kết luận:** Script `ui-check.cjs` **đã đầy đủ** cả ba viewport canonical. Không thiếu viewport nào.

### 3.3 Cách Chạy

**NPM script:** `package.json:17`
```json
"test:ui": "node scripts/ui-check.cjs"
```

**Chạy bằng:**
```bash
npm run test:ui
```

**Yêu cầu:** Cổng 4028 phải trống (dev server đang chạy), Chrome tại `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` (macOS).

**Output:** Screenshot được lưu tại thư mục tạm (default: `/tmp/vietjet-ui-check/shots/`), có thể ghi đè bằng biến môi trường `UI_CHECK_SHOTS_DIR`.

---

## 4. Tóm Tắt Findings

### 4.1 Asset Thương Hiệu (3 file)

| Vấn đề | Trạng thái |
|--------|------------|
| Không có văn bản cho phép/giấy phép | ❌ Cả 3 file |
| Có git history nhưng không có commit message nhắc nguồn/license | ❌ Cả 3 file |
| Có comment trong `asset-registry.md` nói "nguồn chưa xác minh" | ✅ Đã ghi nhận |
| Một số file có ghi chú "lấy từ vietjetair.com" | ⚠️ `logo-vj.svg` |

**Khuyến nghị:** Cần quyết định cho 3 asset này (Thay / Giữ kèm giấy phép / Xoá) như đã nêu trong `docs/design/asset-decisions.md`.

### 4.2 Mâu Thuẫn Font

| Vấn đề | Trạng thái |
|--------|------------|
| Comment `tailwind.css` nói "moved to next/font" | ❌ Không đúng sự thật |
| Thực tế vẫn dùng `<link>` Google Fonts | ✅ Xác nhận |
| ESLint warning bị tắt với lý do "false positive" | ⚠️ Không nhất quán |
| Comment giải thích "would change Tailwind wiring" | ✅ Lý do rõ ràng nhưng mâu thuẫn với claim trước đó |

**Khuyến nghị:** Sửa comment trong `tailwind.css:1` thành: `/* Google Fonts loaded via <link> in layout.tsx; next/font not used to preserve Tailwind CSS variable wiring */` hoặc tương tự để phản ánh đúng thực tế.

### 4.3 Viewport UI Check

| Viewport | Có trong script? |
|----------|------------------|
| 390×844 | ✅ Có (mobile) |
| 768×1024 | ✅ Có (tablet) |
| 1440×900 | ✅ Có (desktop) |

**Kết luận:** Viewport đầy đủ, không cần sửa.

---

## 5. Gợi Ý Tiếp Theo

1. **Quyết định 3 asset thương hiệu:** Chọn phương án **T** (Thay), **G** (Giữ kèm giấy phép), hoặc **X** (Xoá) cho từng file `logo-vj.svg`, `logo.png`, `app_logo.png` theo hướng dẫn trong `docs/design/asset-decisions.md`.
2. **Sửa comment mâu thuẫn font:** Cập nhật `src/styles/tailwind.css:1` để phản ánh đúng rằng Google Fonts vẫn được nạp qua `<link>` chứ chưa chuyển sang `next/font`.
3. **Chạy `npm run test:ui`** để chụp baseline screenshot tại cả ba viewport canonical (đảm bảo cổng 4028 đang chạy dev server).
