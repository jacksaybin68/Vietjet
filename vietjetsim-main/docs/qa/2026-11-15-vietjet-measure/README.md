# Đo lại DOM sống — site thật (14/11/2026)

Nguồn: `newweb.vietjetair.com` (Puppeteer + browser CDP), lưu JSON thô tại
`docs/qa/2026-11-15-vietjet-measure/official-*.json`.

> Quy tắc `AGENTS.md`: chỉ **đo** số đo. Không tải CSS/font/asset của site thật
> về repo.

## 0. Các script dùng để đo

| Script | Phủ |
|---|---|
| `scripts/measure-official-auth-lookup.cjs` | `/vi/signin`, `/vi/signup`, `/vi/my/search-booking`, `/vi/checkin` @ 1440×900 + 390×844 |
| `scripts/probe-official-signin-popup.cjs` | Bấm nút "Đăng nhập" ở header rồi đo khung popup |

Popup đăng nhập của site thật **không** mở được bằng Puppeteer headless (bị
WAF chặn → `403 Forbidden` khi điều hướng sang `auth.vietjetair.com`), nên số
đo popup lấy từ lần đo tay 13/11/2026 (`docs/qa/so-do-skyid-2026-11-13.md` §4)
và được đối chiếu lại ở §1 dưới đây.

---

## 1. Popup SkyID 622×664

| Phần tử | Số đo |
|---|---|
| Container ngoài | `622×664px`, `border-radius:10px`, `overflow:hidden`, shadow `rgba(0,0,0,.21) 0 2px 6px` |
| Băng đỏ trên cùng | cao `48px`, `padding:0 17px`, nền `linear-gradient(rgb(217,26,33) 34.8%, rgb(171,3,3) 182.34%)`, shadow `rgba(0,0,0,.21) 0 2px 6px` |
| Tiêu đề băng đỏ | "Đăng nhập SkyJoy" / "Đăng ký SkyJoy", `16px/500` KoHo, trắng |
| Overlay thân | `linear-gradient(rgba(0,0,0,.5) 0%, rgba(0,0,0,.094) 100%)` |
| Khung iframe SkyID | `500×208px` tại `x=61`, `y=100` (cách mép trên khung `52px`) |
| Bottom nav | cao `62px`, `border-radius:15px 15px 0 0`, nền `linear-gradient(rgba(0,0,0,.8) 4.03%, rgba(0,0,0,.153) 216.13%)`, nhãn `10px/700` trắng, active `#F7C61A` |
| Overlay nền ngoài | `rgba(0,0,0,.4)` |

Ở mobile (`390×844`) băng đỏ phủ **toàn chiều rộng** `390×48px` — đo được
trực tiếp: `linear-gradient(rgb(217,26,33) 34.8%, rgb(171,3,3) 182.34%)`,
`padding 0 17px`, shadow `rgba(0,0,0,.21) 0 2px 6px`.

---

## 2. Header trang con (đo ở `/vi/checkin`, 1440×900)

| Phần tử | Số đo |
|---|---|
| `<header>` | `x=16`, `w=1408`, **`h=74px`** (72px trong + viền dưới 2px), nền `#FFFFFF`, bo `0 0 16px 16px`, shadow `rgba(0,0,0,.08) 0 8px 24px`, viền dưới `2px #E31E24` |
| Hàng nav trong header | `h=72px`, `padding 0 30px` |
| Link nav | `17px/500` KoHo, `#1F1F1F` |
| `<li>` nav | `16px/700`, `uppercase` |
| **Số mục nav** | **3**: "Chuyến bay của tôi", "Online Check-in", "Dịch vụ chuyến bay" (dropdown: Bảo hiểm / Săn vé giá rẻ / Dịch vụ đặc biệt) |
| Chip "Hỗ trợ" | `91×28`, `15px/500`, radius `999px`, `padding 0 12.5px` |
| Chip "Tiếng Việt" | `116×28`, `15px/500`, radius `999px` |
| Pill "Tải ứng dụng" | `156×36`, nền `#F7F7F7`, viền `#DDDDDD`, `15px/500` |
| Pill "Đăng nhập" | `125×36`, gradient `linear-gradient(rgb(255,235,99) 0%, rgb(245,210,0) 100%)`, viền `1px #F0CC00`, `15px/700`, `padding 0 25px` |

Ở mobile header đổi thành **băng đỏ** `390×48px` cùng gradient như §1, tiêu đề
trắng `16px/700` `JambonoMedium` uppercase ("LÀM THỦ TỤC" ở `/vi/checkin`,
"ĐẶT CHỖ CỦA TÔI" ở `/vi/my/search-booking`, "ĐĂNG NHẬP SKYJOY" ở `/vi/signin`).

---

