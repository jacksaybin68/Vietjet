# 🎨 KẾ HOẠCH CHỈNH SỬA GIAO DIỆN GIỐNG VIETJETAIR.COM

**Ngày lập**: 2026-09-21
**Đối tượng**: `vietjetsim-main` (Next.js 16.3.4 / React 19 / Tailwind 3.4.6)
**Trạng thái**: Hoàn thành (2026-09-21)
**Nguồn tham chiếu**: https://www.vietjetair.com/vi (khảo sát trực tiếp DOM + CSS bundle production)

---

## 1. Mục tiêu

Đưa giao diện các trang trong `vietjetsim-main` tiệm cận nhận diện của
vietjetair.com về **bố cục header, hệ màu, typography và dạng control** — không sao chép
nội dung/dịch vụ thật, chỉ đồng bộ ngôn ngữ thị giác.

**Trong phạm vi:**
- Hệ màu + token (đỏ, vàng/gold, gradient, nền, chữ).
- Header (announce bar, utility row, menu bar đỏ, rail dịch vụ).
- Khung trang dùng chung (Header/Footer một lần cho trang công khai).
- Hero + form tìm chuyến bay ở trang chủ.
- Sửa link hỏng điều hướng.

**Ngoài phạm vi:**
- Logic nghiệp vụ, API, DB, auth, RBAC.
- Nội dung trang quản trị (`/quan-tri`) — giữ nguyên hệ admin hiện có.
- Không đổi route/URL đang chạy (tránh phá deep link).

---

## 2. Hiện trạng đã khảo sát

### 2.1 Số liệu đo được trong repo

| Chỉ số | Giá trị | Hệ quả |
|---|---|---|
| Màu hex khác nhau trong `src/` | **254** | Không có nguồn màu duy nhất |
| Tổng lần xuất hiện hex | **1262** | Rất nhiều hard-code rải rác |
| Đỏ dùng song song | `#EC2029`×123, `#E31E24`×24, `#E30613`×14 | 3 sắc đỏ khác nhau |
| Vàng dùng song song | `#FFD400`×44, `#FFC400`×13, `#FFC72C`×7, `#FFD700`×5, `#FFF200`×4 | 5 sắc vàng khác nhau |
| Cỡ chữ tuỳ biến `text-[Npx]` | 15 giá trị khác nhau | Thang chữ không thống nhất |

Nguyên nhân gốc: `tailwind.config.js` khai báo `vjred: '#E31E24'` còn `src/styles/tailwind.css`
khai báo `--primary: #E30613`, trong khi các component lại hard-code `#EC2029` — ba nguồn
sự thật cho cùng một màu thương hiệu.

### 2.2 Bằng chứng lấy từ vietjetair.com

Trích trực tiếp từ CSS/JS bundle production (`/static/css/main.f5b4a549.chunk.css`,
`/static/js/main.6df371cf.chunk.js`):

```css
/* Gradient đỏ chủ đạo — dùng cho menu bar và toolbar date-picker */
linear-gradient(180deg, #D91A21 34.8%, #6F0000 182.34%)

/* Gradient gold — dùng cho nút CTA và thanh progress */
linear-gradient(60.29deg, #F9A51A -4.93%, #FBB612 18.27%, #FFDD00 71.59%)

/* Menu bar cố định */
menuBarContainer { background: linear-gradient(180deg,#D91A21 34.8%,#AB0303 182.34%);
                   height: 48; width: 100%; position: fixed }

/* Font + nền */
body { font-family: KoHo, sans-serif !important; background-color:#fff !important }
```

Các giá trị khác ghi nhận được:

| Token thật | Giá trị | Ghi chú |
|---|---|---|
| Đỏ icon/active | `#EC2029` | 47 lần trong bundle — màu đỏ "action" |
| Gold phụ | `#f7c61a`, `#FFDD00`, `#F9A51A` | Nút CTA |
| Xám chữ | `#333333`, `#6C6C6C`, `#939393` | Thang chữ xám |
| Nền phụ | `#fafafa`, `#F9FAFB`, `#f7f7f7` | Section xen kẽ |
| Bo góc | `36px` (pill), `10px` (card), `8px`, `5px`, `.3rem` | Pill cho CTA, card 10px |

**Kết luận quan trọng**: form tìm chuyến bay trên trang chủ thật **không** dùng card trắng bo
góc lớn như `design_mau_giao_dien_nguoi_dung.html`. Nó là **card đỏ nằm trong hero**, với
nút CTA vàng dạng viên thuốc. HeroSection hiện tại đã đúng hướng này.

