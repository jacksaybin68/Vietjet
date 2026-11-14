# Đối chiếu giao diện 100% — Luồng đặt vé (Chọn chặng → Thanh toán xong)

**Ngày đo:** 14/11/2026
**Site thật:** `https://newweb.vietjetair.com` (đo trực tiếp bằng CDP trên DOM sống, viewport 1440×900)
**App local:** `http://127.0.0.1:4028` (đo cùng bộ câu hỏi)

> **Ghi chú bản quyền:** tài liệu này chỉ ghi lại **số đo** (kích thước / màu / font /
> bo góc / gradient) lấy từ DOM sống. Không tải asset, CSS hay font của site thật
> về repo. Mọi giá trị được dựng lại bằng token & utility nội bộ của dự án.

---

## 0. Nguồn số đo

**Site thật (đo trực tiếp 14/11/2026):**

- `/vi/` — trang chủ (hero, search bar, sections)
- `/vi/select-flight` — chọn chuyến bay (framework + panel đặt chỗ)
- `/vi/payment-methods` — chỉ tới màn "Hết hạn session" (cần session thật)
- Route thật lấy từ `main.444c8b3e.chunk.js`:
  `/select-flight` → `/passengers` → `/select-service` → `/payment-methods`

**App local (đo cùng bộ câu hỏi):**

- `/tim-ve?from=SGN&to=DAD&depart=2026-11-25&adult=1`
- `/thanh-toan`
- `/dat-ve/[id]` (chi tiết đặt vé)

**Số đo đã lưu sẵn trong repo (13/11/2026):**
`docs/qa/2026-11-13-vietjet-measure/official-select-flight.json`,
`official-total-row.json`, `official-booking-detail.json`.

---

## 1. Token thương hiệu — đối chiếu tuyệt đối

| Token | Site thật (đo) | App local (đo) | Trạng thái |
|---|---|---|---|
| Font chữ | `KoHo` | `KoHo` | ✅ khớp |
| Font nút / giá lớn | `JambonoMedium` | `JambonoMedium` | ✅ khớp |
| Body text | `14px` / `#333333` | `14px` / `rgb(51,51,51)` | ✅ khớp |
| Gradient CTA | `linear-gradient(26.73deg, #F9A51A 13.7%, #FBB612 29.8%, #FFDD00 66.81%)` | **giống hệt** | ✅ khớp |
| Bo góc CTA | `10px` | `10px` | ✅ khớp |
| Shadow CTA | `rgba(0,0,0,.2) 0 3px 1px -2px, rgba(0,0,0,.14) 0 2px 2px, rgba(0,0,0,.12) 0 1px 5px` | `rgba(0,0,0,.05) 0 1px 2px` | ⚠️ lệch |
| Gradient panel header | `linear-gradient(359.2deg, #D91A21 53.08%, #6F0000 206.46%)` | `linear-gradient(359.2deg, #EC2029 0%, #6F0000 100%)` | ⚠️ lệch 2 điểm dừng |
| Gradient search bar | `linear-gradient(28.91deg, #F9A51A 2.24%, #FBB612 31.03%, #FBF300 97.21%)` | `linear-gradient(26.73deg, #F9A51A 13.7%, …)` | ⚠️ lệch |
| Nền hạng vé | `#F8F8F8` | — | ⚠️ thiếu |
| Nền thanh mục panel | `#F1F1F1` | `bg-gray-50/70` (≈ `#F9FAFB`) | ⚠️ lệch |
| Header trang con | trắng `#FFFFFF`, 74px, bo `0 0 16px 16px`, viền dưới `2px #E31E24` | trắng, **76px**, bo `0 0 16px 16px` | ⚠️ lệch 2px |
| Chữ nav header | `17px/500` `#1F1F1F` | `17px/500` `#1F1F1F` | ✅ khớp |

---

## 2. `/vi/select-flight` (Chọn chuyến bay) — site thật