## 3. Form tra cứu (Material-UI underline)

Đo trực tiếp trên DOM sống (`getComputedStyle`):

| Phần tử | Số đo |
|---|---|
| Wrapper ô nhập | `h=40px`, `w=370px` (check-in) / `w=360px` (chuyến bay của tôi) / `w=320px` (check-in mobile) / `w=290px` (chuyến bay của tôi mobile) |
| `<input>` | `h=32px`, `padding 6px 0 7px`, `16px/500` KoHo, màu `#333`, KHÔNG viền trên/side |
| Gạch chân | `1px solid #D9D9D9`; focus → `2px` đỏ thương hiệu |
| Nhãn | `16px/600` `#333`, nâng lên caption `12px/500` khi focus/đã có giá trị |
| Khung chứa ô (check-in) | nền trắng, `border-radius:5px`, `padding 0 20px` |

### 3.1. Chi tiết đo lại 14/11/2026 (probe `scripts/probe-official-field-*.cjs`)

Site thật dùng MUI `TextField variant="standard"` với `padding: 0 20px` ở
wrapper (`MuiFormControl-root`) → **mọi ô nhập lệch `+20px` so với mép cột**,
độc lập với breakpoint:

| Trang | Viewport | Wrapper (`MuiFormControl-root`) | `<input>` | Nhãn hiển thị |
|---|---|---|---|---|
| `/vi/checkin` | 1440×900 | `x=170`, `w=410`, `h=40` | `x=190`, `y=296`, `370×32`, `16px/500`, `lh 21.28` | `x=190`, `y=368`, `86×21`, `16px/600`, `lh 21.28`, `#333` |
| `/vi/checkin` | 390×844 | `x=15`, `w=360`, `h=40` | `x=35`, `y=171`, `320×30`, `14px/500`, `lh 18.62` | `x=35`, `y=251`, `75×19`, `14px/600`, `lh 18.62`, `#333` |
| `/vi/my/search-booking` | 1440×900 | `x=220`, `w=400`, `h=40` | `x=240`, `y=363`, `360×32`, `16px/500` | `x=240`, `y=368`, `86×21`, `16px/600` |
| `/vi/my/search-booking` | 390×844 | `x=30`, `w=330`, `h=40` | `x=50`, `y=246`, `290×30`, `14px/500` | `x=50`, `y=251`, `75×19`, `14px/600` |

Gạch chân (đo ở `MuiInput-underline`):
- `::before` = `1px solid rgba(0, 0, 0, 0.42)` (nền).
- `::after` = `2px solid rgb(236, 32, 41)` (focus, vẽ overlay **không** đẩy layout).

Dấu `*` trong nhãn: `rgb(236, 32, 41)`.

> **Lưu ý (khác biệt có chủ đích).** Site thật dùng MUI `InputLabel` với
> `data-shrink="false"` → nhãn **không** nổi lên khi focus hay khi đã nhập, và
> vì vậy chữ đã nhập sẽ **chồng lên nhãn**. App giữ hành vi nổi nhãn (caption
> `12px/500`) để tránh lỗi chồng chữ, còn **trạng thái rảnh (empty & blur)**
> khớp tuyệt đối với site thật (nhãn nằm giữa ô, `16px/600` / `14px/600`).

### 3.2. Quy tắc bám theo (đã cài trong `src/styles/tailwind.css`)

| Token / class | Giá trị |
|---|---|
| `.vj-lookup-field` | `position:relative; display:flex; align-items:center; height:40px; border-bottom:1px solid var(--vj-underline-border)` |
| `.vj-lookup-field::after` | overlay focus `2px` `--primary` (không đổi layout) |
| `.vj-lookup-input` | desktop `32px`, `16px/500`; mobile (`≤639px`) `30px`, `14px/500` |
| `.vj-lookup-label` | canh giữa theo chiều dọc trong ô; desktop `16px/600`, mobile `14px/600` |
| `--vj-underline-border` | `#d9d9d9` |

---

## 4. `/vi/checkin` (1440×900)

