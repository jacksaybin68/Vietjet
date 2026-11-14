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