### 2.1. Khung trang

| Phần tử | Số đo site thật |
|---|---|
| Header | `1408×74`, nền trắng, bo góc dưới `0 0 16px 16px`, shadow `rgba(0,0,0,.08) 0 8px 24px` |
| Container | `1200px`, x=`120` (viewport 1440) |
| Grid | `MuiGrid` 2 cột: trái `md-8` (820px, padding 15px), phải `md-4` (410px, padding 15px) |
| Băng "CHUYẾN BAY MỘT CHIỀU \| 1 Người lớn" | x=120, y=90, **1200×82**, bo góc **16px**, gradient vàng `28.91deg`, tiêu đề `18px/700` uppercase |
| Dải ngày | y=172, cao **237px** (mỗi ô `156×95`, bo gọn), padding `0 0 30px` |
| Ô ngày | `156×95`; text `16px/500`; "14 tháng 11" `16px/500` |
| Panel đặt chỗ | x=940, y=220, **380px** |
| Băng tổng (sticky bottom) | x=120, y=838, **1200×59**, nền trắng |
| Nút "Đi tiếp" | x=1173, y=838, **127×39**, `14px/500`, bo `10px`, gradient vàng |

### 2.2. Panel "THÔNG TIN ĐẶT CHỖ" — site thật

| Phần tử | Số đo site thật |
|---|---|
| Wrapper | `380×521`, bo góc **6px**, nền trắng |
| Header "THÔNG TIN ĐẶT CHỖ" | `h3` `20px/700` uppercase trắng, padding `8px 0`, gradient đỏ `359.2deg` |
| Bar "Thông tin hành khách" | `h4` `18px/600` `#000000` |
| Bar "Chuyến đi" | `h5` `16px/700` `#333333` |
| Dòng "--- \| --- \| --- \| ---" | `14px/500` `#333333` |
| Bar "Giá vé" / "Thuế, phí" / "Dịch vụ" | `h4` `18px/600` `#333333` |
| Bar "Dịch vụ" nền | `#F1F1F1`, bo `5px`, viền `1px solid #F1F1F1`, padding `5px 15px`, cao **52px** |
| Thanh tổng (đỏ) | `linear-gradient(359.2deg, #D91A21 53.08%, #6F0000 206.46%)`, cao **50px**, padding `15px 20px` |
| "Tổng tiền" | `h4` `20px/600` trắng |
| Giá tổng | `22px/700` **JambonoMedium** trắng |
| Tổng tiền ở băng dưới | `p` `20px/400` `#000` (không phải 22px) |

### 2.3. Băng tổng dưới (sticky bottom bar)

| Phần tử | Số đo site thật |
|---|---|
| Container ngoài | x=0, y=820, `1440×80`, nền trắng, padding `18px 0 0` |
| Nội dung | x=120, `1200×59`, padding-left `10px` |
| "Tổng tiền" | `p` `16px/500` `#000`, x=769 |
| "0 VND" | `p` `20px/400` `#000`, x=769 y=860 |
| "Chi tiết" | nút phụ |
| "Đi tiếp" | `127×39` |

---

## 3. `/tim-ve` (App local) — đối chiếu

