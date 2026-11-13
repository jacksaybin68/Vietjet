# Sơ đồ giao diện Vietjet — số đo site thật (13/11/2026)

Tài liệu này ghi lại **số đo đo trực tiếp trên DOM sống** của
`newweb.vietjetair.com/vi` (viewport `1440×900` cho desktop, `390×844` cho mobile),
phục vụ cho đợt sao chép giao diện các trang còn lại:

- `/vi/my/search-booking` — Chuyến bay của tôi
- `/vi/checkin` — Online Check-in
- Modal SkyJoy ID (mở từ header) — Đăng nhập / Đăng ký

> Không copy trực tiếp ảnh / logo / CSS từ site thật. Tài liệu này chỉ ghi lại
> **giá trị đo được** để dựng lại bằng token & utility nội bộ.

Nguồn đo: `getComputedStyle` trên DOM sống + đếm tần suất hex trong bundle
`main.*.chunk.js`. Giá trị chính xác đã được gom thành CSS variable trong
`src/styles/tailwind.css` (mục "Token đo trực tiếp từ vietjetair.com").

---

## 0. Token dùng chung

| Token | Giá trị | Nguồn |
|---|---|---|
| `--vj-red` | `#EC2029` | nút / chữ nhấn mạnh |
| `--vj-red-dark` | `#D91A21` | hover |
| `--vj-red-deep` | `#6F0000` | gradient đỏ sâu |
| `--vj-yellow` | `#FFDD00` | CTA chính |
| `--vj-yellow-tab` | `#FFDD32` | pill tab đang chọn |
| `--vj-tab-ink` | `rgb(115 62 10)` | chữ trên pill tab đang chọn |
| `--vj-skyjoy-id` | `#D6231E` | chữ "Đăng nhập" trong card SkyJoy |
| `--vj-link-blue` | `#0088FF` | link "Đăng ký ngay" |
| `--vj-radius-field` | `5px` | ô nhập tra cứu |
| `--vj-radius-card` | `12px` | card tra cứu |
| `--vj-radius-modal` | `8px` | modal SkyJoy ID |
| `--vj-radius-btn` | `10px` | nút "Tìm kiếm" |
| `--vj-field-border` | `#D9DEE5` | viền ô nhập |
| `--vj-btn-disabled-ink` | `#75767A` | chữ nút disabled |

Gradient CTA (đo được ở nút "Tìm kiếm"):

```css
linear-gradient(
  26.73deg,
  #F9A51A 13.7%,
  #FBB612 29.8%,
  #FFDD00 66.81%
)
```

Font: `KoHo` cho toàn bộ văn bản (300–700); `JambonoMedium` cho nút CTA.

---

## A. Chuyến bay của tôi — `/vi/my/search-booking`

### A.1 Bố cục desktop (1440×900)

- Container `1200px`, căn giữa.
- Card: nền `rgba(255,255,255,0.94)`, `border-radius: 12px`, cao ~`560px`.
- Grid 2 cột: **trái form `600px`** — **phải slider ảnh `600px`**.
- Ảnh bên phải: `600×500px`, `border-radius: 5px`.

### A.2 Cột trái — form tra cứu

| Phần tử | Số đo |
|---|---|
| Tiêu đề | `H2 "CHUYẾN BAY CỦA TÔI"`, `20px/600`, `line-height 26px`, uppercase, `margin 20px 0` |
| Dòng phụ | `16px/500`, `line-height 21.28px`, màu `#333` |
| Bề rộng form | `400px`, margin ngang `75px` |
| Ô nhập | cao `40px`, nền trắng, bo `5px`, padding ngang `20px` |
| Nhãn | `16px/600`, dấu `*` màu `#EC2029` |
| Khoảng cách giữa các ô | `17px` |
| Nút "Tìm kiếm" | `127×39px`, bo `10px`, gradient `26.73deg`, chữ `14px/500` |

Ba ô nhập: `Mã đặt chỗ*`, `Họ*`, `Tên đệm và tên*`.

### A.3 Khối SkyJoy dưới form

- Nút `Đăng nhập`: cao `48px`, bo `12px`, nền trắng, viền `1px rgba(236,32,41,0.1)`,
  chữ `#D6231E` `16px`, icon `20×20`.
- Dòng `Bạn đã biết về Vietjet SkyJoy? Đăng ký ngay`: `14px/400`,
  `letter-spacing .1px`, link `#0088FF`.

### A.4 Tabs đầu trang

- Desktop: `Chuyến bay của tôi` (đang chọn) + `Đơn hàng SkyShop`.
- Mobile: pill `160×36px`, bo `18px`; tab active nền `#FFDD32`, chữ `rgb(115,62,10)`.

### A.5 Mobile (390×844)

- Băng đỏ header, `H1 "ĐẶT CHỖ CỦA TÔI"` `16px/700` trắng uppercase.
- `H5 14px/700` cho dòng mô tả.
- Input `14px`, nút "Tìm kiếm" `127×39px`.

