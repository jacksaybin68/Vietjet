# BÁO CÁO ĐỐI CHIẾU GIAO DIỆN MOBILE — VIETJET AIR (SIMULATOR)

**Ngày đo:** 13/11/2026
**Viewport chuẩn:** 390 × 844 (iPhone 12/13/14/15), `deviceScaleFactor: 2`, `isMobile: true`
**Nguồn đối chiếu:** `https://www.vietjetair.com/vi/` (đo trực tiếp bằng Chrome DevTools Protocol qua Puppeteer)
**Đối tượng đo:** `http://127.0.0.1:4028/trang-chu` (Next.js 16 + Turbopack)

---

## 1. Tóm tắt kết quả

| Hạng mục | Trước khi sửa | Sau kửa | Site thật | Trạng thái |
|---|---|---|---|---|
| Thanh thông báo (cao) | 43px | **35px** | 35px | ✅ Khớp |
| Header mobile (lớp phủ) | **không có** (cao 0px) | **56px @ y=35** | 56px @ y=35 | ✅ Khớp |
| Logo trắng | không có | **84×15 @ (13, 51)** | 84×15 @ (13, 51) | ✅ Khớp |
| Ảnh hero (cao) | 380px | **422px** | 422px | ✅ Khớp |
| Chấm slider | y=632 (top 589px) | **y=332 (top 297px)** | y=333 | ✅ Khớp (1px) |
| Hàng tab (rộng) | 201/103/76 | **207/105/78** | 207/105/78 | ✅ Khớp |
| Bo góc tab | 5px | **10px 10px 0 0** | 10px 10px 0 0 | ✅ Khớp |
| Gradient tab | 20.12deg (0.8 alpha) | **11.3deg (đục)** | 11.3deg | ✅ Khớp |
| Panel (vị trí/cao) | y=580 / 409px | **y=420 / 305px** | y=420 / 304px | ✅ Khớp |
| Ô nhập (cao) | 48px | **48px** | 48px | ✅ Khớp |
| Cột ngày | 121px | **127px** | 127px | ✅ Khớp |
| Hành khách / KM / rẻ nhất | hiện | **ẩn (site thật cũng ẩn)** | ẩn | ✅ Khớp |
| Nút CTA | 200×39 @ y=712 | **200×39 @ y=626** | 200×39 @ y=625 | ✅ Khớp (1px) |
| Thanh điều hướng dưới | 63px, bo 0 | **62px, bo 15px 15px 0 0** | 62px, bo 15px | ✅ Khớp |
| Nhãn thanh dưới | "Đặt vé"… | **"Đặt chuyến bay"…** | khớp từng nhãn | ✅ Khớp |
| Tràn ngang (overflow) | — | **0px** | 0px | ✅ Khớp |

**Parity desktop (1440×900) được bảo toàn:** announce 50px, lớp phủ header 118px @ y=50, logo 265×46 @ (120, 71), hero 725px, panel 380×409 @ (940, 266), tab 201/103/76 bo 5px, CTA 200×39 @ (1030, 607) — tất cả không đổi so với số đo đã nghiệm thu.

---

## 2. Nguyên nhân gốc của `ERR_CONNECTION_REFUSED (-102)`

Báo lỗi trên `http://localhost:4028/dich-vu?service=cargo` **không liên quan gì tới route `/dich-vu`** — mọi URL trên port 4028 đều chết cùng lúc. Chuỗi sự kiện:

1. Dev server bị kill giữa chừng trong lúc Turbopack đang ghi cache → file cache `.next/dev` bị ghi dở.
2. Lần khởi động sau, Turbopack panic ngay lúc boot:
   ```
   Error [TurbopackInternalError]: range start index 763466 out of range for slice of length 763350
       at turbopack/crates/turbo-persistence/src/static_sorted_file.rs:570
   ```
   → tiến trình `next dev` chết trước khi lắng nghe cổng → `ECONNREFUSED` cho mọi URL.
3. Lần khởi động tiếp theo dùng `launchctl submit` chạy **`npm run dev` → `next dev --turbo`**; nhưng do cache vẫn hỏng, file CSS được serve ra **9 bytes** (rỗng) → trang hiển thị không có style, ảnh hero tràn ra 1920px, `innerWidth` bị Chrome "shrink-to-fit" lên 1560px.

### Cách khắc phục đã áp dụng

