# BÁO CÁO KIỂM THỬ UI THỰC TẾ — VietjetSim

**Ngày kiểm thử:** 23/09/2026
**Môi trường:** `vietjetsim-main/` — Next.js 16.3.4 (Turbopack, dev), cổng **4028**, PostgreSQL Docker (`vietjet-pg`, cổng 5433) qua Neon HTTP proxy (5444)
**Phương pháp:** thao tác trên trình duyệt thật như người dùng cuối (mở trang, điền form, bấm nút, đăng nhập, đặt vé, thanh toán, duyệt trang quản trị), quan sát DOM/console/network và đối chiếu source code cho từng lỗi
**Tài khoản test:** `user@vietjetsim.vn / user123`, `admin@vietjetsim.vn / admin123`
**Ảnh bằng chứng:** `qa-screenshots/01…09-*.webp`

> **Cập nhật 25/09/2026 — báo cáo này mô tả trạng thái ngày 23/09 và đã lệch ở
> một số điểm. Trạng thái mới nhất:**
>
> | Hạng mục | Ngày 23/09 | Hiện tại |
> |---|---|---|
> | `type-check` | ✅ 0 lỗi | ✅ 0 lỗi |
> | `npm run lint` | 334 warning | ✅ **0 error, 0 warning** |
> | `npm test` | 309 test | ✅ **367 test** (37 file) |
> | `test:smoke` | ✅ pass | ✅ pass |
> | `npm run build` | ✅ pass | ✅ pass |
> | Hydration mismatch | đã sửa | ✅ đã sửa thật (`DealCard`/`PriceBreakdown` dùng `Intl.NumberFormat('vi-VN')`) |
> | RBAC | *advisory only* | ✅ **đã enforce thật** — migration `019_role_permissions.sql` |
> | Mã đặt chỗ | hiển thị UUID/bịa | ✅ hiển thị `booking_code` thật từ DB |
> | Số liệu dashboard admin | *ghi là dữ liệu mẫu* | ✅ **đã nối API thật** (`getAdminAnalytics`) — ghi chú dưới đây đã lỗi thời |
>
> Các mục còn tồn đọng: xem `BAO_CAO_TRANG_THAI_HIEN_TAI.md`.

---

## 1. Tổng quan dự án (đọc hiểu)

VietjetSim là web mô phỏng đặt vé máy bay Vietjet Air, kiến trúc feature-based (vừa tái cấu trúc Phase 1–6):

```
src/
├── app/          # App Router: trang-chu, tim-ve, thanh-toan, tai-khoan, quan-tri, tra-cuu, lam-thu-tuc…
│   └── api/      # xac-thuc (JWT+2FA), dat-ve, thanh-toan, quan-tri/*, vi, checkin, tro-chuyen…
├── features/     # auth, bookings, flights, payments, loyalty, admin, chat
├── shared/       # components (ui/feedback/navigation), services (apiClient), utils, constants, types
├── lib/          # auth, csrf, db (Neon), rate-limit, roles, route-access
└── hooks/        # useCsrf, useToast
middleware.ts     # (tại root project) auth/CSRF/rate-limit — XEM LỖI NẶNG #1
```

Điểm chính về luồng đặt vé: `FlightBookingClient` (3 bước: chọn chuyến → hành khách → chọn ghế) → `POST /api/dat-ve` → redirect `/thanh-toan?bookingId=…` → `POST /api/thanh-toan`. Mọi mutation phải qua CSRF double-submit (`csrf_token` cookie + header `x-csrf-token`); page này phụ thuộc hoàn toàn vào việc `middleware.ts` seed cookie.

---

## 2. Kết quả test các luồng (người thật thao tác)