| Phần tử | Site thật | App local | Chênh lệch |
|---|---|---|---|
| Header | `1408×74` | `1434×76` | **+2px cao**, +26 rộng |
| Băng "Chuyến bay một chiều" | `1200×82`, bo 16px, gradient `28.91deg` | `1434×44`, bo **0**, nền `#FFDD00` phẳng | ❌ **lệch lớn** |
| Vị trí băng | x=120, y=90 | x=0, y=76 | ❌ full-bleed thay vì container |
| Dải ngày — ô | `156×95`, `16px/500` | `110×85` (inactive) / `130×85` (active), `13px/500` | ❌ lệch size + font |
| Dải ngày — active | nền theo thiết kế site | `rgb(255,221,50)` = `#FFDD32`, chữ `rgb(115,62,10)`, bo `10px` | ✅ màu khớp |
| Panel header gradient | `359.2deg, #D91A21 53.08%, #6F0000 206.46%` | `359.2deg, #EC2029 0%, #6F0000 100%` | ⚠️ lệch |
| Panel header cao | `56px` | `56px` | ✅ |
| Panel h3 | `20px/700` | `20px/700` | ✅ |
| Panel bo góc | `6px` | `5px` | ⚠️ lệch 1px |
| Bar mục — nền | `#F1F1F1` | trong suốt / `bg-gray-50/70` | ❌ |
| Bar mục — tiêu đề | `18px/600` | `18px/600` | ✅ |
| Bar mục — chiều cao | `52px` | `28px` (nội dung) | ⚠️ |
| Panel x/y | x=940, y=220 | x=937, y=140 | ⚠️ lệch vị trí |
| Nút "Đi tiếp" | `127×39` | `95×39` | ❌ **rộng thiếu 32px** |
| Băng tổng dưới | `1200×59`, x=120, y=838 | `1434×71`, x=0, y=1314 | ❌ full-bleed |
| "Tổng tiền" băng dưới | `20px/400` | `20px/600` | ⚠️ |
| Tổng tiền panel | `22px/700` Jambono | `22px/700` Jambono | ✅ |

---

## 4. `/thanh-toan` (App local) — đối chiếu

| Phần tử | Site thật (`/payment-methods`) | App local | Chênh lệch |
|---|---|---|---|
| Header | trắng `74px`, bo `0 0 16px 16px` | **đỏ `#D91A21`, 122px** | ❌ **sai hoàn toàn** |
| H1 | — | `24px/900` `#333` | ⚠️ `font-black` không phải style site |
| Tiêu đề section | `20px/600` uppercase | `16px/800` | ❌ |
| Tiêu đề nhóm | — | `14px/800` | ⚠️ |
| Ô phương thức thanh toán | — | `143×96`, bo `12px`, active viền `2px #005BAA` | ⚠️ cần đối chiếu |
| Nút header "Tiếng Việt" | `15px/500`, chip `999px`, trong suốt, viền `#DDDDDD` | `12px/700`, `rgba(0,0,0,.1)` | ❌ |
| Nút header "Đăng nhập" | `125×36`, gradient `#FFEB63→#F5D200`, viền `#F0CC00`, `15px/700` | — | ❌ thiếu trên header đỏ |
| Hàng "Tải ứng dụng" | pill `156×36` nền `#F7F7F7` viền `#DDDDDD` | — | ❌ |
| Input mã ưu đãi | — | `179×38`, nền `#F7F7F7`, bo `8px` | ⚠️ site dùng underline MUI 40px |

---

## 5. Những gì **đã khớp 100%** (không cần sửa)

- Font `KoHo` + `JambonoMedium` + fallback chain.
- Gradient CTA vàng `26.73deg` — dùng ở mọi nút "Đi tiếp".
- Bo góc `10px` cho CTA, `5px` cho panel, `16px` cho băng tìm kiếm.
- Header trang con: nền trắng, bo `0 0 16px 16px`, shadow `0 8px 24px rgba(0,0,0,.08)`.
- Nav header `17px/500` `#1F1F1F`.
- Panel header `h3` `20px/700` uppercase trắng trên gradient đỏ.
- Bar mục trong panel `18px/600`.
- Tổng tiền `22px/700` JambonoMedium.
- Màu tab active dải ngày `#FFDD32` + chữ `rgb(115 62 10)`.
- Container `1200px`.

---

## 6. Bảng sai lệch — ưu tiên