### 2.3 Header thật vs header hiện tại

| Thành phần | vietjetair.com | `Header.tsx` hiện tại |
|---|---|---|
| Announce bar | 2 dòng, có mũi tên trái/phải chuyển thông báo | 1 dòng, chỉ có nút đóng |
| Utility row | Logo · Hỗ trợ · Đăng ký\|Đăng nhập · Tiếng Việt | Logo · Hỗ trợ · Đăng ký/Đăng nhập · ThemeToggle · Tiếng Việt |
| Menu bar | **Nền đỏ** chữ trắng, sticky | **Nền trắng** chữ đen/xám |
| Rail dịch vụ | 9 icon ảnh màu (Đặt vé…SkyJoy) | 9 icon `react-icons` đơn sắc |
| Mobile | Hamburger + drawer | Không có, chỉ scroll ngang |

Sai lệch lớn nhất: menu bar thật **nền đỏ gradient**, app đang để nền trắng.

### 2.4 Các lỗi điều hướng phát hiện được

```
/dich-vu/hanh-ly   → 404      /dich-vu/skyboss  → 404
/dich-vu/suat-an   → 404      /dich-vu/duty-free → 404
/dich-vu/cho-ngoi  → 404      /dich-vu/bao-hiem  → 404
/dich-vu/skyjoy    → 404      /dich-vu/e-sim     → 404
/dich-vu/e-visa    → 404
```

9 link này nằm trong `ServiceIconsSection.tsx` (trang chủ) — người dùng bấm vào là gặp 404.

### 2.5 Trang thiếu khung dùng chung

| Trang | Thiếu Header | Thiếu Footer |
|---|---|---|
| `gioi-thieu`, `hoi-dap`, `lien-he` | ✅ thiếu | ✅ thiếu |
| `dich-vu` | dùng riêng | ✅ thiếu |
| `tra-cuu` | dùng riêng | ✅ thiếu |
| `hanh-ly` | ✅ thiếu | ✅ thiếu (`return null`) |
| `dang-nhap`, `editor`, `quan-tri` | ✅ thiếu (chủ ý) | ✅ thiếu (chủ ý) |

`gioi-thieu`, `hoi-dap`, `lien-he`, `dich-vu` mỗi trang tự vẽ hero đỏ riêng với
`linear-gradient` viết inline → không đồng nhất và không sửa được tập trung.

---

## 3. Bảng ánh xạ thiết kế

Đây là bảng chuẩn để triển khai. Mọi nơi hard-code màu phải chuyển sang token tương ứng.

| Vai trò | Token mới | Giá trị | Thay thế cho |
|---|---|---|---|
| Đỏ thương hiệu (fill, icon, active) | `vj.red` | `#EC2029` | `#E31E24`, `#E30613` |
| Đỏ gradient — đầu | `vj.red-grad.from` | `#D91A21` | inline `#E30613` |
| Đỏ gradient — cuối | `vj.red-grad.to` | `#6F0000` | inline `#8F020B`, `#B91C1C` |
| Gold — đầu | `vj.gold.from` | `#F9A51A` | `#FFC400`, `#FFC72C` |
| Gold — giữa | `vj.gold.mid` | `#FBB612` | — |
| Gold — cuối (CTA) | `vj.gold.to` | `#FFDD00` | `#FFD400`, `#FFD700`, `#FFF200` |
| Chữ chính | `vj.text` | `#333333` | `#1A2948`, `#242424` |
| Chữ phụ | `vj.text-muted` | `#6C6C6C` | `#6d6e71`, `#939393` |
| Nền phụ | `vj.surface` | `#f7f7f7` | `#F7F7F7`, `#fafafa` |
| Viền | `vj.border` | `#ececec` | `#e2e8f0`, `#e9eaee` |

**Quy ước hình dạng (bám bundle thật):**

| Thành phần | Bo góc | Chiều cao |
|---|---|---|
| Nút CTA chính | `rounded-full` (pill, ~36px) | 48px |
| Card | `rounded-[10px]` | — |
| Ô input trong form | `rounded-[5px]` | 48px |
| Menu bar | 0 | 48px |

**Typography:** `KoHo` là font body, weight 500 mặc định — đã có trong
`tailwind.config.js` (`font-koho`, `font-body`) nhưng `body` đang gán
`'KoHo', 'Be Vietnam Pro'` trong `globals.css` (file không được import) nên không có hiệu lực.

---

## 4. Các giai đoạn triển khai