```bash
launchctl remove vjdev 2>/dev/null
pkill -f "next dev"; pkill -f "next-server"; pkill -f "next start"
rm -rf .next/dev
launchctl submit -l vjdev -- /bin/zsh -lc \
  "cd <project> && exec npx next dev --turbo -p 4028"
```

**Kết luận:** dùng `launchctl submit` để dev server sống độc lập với vòng đời shell của agent (các tiến trình `nohup ... &` trong shell nền bị Cursor thu hồi khi session kết thúc). Sau khi xoá cache, CSS serve đúng 234KB, cả `/trang-chu` và `/dich-vu?service=cargo` trả **HTTP 200**.

---

## 3. Các lỗi giao diện đã sửa và cách sửa

### 3.1 `src/shared/components/navigation/Header.tsx` — thêm hàng điều hướng mobile

**Lỗi:** header trang chủ dùng `hidden lg:block` cho phần nội dung → ở 390px không có gì hiển thị, chiều cao header = 0px, không có logo, không có menu.

**Sửa:** thêm một hàng phủ 56px nằm ngay dưới thanh thông báo:

```tsx
'absolute inset-x-0 top-[var(--vj-announce-h,35px)] z-40 h-[56px] lg:inset-x-0 lg:top-[50px] lg:z-[1300] lg:h-0 lg:shadow-none'
```

Nội dung hàng (đo từ site thật):

| Thành phần | Kích thước | Toạ độ |
|---|---|---|
| Logo trắng (`brightness-0 invert`) | 84 × 15px | x=13, y=51 |
| "Hỗ trợ" (icon tai nghe 12×12) | 10px/700 | x=151 |
| Icon quả địa | 14 × 14px | — |
| "Đăng ký \| Đăng nhập" | 10px/700 | — |
| Nút "vi" (viền trắng 1px, bo 3px) | 38 × 20px | — |
| Nút menu | 12 × 14px | sát mép phải |

**Lưu ý kỹ thuật:** dùng biến CSS `--vj-announce-h` do `AnnouncementBar` công bố (35px, hoặc 0px khi người dùng đóng thanh) để header luôn neo đúng ngay dưới thanh thông báo, kể cả sau khi đóng.

### 3.2 `src/shared/components/navigation/AnnouncementBar.tsx` — công bố chiều cao

Thêm `useEffect` set `--vj-announce-h` / `--vj-announce-h-lg` (35px / 50px, 0px khi dismissed) vào `document.documentElement`.

### 3.3 `src/app/trang-chu/components/HeroSection.tsx`

| Thay đổi | Trước | Sau |
|---|---|---|
| Cao banner | `h-[380px]` | `h-[422px] sm:h-[560px] lg:h-[725px]` |
| Top chấm slider | `top-[589px]` | `top-[297px] lg:top-[589px]` (+ `pt-[6px]` mobile để chấm rơi đúng y=338) |
| Vị trí panel đặt vé | trôi trong flow | `absolute inset-x-0 top-[333px]` (tab bắt đầu ở y=368, phủ xuống banner) |
| Padding đáy section | 0 | `pb-[268px] lg:pb-0` (khối kế tiếp bắt đầu ở y=725) |

### 3.4 `src/app/trang-chu/components/HeroBookingWidget.tsx`

- Rộng tab: `w-[207px] lg:w-[201px]` / `w-[105px] lg:w-[103px]` / `w-[78px] lg:w-[76px]`.
- Cột ngày: `w-[127px] lg:w-[121px]`.
- Ẩn ở mobile (site thật không có): hàng "Hành khách", "Mã khuyến mại", công tắc "Tìm vé rẻ nhất" → `hidden lg:flex`.
- Hàng CTA: `mt-[11px] pt-[30px] pb-[60px]` (mobile) → nút 200×39 nằm ở y=626, panel kết thúc ở y=725.

### 3.5 `src/styles/tailwind.css`

```css
/* MOBILE: gradient 11.3deg màu đục, bo góc 10px 10px 0 0 */
.vj-booking-tab { background-image: linear-gradient(11.3deg, rgb(217,26,33) 30.49%, rgb(111,0,0) 186.99%); border-radius: 10px 10px 0 0; }
@media (min-width: 1024px) { .vj-booking-tab { background-image: linear-gradient(20.12deg, rgba(217,26,33,.8) 19.6%, rgba(111,0,0,.8) 93.86%); border-radius: 5px 5px 0 0; } }
@media (max-width: 1023px) { .vj-booking-panel { border-radius: 0; } }
```

