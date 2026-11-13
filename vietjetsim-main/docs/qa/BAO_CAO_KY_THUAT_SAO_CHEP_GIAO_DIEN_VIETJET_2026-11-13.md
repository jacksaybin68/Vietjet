# Báo cáo kỹ thuật — Sao chép giao diện Vietjet Air (13/11/2026)

Phạm vi: **5 nhóm trang** còn lại của site `newweb.vietjetair.com` — Đặt vé, Chuyến
bay của tôi, Check-in Online, Đăng ký, Đăng nhập.

Nhánh: `cursor/vietjet-ui-parity-polish-2026-11-13`
Baseline đo được: [`VIETJET_THAM_SO_TRANG_CON_2026-11-13.md`](./VIETJET_THAM_SO_TRANG_CON_2026-11-13.md)

---

## 1. Nguyên tắc đã tuân thủ

| Ràng buộc | Cách thực hiện |
|---|---|
| Không tải/hotlink asset hay CSS của site thật | Chỉ **đo** DOM sống (kích thước/màu/font/bo góc) bằng `scripts/measure-official-pages.cjs`, rồi dựng lại bằng token & utility nội bộ |
| Không đổi schema DB | Không có migration nào trong đợt này |
| Không đụng giá server-side | `src/features/bookings/pricing` và logic tính tiền không thay đổi |
| Không đổi contract API | `/api/xac-thuc/*` giữ nguyên; luồng OTP / CAPTCHA / 2FA giữ nguyên |
| Giữ card 2 cột ở trang auth | `AuthShell` vẫn là `lg:grid-cols-[1.12fr_0.88fr]` |

## 2. Nguồn số đo

```
docs/qa/2026-11-13-vietjet-measure/
├── official-home-desktop-1440.json
├── official-home-mobile-390.json
├── official-my-search-booking-desktop-1440.json
├── official-my-search-booking-mobile-390.json
├── official-checkin-desktop-1440.json
├── official-checkin-mobile-390.json
├── official-booking-search-desktop-1440.json
├── official-booking-search-mobile-390.json
├── official-booking-detail.json
└── app-local.json
```

Các route được đo ở `1440×900` và `390×844`:
`/vi/`, `/vi/my/search-booking`, `/vi/checkin`, `/vi/pages/booking-search`.

> `/vi/pages/booking-search` render phía client và cần session để có dữ liệu
> chuyến bay, nên probe tự động không lấy được danh sách chuyến. Baseline của
> nhóm này dựa trên **header đo được** + ảnh tham chiếu đã lưu ở
> `docs/qa/so-do-mobile-site-that.json`.

## 3. Thay đổi theo từng nhóm

### 3.1 Header trắng trang con (dùng chung)

| Thuộc tính | Giá trị áp dụng |
|---|---|
| Nền | `#FFFFFF` |
| Cao | `74px` |
| Bo góc | `0 0 16px 16px` |
| Shadow | `0 8px 24px rgba(0,0,0,.08)` |
| Viền dưới | `2px solid #E31E24` |
| Nav | `17px/500` KoHo, `#1F1F1F` |

Thêm biến thể `variant="subpage"` cho `Header` và component `SubpageHeader`
(dải tab trắng 50px + pill bo `18px`, tab đang chọn nền `#FFDD32` chữ
`rgb(115 62 10)`).

### 3.2 Ô tra cứu (underline Material-UI)

Site thật dùng `MuiInputBase-root MuiInput-underline`: container cao đúng
**40px**, không viền trên/side, chỉ gạch chân 1px, focus → gạch 2px đỏ, bo góc
`0px`, chữ `16px/500`.

Trước: `.vj-lookup-field` là hộp viền đầy → **47px** (cao thừa 7px ở cả desktop
lẫn mobile). Sau: đúng `40px`, khớp `/lam-thu-tuc` (370×40 desktop, 320×40
mobile) và `/chuyen-bay-cua-toi` (360×40 desktop, 290×40 mobile).

### 3.3 Panel "Thông tin đặt chỗ" (`BookingSummaryPanel`)

| Phần tử | Trước | Sau (theo số đo) |
|---|---|---|
| Bề rộng | `340px` | `380px` |
| Header | nền đỏ phẳng | gradient `359.2deg`, cao `56px`, `h3` `20px/700` trắng |
| Thanh mục | `py-2.5` | cao `52px`, nền `#F1F1F1`, tiêu đề `18px/600` |
| Thanh tổng | nền đỏ, `12px` | nền trắng, "Tổng tiền" `20px/600`, giá `22px/700` |

### 3.4 Đăng nhập / Đăng ký

- Tiêu đề form: `20px/600` uppercase KoHo (trước `20-24px/900`).
- Mô tả: `16px/500`, `line-height 21.28px` (trước `12-14px`).
- Tab Đăng ký / Đăng nhập: `19px/600` (trước `16-18px/900` + `scale-105`).
- `.vj-auth-submit` **giữ nguyên** theo `AGENTS.md`: 48px cao, bo góc 4px, sweep
  vàng 90° `#F9A51A → #FFDD00`, chữ `#333` — theme SkyID của site thật, không
  đổi sang đỏ.