### Phase 1 — Token hoá hệ màu ✅ nền tảng cho mọi phase sau
1. Cập nhật `tailwind.config.js`: đổi `vjred` → `#EC2029`, thêm `gold.from/mid/to`,
   `red-grad.from/to`; giữ alias cũ để không vỡ chỗ chưa migrate.
2. Cập nhật `src/styles/tailwind.css`: đồng bộ `--primary`, `--vj-red`, `--accent`,
   `--vj-yellow` theo bảng trên; thêm biến gradient dùng lại.
3. Thêm lớp tiện ích `.vj-cta` (nút pill gold) và `.vj-menubar` (gradient đỏ) để
   Header và hero dùng chung, tránh lặp inline style.
4. Thay `text-[Npx]` rải rác bằng thang chữ Tailwind ở các component trọng tâm.

**Kiểm chứng**: `npm run build` qua; test hiện có vẫn xanh.

### Phase 2 — Header giống vietjetair.com
1. Announce bar: thêm mũi tên trái/phải chuyển thông báo, giữ nút đóng, ARIA `aria-live`.
2. Utility row: logo (dùng `AppLogo`), `Hỗ trợ`, `Đăng ký | Đăng nhập`, chọn ngôn ngữ.
   Chuyển `ThemeToggle` vào menu tài khoản (site thật không có nút theme ở header).
3. Menu bar: **nền gradient đỏ, chữ trắng**, sticky `top-0`, cao 48px; trạng thái active
   là gạch chân trắng. Đây là thay đổi thị giác lớn nhất.
4. Rail dịch vụ: giữ 9 mục, đưa vào nền sáng `#f7f7f7`, icon màu đỏ `#EC2029`.
5. Thêm **mobile drawer**: hamburger mở panel chứa menu chuyến bay + rail dịch vụ +
   tài khoản. Hiện chưa có, đây là lỗ hổng dùng được trên mobile.
6. Giữ nguyên: `useAuth`, đóng menu khi click ngoài, đóng bằng `Escape`, các `href` hiện có.

**Rủi ro**: menu bar đỏ có thể làm giảm tương phản chữ trắng/nền đỏ ở một số màn hình;
dùng đúng `#D91A21` (không phải `#EC2029`) cho nền để đạt tương phản tốt hơn.

### Phase 3 — Khung trang dùng chung
1. Tạo route group `src/app/(main)/layout.tsx` render `<Header/>` + `children` + `<Footer/>`.
2. Di chuyển các trang công khai vào group, **bỏ** `<Header/>`/`<Footer/>` lặp trong
   từng `page.tsx`.
3. Thêm Header/Footer cho `gioi-thieu`, `hoi-dap`, `lien-he`, `tra-cuu`, `dich-vu`.
4. `dang-nhap`, `quan-tri`, `editor` giữ layout riêng (chủ ý — không dùng khung công khai).
5. Gộp 4 hero đỏ tự vẽ của `gioi-thieu`/`hoi-dap`/`lien-he`/`dich-vu` thành một
   component `PageHero` dùng chung.

> Lưu ý kỹ thuật: route group `(main)` không đổi URL, nhưng `middleware.ts` khớp theo
> pathname nên không bị ảnh hưởng. Cần chạy lại `src/test/route-access.test.ts` để xác nhận.

### Phase 4 — Sửa link hỏng
Chọn phương án **gộp về `/dich-vu` + anchor** thay vì tạo 9 route mới, vì
`dich-vu/page.tsx` đã là trang danh mục dịch vụ đầy đủ:

```
/dich-vu/hanh-ly  → /dich-vu#baggage     (id đã có: 'baggage')
/dich-vu/suat-an  → /dich-vu#meal
/dich-vu/cho-ngoi → /dich-vu#seat
/dich-vu/skyboss  → /dich-vu#skyboss
...
```

Cách này không tạo trang rỗng, không thêm mã, và sửa đúng 1 file
(`ServiceIconsSection.tsx`). Nếu sau này cần trang riêng thì tách sau.

### Phase 5 — Hero + form tìm chuyến bay
Đối chiếu site thật, giữ những gì đã đúng và sửa phần lệch:

**Đã đúng, giữ nguyên:** card đỏ `#EC2029`, 3 hàng input, accordion hành khách,
ô mã giảm giá, checkbox "Tìm vé rẻ nhất", nút CTA vàng.

