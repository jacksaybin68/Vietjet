# QA — Sao chép 100% giao diện Vietjet Air (khu vực người dùng, đến trước thanh toán)

**Ngày:** 13/11/2026
**Hồ sơ số đo nguồn:** [`VIETJET_THAM_SO_GIAO_DIEN_2026-11-13.md`](./VIETJET_THAM_SO_GIAO_DIEN_2026-11-13.md)
**Kế hoạch:** [`../plans/KE_HOACH_DOI_CHIEU_VIETJETAIR_2026-10-18.md`](../plans/KE_HOACH_DOI_CHIEU_VIETJETAIR_2026-10-18.md)
**Phạm vi:** toàn bộ khu vực người dùng của `vietjetsim-main`, **dừng trước khâu thanh toán**.

---

## 1. Cổng kỹ thuật

| Cổng | Lệnh | Kết quả |
| --- | --- | --- |
| Lint | `npx eslint src --quiet` | ✅ 0 error (exit 0) |
| Type-check | `npm run type-check` | ✅ sạch (`tsc --noEmit`, exit 0) |
| Unit test | `npm test` | ✅ xem §2 |
| Ratchet nợ CSS | `npm run lint:css-debt` | ✅ **107 fontSize / 79 color** — xanh |
| Class Tailwind không tồn tại | `npm run lint:tailwind-classes` | ✅ **2314 token quét, 0 lỗi ngoài vùng cấm sửa** |
| Build | `npm run build` | ✅ xem §2 |
| UI check | `npm run test:ui` | ✅ **35/35 màn hình** |

### 1.1 Ratchet nợ CSS

Baseline được hạ xuống số thực tế sau đợt dọn này:

| Mục | HEAD (trước đợt) | Sau đợt 13/11 | Chênh lệch |
| --- | --- | --- | --- |
| `text-[Npx]` (cỡ chữ tuỳ ý) | 268 | **107** | −161 |
| `[#rrggbb]` (màu tuỳ ý) | 129 | **79** | −50 |

79 màu hex còn lại nằm **hoàn toàn** trong khu vực ngoài phạm vi sửa:

| File | Số | Lý do không migrate |
| --- | --- | --- |
| `src/features/payments/components/PaymentClient.tsx` | 35 | **Ranh giới cứng — thanh toán không được sửa** |
| `src/features/payments/components/VietQrBox.tsx` | 18 | **Ranh giới cứng** |
| `src/features/payments/components/PaymentHistoryTab.tsx` | 13 | **Ranh giới cứng** |
| `src/features/payments/components/EBoardingPass.tsx` | 3 | **Ranh giới cứng** |
| `src/app/thanh-toan/page.tsx` | 3 | **Ranh giới cứng** |
| `src/features/admin/components/SendBookingEmailModal.tsx` | 4 | Ngoài phạm vi (admin console) |
| `src/app/editor/page.tsx` | 3 | Ngoài phạm vi (CMS) |

> Baseline được ghi bằng `node scripts/css-debt.cjs --update` sau khi đo thực tế, đúng
> chính sách ratchet của `scripts/css-debt.cjs`: *"Hạ nó xuống sau mỗi đợt dọn thật;
> đừng nâng lên"*. Số **107/79** thấp hơn HEAD (**268/129**), nên ratchet vẫn có
> hiệu lực chặn nợ mới.

### 1.2 Chốt class Tailwind không tồn tại

`npm run lint:tailwind-classes` (script mới: `scripts/check-tailwind-classes.cjs`) sinh
CSS bằng chính Tailwind CLI rồi đối chiếu **từng token** trong `className`/`class` với
selector thực sự có trong CSS. Mục đích: Tailwind **im lặng bỏ qua** class không sinh
CSS, nên typo kiểu `bg-whiterounded-vj` hay class bị "dính" khi thay hàng loạt sẽ
không ai thấy.

Kết quả: **2314 token quét, 0 class hỏng ngoài vùng ranh giới cứng.** Hai class còn
lại nằm trong `src/features/payments/**` (file không được sửa):

| Class | File | Ghi chú |
| --- | --- | --- |
| `font-[Be Vietnam Pro,sans-serif]` | `PaymentHistoryTab.tsx` | Arbitrary value có khoảng trắng — không phải class Tailwind hợp lệ (Tailwind yêu cầu `_`) |
| `animate-scale-in` | `ReservationCountdown.tsx` | Đã thêm token `animate-scale-in` + keyframe `scaleIn` ở `tailwind.config.js` để class có hiệu lực mà **không cần sửa file trong vùng cấm** |

> Script báo lỗi (`exit 1`) chỉ khi class hỏng nằm **ngoài** vùng ranh giới cứng
> (`src/features/payments/**`, `src/app/thanh-toan/**`, `src/features/admin/**`,
> `src/app/quan-tri/**`, `src/app/editor/**`). Vùng cấm chỉ được báo cáo.

---

## 2. Ranh giới cứng — thanh toán không bị đụng

```bash
git diff --stat -- \
  vietjetsim-main/src/features/payments \
  vietjetsim-main/src/app/thanh-toan \
  vietjetsim-main/src/features/admin \
  vietjetsim-main/src/app/editor \
  vietjetsim-main/src/app/quan-tri
# → (rỗng)
```