| # | Luồng | Kết quả | Ghi chú |
|---|-------|---------|---------|
| 1 | Mở trang chủ `/trang-chu` | ⚠️ Pass có lỗi | Render đủ, nhưng dev overlay báo **1 lỗi Hydration** (chi tiết #L1) |
| 2 | Tìm vé HAN→SGN, chọn ngày/khách | ⚠️ Pass có lỗi | Kết quả đúng (VJ 110, 4 hạng vé, bộ lọc); **ngày bay không nằm trong URL** (`/tim-ve?from&to&pax`, thiếu date) → không chia sẻ được ngày đi; card vé **tràn phải, giá bị cắt** ở viewport 1024px (ảnh 02) |
| 3 | **Khách (chưa đăng nhập) đặt vé → thanh toán** | ❌ **FAIL** | Chọn ghế OK, bấm "Tiến hành thanh toán" → `POST /api/dat-ve` trả **403 CSRF validation failed**, nút kẹt "Đang xử lý..." **vĩnh viễn** (xem #L2, #L3 — ảnh 03) |
| 4 | Đăng nhập `user@vietjetsim.vn` | ✅ Pass | Redirect `/tai-khoan`, hiện "Xin chào! Nguyễn Văn A" |
| 5 | **Đặt vé khi đã đăng nhập → thanh toán thẻ** | ✅ Pass | VJ 108, ghế 1B, tổng 2.643.850₫ → booking `0d0dcc30…` → trang xác nhận **mã đặt chỗ VJNV61B2**, QR check-in (ảnh 05) |
| 6 | `/chuyen-bay-cua-toi` | ✅ Pass | 3 đặt chỗ, tổng chi 5.133.850₫, điểm đến thường xuyên, booking mới hiện "Đã xác nhận" |
| 7 | Dashboard `/tai-khoan` → tab "Chuyến bay sắp tới" | ✅ Pass | Hiện 2 chuyến, kiểm tra đúng mã booking/đơn giá (ảnh 06) |
| 8 | Dashboard → tab **"Lịch sử đặt vé"** | ❌ **CRASH** | ErrorBoundary toàn trang: `Cannot read properties of undefined (reading 'cls')` (xem #L4 — ảnh 07). API `/api/dat-ve` vẫn 200 → lỗi nằm ở client render |
| 9 | Dashboard → tab "Ví của tôi" | ✅ Pass | Số dư 2.660.000₫, SỐ TK 970400000002, thẻ VISA ••••4242, nạp 100K–1M (ảnh 08) |
| 10 | Logout → đăng nhập `admin@vietjetsim.vn` | ✅ Pass | Redirect đúng `/quan-tri` |
| 11 | Admin: Tổng quan, Chuyến bay (70 chuyến), Người dùng (2 TK), Đặt vé (7 đơn), Giao dịch, Hoàn tiền (1 phiếu), Doanh thu | ✅ Pass | Không tab nào crash; giao dịch card 2.643.850₫ của booking vừa tạo xuất hiện đúng (ảnh 09) |
| 12 | Sweep 14 route (public + protected + 404) | ⚠️ Pass có lỗ hổng | Tất cả 200, `/khong-ton-tai-xyz` → 404 đúng; **nhưng request ẩn danh (không cookie) tới `/quan-tri` và `/tai-khoan` vẫn 200 server-side thay vì redirect về `/dang-nhap`** → bằng chứng #L1 |

**Kết luận ngắn:** luồng đặt vé/thanh toán **hoạt động trọn vẹn khi đã đăng nhập**; **ách chết với khách vãng lai** (CSRF); 1 tab dashboard crash toàn trang; middleware bảo vệ không chạy.

---

## 3. Lỗi tìm được (ưu tiên theo mức độ)

### 🔴 L1 — NẶNG: `middleware.ts` không chạy trên Next.js 16 → mất toàn bộ bảo vệ phía server + không seed CSRF

- **Hiện tượng (đo được):**
  - `curl` không cookie tới `/quan-tri` → **200** (phải là 307 → `/dang-nhap`); `/tai-khoan` → **200**; `/tim-ve` không có header `Set-Cookie: csrf_token=…`.
  - `document.cookie` của khách vãng lai **rỗng** → mọi `POST` đều 403 (dẫn tới L2).
- **Nguyên nhân:** project dùng **Next.js 16.3.4**. Từ Next 16, convention file bảo vệ đổi từ `middleware.ts` sang **`proxy.ts`** (middleware bị deprecated — [nextjs.org/docs/messages/middleware-to-proxy](https://nextjs.org/docs/messages/middleware-to-proxy), [proxy docs](https://nextjs.org/docs/app/getting-started/proxy)). File vẫn đặt tại `vietjetsim-main/middleware.ts` nên **không được thực thi**: không redirect `isPublicRoute`, không gắn `x-user-*`, không rate-limit ở tầng proxy, không seed cookie CSRF.
  - Phản chứng cho thấy code trong file không hề chạy: nhánh chặn `/quan-tri` với `!user` tồn tại ở `middleware.ts:157-166` nhưng response vẫn 200.
- **Tác động:** (a) trang `tai-khoan`/`quan-tri` chỉ còn chặn ở phía client — ai xem HTML/JSON đều tải được shell server-rendered; (b) guest không bao giờ có `csrf_token` (L2); (c) rate-limit đăng nhập ở tầng proxy vô hiệu (còn rate-limit trong route handler thì vẫn chạy).
- **Khuyến nghị:** chạy codemod `middleware-to-proxy`, đổi export `middleware` → `proxy`, giữ nguyên matcher; xác minh lại bằng curl: ẩn danh `/quan-tri` phải 307 và response phải set `csrf_token`.

### 🔴 L2 — NẶNG: Khách vãng lai không đặt được vé (403 CSRF) trên toàn bộ luồng mua

- **Tái hiện:** ẩn danh → `/tim-ve` → chọn VJ → hành khách → chọn ghế 1A → "Tiến hành thanh toán" → `POST /api/dat-ve` = **403 `{"error":"CSRF validation failed"}`**.
- **Root cause:** `apiRequest` (`src/shared/services/apiClient.ts:76`) đính kèm header từ `document.cookie['csrf_token']` — cookie chỉ được set bởi (i) middleware (đã chết, L1) hoặc (ii) response đăng nhập. Người đã đăng nhập đặt vé OK (đã verify — luồng #5 pass). Cách sửa dứt điểm: khôi phục seed cookie qua proxy (L1); zusätzlich cân nhắc gọi `GET /api/csrf` ở layout root làm lớp phòng thủ thứ hai.

### 🟠 L3 — Nút "Tiến hành thanh toán" kẹt vĩnh viễn sau lỗi API (không thể thử lại)

- **Hiện tượng:** khi `createBooking` lỗi (403), nút spinner "Đang xử lý..." **disabled mãi**, người dùng phải reload trang (ảnh 03).
- **Root cause:** `SeatSelectionStep.tsx:243-248` — `handleConfirm` set `setIsConfirming(true)` rồi gọi `onConfirm(...)` bất đồng bộ; `FlightBookingClient.handleSeatConfirm` (`FlightBookingClient.tsx:70-125`) bắt lỗi và chỉ toast — **không có đường nào reset `isConfirming` về `false`** (component con giữ state). Thành công thì OK vì `router.push` unmount component; thất bại thì treo.
- **Khuyến nghị:** `handleConfirm` nên `try/finally { setIsConfirming(false) }`, hoặc nhận `finally` từ callback cha; đồng thời toast lỗi cần giữ đủ lâu để người dùng thấy (`toast.error` hiện biến mất nhanh, tôi không ghi lại được текст lỗi trên UI — chỉ thấy qua network).

### 🟠 L4 — Crash toàn trang tab "Lịch sử đặt vé": `STATUS_MAP` thiếu status `refunded`

- **Hiện tượng:** bấm "Lịch sử đặt vé" → ErrorBoundary "Lỗi máy chủ — Cannot read properties of undefined (reading 'cls')" (ảnh 07).
- **Root cause:** `UserDashboardClient.tsx:301-305` khai báo `STATUS_MAP` chỉ có `confirmed | completed | cancelled` nhưng API trả status `refunded` (booking `990fa136…` đã hoàn tiền qua `api/quan-tri/hoan-tien/route.ts:109`) và `pending` cũng có trong schema. Truy cập `STATUS_MAP[booking.status].cls` tại **dòng 875 và 1351** ném TypeError. Tương tự pattern không optional-chain ở `OverviewTab.tsx:275`, `RefundRequestsTab.tsx:483,670`, `FlightsTab.tsx:788`.
- **Repro dữ liệu:** 1 booking `refunded` sẵn trong DB → chỉ cần 1 bản ghi loại này là tab chết cho **mọi** user.
- **Khuyến nghị:** thêm key `pending`/`refunded` vào map (UI `MyFlightsTimeline.tsx:99-100` đã có label "Đã hoàn tiền" làm chuẩn) + đổi sang `STATUS_MAP[status]?.cls ?? ''` cho mọi chỗ, hoặc 1 helper `getBookingBadge(status)`.

### 🟡 L5 — Lỗi Hydration lặp lại mỗi lần tải trang chủ — `DealCard.tsx:58`

- Dev overlay: `Recoverable Error: Hydration failed… src/features/flights/components/DealCard.tsx (58:13)` → `<h3 className="text-semibold text-base mb-1">{deal.route}</h3>`, lặp ở mọi lần mở `/trang-chu` (log `next-development.log`).
- Node render `deal.price.toLocaleString()`/text khác locale với browser hoặc branch SSR-client khác nhau; tree bị regenerate → phí performance + có thể nháy nội dung. **Khuyến nghị:** set locale tường minh (`toLocaleString('vi-VN')`), đối chiếu HTML server/client trong `DealCard` (icon react-icons SSR vs client cũng là thủ phạm thường gặp — import `react-icons/md` nên kiểm tra `AppImage` placeholder).

### 🟡 L6 — File ảnh placeholder là **text**, không phải JPG → lỗi image optimizer

- `public/images/hero/banner-1-hongkong.jpg` = **251 bytes ASCII** ("This is a placeholder file…"). Log server: `"The requested resource isn't a valid image for /images/hero/banner-1-hongkong.jpg received null`.
- Được tham chiếu ở **5 nơi**: `HeroSection.tsx:55` (background hero), `AttractiveDestinationsSection.tsx:18`, `HotDealsSection.tsx:14,59`, `TravelGuidesSection.tsx:11`, `app/chuyen-bay-cua-toi/page.tsx:363`.
- **Khuyến nghị:** thay bằng ảnh JPEG thật (các ảnh cùng thư mục 300KB–900KB là thật).

### 🟡 L7 — Ngày bay không được truyền qua URL khi tìm vé

- Form có ô "NGÀY ĐI/NGÀY VỀ", nhưng URL kết quả chỉ có `from/to/pax` → refresh/share link mất ngày đi, `FlightResultsStep` phải tự set lại default. Không rò rỉ dữ liệu nhưng sai kỳ vọng người dùng và khiến test không xác định được ngày.

### 🟡 L8 — Card kết quả tìm vé tràn khung ở viewport 1024px

- Ảnh 02: cột giá/fare ("…90.00₫", "…50₫") bị cắt phía phải, phải cuộn ngang. Test lại ở 768px/375px nên kiểm chứng thêm — nghi `grid lg:grid-cols-3` + `overflow` không wrap.

### 🟡 L9 — Trợ cụ accessibility ở bản đồ ghế

- 180 nút ghế là `<button>` **không có text, không `aria-label`, không `title`** (nhãn ghế render bằng CSS) → screen reader không đọc được tên ghế; `tab.observe()`/automation cũng không thấy. Cần `aria-label="Ghế 1A, thương gia, 402.500₫"`.

### 🔵 L10 — Số liệu admin overview không nhất quán (data demo cứng)

- Tổng quan: 4,82 tỷ₫ / 3.847 vé / 48 chuyến / 284 user mới — trong khi tab Người dùng thật = **2 tài khoản**, tab Đặt vé thật = **7 đơn**, tab Doanh thu = 2,5B₫ và "Cập nhật lần cuối: **16/03/2026**". Nhìn "đẹp" nhưng sai lệch với dữ liệu thật → gây hiểu lầm người dùng demo. Cần gắn cùng một nguồn số hoặc ghi rõ "số liệu mẫu".

---

## 4. Những gì KHÔNG phát hiện lỗi

- 14 route public/protected sweep: 200/404 đúng; 404 page có render.
- Đăng nhập/đăng xuất/JWT redirect `/dang-nhap → /quan-tri|/tai-khoan` theo role hoạt động đúng **ở client**.
- Tính tiền: vé 1.949.000 + thuế 15% (292.350) + ghế 1B 402.500 = **2.643.850₫** khớp từ tóm tắt → trang thanh toán → xác nhận → giao dịch admin.
- Booking tạo thật trong DB (`/api/dat-ve` 200, xuất hiện ở `/chuyen-bay-cua-toi`, tab Đặt vé & Giao dịch admin).
- Admin 6 tab lớn không crash; tab Hoàn tiền hiển thị đúng 1 phiếu pending.
- Test suite hiện có (309 tests) không bao phủ 4 lỗi trên vì: CSRF test mock cookie sẵn (`test/*` set thẳng `csrf_token`), không test integration trạng thái `isConfirming`, không test render với status `refunded`.

---

## 5. Thứ tự sửa khuyến nghị

1. **L1** — `middleware.ts` → `proxy.ts` (codemod Next 16). Sửa L1 gần như sửa luôn L2 cho khách.
2. **L4** — thêm `refunded`/`pending` vào `STATUS_MAP` + optional-chain toàn bộ `STATUS_MAP[...]` (1 dòng/map, chặn crash toàn trang).
3. **L3** — `finally` reset `isConfirming`.
4. **L6** — thay ảnh placeholder.
5. **L5, L7, L8, L9** — hydration DealCard, date param trong URL, responsive card, aria-label ghế.
6. **L10** — làm rõ số liệu demo ở dashboard admin.

**Tiêu chí nhận pass đề xuất (re-test):**
- ẩn danh `curl -I /quan-tri` → 307; response trang có `Set-Cookie: csrf_token`;
- khách bấm "Tiến hành thanh toán" → được đưa sang `/dang-nhap?redirect=…` (đăng nhập xong quay lại đúng tìm kiếm), không kẹt nút, không lộ lỗi 401 thô;
- người đã đăng nhập đặt vé → trang xác nhận có mã;
- bấm thanh toán khi API lỗi → nút bật lại được;
- dashboard với dữ liệu có booking `refunded` → không crash;
- `/trang-chu` không còn lỗi hydration trong dev overlay.

---

# PHẦN 2 — ĐÃ SỬA & KIỂM CHỨNG LẠI (23/09/2026)

## 2.1 Tóm tắt thay đổi

| Lỗi | Trạng thái | File thay đổi | Kiểm chứng |
|---|---|---|---|
| **L1** proxy không chạy | ✅ Sửa | `middleware.ts` → **`src/proxy.ts`** (đổi tên file + export `proxy`), comment/doc cập nhật: `AGENTS.md`, `README.md`, `scripts/smoke-test.cjs`, `src/lib/{route-access,roles,rate-limit}.ts`, `src/app/dang-nhap/page.tsx`, `src/test/{edge-jwt,api-security,rbac}.test.ts` | dev: `/quan-tri` → **307** `/dang-nhap?redirect=%2Fquan-tri`; trang seed `Set-Cookie: csrf_token`; prod build in `ƒ Proxy (Middleware)` |
| **L2** khách không đặt được vé | ✅ Sửa (2 phần) | (a) proxy seed cookie CSRF; (b) `FlightBookingClient.tsx` — 401 → toast "Yêu cầu đăng nhập" + `router.push('/dang-nhap?redirect=<url hiện tại>')` theo đúng pattern đã có ở `lam-thu-tuc`/`dat-ve/[id]` | khách: `document.cookie` có `csrf_token`; bấm thanh toán → `/dang-nhap?redirect=%2Ftim-ve%3Ffrom%3DHAN…` |
| **L3** nút kẹt "Đang xử lý…" | ✅ Sửa | `SeatSelectionStep.tsx` (`onConfirm` trả `boolean \| Promise<boolean>`, reset khi `false`/throw), `FlightBookingClient.tsx` (`handleSeatConfirm` trả `true/false`) | lỗi 401 của khách: nút trở lại "Tiến hành thanh toán" (`disabled: false`) |
| **L4** crash tab "Lịch sử đặt vé" | ✅ Sửa | `UserDashboardClient.tsx` (map đủ 5 status + `?.` với fallback ở badge/CSV/PDF), `OverviewTab.tsx`, `RefundRequestsTab.tsx` (bỏ `as any` ở icon), `FlightsTab.tsx` | booking `refunded` hiện đúng nhãn **"Đã hoàn tiền"**, `CRASH=false` |
| **L5** hydration `DealCard` | ✅ Sửa | `DealCard.tsx` + `PriceBreakdown.tsx` + `api/quan-tri/cong-cu/route.ts`: `toLocaleString('vi-VN')` | dev overlay `/trang-chu`: **0 issue** (trước: lỗi hydration lặp lại) |
| **L6** ảnh placeholder hỏng | ✅ Sửa | thay `public/images/hero/banner-1-hongkong.jpg` bằng ảnh máy bay Vietjet thật | optimizer trả `200 image/jpeg`, log không còn "not a valid image" |
| **L7** ngày bay không vào URL | ✅ Sửa | `HeroSection.tsx`: refs cho 2 input date, default (hôm nay / +7) set **sau mount** để không tái phát hydration, `search()` gắn `depart`/`return` | URL: `/tim-ve?from=HAN&to=SGN&pax=1&depart=2026-09-23&return=2026-09-30` |
| **L8** card vé tràn/cắt giá | ✅ Sửa | `FlightResultsStep.tsx`: card `@container`, fare grid `grid-cols-2 @3xl:grid-cols-4`, cột thông tin `xl:w-[240px]`, `min-w-0` | ô giá 43px → **109px**, `priceOverflowPx = 0`, `scrollWidth == clientWidth` |
| **L9** ghế thiếu aria | ✅ Sửa | `SeatSelectionStep.tsx`: `aria-label` (ghế + hạng + giá + trạng thái) và `aria-pressed` | **180/180** nút ghế có aria-label, vd `"Ghế 1C, thương gia, đã chọn, 402.500₫"` |
| **L10** số liệu demo admin | ✅ Sửa | `OverviewTab.tsx` (chip "Số liệu minh họa" + "Dữ liệu mẫu"), `RevenueTab.tsx` (timestamp động set sau mount + chip minh họa) | ảnh 12–13: chip hiển thị, "Cập nhật lần cuối: 22:02:20 23/9/2026" |
| (phát sinh) lỗi console `src=""` | ✅ Sửa | `UserDashboardClient.tsx`: chỉ render `AppImage` khi có `booking.image`, nếu không dùng gradient | dev overlay dashboard: 0 issue |
| (phát sinh) 16 lỗi lint pre-existing | ✅ Sửa | `scripts/remove-dark-*.js` (auto-fix prettier) | `npm run lint`: **0 error** (334 warning pre-existing) |

## 2.2 Nguyên nhân sâu hơn của L1 (phát hiện khi sửa)

Đổi tên `middleware.ts` → `proxy.ts` tại **project root** vẫn KHÔNG chạy trong `next dev`. Đọc `next/dist/server/lib/router-utils/setup-dev-bundler.js:270-345`: watcher chỉ dò `getPossibleMiddlewareFilenames(rootDir/..)` với `rootDir = pagesDir || appDir`. Vì app nằm ở `src/app`, "cùng cấp với app" là **`src/`** — file proxy ở project root bị lọc bỏ (`if (!files.includes(fileName) && !directories.some(...)) continue`), trong khi `next build` (`isAtConventionLevel = fileDir === dir || fileDir === dir/src`) vẫn nhận file ở root. Đó chính xác là lý do "dev không chạy, prod chạy" mà `AGENTS.md` mô tả. **Fix đúng: `src/proxy.ts`** (minh chứng: `src/instrumentation.ts` cũng ở `src/`).

## 2.3 Điều chỉnh so với báo cáo Phần 1

- **L2 không chỉ là CSRF**: kể cả khi có cookie CSRF, `POST /api/dat-ve` trả **401** vì `verifyAuthRequest` bắt buộc phiên đăng nhập (đã kiểm tra lại: sau khi có token, request trả 401 `Authentication required`). API yêu cầu đăng nhập là **thiết kế** (test `api-security.test.ts` khoá hành vi này, `createBooking` cần `user_id`). Vì vậy phần (b) của fix là UI: đưa khách sang đăng nhập thay vì để luồng đi tới bước thanh toán rồi lỗi. Comment sai trong `features/bookings/services/index.ts` ("Works for guests too") đã được sửa cho khớp thực tế.
- **Build production lần đầu fail** (`TurbopackInternalError … was canceled`) khi chạy song song dev server trên máy i5 này; build lại khi rảnh tài nguyên thì pass (`ƒ Proxy (Middleware)`). Đây là flake do tài nguyên, không phải lỗi mã nguồn.

## 2.4 Kết quả kiểm chứng sau khi sửa

| Hạng mục | Kết quả |
|---|---|
| `npm run type-check` | ✅ 0 lỗi |
| `npm run lint` | ✅ 0 error (334 warning pre-existing) |
| `npm test` (vitest) | ✅ **309/309** pass (27 file) |
| `node scripts/smoke-test.cjs` (dev 4028) | ✅ pass toàn bộ 31 assertion |
| smoke + HTTP checks trên **production build** (4029) | ✅ pass; `/quan-tri` 307, cookie `Secure`, API 401, unknown 307 |
| E2E trình duyệt — khách | ✅ tìm vé có ngày trên URL → chọn vé → hành khách → ghế → thanh toán → **chuyển tới `/dang-nhap?redirect=…`** |
| E2E trình duyệt — user đã đăng nhập | ✅ đặt vé + thanh toán thành công, mã đặt chỗ **VJ2MG06P** (ảnh 11) |
| Dashboard user | ✅ không crash; tab Lịch sử hiển thị booking `refunded` nhãn "Đã hoàn tiền" (ảnh 14) |
| Admin | ✅ chip "Số liệu minh họa"/"Dữ liệu mẫu" + timestamp động (ảnh 12–13) |
| Dev overlay | ✅ `/trang-chu` và `/tai-khoan`: **0 issue** (hydation + empty-src đã hết) |

**Ảnh bằng chứng sau khi sửa:** `qa-screenshots/10…14-*.webp`.

## 2.5 Việc còn lại (không nằm trong phạm vi đã sửa)

> Hai mục đầu dưới đây đã lỗi thời so với code hiện tại (25/09/2026) — xem bảng
> cập nhật ở đầu file.

- ~~Số liệu dashboard admin vẫn là dữ liệu mẫu cứng~~ → **Đã sửa**: `OverviewTab`
  và `RevenueTab` gọi `getAdminAnalytics()` / `listAdminFlights()` / `listUsers()`,
  route `api/quan-tri/cong-cu` truy vấn `sql` thật. Nhãn "dữ liệu mẫu" đã bị gỡ.
- Luồng khách muốn đặt vé không cần đăng nhập: cần thay đổi API + schema
  (`user_id` nullable) — thay đổi lớn, ngoài phạm vi báo cáo lỗi. **Vẫn còn.**
- ~~334 warning ESLint còn lại~~ → **Đã sửa**: `npm run lint` hiện ra 0 error,
  0 warning.


---

## Kiểm thử luồng hoàn tiền (migration 020) — 26/09/2026

Thực hiện trên dev server `http://localhost:4028`, tài khoản demo thật, CSRF token
thật. Booking demo `VJDEMO01` được tạo cho `user@vietjetsim.vn` vì tài khoản này
trước đó chưa có booking nào (chặn việc test E2E).

| # | Bước | Kết quả mong đợi | Thực tế |
|---|------|------------------|---------|
| 1 | POST thiếu số điện thoại | 400 nêu đúng trường thiếu | 400 `Thiếu thông tin: Số điện thoại` |
| 2 | POST PNR của tài khoản khác (`VJ644052`) | 403 | 403 |
| 3 | POST hợp lệ | 201, chỉ trả `refundId` | 201 |
| 4 | User GET sau khi gửi | 0 phiếu (đang ẩn) | 0 |
| 5 | Admin GET | thấy phiếu, `visible_to_user=false`, có PNR + SĐT | đúng |
| 6 | Admin `update_details` | 200 | 200 |
| 7 | Admin `set_visibility=true` | 200 | 200 |
| 8 | User GET sau khi hiện | thấy phiếu + bản admin đã sửa | đúng |
| 9 | Admin khoá tính năng rồi POST | 200 rồi 403 | đúng |
| 10 | Admin mở khoá | 200 | đúng |
| 11 | Admin ẩn lại | user về 0 phiếu | đúng |
| 12 | User tự PATCH phiếu | 405 (không có endpoint) | 405 |

### Lỗi tìm được và đã sửa trong quá trình test

1. **POST hợp lệ trả 500.** `getBookingById` lọc theo `b.id` (UUID); khi nhận PNR,
   Postgres thử cast sang uuid và ném lỗi — "không tìm thấy" biến thành 500.
   Thêm `getBookingByCodeOrId` khớp `booking_code` **hoặc** `id::text`.
2. **Sửa bank xoá mất `account_holder`.** Route ghi đè cả ba trường, nên chỉ sửa
   tên ngân hàng là mất tên chủ tài khoản. Sửa bằng cách merge jsonb thay vì thay
   thế, và chỉ gửi các key thực sự được cung cấp.
3. **`reviewed_by` nội suy sai kiểu.** Ban đầu để `${reviewedBy}` trong chuỗi
   thường nên thành chữ literal, đồng thời `$` bị hiểu là placeholder.

### Lưu ý vận hành

- Auth rate-limit là 5 request/60 giây. Chạy nhiều kịch bản đăng nhập liên tiếp sẽ
  nhận 401; cần nghỉ 60 giây giữa các lần.
- Cột `bank_info` là **TEXT**, không phải JSONB — phép merge phải ép kiểu hai chiều.
