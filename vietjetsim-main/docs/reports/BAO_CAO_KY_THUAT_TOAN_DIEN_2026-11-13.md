# BÁO CÁO KIỂM TRA KỸ THUẬT TOÀN DIỆN — DỰ ÁN VIETJET AIR (MÔ PHỎNG)

- **Dự án**: `vietjet/Vietjet/vietjetsim-main` (Next.js 16.4 App Router, React 19, TypeScript, Tailwind 3.4.6)
- **Ngày khảo sát**: 13/11/2026
- **Phạm vi**: toàn bộ luồng xử lý server-side (Auth → Proxy/Guard → RBAC → CSRF → Tìm chuyến → Đặt vé → Định giá & phụ thu → Thanh toán/Webhook → Ví → Check-in → Hoàn tiền → Admin → Chat/AI) + hạ tầng build, test, SEO.
- **Cách kiểm tra**: đọc mã nguồn từng route handler, đối chiếu với migrations, chạy `vitest`, `eslint`, `check-tailwind-classes`, đối chiếu luồng UI ↔ luồng server.

### Trạng thái xác minh tại thời điểm chốt báo cáo (13/11/2026 22:07)

| Hạng mục | Kết quả |
|---|---|
| `next build` | ✅ PASS (`BUILD_EXIT=0`) |
| `vitest run` (toàn bộ) | ✅ **118 file / 1035 test PASS** (sau khi sửa 3 assertion lệch) |
| `eslint .` | ✅ exit 0, còn ~91 giây (trước khi sửa ignores: 723 giây) |
| `check-tailwind-classes` | ✅ 2355 token quét, 3 class trong vùng ranh giới (`scrollbar-none`, `lg:row`, `font-[Be Vietnam Pro,sans-serif]`) |
| `lint:css-debt` | ⚠️ 134 màu tùy ý (`[#rrggbb]`) nằm rải rác, tập trung ở `src/app/dat-ve/[id]/page.tsx` (51), `PaymentClient.tsx` (35), `VietQrBox.tsx` (18) |

**Ghi chú về quy trình**: trong lúc chạy, có một phiên làm việc song song sửa `src/lib/transfer-note.ts`, `src/lib/mail.ts` và `src/test/airports-api.test.ts`. Ba lỗi test ban đầu đã được chính phiên đó sửa đúng hướng (fallback chuyển khoản về `{code}I98O` theo `migrations/042`, email thêm hậu tố `I98O`, assertion sân bay thêm `country`/`isDomestic`). Tại thời điểm chốt, toàn bộ suite đã xanh — nhưng những thay đổi này **chưa được commit**, và các P0 bên dưới vẫn chưa được đụng tới.

---

## 0. Tóm tắt điều hành

| Mức | Số lượng | Nội dung |
|---|---|---|
| **P0 — Nghiêm trọng** | 4 | Chi phí có thể bị thao túng từ client; tài khoản bị chiếm đoạt qua chat khách; thanh toán/đặt vé bị IDOR không cần đăng nhập; khóa ghế có thể bị cưỡng chiếm |
| **P1 — Cao** | 8 | Người dùng bị đăng xuất im lặng sau 15 phút; thuế hardcode lệch với server; rate limit giả lập & giả IP; refresh token không được dùng; `/api/editor/files` ghi file không ghi log; webhook replay/verify; admin WAF token solver; RBAC vs proxy |
| **P2 — Trung bình/Kỹ thuật nợ** | 10+ | `src/lib/db.ts` 3.880 dòng; ESLint quét cả cây build 305MB; 134 màu tùy ý rải rác trong component; SEO/robots mâu thuẫn; thiếu kiểm thử e2e; mock DB fallback dễ che lỗi; bundle/CSS |

**Kết luận ngắn**: nền tảng kỹ thuật (App Router, proxy-based routing, CSRF double-submit, RBAC có bảng `role_permissions`, migration có version) là khá tốt và hiếm gặp ở mức dự án này. Tuy nhiên, **toàn bộ lớp "money" (giá tiền, quyền sở hữu đặt vé) đang tin vào dữ liệu do client gửi lên hoặc bỏ qua khi người dùng chưa đăng nhập**. Đây là rủi ro kinh tế trực tiếp, không phải rủi ro lý thuyết.

---

## 1. Bản đồ kiến trúc & luồng xử lý

### 1.1. Các lớp

```
Browser
  │
  ├─ src/proxy.ts  (Next.js 16 proxy — thay middleware.ts)
  │    ├─ rateLimit() cho /api/xac-thuc/*
  │    ├─ verifyJwtSignature() bằng WebCrypto HS256 (Edge runtime)
  │    ├─ isPublicRoute() / isPublicApiRoute()  ← src/lib/route-access.ts
  │    ├─ RBAC thô theo prefix: /quan-tri, /api/quan-tri, /tai-khoan
  │    └─ bootstrap cookie csrf_token (SameSite=Strict) + header x-user-*
  │
  ├─ Route Handler (src/app/api/**/route.ts)  — runtime nodejs
  │    ├─ verifyAuthRequest() / verifyAdminRequest()  (JWT + CSRF)
  │    ├─ src/lib/db.ts (3.880 dòng) → SQL thuần qua @neondatabase/serverless
  │    └─ src/features/bookings/pricing.ts (giá vé, thuế, phụ thu)
  │
  └─ Server Component / Client Component (src/app/**, src/features/**)
```

