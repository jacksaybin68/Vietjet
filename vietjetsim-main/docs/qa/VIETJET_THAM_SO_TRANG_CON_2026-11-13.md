# Vietjet Air — Baseline tham số giao diện trang con (13/11/2026)

Tài liệu này là **baseline chuẩn** cho đợt sao chép 5 nhóm trang còn lại:
Đặt vé, Chuyến bay của tôi, Online Check-in, Đăng nhập, Đăng ký.

> **Bản quyền (AGENTS.md):** tài liệu chỉ ghi lại **số đo** (kích thước / màu / font /
> bo góc) lấy từ DOM sống của `newweb.vietjetair.com`. Không tải asset, CSS hay
> font của site thật về repo. Mọi giá trị dưới đây được dựng lại bằng token & utility
> nội bộ của dự án.

Nguồn số đo:
- `scripts/measure-official-pages.cjs` → `docs/qa/2026-11-13-vietjet-measure/official-<route>-<viewport>.json`
- `scripts/measure-parity-pages.cjs` → `docs/qa/2026-11-13-vietjet-measure/app-local.json`
- `scripts/probe-official-booking.cjs` → `docs/qa/2026-11-13-vietjet-measure/official-booking-detail.json`

Viewport: `1440×900` (desktop) và `390×844` (mobile).

---

## 0. Token dùng chung đo được

| Token | Giá trị | Nơi dùng |
|---|---|---|
| `--vj-header-sub` | `#FFFFFF` | nền header trang con |
| `--vj-header-sub-border` | `#E31E24` | viền dưới header trang con (2px) |
| `--vj-nav-ink` | `#1F1F1F` | chữ nav 17px/500 |
| `--vj-pill-gray` | `#F7F7F7` | nền pill "Tải ứng dụng" |
| `--vj-pill-gray-border` | `#DDDDDD` | viền pill xám |
| `--vj-pill-gold-from` / `--vj-pill-gold-to` | `#FFEB63` → `#F5D200` | gradient pill "Đăng nhập" |
| `--vj-pill-gold-border` | `#F0CC00` | viền pill vàng |
| `--vj-yellow-tab` | `#FFDD32` | pill tab đang chọn |
| `--vj-tab-ink` | `rgb(115 62 10)` | chữ trên pill tab đang chọn |
| `--vj-btn-disabled-ink` | `#75767A` | chữ nút disabled |
| `--vj-radius-field` | `5px` | bo ô nhập (bản có viền) |
| `--vj-radius-card` | `12px` | bo card tra cứu |
| `--vj-radius-modal` | `8px` | bo modal SkyJoy ID |
| `--vj-radius-btn` / `--vj-radius` | `10px` | bo nút CTA |
| `--vj-lookup-card-bg` | `rgba(255,255,255,.94)` | nền card tra cứu |
| `--vj-font` | `KoHo` | toàn bộ văn bản |

Gradient CTA "Tìm kiếm" (đo ở nút, không suy đoán):

```css
linear-gradient(
  26.73deg,
  #F9A51A 13.7%,
  #FBB612 29.8%,
  #FFDD00 66.81%
)
```

---

## 1. Header trang con (đo ở `/vi/checkin`, `/vi/my/search-booking`, `/vi/pages/booking-search`)

| Thuộc tính | Site thật | App (sau khi sửa) |
|---|---|---|
| Nền | `rgb(255,255,255)` | `#FFFFFF` |
| Cao | `74px` | `74px` |
| Bo góc | `0px 0px 16px 16px` | `0 0 16px 16px` |
| Shadow | `rgba(0,0,0,0.08) 0px 8px 24px 0px` | `0 8px 24px rgba(0,0,0,.08)` |
| Viền dưới | `2px solid #E31E24` | `2px solid #E31E24` |
| Chữ nav | `16px` (17px ở desktop) / `500` / `rgb(31,31,31)` | 17px/500 KoHo `#1F1F1F` |

Cụm nút phải (desktop):