- Card 2 cột, luồng OTP/2FA và contract API không đổi.

### 3.5 Đặt vé — `/tim-ve`

- Header: `variant="compact"` → `variant="subpage"` (đo được ở
  `/vi/pages/booking-search`: header trắng 74px bo góc dưới 16px).
- `FareClassTabs`: nhãn `14px/600` uppercase (trước `12px/700` + tracking rộng).
- `TripLegTabs`: nhãn chuyến `14px/600`, số chuyến `14px/700`.
- `DateStrip`: chữ 13px (`sm2`), giá 13px/700.

## 4. Tám cổng nghiệm thu

| # | Cổng | Lệnh | Kết quả |
|---|---|---|---|
| 1 | Type check | `npm run type-check` | ✅ 0 lỗi |
| 2 | Lint | `npm run lint` | ✅ 0 error (30 warning `no-explicit-any` có sẵn từ trước) |
| 3 | Tailwind classes | `npm run lint:tailwind-classes` | ✅ 2340 token, không class không tồn tại |
| 4 | CSS debt | `npm run lint:css-debt` | ✅ `fontSize 107→107`, `color 79→79` (không tăng) |
| 5 | Build | `npm run build` | ✅ thành công |
| 6 | UI check | `node scripts/ui-check.cjs` | ✅ **53/53 màn hình sạch** |
| 7 | Unit test | `npx vitest run` | ✅ **110 file / 999 test** |
| 8 | Smoke | `node scripts/smoke-test.cjs` | ✅ toàn bộ assertion pass |

## 5. Lỗi phát hiện & cách sửa trong đợt này

| # | Vấn đề | Nguyên nhân | Cách sửa |
|---|---|---|---|
| 1 | `eslint .` treo hàng chục phút | `.next-prod/` (336MB), `.next-qa-*/` (336MB), `.next-mobilqa/` (332MB) sinh từ pipeline QA **không** nằm trong `ignores` — `eslint .` quét cả chúng | Thêm `.next-mobilqa/`, `.next-prod/`, `.next-qa-*/` vào `eslint.config.mjs`; lint rút từ >15 phút xuống ~50s |
| 2 | 33 lỗi `prettier/prettier` | Script đo mới viết tay chưa qua Prettier | `eslint . --fix` |
| 3 | `ui-check` chết với `Page.loadEventFired never fired` | Timeout 30s quá ngắn khi máy chật/memory áp lực | `LOAD_TIMEOUT` mặc định 90s, nới được qua `UI_CHECK_TIMEOUT_MS` |
| 4 | 53 màn hình `ui-check` trả HTTP 500 | `next start` trên `.next` bị **`next dev` ở cổng 4028 ghi đè** client manifest trong lúc chạy | Theo `AGENTS.md`: build vào `DIST_DIR=.next-uicheck` riêng rồi `DIST_DIR=.next-uicheck npx next start -p 4041` |
| 5 | `ui-check` báo `BOX TRÙNG: HEADER+IMG @0:35` ở `/trang-chu` mobile/tablet | Header trang chủ là **lớp phủ** (`position:absolute`) trên ảnh hero — đúng như site thật — nên nó và ảnh slide trùng đúng gốc | Detector bỏ qua cặp *header phủ* (`absolute`/`fixed`) + *ảnh nền*; header `sticky`/`static` đè ảnh vẫn bị báo |
| 6 | Ô tra cứu cao 47px thay vì 40px | `.vj-lookup-field` còn kiểu hộp viền đầy | Chuyển sang underline Material-UI (xem 3.2) |

## 6. Ghi chú vận hành

- **Cần `DIST_DIR` riêng khi chạy `ui-check`**: nếu một `next dev` còn sống và
  dùng chung `.next`, bản `next start` sẽ phục vụ cây build bị ghi đè và mọi
  màn hình trả 500.
- `ui-check` cần Chrome trên máy; ảnh nằm ở thư mục tạm, đổi bằng
  `UI_CHECK_SHOTS_DIR`.
- `smoke` chạy với `SMOKE_BASE_URL`; không `DATABASE_URL` thì nó dùng mock DB.
- Đợt này **không** tạo migration DB nào.

## 7. Ngoài phạm vi (có chủ ý)

- **Giá vé, phí, thuế**: giữ nguyên logic server-side.
- **Sơ đồ chỗ ngồi, hành lý, suất ăn, ví**: giữ nguyên luồng và component hiện có;
  chỉ chỉnh typography/size, không đổi hành vi.
- **Trang chủ (`/trang-chu`)**: không thuộc 5 nhóm trong phạm vi đợt này; chỉ sửa
  detector `ui-check` để không báo nhầm lớp phủ hero.