### 1.2. Luồng nghiệp vụ chính

| Luồng | Endpoint | Xác thực | Ghi chú |
|---|---|---|---|
| Tìm chuyến | `GET /api/chuyen-bay`, `GET /api/san-bay` | Public | Có rate-limit |
| Đặt vé | `POST /api/dat-ve` | Public (guest) | ⚠️ P0-1, P0-2 |
| Thanh toán | `POST /api/thanh-toan` | Public (guest) | ⚠️ P0-3 |
| VietQR | `GET /api/thanh-toan/vietqr` | Public | ⚠️ P0-3 |
| Trạng thái | `GET /api/thanh-toan/trang-thai` | Public | ⚠️ P0-3 |
| Webhook | `POST /api/thanh-toan/webhook` | HMAC | Cần rà lại replay |
| Lịch sử thanh toán | `GET /api/thanh-toan/lich-su` | `verifyAuthRequest` | ✅ |
| Ví | `/api/vi/**` | `verifyAuthRequest` | ✅ |
| Hoàn tiền | `/api/hoan-tien` | `verifyAuthRequest` + ownership | ✅ (mẫu tốt) |
| Check-in | `GET /api/checkin` (public, mã đặt chỗ + họ) / `POST` | Public/Auth | ✅ thiết kế hợp lý |
| Ghế | `/api/ghe/**`, `/api/ghe/khoa` | Public | ⚠️ P0-4 |
| Chat khách | `POST /api/tro-chuyen/khach` | **Không** | ⚠️ P0-2 |
| Admin | `/api/quan-tri/**` | `verifyAdminRequest` | ⚠️ P1 về audit log |

---

## 2. P0 — Lỗ hổng nghiêm trọng

### P0-1 · Giá tiền đặt vé có thể bị client thao túng (Money Tampering)

**File**: `src/app/api/dat-ve/route.ts` (khoảng dòng 213–231)

Mã hiện tại:

```typescript
const clientTotal =
  typeof clientTotalPrice === 'number' && Number.isFinite(clientTotalPrice)
    ? Math.round(clientTotalPrice)
    : 0;

// Use client's total if it includes additional services / round-trip legs and is at least the server calculated base
const totalPrice = clientTotal > serverCalculated ? clientTotal : serverCalculated;
```

**Vấn đề**: comment ở phía trên cho rõ ý đồ ("Price the whole booking here rather than trusting anything the browser sent"), nhưng code lại **dùng giá của browser khi lớn hơn**. Tức là server chỉ chặn chiều "client rẻ hơn server", còn chiều "client đắt hơn" thì nhận nguyên.

**Kết quả**: bất kỳ ai gọi `POST /api/dat-ve` bằng `curl` đều có thể đặt vé với `total_price` tùy ý (ví dụ 9.999.999.999đ). Giá này được ghi thẳng vào `bookings.total_price` và được dùng làm nền cho:
- `POST /api/thanh-toan` → tạo `payments.amount`
- Hoàn tiền → `refund_requests.amount`
- Ví / SkyJoy → điểm thưởng quy đổi theo tổng tiền
- Báo cáo doanh thu admin

**Vì sao code cũ "tưởng an toàn"?** Vì `serverCalculated` chỉ tính đúng 3 loại phụ thu trong catalog server (`ANCILLARY_OPTIONS`: hành lý 150k, suất ăn 100k, bảo hiểm 60k), trong khi UI bán `BAGGAGE_PACKAGES` 200k–750k, bảo hiểm 72k, suất ăn 119k (`src/features/bookings/pricing.ts` dòng 68–108). Server luôn tính thấp hơn UI → nhánh `clientTotal > serverCalculated` **luôn đúng** → giá client luôn thắng. Đây là "vô tình mở cửa" chứ không phải chủ ý.

**Khuyến nghị**:
1. Xoá hoàn toàn nhánh `clientTotal > serverCalculated`. Giá là **duy nhất** quyết định bởi server.
2. Chuẩn hoá một **bảng giá server-side duy nhất** phải bao gồm *mọi* SKU mà UI bán (hành lý theo gói, bảo hiểm, suất ăn, chỗ ngồi, hạng vé) — UI chỉ được **hiển thị** giá lấy từ API, không hardcode.
3. Thêm test bất biến: gửi `total_price` = 1, = 10^12, = NaN → server phải trả về đúng giá tính sẵn.
4. Nếu cần hỗ trợ "vành khuyên / phí linh hoạt", phải tính ở server theo `pricing.ts` và trả về `breakdown` để client hiển thị, không nhận `total_price` từ client.

### P0-2 · Chiếm đoạt tài khoản qua API chat khách (Account Takeover)

**File**: `src/app/api/tro-chuyen/khach/route.ts` (dòng 42–78)

```typescript
const guestEmail = `${phone}@khach.vietjetsim.vn`;
let userRecord = await findUserByEmail(guestEmail);

if (!userRecord) {
  // Tìm xem có user nào cùng số điện thoại không
  const byPhone = await sql`SELECT * FROM user_profiles WHERE phone = ${phone} LIMIT 1`;
  const foundByPhone = (byPhone as unknown as UserRecord[])[0];
  if (foundByPhone) {
    userRecord = foundByPhone;          // ← lấy đúng user đó
  }
}
// ...
const tokens = generateTokens(authUser);
setAuthCookiesOnResponse(response, tokens);
```