Toàn bộ khu vực cấm đã được **đưa về trạng thái nguyên bản so với HEAD**: không một
dòng nào khác, kể cả comment. Mọi token, gradient và bo góc mới đều được thêm ở tầng
token để các file này tiếp tục dùng nguyên giá trị cũ mà không cần sửa.

> **Ghi chú quá trình:** trong lúc dọn nợ CSS có một lượt migrate màu cục bộ sang
> token trong `payments` / `thanh-toan` / `admin` / `editor`. Đợt đối soát cuối đã
> kiểm tra **từng cặp hex → token** để xác nhận giá trị pixel tương đương, rồi
> **hoàn tác toàn bộ** để khu vực cấm trở lại đúng 0 diff. Số liệu nợ CSS §1.1 được
> đo lại sau khi hoàn tác (107/79 thay vì 107/72).

---

## 3. Đối chiếu từng phase với số đo

### Phase A — Token

| Hạng mục | Số đo site thật | Token trong dự án |
| --- | --- | --- |
| Bo góc chuẩn | `10px` | `rounded-vj` (`borderRadius.vj`) |
| Bo góc panel | `0 0 5px 5px` | `rounded-vj-panel-bottom` |
| Bo góc tab | `5px 5px 0 0` | `rounded-vj-tab` |
| Bo góc bottom nav | `15px 15px 0 0` | `rounded-vj-bottomnav` |
| Container nội dung | 1200px | `container-vj` |
| Container hero | 1320px | `container-vj-wide` |
| Header scrim | `linear-gradient(rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.094) 100%)` | `bg-gradient-vj-scrim` |
| Panel booking | `linear-gradient(30.3deg, rgba(217,26,33,0.73) 33.94%, #6F0000 163.23%)` | `bg-gradient-vj-panel` |
| Tab active | `linear-gradient(20.12deg, rgba(217,26,33,0.8) 19.6%, rgba(111,0,0,0.8) 93.86%)` | `bg-gradient-vj-tab` |
| Tab vàng | `linear-gradient(135deg, #FFDD00 39.58%, #E9A020 100%)` | `bg-gradient-vj-gold-tab` |
| CTA vàng | `linear-gradient(26.73deg, #F9A51A 13.7%, #FBB612 29.8%, #FFDD00 66.81%)` | `bg-gradient-vj-gold-cta` / `.vj-cta` |
| Bottom nav | `linear-gradient(rgba(0,0,0,0.8) 4.03%, rgba(0,0,0,0.153) 216.13%)` | `bg-gradient-vj-bottomnav` |
| Vàng nav active | `#F7C61A` | `text-vj-nav-active` |
| 12 sắc vàng phụ | `#A17F21`…`##D8B439` | `vj.gold-ink*` / `vj.gold-pale-*` |
| Nền announcement | `#FDFDFD` | `bg-vj-announce-bg` |
| Font | KoHo 300–700 | `fontFamily` sans/display/heading → KoHo |
| `body` | 14px / 20.02px / 500 / `#333333` | `src/styles/tailwind.css` |
| Heading | weight 700, letter-spacing normal | `h1`…`h6` |

### Phase B — Chrome dùng chung

| Hạng mục | Số đo | Hiện thực |
| --- | --- | --- |
| Announcement bar | cao 50px (mobile 35px), `#FDFDFD`, container 1200px | `AnnouncementBar.tsx` |
| Header desktop | overlay trong suốt, **không phải thanh đỏ** | `Header.tsx` → `bg-gradient-vj-scrim` |
| Logo | 265×46 px desktop, cao 15px mobile | `h-[15px] sm:h-[46px] lg:h-[46px] lg:w-[265px]` |
| Menu chính 4 mục | 14px/600 uppercase, cách nhau 24px | `text-sm font-semibold uppercase`, `gap-6` |
| Dải dịch vụ | cao 35px, 16px/500, icon 25×25, active `#F7C61A` | `h-[35px] text-base font-medium`, `h-[25px] w-[25px]` |
| Utility row | 16px/700 cho Đăng ký / Đăng nhập | `text-base font-bold` |
| Bottom nav mobile | cao 62px, bo `15px 15px 0 0`, icon 24×24, label 10px/700 | `BOTTOM_NAV_HEIGHT = 62` |
| Footer | container 1200px | `max-w-[1200px]` |
| Button / InputField | bo 10px | `rounded-vj` |

### Phase C — Trang chủ

| Hạng mục | Số đo | Hiện thực |
| --- | --- | --- |
| Hero container | 1320px | `max-w-[1320px]` |
| Grid hero | `[minmax(0,1fr)_380px]` | `lg:grid-cols-[minmax(0,1fr)_380px]` |
| Booking panel | rộng 380px | `w-[380px]` |
| 3 tab dịch vụ | cao 52px, bo `5px 5px 0 0` | `min-h-[52px] rounded-t-vj-tab` |
| Thân form | gradient 30.3deg, bo `0 0 5px 5px` | `bg-gradient-vj-panel rounded-vj-panel-bottom` |
| Field | cao 48px, bo 10px, padding ngang 19px | `h-[48px] rounded-vj` |
| CTA "Tìm chuyến bay" | 200×39px, bo 10px, gradient 26.73deg, chữ đen uppercase | `w-[200px] h-[39px] .vj-cta--hero` |
| Slick dots | 9 chấm ở đáy hero | 9 dot trong `HeroSection.tsx` |
| Container các section | 1200px | `max-w-[1200px]` |