### 3.6 `src/shared/components/navigation/MobileBottomNav.tsx` + `tailwind.config.js`

- Bỏ `border-t border-white/10` (làm cao 63px) → thanh đúng **62px**.
- Token bo góc đổi từ `'15px 15px 0 0'` → `'15px'` để `rounded-t-vj-bottomnav` sinh được (Tailwind 3.4 **không** nội suy utility theo hướng với token 4 giá trị → trước đó class này ra `0px`).
- Nhãn đổi theo site thật: `Đặt chuyến bay` / `Chuyến bay của tôi` / `Mua hành lý, chỗ ngồi...` / `Check-in`.
- Màu nhãn: tất cả trắng (site thật dùng trắng ở cả 4 mục), bỏ `text-white/70`.
- Layout mục: `pt-[10px] pb-[5px]` (icon 24×24 ở y=792, nhãn 10px/700 ở y=815/816), mỗi mục rộng đều 98px (site thật: 97/98/98/98).

---

## 4. Sai lệch còn lại (không phải lỗi layout)

| Mục | App | Site thật | Ghi chú |
|---|---|---|---|
| Số banner slider | 9 | 7 | Khác biệt **nội dung**, app có nhiều banner hơn. Vị trí chấm vẫn căn giữa. |
| Vị trí khối sau hero | bắt đầu y=725 | y=744 | App không có lớp "promo card" của site thật. |
| Dải dịch vụ phụ (quick rail) | ẩn trên mobile | ẩn trên mobile | Khớp. |

---

## 5. Cổng chất lượng đã chạy

| Cổng | Lệnh | Kết quả |
|---|---|---|
| Type-check | `npx tsc --noEmit` | ✅ 0 lỗi |
| ESLint | `npx eslint src/` | ✅ 0 lỗi, 32 warning (có sẵn) |
| Tailwind class audit | `npm run lint:tailwind-classes` | ✅ OK (2357 token quét) |
| Unit test | `npx vitest run` | ✅ 110 file / **999 test pass**, 0 fail |
| Desktop parity | `scripts/qa-desktop-check.cjs` | ✅ không lệch |
| Mobile parity | `scripts/qa-mobile-detail.cjs` | ✅ khớp (bảng mục 1) |

---

## 6. Công cụ đo dùng để tái lập

| Script | Mục đích |
|---|---|
| `scripts/measure-official-mobile.cjs` | Đo site thật ở 390×844 → `docs/qa/so-do-mobile-site-that.json` |
| `scripts/probe-official-desktop-extra.cjs` | Đo CTA/tab/panel desktop của site thật |
| `scripts/probe-official-bottomnav-active.cjs` | Đo màu/nhãn thanh điều hướng dưới của site thật |
| `scripts/qa-mobile-detail.cjs` | Đo chi tiết app ở 390×844 (header, hero, tab, panel, bottom nav) |
| `scripts/qa-desktop-check.cjs` | Kiểm tra parity desktop không bị hồi quy |
| `scripts/measure-mobile.cjs` | Đo tổng hợp + phát hiện tràn ngang |

---

## 7. Ghi chú vận hành dev server

Dev server trên port 4028 **phải được chạy bằng `launchctl submit`** thay vì `nohup ... &` trong shell của agent: các tiến trình con của shell nền bị Cursor thu hồi khi session kết thúc → `ERR_CONNECTION_REFUSED (-102)` tái diễn.

```bash
# Kiểm tra nhanh
lsof -nP -iTCP:4028 -sTCP:LISTEN
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4028/trang-chu

# Nếu cache Turbopack hỏng (log có "TurbopackInternalError") hoặc CSS serve rỗng:
rm -rf .next/dev && launchctl remove vjdev; \
launchctl submit -l vjdev -- /bin/zsh -lc "cd <project> && exec npx next dev --turbo -p 4028"
```

Dấu hiệu CSS bị serve rỗng (9 bytes) → trang mất toàn bộ style, `innerWidth` bị Chrome nới rộng, và mọi số đo trở nên vô nghĩa. Luôn kiểm tra `curl -s <page> | grep -o '/_next/static/[^"]*\.css'` rồi `curl` file đó để chắc CSS > 100KB trước khi đo.