| Phần tử | Số đo |
|---|---|
| Container | `x=145`, `w=1150` |
| Cột trái (form) | `x=170`, `w=410`; H1 `x=170`, `y=188`, `20px/600`, `lh 26px`, uppercase, `margin 13.4px 0 20px` |
| Mô tả | `x=170`, `y=234`, `w=410`, `h=42`, `16px/500`, `lh 20.8px`, `margin 16px 0` |
| Ô nhập 1 | `x=190`, `y=292`, `370×40` (wrapper), input `370×32` |
| Ô nhập 2 | `x=190`, `y=342`, `370×40` |
| Nút "Tìm kiếm" | `x=312`, `y=392`, **`127×39`**, radius `10px`, gradient `26.73deg`, `14px/500`, màu `rgb(117,118,122)`, `padding 0 15px` |
| Nút "Đăng nhập" | `x=307`, `y=471`, **`137×48`**, radius `12px`, nền trắng, viền `1px rgba(236,32,41,.1)`, chữ `rgb(214,35,30)` `16px/500` |
| Link "Đăng ký ngay" | `x=428`, `y=535`, `84×20`, `14px/400`, màu `rgb(0,136,255)` |
| Dòng SkyJoy | "Bạn đã biết về Vietjet SkyJoy? Đăng ký ngay", khối `y=471`, `h=84` |
| **Cột phải (nội dung dài)** | `x=626`, `w=649` — CÓ tồn tại trên site thật |

**Quan trọng — cột phải của `/vi/checkin` CÓ tồn tại trên site thật.** Đo được
trực tiếp (không phải suy đoán): các khối "Quý khách có thể chủ động làm thủ
tục chuyến bay trực tuyến…", "Tiện lợi – nhanh chóng – tiết kiệm thời gian",
"Lưu ý sau khi Online Check-in:", "Lưu ý quan trọng:", "I. Các chuyến bay khai
thác bởi Vietjet:", "II.", "III." đều nằm ở cột phải (`x=626`, `w=649`).
→ **KHÔNG xoá** các khối này (kế hoạch cũ ghi "site thật không có" — sai).

Trang check-in **không** có dải pill "Dịch vụ tra cứu" (đo: không tồn tại
`nav[aria-label="Dịch vụ tra cứu"]`).

Ở mobile (`390×844`): băng đỏ 48px, ô nhập `320×40` tại `x=35`, "Tìm kiếm"
`127×39`, "Đăng nhập" `137×48`, link "Đăng ký ngay" `84×20`.

---

## 5. `/vi/my/search-booking` (1440×900)

| Phần tử | Số đo |
|---|---|
| Dải "Dịch vụ tra cứu" | `x=120`, `y=82`, `1200×69`, bo `16px`, `padding 16px`, nền ảnh `search-my-booking-nav-bg.webp` |
| Bên trong dải | **2 pill**: "Chuyến bay của tôi" (`x=136`, `164×36`, nền `#FFDD32`, chữ `rgb(115,62,10)`) và "Đơn hàng SkyShop" (`x=308`, `164×36`, nền trong suốt, chữ `#333`), chữ `14px/500`, radius `18px` |
| Cột trái | `x=120`, `w=600`, `padding 20px 25px 0` |
| Khối form | `x=220`, `w=400` |
| H2 | `x=225`, `y=229`, `20px/600`, uppercase, màu `#333` |
| Mô tả (h5) | `x=225`, `y=275`, `390×64`, `16px/500`, `lh 24px` |
| Ô nhập ×3 | `x=240`, `w=360`, `h=40`, cách nhau `57px` (y=359 / 416 / 473) |
| Nút "Tìm kiếm" | `x=357`, `y=530`, `127×39`, radius `10px`, gradient `26.73deg` |
| Nút "Đăng nhập" | `x=352`, `y=609`, `137×48`, radius `12px`, nền trắng, viền `1px rgba(236,32,41,.1)`, chữ `rgb(214,35,30)` `16px/500` |
| Link "Đăng ký ngay" | `x=473`, `y=673`, `84×20`, `14px/400`, `rgb(0,136,255)` |
| Cột phải | `x=720`, `w=600`, `padding 30px 15px` |
| **Banner phải** | `x=735`, `y=209`, **`570×496`**, radius `5px` — CÓ tồn tại trên site thật (`vie12mybookingbanner690x600.jpg`) |

→ Banner phải **CÓ** trên site thật (kế hoạch cũ ghi "bỏ banner ngoại tệ" —
sai). Việc cần làm là **thêm** khối "Đăng nhập / Đăng ký ngay / dòng SkyJoy"
(cũng có trên site thật), không phải bỏ banner.

Ở mobile: 2 pill `160×36` tại `x=27` / `x=195`, `y=71`; ô nhập `290×40` tại
`x=50`; "Tìm kiếm" `127×39`; "Đăng nhập" `137×48`.

---

## 6. Bottom nav di động của site thật

Đo ở `/vi/checkin`, `/vi/signin`, `/vi/signup` (390×844):

| Mục | Số đo |
|---|---|
| 4 mục | **"Trang chủ" / "Vé của tôi" / "Mua vé" / "Làm thủ tục"** |
| Kích thước | mỗi mục `87×56`, x = `21 / 108 / 195 / 282`, `y=771` |
| Chữ | `16px/500`, màu `rgb(31,42,51)`; mục active `#EC2029` ("Làm thủ tục" ở trang check-in) |