---

## B. Online Check-in — `/vi/checkin`

### B.1 Bố cục desktop (1440×900)

- Container `1200px`; 2 cột: **form trái `410px`** (x=170) — **nội dung hướng dẫn phải `649px`** (x=626).
- `H1 "LÀM THỦ TỤC"`: `20px/600`, uppercase, `line-height 26px`, `margin 13.4px 0 20px`.
- 2 input (`Mã đặt chỗ*`, `Họ*`), rộng tối đa `370px`, cao `40px`, bo `5px`.
- Nút "Tìm kiếm": gradient `26.73deg`, `127×39px`, bo `10px`; disabled chữ `#75767A`.

### B.2 Cột phải — nội dung hướng dẫn

- Đoạn văn `16px/500`, `line-height 24px`.
- Tiêu đề bullet: `16px/700`.
- Khối hướng dẫn (viền vàng) chia **3 cột** ở desktop:
  1. `Lưu ý sau khi Online Check-in:` (hành lý ký gửi / không ký gửi)
  2. `Lưu ý quan trọng:`
  3. `I. Các chuyến bay khai thác bởi Vietjet:`

### B.3 Mobile (390×844)

- Header đỏ, `H1 16px/700` trắng.
- Toàn bộ nội dung `14px/500`, `line-height 21px`.
- Input rộng `320px`.

---

## C. Modal SkyJoy ID — Đăng nhập / Đăng ký

Đây là modal 2 cột mở từ header của site thật (thay cho trang full-page SkyID).

### C.1 Overlay

- Cột trái (form): rộng `536px`.
- Cột phải (hero): `600×600px`, nền trắng.
- Bo góc modal `8px`.

### C.2 Cột trái — form

| Phần tử | Số đo |
|---|---|
| Tiêu đề | `32px/700` — đăng ký dùng `"Nhập số điện thoại"` |
| Phụ đề | `16px/400` |
| Nhãn ô điện thoại | `12px/500`, nằm phía trên |
| Ô điện thoại | cờ + mã quốc gia `🇻🇳 +84 ▾`, placeholder `Nhập số điện thoại của bạn`, chữ `16px/500` |
| Nút "Tiếp tục" | `146×48px`, bo `8px` |
| Nút disabled | nền `#F5F5F5`, chữ `#C4C4C4` |
| Nút active | chữ `700` |
| Divider | `hoặc tiếp tục với`, `16px/500`, `#C4C4C4` |
| Nút social | `Apple` / `Google`, chữ `16px/700` |
| Footer | `Được cung cấp và xác thực bởi SkyJoy ID`, `14px/500` |

### C.3 Luồng thật của site thật

- `Đăng nhập` → `auth.vietjetair.com/realms/skyjoy` (Keycloak ngoài domain),
  `redirect_uri` quay về `/vi/checkin?ui_locales=vi`.
- `Đăng ký` cũng đi qua realm `skyjoy` nên **không copy được** — bản mô phỏng
  nội tuyến dùng lại API `/api/xac-thuc/*` sẵn có của dự án.

---

## 2. Ánh xạ sang mã nguồn

| Số đo | Nơi dùng |
|---|---|
| `--vj-yellow-tab`, `--vj-tab-ink` | pill tab `/chuyen-bay-cua-toi`, `/lam-thu-tuc` |
| `.vj-lookup-card` | card 2 cột của `/chuyen-bay-cua-toi` và `/lam-thu-tuc` |
| `.vj-lookup-field` | 3 ô tra cứu (`40px`, bo `5px`, padding `0 20px`) |
| `.vj-lookup-btn` | nút "Tìm kiếm" (`127×39px`, bo `10px`, gradient `26.73deg`) |
| `.vj-subheader` / `.vj-subheader-pill` | header trắng của `SubpageHeader` (dùng bởi `CheckInHeader`) |
| `SkyJoyIdModal` | modal 2 cột dùng chung cho `/dang-nhap` và `/dang-ky` |
| `AuthModalProvider` | điều phối mở modal từ header, hỗ trợ `?redirect=` |

---

## 3. Kiểm tra chấp nhận

- `npm run type-check`, `npm run lint`, `npm run lint:tailwind-classes`: không lỗi.
- `DIST_DIR=.next-uicheck npm run build && DIST_DIR=.next-uicheck npx next start -p 4029 && UI_CHECK_BASE_URL=http://127.0.0.1:4029 node scripts/ui-check.cjs`: xanh.
  Ba màn `03-dang-nhap`, `05-lam-thu-tuc`, `06-chuyen-bay-cua-toi` phải qua được:
  đúng **1** `<main>`, đúng **1** `#main-content` nằm sau `<header>`, không tràn ngang,
  không có box trùng khung.
- `npm run test:smoke`: xanh.
- Đối chiếu trực quan ở `1440×900` và `390×844`: màu / gradient / khoảng cách lệch 0,
  font `KoHo` đúng weight.