| Nút | Kích thước | Nền / viền | Chữ |
|---|---|---|---|
| "Hỗ trợ" | chip `91×28`, bo `999px` | trong suốt, viền `#DDDDDD` | 15px/500 |
| "Tiếng Việt" | chip `116×28` | trong suốt, viền `#DDDDDD` | 15px/500 |
| "Tải ứng dụng" | pill `156×36` | `#F7F7F7`, viền `#DDDDDD` | 15px/500 |
| "Đăng nhập" | pill `125×36` | gradient `#FFEB63→#F5D200`, viền `#F0CC00` | 15px/700 |

**Mobile (390×844):** site thật dùng header ĐỎ 56px (`h1` trắng 16px/700 uppercase).
App hiện tại dùng header trắng responsive — giữ nguyên theo quyết định "keep-split",
chỉ tinh chỉnh token/size/typography.

---

## 2. Check-in — `/vi/checkin` ↔ `/lam-thu-tuc`

Số đo desktop (`official-checkin-desktop-1440.json`):

| Phần tử | Site thật | App |
|---|---|---|
| Header | `1408×74`, nền trắng, bo `0 0 16px 16px` | `1440×76` (1px chồng viền dưới) |
| `h1` "LÀM THỦ TỤC" | `20px/600`, `line-height 26px`, x=170, w=410 | 20px/600 uppercase |
| Ô nhập | `370×40`, `16px/500`, bo `0px` (underline MUI) | `369×47` → cần về `370×40` |
| Nút "Tìm kiếm" | `127×39`, `14px/500`, bo `10px` | `127×39` ✓ |

Mobile (`official-checkin-mobile-390.json`):

| Phần tử | Site thật | App |
|---|---|---|
| Ô nhập | `320×40` | `310×47` → cần về `320×40` |
| Nút "Tìm kiếm" | `127×39`, `14px/500` | `127×39` ✓ |

**Kết luận:** nút đã khớp. Ô nhập còn 7px cao thừa do `.vj-lookup-field` dùng padding
`14px 20px 3px` + border 1px → phải chuyển sang **underline MUI** (cao 40px, không viền
trên/side, gạch chân 1px, focus gạch 2px đỏ).

---

## 3. Chuyến bay của tôi — `/vi/my/search-booking` ↔ `/chuyen-bay-cua-toi`

Desktop (`official-my-search-booking-desktop-1440.json`):

| Phần tử | Site thật | App | Chênh lệch |
|---|---|---|---|
| Header | `1408×74` | `1440×76` | +32 rộng, +2 cao |
| `h2` "CHUYẾN BAY CỦA TÔI" | `20px/600`, x=225, w=390 | 20px/600 uppercase | ✓ |
| Ô nhập 1..3 | `360×40`, `16px/500`, gap 17px | `360×47` | +7 cao |
| Nút "Tìm kiếm" | `127×39`, `14px/500`, bo `10px` | `127×39` | ✓ |

Mobile (`official-my-search-booking-mobile-390.json`):

| Phần tử | Site thật | App |
|---|---|---|
| Ô nhập | `290×40` | `358×47` → cần về `290×40` |
| Nút "Tìm kiếm" | `127×39`, `14px/500` | `127×39` ✓ |

Dải tab "Dịch vụ tra cứu" (chỉ có ở `/vi/my/search-booking`):
container `1200px`, cao `69px`, bo `16px`, padding `16px`; pill `164×36`, bo `18px`;
active nền `#FFDD32` chữ `rgb(115,62,10)`, inactive nền trong suốt.

---

## 4. Đặt vé — `/vi/pages/booking-search` ↔ `/tim-ve`

`/vi/pages/booking-search` là **SPA render client-side**: probe tự động
(`scripts/probe-official-booking.cjs`) chạy 20s sau `domcontentloaded` vẫn trả về
`bodyText` rỗng — tức dữ liệu chuyến bay chỉ về sau khi có session/response API
cụ thể. Vì vậy **baseline của nhóm này dựa trên header đo được** (đã lưu ở
`official-booking-search-desktop-1440.json`) + ảnh chụp tham chiếu đã lưu ở
`docs/qa/so-do-mobile-site-that.json`.