Khác hẳn 4 mục hiện tại của dự án ("Đặt chuyến bay / Chuyến bay của tôi /
Mua hành lý, chỗ ngồi... / Check-in") — 4 mục đó là bottom nav **trong popup**
SkyID, không phải bottom nav của trang.

### 6.1. Đo lại 14/11/2026 (đo trực tiếp thanh ở đáy trang)

| Thuộc tính | Số đo |
|---|---|
| Vị trí | `position: fixed`, `bottom: 0`, `inset-x: 0` |
| Chiều cao | **`88px`** (padding `8px 12px 10px`) |
| Nền | trắng `#FFFFFF`, **không** bo góc, **không** đổ bóng |
| Icon | `26×26px`, cách nhãn `6px` |
| Nhãn | `13px/500`, `line-height: 16px` |
| Màu | inactive `rgb(31, 42, 51)`, active `rgb(236, 32, 41)` |
| Mục | "Trang chủ" (x=21) / "Vé của tôi" (x=108) / "Mua vé" (x=195) / "Làm thủ tục" (x=282) |

> ⚠️ **Dễ nhầm:** thanh `62px` bo góc `15px 15px 0 0` là bottom nav **BÊN TRONG
> popup SkyID** (`src/features/auth/components/PopupFrame.tsx`), KHÔNG phải
> thanh đáy trang. `MobileBottomNav` của trang là thanh `88px` ở §6.1.

---

## 6.2. Header trang con ở MOBILE (đo lại 14/11/2026)

Đo ở `/vi/checkin` và `/vi/my/search-booking` (390×844):

| Phần tử | Số đo |
|---|---|
| Thanh | cao **`48px`** (KHÔNG phải 56px), `padding 0 17px` |
| Nền | `linear-gradient(rgb(217,26,33) 34.8%, rgb(171,3,3) 182.34%)` |
| Số phần tử con | **2** — `<h1>` + nút hamburger. **KHÔNG có logo** (`imgs: 0`) |
| `<h1>` | `x=17`, `y=15`, `w=320`, `h=19`, `16px/700` `JambonoMedium`, trắng, uppercase, căn giữa |
| Nút menu | `x=337`, `y=6`, `36×36` |
| Tiêu đề | "LÀM THỦ TỤC" (`/vi/checkin`), "ĐẶT CHỖ CỦA TÔI" (`/vi/my/search-booking`) |

Lưu ý: tiêu đề mobile của `/vi/my/search-booking` là **"ĐẶT CHỖ CỦA TÔI"**,
khác tiêu đề desktop `H2` "CHUYẾN BAY CỦA TÔI".

---

## 7. Nội dung dài ở `/vi/checkin` (đo từ DOM sống)

Thứ tự đầy đủ (đo bằng `document.body.innerText`):

```
Chuyến bay của tôi / Online Check-in / Dịch vụ chuyến bay   (nav header)
Hỗ trợ / Tiếng Việt / Tải ứng dụng / Đăng nhập            (header)
LÀM THỦ TỤC
Sẵn sàng cho chuyến bay vui vẻ, thoải mái, bạn có thể làm thủ tục chuyến bay trực tuyến nhanh chóng và đơn giản.
Mã đặt chỗ* / Họ*
Tìm kiếm
Đăng nhập
Bạn đã biết về Vietjet SkyJoy? Đăng ký ngay
Quý khách có thể chủ động làm thủ tục chuyến bay trực tuyến (Online Check-in) trên website hoặc ứng dụng Vietjet Air từ 24 giờ đến 60 phút trước giờ khởi hành (thời gian kết thúc có thể thay đổi tùy sân bay).
Tiện lợi – nhanh chóng – tiết kiệm thời gian
Hoàn tất thủ tục mọi lúc, mọi nơi và hạn chế thời gian chờ tại Quầy thủ tục sân bay.
Lưu ý sau khi Online Check-in:  (Không có hành lý ký gửi / Có hành lý ký gửi)
Lưu ý quan trọng:
I. Các chuyến bay khai thác bởi Vietjet: 1. Quy định chung / 2. Chuyến bay nội địa / 3. Chuyến bay quốc tế
Thời gian á dụng:
*Lưu ý quan trọng dành cho hành khách quốc tế đã làm thủ tục trực tuyến:
Để đảm bảo hành trình suôn sẻ…
II. Các chuyến bay khai thác bởi Thai Vietjet … TẠI ĐÂY
III. Làm thủ tục trực tuyến bằng công nghệ định danh sinh trắc học … TẠI ĐÂY
Xin cảm ơn và chúc Quý khách có chuyến đi vui vẻ!
```

Cột phải: các list có `padding-left:40px`, chữ `16px/500`, tiêu đề con
`16px/700`.