**Cần sửa:**
1. Lỗi chính tả trong chuỗi hiển thị: `"Mua hành lý, suût ăn chọn ghế ngồi..."` → `suất ăn`.
2. Nút CTA đổi sang gradient gold thật (`#F9A51A → #FBB612 → #FFDD00`) thay vì `#FFD400`
   phẳng, bo `rounded-full` theo bundle.
3. Thay `window.location.href` bằng `router.push` (giữ hành vi, tránh full reload).
4. Thêm **dải "Tìm vé rẻ nhất"** — carousel giá vé theo chặng như site thật. Hiện
   `HotDealsSection` đang hiển thị giá USD cho chặng quốc tế, khác với dải giá VND
   thật. Bổ sung component mới, dữ liệu lấy từ `searchFlightsForUi`.
5. Dọn biến không dùng trong `HeroSection` (`Link`, `MdLogin`, `MdSwapHoriz`, `paxRef`,
   `airport`, `adj`) để hết cảnh báo lint.

### Phase 6 — Đồng bộ trang còn lại
Áp token + `PageHero` + `rounded-full` CTA cho: `tim-ve`, `tra-cuu`, `lam-thu-tuc`,
`dat-ve/[id]`, `thanh-toan`, `tai-khoan`, `chuyen-bay-cua-joi`, `dich-vu`, `hoi-dap`,
`gioi-thieu`, `lien-he`, `dang-nhap`.

---

## 5. Thứ tự & phụ thuộc

```
Phase 1 (tokens)
   ├── Phase 2 (Header)  ──┐
   ├── Phase 3 (shell)   ──┼── Phase 6 (đồng bộ toàn bộ)
   └── Phase 5 (hero)    ──┘
Phase 4 (link hỏng) — độc lập, làm bất kỳ lúc nào
```

Phase 1 phải xong trước tất cả. Phase 4 không phụ thuộc gì.

---

## 6. Tiêu chí nghiệm thu

| # | Tiêu chí | Cách kiểm |
|---|---|---|
| 1 | Header có menu bar nền gradient đỏ | Ảnh chụp `/trang-chu` |
| 2 | Chỉ còn **1** sắc đỏ và **1** sắc gold trong `src/` | `grep -rohE '#[0-9A-Fa-f]{6}' src \| sort -u` |
| 3 | Không còn page công khai nào thiếu Header/Footer | Script kiểm tra như mục 2.5 |
| 4 | Không còn link 404 ở trang chủ | `curl -o /dev/null -w '%{http_code}'` cho 9 link |
| 5 | Nút CTA bo pill + gradient gold | Ảnh chụp hero |
| 6 | `npm run build` qua (TS gate bật) | `npm run build` |
| 7 | `npm test` xanh | 225 test như baseline |
| 8 | `npm run lint` trên file sửa: 0 error | `npx eslint <files>` |
| 9 | `hero-banner.test.tsx` vẫn qua | Chuỗi "Bay là thích ngay!", nút "Tìm chuyến bay", "Điểm khởi hành", "Điểm đến" phải giữ |

---

## 7. Rủi ro & giảm thiểu

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Route group `(main)` làm lệch URL | Cao | Group không đổi path; chạy `route-access.test.ts` + curl từng route |
| Menu đỏ giảm tương phản chữ | Trung bình | Dùng `#D91A21` cho nền, không dùng `#EC2029`; kiểm contrast ≥ 4.5:1 |
| Đổi token vỡ trang chưa migrate | Trung bình | Giữ alias cũ trong `tailwind.config.js` ở Phase 1, xoá ở Phase 6 |
| `hero-banner.test.tsx` vỡ khi sửa hero | Trung bình | Giữ nguyên 4 chuỗi test đang assert |
| 254 màu hard-code quá nhiều để sửa hết | Trung bình | Ưu tiên 8 file trọng tâm trước; phần còn lại theo tiêu chí #2 |
| Token vàng `#FFD400` ở `dang-nhap` lệch nhẹ so với `#FFDD00` | Thấp | Chấp nhận, đưa về `vj.gold.to` ở Phase 6 |

---

## 8. Việc bắt buộc kiểm tra lại sau mỗi phase

```bash
cd vietjetsim-main
npx eslint <các file đã sửa>      # phải 0 error
npm run type-check                # TS gate của build
npm test                          # 225 test phải xanh
npm run build                     # bắt buộc, ignoreBuildErrors = false
```

Ảnh chụp đối chiếu: `/trang-chu`, `/tim-ve`, `/dang-nhap`, `/hoi-dap`, `/lien-he`,
`/dich-vu` ở cả desktop (1440px) và mobile (390px).