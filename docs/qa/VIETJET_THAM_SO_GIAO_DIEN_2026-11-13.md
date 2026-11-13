# Tham số giao diện Vietjet Air — hồ sơ đo đạc

**Ngày đo:** 13/11/2026
**Nguồn:** [https://www.vietjetair.com/vi/](https://www.vietjetair.com/vi/) (trang chủ công khai, bản live)
**Phương pháp:** Chrome DevTools Protocol — `Runtime.evaluate` lấy `getComputedStyle` cho toàn bộ cây DOM; tải về và phân tích `static/css/main.f5b4a549.chunk.css`, `static/css/19.b90ce945.chunk.css` và `static/js/main.6165d6fe.chunk.js` (2 291 007 byte).
**Viewport đo:** `1440×900` (desktop, `mobile: false`) và `390×844` (mobile, `mobile: true`).
**Ảnh tham chiếu:** `docs/qa/screenshots/2026-11-13/vietjetair-tham-chieu-desktop-1440.png`

> Trang là React SPA. `<div id="root">` rỗng trong HTML tĩnh — toàn bộ số đo dưới đây lấy từ DOM sống sau khi render.

---

## 1. Bảng màu

Đếm tần suất trong `main.6165d6fe.chunk.js` (chỉ mã hex 6 ký tự).

### 1.1 Đỏ

| Hex | Số lần | Vai trò |
|---|---|---|
| `#EC2029` | 47 | đỏ brand chính |
| `#D91A21` | 15 | đỏ hover / gradient start |
| `#EC2227` | 10 | đỏ biến thể |
| `#CF0000` | 15 | đỏ sâu |
| `#BF0000` | 15 | đỏ sâu |
| `#CA161C` | 11 | đỏ sâu |
| `#6F0000` | — | đỏ sâu (điểm cuối gradient) |

### 1.2 Vàng

| Hex | Số lần | Vai trò |
|---|---|---|
| `#FFDD00` | 17 | vàng CTA chính |
| `#F9A51A` | 16 | vàng gradient start |
| `#FBB612` | 14 | vàng gradient giữa |
| `#F7C61A` | — | vàng nav active (dải dịch vụ) |
| `#E9A020` | — | vàng tab active (điểm cuối gradient) |
| `#A17F21` | 24 | **vàng phụ — chữ trên nền vàng** |
| `#C99B14` | 21 | **vàng phụ** |
| `#E9B128` | 18 | **vàng phụ** |
| `#FDF34F` | 18 | **vàng phụ — sáng** |
| `#B78817` | 12 | **vàng phụ — tối** |
| `#875017` | 12 | **vàng phụ — rất tối** |
| `#F9EA8A` | 9 | **vàng phụ — rất sáng** |
| `#F8E98A` | 9 | **vàng phụ — rất sáng** |
| `#ECD56A` | 9 | **vàng phụ** |
| `#EBD673` | 9 | **vàng phụ** |
| `#E1C34F` | 9 | **vàng phụ** |
| `#D8B439` | 9 | **vàng phụ** |

> **Phát hiện quan trọng.** Site thật dùng một *hệ vàng nhiều sắc độ* (12 sắc phụ) cho chữ trên nền vàng, viền và trạng thái. Dự án `vietjetsim-main` chỉ có `#FFDD00` / `#FBB612` — dùng trực tiếp làm màu chữ trên nền vàng sẽ không đạt tương phản và lệch hình dạng.

### 1.3 Xám và trung tính

| Hex | Số lần | Vai trò |
|---|---|---|
| `#939393` | 45 | xám chữ phụ |
| `#333333` | 24 | xám chữ chính (`body`) |
| `#6C6C6C` | 18 | xám chữ trung gian |
| `#CCCCCC` | 12 | viền | 
| `#F0F0F0` | 9 | nền nhạt |
| `#B3B3B3` | 9 | viền |
| `#AEAEAE` | 9 | viền |
| `#E6E6E6` | 4 | viền nhạt |
| `#A0A0A0` | 1 | viền |
| `#FDFDFD` | — | nền announcement bar |

### 1.4 Xanh và trạng thái

| Hex | Số lần | Vai trò |
|---|---|---|
| `#216BA5` | 6 | xanh chính |
| `#1D5D90` | 3 | xanh đậm |
| `#2A87D0` | 1 | xanh sáng |
| `#32BE3F` | 1 | xanh lá |
| `#3DCC4A` | 1 | xanh lá sáng |
| `#FF0000` | 15 | đỏ thuần (hot icon) |

---

## 2. Typography

Font duy nhất của site: **KoHo** (Google Fonts, weight 300–700). `Be Vietnam Pro` **không** xuất hiện.

> `main.f5b4a549.chunk.css` khai báo thêm `JambonoBlack` / `JambonoLight` / `JambonoMedium` / `OpenSans` / `SansSerif*` — đây là font đóng gói của site thật, **không dùng được** (không có quyền). Thay bằng KoHo 700 uppercase.

| Vị trí | Font | Size | Weight | Line-height | Letter-spacing | Màu |
|---|---|---|---|---|---|---|
| `body` | KoHo, sans-serif | 14px | 500 | 20.02px | normal | `#333333` |
| Announcement bar | KoHo | 14px | 500 | 20.02px | normal | `#333333` trên `#FDFDFD` |
| Utility row — "Hỗ trợ" | KoHo | 14px | 500 | 20.02px | normal | trắng |
| Utility row — "Đăng ký" | KoHo | **16px** | **700** | 18.08px | normal | trắng |
| Utility row — "Đăng nhập" | KoHo | **16px** | **700** | 18.08px | normal | trắng |
| Utility row — nút ngôn ngữ | KoHo | 14px | 500 | 20.02px | **uppercase** | `#333333` |
| Menu chính (4 mục) | KoHo | **14px** | **600** | 20.02px | normal | trắng, **uppercase** |
| Dải dịch vụ (Đặt vé…) | KoHo | **16px** | **500** | 35px | normal | trắng; active `#F7C61A` |
| Input sân bay | KoHo | **17px** | 500 | 20px | normal | `#333333` |
| Input ngày / hành khách | KoHo | 16px | 500 | 19px | normal | `#333333` |
| Input mã khuyến mại | KoHo | 16px | 500 | 19px | normal | `#333333` |
| Nút "Tìm chuyến bay" | JambonoMedium | 16px | 500 | 28px | normal | `#000000`, **uppercase** |
| Nút tab dịch vụ | KoHo | 14px | 500 | 20.02px | normal | trắng / `#000` |
| H3 "Tìm vé rẻ nhất" | KoHo | **18px** | **700** | — | — | trắng |
| H6 tên tuyến | KoHo | **16px** | **700** | — | — | `#EC2029` |
| Bottom nav label | KoHo | **10px** | **700** | 13px | normal | trắng |
| Chat bubble | koho | 14px | 500 | 20.02px | normal | `#212529` |

**Cỡ chữ có trong JS bundle:** `0, 8, 9, 10, 12, 13, 14, 16, 18, 20, 22, 24, 25, 26, 30, 32`.

**Weight có trong JS bundle:** `500` (11), `600` (12), `700` (2).

---

## 3. Nền, gradient, bo góc, hiệu ứng

### 3.1 Gradient

| Vùng | Gradient |
|---|---|
| Header desktop + mobile | `linear-gradient(rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.094) 100%)` |
| Booking panel (thân form) | `linear-gradient(30.3deg, rgba(217, 26, 33, 0.73) 33.94%, rgb(111, 0, 0) 163.23%)` |
| Tab panel active | `linear-gradient(20.12deg, rgba(217, 26, 33, 0.8) 19.6%, rgba(111, 0, 0, 0.8) 93.86%)` |
| Tab vàng | `linear-gradient(135deg, rgb(255, 221, 0) 39.58%, rgb(233, 159, 36) 100%)` |
| CTA vàng | `linear-gradient(26.73deg, rgb(249, 165, 26) 13.7%, rgb(251, 182, 18) 29.8%, rgb(255, 221, 0) 66.81%)` |
| Bottom nav mobile | `linear-gradient(rgba(0, 0, 0, 0.8) 4.03%, rgba(0, 0, 0, 0.153) 216.13%)` |
| Menu bar (file CSS tĩnh) | `linear-gradient(180deg, #d91a21 34.8%, #6f0000 182.34%)` |
| Nút vàng (file CSS tĩnh) | `linear-gradient(180deg, #f9a51a, #fedc00)` |

### 3.2 Bo góc

`main.f5b4a549.chunk.css` khai báo `border-radius:10px!important` — **10px là chuẩn chủ đạo** của site thật (không phải 4px như Tailwind mặc định).

| Thành phần | Bo góc |
|---|---|
| Field trong booking panel | 10px |
| Nút "Tìm chuyến bay" | 10px |
| Booking panel | `0 0 5px 5px` |
| Tab dịch vụ | `5px 5px 0 0` |
| Bottom nav mobile | `15px 15px 0 0` |
| Nút đóng announcement | 25px (tròn) |
| Chat bubble | `15px 0` |
| `19.b90ce945.chunk.css` | `.3rem` (= 4.8px) — chỉ dùng cho phần tử nhỏ |

### 3.3 Shadow và transition

| Thành phần | Shadow |
|---|---|
| Nút "Tìm chuyến bay" | `rgba(0,0,0,0.2) 0px 3px 1px -2px, rgba(0,0,0,0.14) 0px 2px 4px 0px` |
| Chat bubble | `rgba(0,0,0,0.16) 0px 0px 6px 0px, rgba(0,0,0,0.32) 0px …` |
| Cookie dialog | `rgba(0,0,0,0.2) 0px 11px 15px -7px, rgba(0,0,0,0.14) 0px …` |
| Icon button | `background-color 0.15s cubic-bezier(0.4, 0, 0.2, 1)` |
| Bottom nav label | `font-size 0.2s 0.1s, opacity 0.2s 0.1s` |
| Menu chính | `color 0.3s` |

**Animation:** `floatUpDown 3s` (chat mascot), slick carousel 1.6.0 (hero + announcement), `transition: opacity 0.225s cubic-bezier(0.4,0,0.2,1)` (MUI backdrop).

---

## 4. Kích thước bố cục

### 4.1 Desktop 1440×900

| Thành phần | Giá trị |
|---|---|
| Container nội dung chung | **1200px**, margin `0 120px` |
| Container hero | **1320px** (nội dung 1095px, margin `0 172.5px`) |
| Announcement bar | cao 50px, Y=0 |
| Utility row (header) | Y=50, cao 118px tổng; nội dung utility ở Y=60 |
| Logo | 265×46px tại X=120, Y=71 |
| Menu chính (4 mục) | Y=95, cao 33px, X=654 |
| Dải dịch vụ | Y=133, cao 35px, padding-left 40px |
| Chat FAB | 150×150 tại X=1270, Y=610 |
| Hero booking panel | X=940, rộng **380px** |
| — 3 tab dịch vụ | Y=214, cao 52px; nút 1 rộng 201px, nút 2 rộng 103px |
| — thân form | Y=266, cao 410px |
| — hàng hành trình | Y=266, cao 58px, padding `16.5px 15px` |
| — field | rộng 342px, cao 48px, bo 10px, margin-bottom 11px |
| — nút "Tìm chuyến bay" | 200×39px, X=1030, Y=607 |
| Slick dots | Y=639, cao 26px, 9 chấm |
| Khối "Tìm vé rẻ nhất" | cao 630px, Y=685, margin `-90px 0 -75px` |
| Nền hero section | `bgBannerHomePage.webp`, padding `180px 0 100.797px` |
| Footer | cao 371px, Y=3540, nền `#FFFFFF` + `footer-pattern.svg` |

### 4.2 Mobile 390×844

| Thành phần | Giá trị |
|---|---|
| Announcement bar | cao 35px |
| Utility row | Y=35, cao 40px, padding 13px |
| Logo | cao 15px, Y=51 |
| Slick dots | Y=332, cao 26px |
| Booking panel | Y=420, cao 305px |
| Field | cao 48px, bo 10px |
| Bottom nav | cao 62px, bo `15px 15px 0 0`, Y=782 (fixed) |
| Bottom nav label | 10px/700, icon 24×24 |
| Nền hero | `bg-mb.webp`, padding `80px 0 0` |
| Nền banner trên cùng | `mb_cloud_bg.webp` |

### 4.3 Kích thước icon

| Icon | Kích thước |
|---|---|
| Logo | 265×46px (desktop), cao 15px (mobile) |
| Icon chuông announcement | 24×26px |
| Icon mũi tên carousel | 10×23px |
| Icon dịch vụ (subservice) | **25×25px** |
| Icon bottom nav | 24×24px |
| Icon đóng announcement | 25×25px |
| Chat FAB | 150×150 (desktop), 100×100 (mobile) |

---

## 5. So sánh với dự án `vietjetsim-main`

| Hạng mục | Site thật | Dự án hiện tại | File |
|---|---|---|---|
| Header | overlay trong suốt + lớp tối | `lightChrome` có sẵn nhưng nav vẫn gradient đỏ | `src/shared/components/navigation/Header.tsx` |
| Announcement | 50px, `#FDFDFD`, container 1200px | 49px, trắng, container 1240px | `AnnouncementBar.tsx` |
| Dải dịch vụ | 16px/500, active `#F7C61A` | `text-sm` 700 uppercase | `Header.tsx` |
| Booking panel | 380px, bo 10px, gradient 30.3deg | `max-w-[356px]`, bo 4px, nền `#E74B55` phẳng | `src/app/trang-chu/components/HeroBookingWidget.tsx` |
| CTA vàng | bo 10px, gradient 26.73deg | bo 8px, gradient góc khác | `src/styles/tailwind.css` |
| Input sân bay | 17px | 16px | `src/shared/components/ui/InputField.tsx` |
| Container | 1200px thống nhất | rải rác 1200/1240/1320/1440/6xl/7xl | toàn bộ section |
| Bảng màu vàng | 12 sắc độ phụ | chỉ `#FFDD00` / `#FBB612` | `tailwind.config.js` |
| Bo góc chuẩn | 10px | `DEFAULT: 0.25rem` (4px) | `tailwind.config.js` |
| Font | KoHo | KoHo + Be Vietnam Pro | `src/app/layout.tsx` |
| Icon/logo | subservice 25×25, logo 265×46 | kích thước lệch | `public/images/subservices/`, `public/images/vj-logo.svg` |

---

## 6. Ràng buộc bảo vệ

- **Không tải asset từ `vietjetair.com` về repo.** Chỉ dùng asset có quyền hoặc asset nội bộ đã đăng ký trong `docs/design/asset-registry.md` (Phase -1 của kế hoạch đối chiếu đã xanh).
- **Không dùng font đóng gói** (`Jambono*`, `OpenSans`, `SansSerif*`) của site thật.
- Mọi số đo trong tài liệu này lấy từ **DOM sống**, không phải từ ảnh — nên dùng được để đối chiếu pixel-level.

---

## 7. Đối chiếu token trong repo (đã áp dụng)

Token được tạo từ chính bảng đo ở trên — mỗi dòng dưới đây là một số đo đã có token tương ứng trong code.

### 7.1 `vietjetsim-main/tailwind.config.js`

| Nhóm | Token | Giá trị |
|---|---|---|
| Bo góc | `borderRadius.vj` | `10px` |
| | `borderRadius.vj-panel` | `5px` |
| | `borderRadius.vj-tab` | `5px 5px 0 0` |
| | `borderRadius.vj-panel-bottom` | `0 0 5px 5px` |
| | `borderRadius.vj-bottomnav` | `15px 15px 0 0` |
| Container | `maxWidth.container-vj` | `75rem` = 1200px |
| | `maxWidth.container-vj-wide` | `82.5rem` = 1320px |
| Gradient | `gradient-vj-scrim` | `linear-gradient(rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.094) 100%)` |
| | `gradient-vj-panel` | `linear-gradient(30.3deg, rgba(217,26,33,0.73) 33.94%, #6F0000 163.23%)` |
| | `gradient-vj-tab` | `linear-gradient(20.12deg, rgba(217,26,33,0.8) 19.6%, rgba(111,0,0,0.8) 93.86%)` |
| | `gradient-vj-gold-tab` | `linear-gradient(135deg, #FFDD00 39.58%, #E9A020 100%)` |
| | `gradient-vj-gold-cta` | `linear-gradient(26.73deg, #F9A51A 13.7%, #FBB612 29.8%, #FFDD00 66.81%)` |
| | `gradient-vj-bottomnav` | `linear-gradient(rgba(0,0,0,0.8) 4.03%, rgba(0,0,0,0.153) 216.13%)` |
| Màu | `vj.gold-ink`…`gold-ink-5` | `#A17F21` `#C99B14` `#E9B128` `#B78817` `#875017` |
| | `vj.gold-pale-1`…`gold-pale-7` | `#FDF34F` `#F9EA8A` `#F8E98A` `#ECD56A` `#EBD673` `#E1C34F` `#D8B439` |
| | `vj.nav-active` / `vj.tab-gold-to` | `#F7C61A` / `#E9A020` |
| | `vj.blue-1…3`, `vj.green-1…2` | `#216BA5` `#1D5D90` `#2A87D0` `#32BE3F` `#3DCC4A` |
| | `vj.announce-bg` | `#FDFDFD` |
| | `vj.fare-business/deluxe/eco/red/gold` | `#8E7022` `#FF8800` `#388E3C` `#D71920` `#FFC700` |
| Font | `fontFamily.sans/display/heading/koho` | `['KoHo', 'ui-sans-serif', 'system-ui', 'sans-serif']` |
| Cỡ chữ | `5xs`…`2xl2`, `3xs`, `2xs`, `xs2`, `sm2`, `base2`, `lg2`, `lg3`, `2xl3`, `xl4`, `2xl4`, `xl5`, `3xl3` | 7px, 9px, 10px, 11px, 13px, 15px, 17px, 19px, 20px, 22px, 25px, 26px, 30px |

### 7.2 `vietjetsim-main/src/styles/tailwind.css`

| Vùng | Nội dung |
|---|---|
| `:root` | `--vj-scrim-from/to`, `--vj-gold-ink-*`, `--vj-gold-pale-*`, `--vj-nav-active`, `--vj-radius: 10px`, `--vj-container: 1200px`, `--vj-container-wide: 1320px` |
| `body` | `font-size: 14px; line-height: 20.02px; font-weight: 500; letter-spacing: normal` |
| `h1`…`h6` | `font-weight: 700; letter-spacing: normal; line-height: 1.43` |
| `.vj-page-hero` | `linear-gradient(20.12deg, rgba(217,26,33,0.8) 19.6%, rgba(111,0,0,0.8) 93.86%)` |
| `.vj-cta` | gradient 26.73deg, `border-radius: 10px`, `font-weight: 500`, `text-transform: uppercase`, shadow `rgba(0,0,0,0.2) 0 3px 1px -2px` |
| `.vj-cta--hero` | `min-height: 39px; font-size: 16px` (nút "Tìm chuyến bay" 200×39px) |
| `.vj-lookup-field` | cao 47px, bo 10px, nhãn 17px |
| `.seat-*` | `border-radius: 10px` |
| `.vj-card` | `border-radius: 10px` |

> **Về `JambonoMedium`:** site thật dùng font đóng gói của hãng cho nút CTA. Bộ này không
> có quyền sử dụng, nên CTA trong repo dùng **KoHo 500 uppercase** — cùng cỡ 16px,
> cùng vị trí, cùng chữ đen trên nền vàng.