**Kịch bản tấn công**:
1. Kẻ tấn công biết số điện thoại của một khách đã đăng ký (số điện thoại VN rất dễ thu thập qua mạng xã hội, form marketing, log giao dịch).
2. Gọi `POST /api/tro-chuyen/khach` với `{ fullName, phone: "<số của nạn nhân>", idNumber: "bất kỳ" }`.
3. Server khớp `user_profiles.phone` → dùng **chính user đó** → ký access token + refresh token → đặt cookie httpOnly.
4. Kẻ tấn công đã đăng nhập hoàn toàn vào tài khoản nạn nhân: xem booking, PNR, lịch sử thanh toán, ví, đổi thông tin cá nhân.

**Aggravating factors**:
- Endpoint nằm trong `PUBLIC_API_ROUTES` → không cần token.
- Không có `rateLimit()` (đối chiếu: `/api/dat-ve`, `/api/thanh-toan`, `/api/ghe/khoa` đều có rate-limit; endpoint này thì không).
- Không có `validateCsrfOrReject()`.
- `idNumber` được thu thập nhưng **không được dùng để đối chiếu với hồ sơ đã lưu** — biến thành dữ liệu trang trí.
- Còn nhánh `userRecord.full_name !== cleanName` → ghi đè tên của user thật (giả mạo hồ sơ, gây nhiễu dữ liệu).

**Khuyến nghị**:
1. **Không bao giờ** cấp token cho một tài khoản đã tồn tại chỉ vì biết số điện thoại. Nếu khách đã có tài khoản → yêu cầu đăng nhập/OTP.
2. Nếu khách vãng lai cần phiên chat → tạo **user ẩn danh riêng biệt** (`role='guest'`, không liên kết tới `user_profiles` thật) và **không** cấp quyền đọc booking/ví.
3. Bắt buộc OTP xác minh số điện thoại trước khi gắn phiên vào account hiện hữu.
4. Thêm `rateLimit` + `validateCsrfOrReject` + ghi log audit mọi lần tạo phiên guest.

### P0-3 · IDOR ở thanh toán: xác nhận/đọc đặt vé của người khác mà không cần đăng nhập

**File**: `src/app/api/thanh-toan/route.ts` (dòng 42–43, 113–117)