Header đo được ở `/vi/pages/booking-search` (1440×900):

| Thuộc tính | Giá trị |
|---|---|
| Nền | `rgb(255,255,255)` |
| Cao | `74px` |
| Bo góc | `0px 0px 16px 16px` |
| Shadow | `rgba(0,0,0,0.08) 0px 8px 24px 0px` |

⇒ `/tim-ve` phải dùng **header trắng 74px** (`variant="subpage"`), KHÔNG dùng
biến thể `compact` (gradient đỏ 4 tầng).

### 4.1 Panel "Thông tin đặt chỗ" (BookingSummaryPanel)

Số đo tham chiếu (site thật, desktop):

| Phần tử | Số đo |
|---|---|
| Bề rộng panel | `380px` |
| Header panel | gradient đỏ `359.2deg`, cao `56px`, `h3` 20px/700 trắng |
| Thanh mục (accordion) | cao `52px`, nền `#F1F1F1`, tiêu đề `18px/600` |
| Thanh tổng | nền trắng, "Tổng tiền" `20px/600`, giá `22px/700` |
| Nút "Đi tiếp" | `127×39` |

### 4.2 Thẻ chuyến bay (FlightCard) / Dải ngày (DateStrip) / Tabs hạng vé (FareClassTabs)

Quy ước đã chốt trong `AGENTS.md`: **một bảng màu duy nhất** — hạng vé đang chọn
đánh dấu bằng nền/viền đỏ thương hiệu, KHÔNG dùng 4 chip xanh/cam/nâu (chúng
gây nhiễu cạnh CTA đỏ). Giữ nguyên quy ước này, chỉ chỉnh kích thước/typography:
- `FareClassTabs`: nhãn `14px/600` uppercase, active đỏ.
- `DateStrip`: ô ngày bo `10px`, chữ 13px/500, giá 13px/700.
- `FlightCard`: giá `16px/700` KoHo, tên hạng `12px/700` uppercase.

---

## 5. Đăng nhập / Đăng ký — `/dang-nhap`, `/dang-ky`

Quyết định đã chốt: **giữ card 2 cột hiện tại**, chỉ chỉnh token / size /
typography. Site thật dùng Keycloak ở domain riêng
`skyjoy-authen.vietjetair.com` nên không thể sao chép nguyên trang; bản mô phỏng
nội tuyến dùng lại API `/api/xac-thuc/*` sẵn có.

Chuẩn áp dụng:

| Phần tử | Quy chuẩn |
|---|---|
| Font | `KoHo` (300–700), không dùng Jambono cho chữ chạy |
| Bo góc nút | `10px` (`--vj-radius`) |
| Gradient nút | `linear-gradient(26.73deg, #F9A51A 13.7%, #FBB612 29.8%, #FFDD00 66.81%)` |
| Nút submit | cao `48px`, rộng `344px`, chữ `16px/500` |
| Tiêu đề form | `20px/600` uppercase |
| Mô tả | `16px/500`, `line-height 21.28px` |
| Ô nhập | underline 40px, chữ `16px/500` |

Không đụng luồng OTP / CAPTCHA / 2FA và không đổi contract API.

---

## 6. Ngưỡng chấp nhận lệch (tolerances)

| Loại | Ngưỡng |
|---|---|
| Bề rộng container | ±2px |
| Chiều cao ô nhập / nút | ±2px |
| Cỡ chữ | phải khớp tuyệt đối |
| Bo góc | phải khớp tuyệt đối |
| Màu nền / chữ | phải khớp tuyệt đối |
| Vị trí ngang (x) | ±16px |

## 7. 8 cổng nghiệm thu

```bash
npm run type-check
npm run lint
npm run lint:tailwind-classes
npm run lint:css-debt
npm run build
DIST_DIR=.next-uicheck npm run build && DIST_DIR=.next-uicheck npx next start -p 4029
UI_CHECK_BASE_URL=http://127.0.0.1:4029 node scripts/ui-check.cjs
npm test
npm run test:smoke
```