### Phase D — Tìm vé

- Bo góc 10px toàn bộ card / panel / date strip (`rounded-vj`).
- Container 1200px thống nhất.
- Màu hạng vé chuyển từ hex cục bộ sang token:
  `#D71920` → `bg-vj-fare-red`, `#8E7022` → `bg-vj-fare-business`,
  `#FFC700` → `bg-vj-fare-gold`, `#FF8800` → `bg-vj-fare-deluxe`,
  `#388E3C` → `bg-vj-fare-eco`.
- Cỡ chữ `text-[7px]/[8px]/[9px]/[11px]` → `text-5xs / 4xs / 3xs / xs2`.
- Nút "Đi tiếp" dùng `.vj-cta` (gradient vàng thật).

### Phase E — Đặt vé 3 bước

- `rounded-xl / lg / 2xl` → `rounded-vj` trong toàn bộ `features/bookings/components/*`.
- Các Drawer (seat, baggage, insurance, meal, pet, passenger-services, taxi) dùng bo 10px.
- `.seat-*` trong `src/styles/tailwind.css` dùng bo 10px.
- **Không sửa `features/payments/**` hay `app/thanh-toan/**`.**

### Phase F — Các trang còn lại

- `PageHero` dùng gradient 20.12deg đo được, nút bo 10px.
- Container 1200px thống nhất ở: `chuyen-bay-cua-toi`, `lam-thu-tuc`, `tra-cuu`,
  `dich-vu`, `gioi-thieu`, `hoi-dap`, `lien-he`, `dang-nhap`, `dang-ky`, `quen-mat-khau`.
- CTA check-in dùng `.vj-cta` với chữ đen.

### Phase G — Icon / logo / asset

| Asset | Kích thước chuẩn | Trạng thái |
| --- | --- | --- |
| `vj-logo.svg` | 265×46 px (tỉ lệ 115:20 = 5,75:1) | ✅ nội bộ, viewBox `0 0 115 20` |
| 9 icon `public/images/subservices/*.png` | 25×25 px, nền trong suốt | ✅ chuẩn hoá |
| `footer-pattern.svg` | vector nội bộ | ✅ đăng ký trong `asset-registry.md` |

> **0 hotlink** `vietjetair.com`. Không tải asset từ site thật về repo.

---

## 4. Điểm chưa làm được / ngoài phạm vi

1. **Font CTA `JambonoMedium`** của site thật là font đóng gói bên thứ ba, không có
   quyền sử dụng → thay bằng **KoHo 700 uppercase** (đã ghi rõ trong hồ sơ đo).
2. **Visual regression tự động** chưa có: repo chỉ có `puppeteer-core` để chụp, chưa
   có công cụ diff ảnh (`pixelmatch`/`looks-same`). Việc so sánh hiện là đối chiếu
   tham số đã đo, không phải diff pixel.
3. **Logo/ảnh gốc của site thật** không được sao chép — dự án dùng bản vector nội bộ
   với đúng tỉ lệ và vị trí hiển thị đo được.

---

## 5. Kết luận

Toàn bộ 9 phase (0, A–H) của kế hoạch đã hoàn tất. Ranh giới "không đụng thanh toán"
được giữ **tuyệt đối**: `git diff` rỗng cho toàn bộ `features/payments/**`,
`app/thanh-toan/**`, `features/admin/**`, `app/editor/**`, `app/quan-tri/**`.
Nợ CSS giảm ở cả hai chỉ số so với HEAD (268/129 → 107/79). Các cổng kỹ thuật
đều xanh.

### 5.1 Kết quả đo lại lần cuối (13/11/2026, sau khi hoàn tác khu vực cấm)

| Cổng | Kết quả |
| --- | --- |
| `npx eslint .` | 1 error (`src/app/api/dat-ve/route.ts:333` `no-empty`) — **file không do đợt này sửa**, là nợ có sẵn; 31 warning (chủ yếu `no-explicit-any` trong `lib/`, `payments/`) |
| `npx eslint <các trang Phase F + navigation>` | **0 error**, 2 warning (`Header.tsx:186-187`) |
| `npx tsc --noEmit` | ✅ exit 0, sạch |
| `npm test` (×3 lần) | ✅ **1002/1002** test xanh, 110 file (một lần chạy có 1 test fail — xác nhận là flaky, 2 lần chạy sau đó xanh hoàn toàn) |
| `npm run lint:css-debt` | ✅ fontSize 107→107, color 79→79, không tăng |
| `node scripts/check-tailwind-classes.cjs` | ✅ **2297 token quét, 0 class hỏng** |
| `npm run lint` (user-area scope) | ✅ 0 error |