```typescript
const { user, error, response } = await verifyAuthRequest(request);
if (error === 'CSRF validation failed') return response!;   // ← chỉ chặn CSRF
// user === null khi không đăng nhập → điều kiện ownership bị bỏ qua
...
if (user && booking.user_id && booking.user_id !== user.userId && !isAdminRole(user.role)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

Điều kiện `user && ...` khiến **request ẩn danh không bao giờ bị chặn**. Vì `booking_id` là UUID nhưng lộ ra qua nhiều kênh (URL `/thanh-toan?bookingId=…`, email, lịch sử trình duyệt), nên:

- `POST /api/thanh-toan` với `bookingId` của người khác + `method: 'card'` (phương thức **mô phỏng**) → đánh dấu đơn là **đã thanh toán** mà không mất một đồng nào. Đây là lỗ hổng kinh tế trực tiếp, không chỉ rò rỉ dữ liệu.
- `GET /api/thanh-toan/trang-thai?bookingId=…` (dòng 16, 34) và `GET /api/thanh-toan/vietqr?bookingId=…` (dòng 17, 35) dùng **cùng mẫu lỗi** → rò rỉ PNR, trạng thái, thông tin ngân hàng nhận tiền, số tiền.

**Khuyến nghị**:
1. Thay pattern "check trong điều kiện" bằng **capability token**: khi tạo booking, ký 1 token (HMAC) gắn vào URL thanh toán chứa `bookingId + userId + exp(30')`; mọi endpoint thanh toán yêu cầu token này. Guest thanh toán cũng có token riêng do server cấp lúc tạo booking → không cần login mà vẫn không đoán được id.
2. Nếu giữ hướng cookie-based: phải yêu cầu **một trong hai**: đã đăng nhập và sở hữu booking, **hoặc** cung cấp `booking_code` + `passenger.last_name` (như `/api/checkin` đang làm rất tốt).
3. Tuyệt đối **không** có phương thức thanh toán "mô phỏng"** (`card`) nằm trên route public production — phải nằm sau feature flag / chỉ bật ở `NODE_ENV!=='production'`.
4. Áp dụng nguyên tắc **fail-closed**: mặc định chặn, chỉ mở khi có bằng chứng sở hữu.

### P0-4 · Khóa ghế tạm bị cưỡng chiếm (Seat Lock Hijacking)

**File**: `src/app/api/ghe/khoa/route.ts` (dòng 96–108)

```sql
INSERT INTO seat_locks (flight_id, seat_number, session_id, expires_at)
VALUES (...)
ON CONFLICT (flight_id, seat_number)
DO UPDATE SET
  session_id = EXCLUDED.session_id,
  expires_at = EXCLUDED.expires_at
```

**Vấn đề**:
- `session_id` do **client tự sinh** và gửi lên → không cần chứng minh quyền sở hữu lock.
- `ON CONFLICT ... DO UPDATE` **ghi đè** lock của session khác, kể cả lock còn hiệu lực → người khác có thể cướp ghế ngay khi bạn đang chọn.
- Không có kiểm tra `flight.available` hay trạng thái `seats` khi khóa.
- `DELETE` xoá lock có điều kiện `session_id` (đúng), nhưng vì `POST` đã ghi đè session_id nên kẻ tấn công cũng xoá được lock gốc.
- Quan trọng hơn: **không có chỗ nào trong `src/lib/db.ts` đọc `seat_locks`** (đã grep xác nhận: 0 kết quả trong `src/lib/db.ts` và `src/app/api/dat-ve/route.ts`). Nghĩa là khóa ghế **chỉ mang tính thông báo**, hoàn toàn không ràng buộc việc tạo booking. Hai người có thể cùng đặt vé cùng một số ghế.

**Khuyến nghị**:
1. Sinh `session_id` ở **server** (cookie httpOnly `seat_session`), không nhận từ client.
2. `ON CONFLICT` phải **có điều kiện**: `DO UPDATE SET ... WHERE seat_locks.session_id = EXCLUDED.session_id OR seat_locks.expires_at <= NOW()` → nếu ghế đã bị session khác giữ, trả `409 Conflict` kèm thời hạn lock.
3. `createBooking` phải **join `seat_locks`** trong cùng transaction và từ chối nếu ghế không còn thuộc session của requester; đồng thời `UPDATE seats SET status='booked'` theo `booking_id`.
4. Xem xét `pg_advisory_lock` hoặc `SELECT ... FOR UPDATE` trên `(flight_id, seat_number)` để loại bỏ race condition.

---

## 3. P1 — Vấn đề mức cao

### P1-1 · Người dùng bị đăng xuất im lặng sau 15 phút (Refresh token không bao giờ được gọi)

- Access token TTL = 15 phút (`src/lib/auth.ts`), refresh token TTL = 7 ngày.
- `refreshSession()` **được implement** tại `src/features/auth/services/index.ts:35` nhưng **không nơi nào gọi tới** (grep toàn repo chỉ ra definition + hằng `API_ENDPOINTS.AUTH.REFRESH`).
- Hậu quả: mọi phiên người dùng dài hơn 15 phút đều bị 401 → `AuthContext` clear user → đẩy về `/dang-nhap`, mất trạng thái form đặt vé/ thanh toán đang dở.
- Ngoài ra `/api/xac-thuc/lam-moi` là **public API route** (đúng thiết kế), nên có thể gọi tự động.

**Khuyến nghị**:
1. Trong `AuthContext`, thêm `useEffect` timer: khi còn < 2 phút hạn, gọi `refreshSession()` (hoặc tốt hơn: **refresh trước mỗi request API** qua interceptor trong `apiRequest`).
2. Xử lý 401: thử refresh **một lần** rồi retry; thất bại mới logout.
3. Cân nhắc kéo dài access token lên 30–60 phút + refresh 7 ngày, và hiện cảnh báo "phiên sắp hết hạn".

### P1-2 · Công thức thuế hardcode trong UI, lệch với server

- `src/features/bookings/pricing.ts`: `TAX_AND_FEE_RATE = 0.15`.
- `src/app/tim-ve/components/FlightBookingResultsWrapper.tsx` (dòng 141, 166): `const tax = 581581 * (paxCounts.adult || 1);` — hằng số gộp cứng.
- Hậu quả: giá hiển thị trên UI ≠ giá server tính → khách thấy giá A, bị thu giá B; và đây chính là nguyên nhân gốc khiến nhánh P0-1 "cần thiết".

**Khuyến nghị**: server trả về `pricing breakdown` (JSON) cho mỗi kết quả tìm chuyến; UI chỉ render, tuyệt đối không tự tính tiền. Xoá mọi hằng giá ở component.

### P1-3 · Rate limit trong bộ nhớ + IP giả được giả mạo dễ dàng

`src/lib/rate-limit.ts`:
```typescript
const ip =
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
  request.headers.get('x-real-ip') || 'unknown';
```

- `x-forwarded-for` **do client tự set** được nếu proxy/CDN không ghi đè → kẻ tấn công đổi header mỗi request để né rate-limit.
- Store là `Map` in-memory → trên serverless multi-instance **mỗi pod một bộ đếm riêng**, giới hạn thực tế bị nhân lên số pod; restart là reset.
- Dùng `setInterval` trong Edge/Node runtime để dọn map → giữ tiến trình sống (rò rỉ trong serverless) và mất trạng thái khi cold start.

**Khuyến nghị**: chuyển sang Upstash Redis / Vercel KV / Cloudflare Rate Limiting; lấy IP từ header do CDN đã ký (`cf-connecting-ip`, `true-client-ip`) chỉ khi có `TRUSTED_PROXY`; fallback sang fingerprint (UA + accept-language) khi không có IP đáng tin cậy.

### P1-4 · `/api/editor/files` cho phép ghi file dự án mà không có audit log

- Route dùng `fs` trực tiếp trên `process.cwd()`, chặn `.env*`/`.git` nhưng **cho phép ghi `package.json`, `next.config.mjs`, và toàn bộ `src/`**.
- Chỉ chặn bằng `verifyAdminRequest` → nếu một tài khoản admin bị lộ (qua P0-2 hoặc credential stuffing), kẻ tấn công có thể **cài backdoor vào mã nguồn** mà không cần deploy pipeline.
- Không có nhật ký ai đã sửa gì, không có diff/backup, không có chữ ký.

**Khuyến nghị**: ghi log bắt buộc vào `sstk_tool_logs`/bảng audit (tên file, diff hash, actor, IP); chỉ cho phép ghi trong `content/` và `public/uploads`; các file build/config phải qua PR hoặc bị chặn hoàn toàn; thêm 2FA bắt buộc cho admin (dự án đã có `2fa` API — nên bắt buộc bật).

### P1-5 · Webhook thanh toán — cần rà lại chống replay & kiểm tra chữ ký

`/api/thanh-toan/webhook` dùng HMAC-SHA256 VietQR. Cần xác nhận các điểm sau (chưa thấy test chứng minh):
- Có lưu `nonce`/số thứ tự để chống replay không? Nếu không, cùng một payload hợp lệ có thể được replay nhiều lần để cộng dồn credit ví / SkyJoy.
- Có kiểm tra timestamp trong payload (độ lệch cho phép) không?
- Tính toán amount đối soát với `bookings.total_price` hay tin amount trong webhook?
- Có transaction/idempotency key cho bảng `payments` không?

**Khuyến nghị**: thêm bảng `webhook_events(dedupe_key UNIQUE, payload_hash, received_at)`; trừ tiền/credit ví trong ** một transaction DB duy nhất** với `SELECT ... FOR UPDATE` trên `bookings`; luôn so khớp `amount` với DB.

### P1-6 · `x-user-*` header là "dead code" gây hiểu nhầm về mô hình tin cậy

`src/proxy.ts` set `x-user-id/email/role/fullname` vào request header. Comment nói rõ "None of the x-user-* headers are read downstream". Vấn đề: header này **đến từ proxy do Next.js tự gắn**, nhưng nếu sau này có bất kỳ route nào đọc `request.headers.get('x-user-role')`, nó sẽ trở thành đường nâng quyền (nếu proxy bị bypass qua matcher config, hoặc route được gọi trực tiếp trong test/dev không qua proxy).

**Khuyến nghị**: xoá hẳn cơ chế này; mọi route tự resolve identity từ JWT (`verifyAuthRequest`) như hiện tại. Nếu cần truyền thông tin giữa các route, dùng Server Actions hoặc context, không phải header giả.

### P1-7 · Hai lớp phân quyền song song dễ lệch (proxy prefix vs RBAC `role_permissions`)

- `src/proxy.ts` chặn theo **prefix**: `/quan-tri`, `/api/quan-tri` và `isAdminRole(role)` (chỉ so `'admin'` + một số role legacy).
- Trong DB lại có bảng `role_permissions` (migration 019) cho RBAC chi tiết, và `src/lib/rbac.ts` với `isAdminRole`.
- Hệ quả: một role mới được cấp quyền trong DB (`role_permissions`) có thể **không** được proxy cho qua `/quan-tri` (bị chặn ở tầng proxy trước khi tới tầng RBAC), hoặc ngược lại — route nằm ngoài prefix `/quan-tri` nhưng có quyền admin lại không được proxy chặn.
- Ngoài ra `src/app/quan-tri/page.tsx` lại dùng `ProtectedRoute requiredRole="admin"` — **ba nơi** cùng quyết định quyền.

**Khuyến nghị**: một nguồn sự thật duy nhất. Proxy chỉ làm "có token / không token"; phân quyền chi tiết giao cho `verifyAdminRequest`/`rbac.ts` dựa trên `role_permissions`. `ProtectedRoute` chỉ là hiển thị UI, không phải lớp bảo vệ.

### P1-8 · Endpoint công khai không đồng nhất về rate-limit & CSRF

Rà soát nhanh:

| Endpoint | rateLimit | CSRF |
|---|---|---|
| `/api/dat-ve` | ✅ | ✅ (verifyAuthRequest) |
| `/api/thanh-toan` | ✅ 30/ph | ✅ (nhưng chỉ chặn CSRF, bỏ qua auth — xem P0-3) |
| `/api/ghe/khoa` | ✅ 120/ph | ❌ |
| `/api/tro-chuyen/khach` | ❌ | ❌ |
| `/api/checkin` GET | ✅ 20/ph | n/a |
| `/api/thanh-toan/vietqr` | ❌ | ❌ (GET) |
| `/api/thanh-toan/trang-thai` | ❌ | ❌ (GET) |

**Khuyến nghị**: bổ sung rate-limit + CSRF cho mọi route mutating, kể cả route "guest". Đặc biệt `/api/ghe/khoa` (POST/DELETE) phải có CSRF để chặn việc trang khác ép khoá ghế hộ nạn nhân.

---

## 4. P2 — Chức năng, UX & kỹ thuật nợ

### 4.1 Chức năng / UX

| # | Vấn đề | Vị trí | Mức |
|---|---|---|---|
| F-1 | Silent logout 15' (P1-1) | `features/auth/services/index.ts` | P1 |
| F-2 | Thuế hardcode lệch server (P1-2) | `FlightBookingResultsWrapper.tsx:141,166` | P1 |
| F-3 | Seat lock không ràng buộc booking (P0-4) | `lib/db.ts` | P0 |
| F-4 | `flight.available` chỉ kiểm tra số ghế trống, không kiểm tra ghế đã bị lock/ghế đã bán theo seat cụ thể | `api/dat-ve/route.ts` ~236 | P1 |
| F-5 | Không có luồng "đặt vé nhiều chặng" dù code có nhánh "round-trip legs" — giá nhiều chặng được gán vô điều kiện fallback client | `api/dat-ve/route.ts` | P1 |
| F-6 | Hủy vé / đổi chỗ / sửa hành khách chưa có endpoint hoàn chỉnh trong `PUBLIC_API_ROUTES`; trạng thái `cancelled/refunded` có trong schema nhưng thiếu flow | `migrations/000_core_schema.sql:41` | P1 |
| F-7 | Không có thông báo khi phiên sắp hết hạn / không có "quên mật khẩu" tự động nhắc | `features/auth` | P2 |
| F-8 | Sitemap chứa `/dang-nhap` (trang login) — ảnh hưởng SEO | `src/app/sitemap.ts` | P2 |
| F-9 | `robots.ts` disallow `/quan-tri` nhưng **không** disallow `/tai-khoan`, `/thanh-toan`, `/lam-thu-tuc` (trang chứa PNR) | `src/app/robots.ts` | P1 (rò rỉ chỉ mục) |

### 4.2 Kiểm thử & chất lượng

- `vitest run`: ✅ **118 file / 1035 test PASS** (13/11/2026 22:07).
  Trước đó có 3 lỗi, tất cả đều là **assertion lệch với hành vi mới** chứ không phải bug sản phẩm:
  1. `src/test/airports-api.test.ts` — commit `f22e44b` thêm `country`/`isDomestic` vào `/api/san-bay`, assertion chưa cập nhật → đã sửa.
  2. `src/test/transfer-note.test.ts` — kỳ vọng fallback về `{code}I98O` (theo `migrations/042_transfer_note_six_chars.sql`), nhưng `renderTransferNote` trả về mã trần → đã sửa `src/lib/transfer-note.ts:106` sang dùng `DEFAULT_TRANSFER_NOTE_TEMPLATE`.
  3. `src/test/email-payment-automation.test.ts` — email chưa hiển thị hậu tố `I98O` trong nội dung đối soát → đã sửa `src/lib/mail.ts`.
  **Bài học**: cả 3 lỗi đều cho thấy thiếu một **test hợp đồng duy nhất** cho quy tắc "nội dung chuyển khoản = `{code}I98O`". Ba nơi (migrate DB, renderer, email) phải cùng tuân thủ một spec.
- **Thiếu test cho chính các P0**: không có test nào khẳng định "client gửi `total_price` hờ không thay đổi giá" hay "user khác không đọc được booking của tôi". Đây là lý do các lỗi P0 tồn tại mà CI vẫn xanh.
- **Tốc độ CI**: `vitest` spawn 118 worker, mỗi worker ~6.7s startup → 267s tổng. Vitest tự nhắn `isolate: false` sẽ tiết kiệm ~190s. Nên bật `poolOptions.threads.isolate: false` cho nhánh CI để pipeline không tốn 4 phút chỉ để spawn worker.
- Test script tự viết (`scripts/smoke-test.cjs`, `ui-check.cjs`, `perf-check.cjs`, `visual-diff.cjs`) — tốt, nhưng không nằm trong CI gate.

### 4.3 Kiến trúc & kỹ thuật nợ

| # | Vấn đề | Chi tiết |
|---|---|---|
| A-1 | **Monolithic DB layer** | `src/lib/db.ts` = 3.880 dòng, 120+ export, trộn schema, query, business logic. Mọi thay đổi = merge conflict; không test được từng phần. |
| A-2 | **ESLint quét cả cây build** | ✅ **ĐÃ SỬA** — `eslint.config.mjs` nay có `'**/.next-*/**'` + `'**/.next*/**'`. Trước đó `npm run lint` mất **723 giây** (bị kill); nay còn **~91 giây**, exit 0. Trên đĩa vẫn còn `.next/` 1.4GB + `.next-qa-skyid` 304MB + `.next-rodriguez` 305MB + `.next-qa-vjparity` 301MB + `.next-skyid` 343MB + `.next-uicheck` 295MB → nên dọn định kỳ. |
| A-3 | **Mock DB fallback che lỗi** | `src/lib/neon.ts` fallback về in-memory khi thiếu `DATABASE_URL` → môi trường thiếu cấu hình vẫn "chạy được" và cho kết quả sai. Nên **fail-fast** ở production. |
| A-4 | **47 migration dạng file rời, không có runner/ledger** | Không thấy bảng `schema_migrations` → không biết DB đang ở version nào; apply thủ công dễ lệch. Nên có runner idempotent + bảng version + CI check. |
| A-5 | **Route handler mặc định không cache** | `src/app/api/**` hầu hết không set `revalidate`/`dynamic` → đọc DB mỗi request. `/api/san-bay`, `/api/chuyen-bay` là dữ liệu tham chiếu, nên cache dài. |
| A-6 | **`next/image` bị tắt toàn cục** | `eslint.config.mjs` tắt `@next/next/no-img-element` với lý do chính đáng (SVG/avatar), nhưng còn **17 tag `<img>`** chưa tối ưu → mất LCP. Nên tạo wrapper `<AppImage>` xử lý riêng avatar/SVG, còn lại chuyển sang `next/image`. |
| A-7 | **SEO metadata nhất quán chưa tốt** | `metadataBase` fallback `http://localhost:4028`; `sitemap.ts` lấy `NEXT_PUBLIC_SITE_URL` fallback `http://localhost:3000` — **hai default khác nhau** → sitemap/canonical trỏ sai domain. Cần một module `site-config.ts` duy nhất, và validate lúc build. |
| A-8 | **Lighthouse/perf chưa gate CI** | Đã có `lighthouse` + `perf-check.cjs` nhưng không chạy trong pipeline → hồi quy bundle không bị chặn. |
| A-9 | **`src/lib/db.ts` dùng SQL thuần dựng chuỗi** | Có dùng template literal của `@neondatabase/serverless` (parameterized) ở nơi này — nhưng cần rà toàn bộ chỗ nối chuỗi để loại SQL injection. |
| A-10 | **Ghi log audit không đồng nhất** | Có `thu-thap-hang-loat`, `nhat-ky-kiem-toan`, `sstk_tool_logs` ở admin, nhưng các thao tác nhạy cảm ở route thường (đổi mật khẩu, khoá phiên, tạo refund) không ghi log bất biến. |

---

## 5. Đề xuất cải thiện — lộ trình

### Giai đoạn 0 — Chặn lỗ hổng (1–2 ngày, dễ làm, rủi ro cao)

1. **P0-1**: xoá `clientTotal > serverCalculated`; server là nguồn giá duy nhất; thêm test bất biến giá.
2. **P0-2**: `/api/tro-chuyen/khach` không cấp token cho account đã tồn tại; thêm OTP hoặc bắt đăng nhập; thêm rate-limit + CSRF.
3. **P0-3**: bỏ phương thức thanh toán mô phỏng ở production; yêu cầu capability token / booking_code + họ cho mọi route `/api/thanh-toan/*`.
4. **P0-4**: `seat_locks` → session do server cấp, `ON CONFLICT` có điều kiện, `createBooking` phải kiểm tra lock.
5. Bật `NODE_ENV=production` guard: chặn `card`/mock payment, chặn fallback DB in-memory.
6. Fix test fail `airports-api.test.ts`.

### Giai đoạn 1 — Chuẩn hoá luồng tiền & phiên (1–2 tuần)

1. **Pricing service thống nhất**: `POST /api/bao-gia` (server) trả `breakdown` đầy đủ (fare theo hạng × pax type, thuế 15%, ghế, hành lý theo gói, bảo hiểm, suất ăn, phí khác). UI chỉ render. Xoá `581581` và mọi bảng giá trong component.
2. **Refresh token**: interceptor tự refresh khi 401 hoặc khi còn < 2' hạn; hiện cảnh báo hết phiên.
3. **Idempotency & transaction**: mọi luồng tiền (payment, refund, wallet, SkyJoy) nằm trong 1 transaction với `SELECT ... FOR UPDATE` trên `bookings`; thêm `idempotency_key` và bảng `webhook_events` chống replay.
4. **Capability token cho thanh toán** thay cho `booking_id` thô.
5. **Audit log toàn diện**: middleware wrapper `withAudit(route, action)` cho mọi mutation nhạy cảm.

### Giai đoạn 2 — Kiến trúc & vận hành (2–4 tuần)

1. **Tách `src/lib/db.ts`** theo domain: `db/flights.ts`, `db/bookings.ts`, `db/payments.ts`, `db/wallets.ts`, `db/users.ts`, `db/admin.ts`; mỗi file có interface rõ ràng + test riêng. Giữ `db/index.ts` làm barrel để không phá import.
2. **Rate limit chuyển sang Redis/Upstash**; IP lấy từ header CDN đã ký; có `TRUSTED_PROXY` + `INTERNAL_NETWORK` allowlist.
3. **RBAC một nguồn**: proxy chỉ gate token; quyền chi tiết lấy từ `role_permissions`; bỏ `x-user-*`; `ProtectedRoute` chỉ UX.
4. **Runner migration**: bảng `schema_migrations` + `npm run db:migrate` idempotent + CI kiểm tra schema khớp.
5. **Fail-fast config**: `instrumentation.ts` validate `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `NEXT_PUBLIC_SITE_URL` khi start production; bỏ fallback in-memory.
6. **Sửa ESLint ignores** (`'**/.next*/**'`) + dọn cây build cũ → lint < 30s.
7. **SEO**: `site-config.ts` duy nhất; `robots.ts` disallow `/tai-khoan`, `/thanh-toan`, `/lam-thu-tuc`; sitemap bỏ `/dang-nhap`; thêm `opengraph-image`, JSON-LD (`Flight`/`Organization`).

### Giai đoạn 3 — Hiệu năng & trải nghiệm (song song, liên tục)

1. Cache `/api/san-bay`, `/api/chuyen-bay` (route handler cache + `revalidate` 60–300s), cache danh sách giá/ancillary theo flight.
2. Wrapper `<AppImage>` → thay 17 `<img>` còn lại; thêm `sizes`/`priority` cho hero.
3. Đưa `perf-check.cjs` + Lighthouse vào CI, đặt ngưỡng (LCP < 2.5s, bundle < 200KB gzip).
4. SSE `/api/sse/ghe-ngoi`: thêm heartbeat + giới hạn số kết nối đồng thời (hiện chưa có).
5. Bổ sung e2e Playwright cho 5 luồng vàng: đăng nhập → tìm chuyến → đặt vé → thanh toán → check-in; và 3 luồng đỏ: giá giả mạo, đặt vé của người khác, chat giả danh.

---

## 6. Checklist ưu tiên (quick wins)

| Ưu tiên | Hành động | File | Sửa trong |
|---|---|---|---|
| 🔴 | Xoá fallback giá từ client | `src/app/api/dat-ve/route.ts` | 10 phút |
| 🔴 | Không cấp token cho user tồn tại | `src/app/api/tro-chuyen/khach/route.ts` | 30 phút |
| 🔴 | Chặn mock payment khi production | `src/app/api/thanh-toan/route.ts` | 15 phút |
| 🔴 | `seat_locks` có điều kiện + server session | `src/app/api/ghe/khoa/route.ts` | 1 giờ |
| 🔴 | Sửa ESLint ignores | `eslint.config.mjs` | ✅ **ĐÃ XONG** (723s → 91s) |
| 🟠 | Fix test `airports-api` + fallback `transfer-note` + hậu tố `I98O` trong email | `src/test/airports-api.test.ts`, `src/lib/transfer-note.ts`, `src/lib/mail.ts` | ✅ **ĐÃ XANH** |
| 🟠 | Bật refresh token trong AuthContext | `src/features/auth/services/index.ts`, `src/contexts/AuthContext.tsx` | 2 giờ |
| 🟠 | Thêm rate-limit + CSRF cho route guest | `/api/tro-chuyen/khach`, `/api/thanh-toan/vietqr`, `/api/thanh-toan/trang-thai` | 1 giờ |
| 🟡 | Xoá hằng thuế `581581` | `FlightBookingResultsWrapper.tsx` | 1 giờ |
| 🟡 | `site-config.ts` + sửa robots/sitemap | `src/app/robots.ts`, `src/app/sitemap.ts` | 45 phút |

---

## 7. Phụ lục — Bằng chứng & lệnh kiểm tra

```bash
# Chứng minh P0-1: giá do client kiểm soát
grep -n "clientTotal > serverCalculated" src/app/api/dat-ve/route.ts

# Chứng minh P0-2: khớp user theo số điện thoại, cấp token
grep -n "byPhone\|generateTokens" src/app/api/tro-chuyen/khach/route.ts

# Chứng minh P0-3: ownership check bị bỏ qua khi user === null
grep -n "if (user && booking.user_id" src/app/api/thanh-toan/route.ts \
                                      src/app/api/thanh-toan/vietqr/route.ts \
                                      src/app/api/thanh-toan/trang-thai/route.ts

# Chứng minh P0-4: lock bị ghi đè, và createBooking không đọc seat_locks
grep -n "DO UPDATE SET" src/app/api/ghe/khoa/route.ts
grep -c "seat_locks" src/lib/db.ts   # => 0

# Chứng minh P1-1: refreshSession không được gọi
grep -rn "refreshSession" src/   # chỉ có definition, không có call-site

# Chứng minh P1-3: IP lấy từ header do client kiểm soát
grep -n "x-forwarded-for" src/lib/rate-limit.ts

# Chứng minh P2 (ESLint): cây build chưa được ignore
du -sh .next-rodriguez .next-qa-skyid .next-qa-vjparity
grep -n "next-rodriguez" eslint.config.mjs   # => không tìm thấy

# Kiểm thử (đã chạy lại sau khi sửa)
npm run build       # PASS, BUILD_EXIT=0
npm test            # PASS — 118 file / 1035 test
npm run lint        # PASS, exit 0, ~91s (trước: 723s)
```

**Số liệu tham khảo**
- `src/lib/db.ts`: 3.880 dòng
- Route handler lớn nhất: `api/thanh-toan/route.ts` (495), `api/tro-ly-ai/tro-chuyen/route.ts` (416), `api/dat-ve/route.ts` (376), `api/quan-tri/cong-cu/route.ts` (331)
- Tổng API routes: ~9.027 dòng trong `src/app/api/**/route.ts`
- Migrations: 47 file; Tests: 118 file
- Dung lượng build artifacts: `.next/` 1.4GB + `.next-qa-skyid` 304MB + `.next-rodriguez` 305MB + `.next-qa-vjparity` 301MB + `.next-skyid` 343MB + `.next-uicheck` 295MB

---

*Báo cáo được tạo bằng phân tích tĩnh mã nguồn + chạy test/lint. Các phát hiện P0-1, P0-3, P1-2, P1-3 nên được tái hiện bằng PoC script trước khi triển khai bản vá để xác nhận mức độ ảnh hưởng thực tế.*