| # | Vấn đề | Mức | File cần sửa |
|---|---|---|---|
| 1 | Header `/thanh-toan` đỏ 122px thay vì trắng 74px | P0 | `src/features/payments/components/PaymentClient.tsx` |
| 2 | Băng "Chuyến bay một chiều" full-bleed, bo 0, nền phẳng | P0 | `src/app/tim-ve/components/FlightBookingResultsWrapper.tsx` |
| 3 | Nút "Đi tiếp" 95px thay vì 127px | P0 | `src/app/tim-ve/components/ContinueButton.tsx` |
| 4 | Băng tổng dưới full-bleed 1434px thay vì container 1200px | P0 | `src/app/tim-ve/components/FlightBookingResultsWrapper.tsx` |
| 5 | Dải ngày ô `110×85`/`130×85` thay vì `156×95`; font `13px` thay vì `16px` | P0 | `src/app/tim-ve/components/DateStrip.tsx` |
| 6 | Header subpage 76px thay vì 74px | P1 | `src/shared/components/navigation/` |
| 7 | Gradient panel header sai điểm dừng | P1 | `tailwind.config.js` / `src/styles/tailwind.css` |
| 8 | Shadow CTA yếu hơn site | P1 | `src/styles/tailwind.css` (`.vj-cta`) |
| 9 | Nền thanh mục panel `#F9FAFB` thay vì `#F1F1F1` | P1 | `src/app/tim-ve/components/BookingSummaryPanel.tsx` |
| 10 | Bo góc panel `5px` thay vì `6px` | P2 | `BookingSummaryPanel.tsx` |
| 11 | Header đỏ mobile vs desktop dùng chung style | P1 | `PaymentClient.tsx` |
| 12 | H1 thanh toán `24px/900` thay vì `20px/600` uppercase | P1 | `PaymentClient.tsx` |
| 13 | Nhóm phương thức `16px/800` → `20px/600` uppercase | P1 | `PaymentClient.tsx` |
| 14 | Chip header (`Tiếng Việt`, `Hỗ trợ`) sai size/màu | P1 | `src/shared/components/navigation/` |
| 15 | Thiếu pill "Đăng nhập" gradient vàng + "Tải ứng dụng" | P1 | Header subpage |
| 16 | Input mã ưu đãi dùng box 38px thay vì underline MUI 40px | P2 | `PaymentClient.tsx` |
| 17 | Thiếu hàng "Chi tiết" trong băng tổng dưới | P1 | `FlightBookingResultsWrapper.tsx` |
| 18 | Băng tổng dưới: "Tổng tiền" 600 thay vì 400 | P2 | `FlightBookingResultsWrapper.tsx` |

---

## 7. Những gì **không đo được** (giới hạn kỹ thuật)

| Mục tiêu | Lý do |
|---|---|
| Danh sách chuyến bay thật + ô hạng vé | API nội bộ `vietjet-api.vietjetair.com` nằm sau AWS WAF + HMAC `X-Signature` + reCAPTCHA → `403` (đã ghi nhận trong `AGENTS.md`) |
| `/passengers`, `/select-service`, `/payment-methods` | Cần session đặt vé hợp lệ; truy cập trực tiếp trả "Hết hạn session" |
| Sơ đồ ghế, giá chọn ghế | Chỉ đo được sau khi có chuyến bay thật |

→ Đối với 3 mục này, **dùng token đã chốt trong `VIETJET_THAM_SO_TRANG_CON_2026-11-13.md`**
và quy ước trong `AGENTS.md` (một bảng màu duy nhất, hạng vé đánh dấu bằng nền/viền đỏ
thương hiệu) thay vì suy đoán pixel.

---

## 8. Ngưỡng chấp nhận lệch

| Loại | Ngưỡng |
|---|---|
| Cỡ chữ | phải khớp tuyệt đối |
| Bo góc | phải khớp tuyệt đối |
| Màu nền / chữ | phải khớp tuyệt đối |
| Chiều cao / rộng ô, nút | ±2px |
| Vị trí ngang (x) | ±16px |
