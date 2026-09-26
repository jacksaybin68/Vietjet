# BÁO CÁO TRẠNG THÁI HIỆN TẠI — VietjetSim

**Cập nhật:** 25/09/2026 · Nguồn: source hiện tại + kết quả chạy thật
(`type-check`, `lint`, `test`, `build`, `test:smoke`)

Tài liệu này thay thế các con số cũ trong `SUMMARY.txt`, `BUILD_VERIFICATION.md`
và `BAO_CAO_KIEM_THU_UI.md` (bản ghi ngày 23/09).

---

## 1. Chất lượng mã nguồn

| Hạng mục | Kết quả |
|---|---|
| `npm run type-check` | ✅ 0 lỗi |
| `npm run lint` | ✅ 0 error, 0 warning |
| `npm test` | ✅ 37 file / **367 test** pass |
| `npm run build` | ✅ exit 0 |
| `npm run test:smoke` | ✅ pass toàn bộ assertion |
| TODO/FIXME trong `src/` | 0 |

---

## 2. Đã đóng trong các đợt gần đây

| # | Hạng mục | Commit |
|---|---|---|
| 1 | Commit 43 file vốn nằm rác (gồm migration 018 + 6 test mới) | `e5bab3c`…`7967f49` |
| 2 | Hydration mismatch — `toLocaleString()` thiếu locale | `e5bab3c` |
| 3 | `Invalid Date` trong Chat quản trị | `e5bab3c` |
| 4 | Dấu `+` sai cho giao dịch rút tiền | `e034452` |
| 5 | Polling chat spam lỗi 401 khi mất session | `e034452` |
| 6 | Lỗi lint formatting | `7967f49` |
| 7 | **RBAC: từ "advisory only" → enforce thật** | `40d3d41` |
| 8 | **Mã đặt chỗ bịa ở trang thanh toán** | `06754dc` |

---

## 3. RBAC — đã enforce

Trước đây `verifyAdminRequest(request, permission)` **nhận permission rồi bỏ qua**;
cả 6 role admin đều vào được mọi route. Nay:

- Migration `019_role_permissions.sql` (đã áp dụng lên DB dev, idempotent).
- `admin` 52 quyền · `super_admin` 52 (bypass bảng) · `admin_content` 18 ·
  `admin_finance` 16 · `admin_ops` 15 · `admin_support` 10.
- **Fail-closed**: role không có dòng nào thì không gọi được route nào có guard.
- Route `phan-quyen` trước đây không yêu cầu quyền — nay cần `rbac:manage`.

Kiểm chứng thật trên DB dev (role tạm đổi rồi hoàn tác): cho phép
`booking:list`/`user:list`/`flight:list`, **từ chối** `flight:create`,
`user:delete`, `rbac:manage`, `system:config`.

---

## 4. Còn tồn đọng

### 4.1 Tra cứu đặt chỗ — **đã xử lý (commit `5ea080c`)**

`MOCK_BOOKINGS` đã bị gỡ khỏi `src/app/tra-cuu/page.tsx`. Tra cứu giờ chạy trên
session + sở hữu: khách phải đăng nhập, dữ liệu lấy từ `GET /api/dat-ve`, bỏ ô
email. Không có endpoint tra cứu PNR ẩn danh.

Lý do đã nêu trong báo cáo bảo mật vẫn đúng:

> *"Requiring a session and ownership stops anyone from enumerating check-in
> details via booking codes."*

PNR chỉ 6 ký tự nên dò được. Ba hướng:

- **(a)** Yêu cậu đăng nhập + sở hữu (đúng precedent hiện có) — an toàn, đánh đổi
  khả năng khách vô danh tra cứu.
- **(b)** Endpoint công khai PNR + email kèm rate-limit nghiêm — tiện hơn nhưng vẫn
  dò được nếu email bị lộ.
- **(c)** Giữ nguyên mock, chỉ ghi rõ là dữ liệu minh hoạ.

### 4.2 `Math.random()` còn trong mã nghiệp vụ

| Vị trí | Vấn đề |
|---|---|
| `api/quan-tri/cong-cu/route.ts:74` | Nhân giá demo 0.8–1.2 |
| `features/admin/components/FlightsTab.tsx:156` | Số ghế đã đặt hiển thị ngẫu nhiên |
| `lib/db.ts` | Sinh mã PNR / số check-in (chấp nhận được ở server) |

Các vị trí còn lại trong `PaymentClient` (confetti) là hiệu ứng đồ hoạ, không
phải dữ liệu.

### 4.3 Khách chưa đăng nhập chưa đặt vé được

`api/dat-ve/route.ts:8,41` gọi `verifyAuthRequest` bắt buộc. Cần
`bookings.user_id` nullable + sửa luồng UI — thay đổi lớn về schema.

### 4.4 Chưa có kiểm thử e2e

- Không có Playwright (`npm ls @playwright/test` → rỗng); 37 file test đều là
  unit/component.
- Chưa kiểm thử responsive mobile/tablet.
- Chưa kiểm thử các luồng phát sinh dữ liệu: thanh toán, nạp/rút ví, đổi mật khẩu,
  bật 2FA.
- Chưa test biên ngày sinh (tháng 2, năm nhuận).

### 4.5 Git

Các commit đã push, `main` đồng bộ với `origin/main`. Git identity đặt cục bộ cho
repo là `Cline <cline@localhost>` — đổi được nếu muốn commit dưới tên khác.

---

## 6. Hoàn tiền: quy trình hai chiều (migration 020)

Phiếu hoàn tiền trở thành luồng có trạng thái, không còn là bản ghi một chiều.

**Khách gửi phiếu** (`/api/hoan-tien` POST) — 5 trường bắt buộc: ngân hàng nhận
tiền, số tài khoản, họ tên chủ tài khoản, số điện thoại, mã đặt chỗ. Mã đặt chỗ
được tra và **kiểm tra sở hữu** trước khi gắn thông tin nhận tiền; PNR 6 ký tự
nên không coi là bằng chứng danh tính.

**Phiếu tạo ra ở trạng thái ẩn** (`visible_to_user = FALSE`). `GET /api/hoan-tien`
lọc theo cờ này, và response POST chỉ trả `refundId` — không trả lại nội dung phiếu,
để khách không đọc được qua devtools. Khách không có endpoint sửa phiếu (PATCH → 405).

**Admin** (`/api/quan-tri/hoan-tien` PATCH) có 4 hành động:
`set_status` (mặc định), `set_visibility`, `update_details`, `set_feature_lock`.
Ghi đè chi tiết tách riêng khỏi `updateRefundStatus` để đổi trạng thái không vô tình
công khai phiếu.

**Khoá tính năng** qua `system_config.refund_feature_enabled`. Thiếu dòng config thì
mặc định **bật**, để DB cũ chưa chạy migration không bị hiểu nhầm là đang tắt.

Đã kiểm thử thật trên dev server (chi tiết ở `BAO_CAO_KIEM_THU_UI.md`).

---

## 5. Vận hành

- Server dev: `npm run dev` → http://localhost:4028
- Migration phải chạy **trước** khi phục vụ traffic; `019_role_permissions.sql`
  là bắt buộc vì `verifyAdminRequest()` fail-closed.
