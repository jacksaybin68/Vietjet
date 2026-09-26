# KẾ HOẠCH TINH CHỈNH GIAO DIỆN — VietjetSim

**Ngày kiểm tra:** 24/09/2026
**Người kiểm tra:** AI Agent (browser automation)
**Phạm vi:** Toàn bộ giao diện người dùng — 7 luồng chính, responsive, accessibility
**Trạng thái trước đó:** 10 lỗi (L1-L10) từ báo cáo QA 23/09 đã được sửa

---

## Tổng quan

Kiểm tra thực tế trên browser (headless Chromium) qua 7 luồng:
1. Trang chủ `/trang-chu` — ✅ Render đúng, không hydration error
2. Tìm vé `/tim-ve` — ✅ Render, có dữ liệu fallback
3. Đăng nhập user → Dashboard — ✅ Hoạt động
4. Admin `/quan-tri` — ✅ Hoạt động
5. Responsive mobile (375px) — ⚠️ Overflow cục bộ
6. Accessibility — ⚠️ Thiếu alt/aria-label
7. Trang phụ — ❌ `/tro-chuyen` 404

**Kết quả:** 2 lỗi nghiêm trọng, 3 lỗi trung bình, 4 lỗi nhẹ.

---

## Phát hiện chi tiết

### 🔴 N1 — NGHIÊM TRỌNG: Trang `/tro-chuyen` trả về 404

- **Hiện tượng:** Truy cập `http://localhost:4028/tro-chuyen` → 404 "Trang không tìm thấy"
- **Nguyên nhân:** Không có thư mục `src/app/tro-chuyen/` — route chưa được tạo. Component chat (`features/chat/components/`) đã có nhưng page thì không.
- **Tác động:** Link "Trợ lý ảo" / "Chat hỗ trợ" trong navigation/admin sidebar dẫn tới trang lỗi → trải nghiệm người dùng kém.
- **Fix:** Tạo `src/app/tro-chuyen/page.tsx` render `ChatComponent` từ `features/chat`, hoặc xóa link nếu tính năng chưa sẵn sàng.

### 🔴 N2 — NGHIÊM TRỌNG: Logout không redirect về trang đăng nhập

- **Hiện tượng:** Click "Đăng xuất" ở sidebar → `setUser(null)` + clear state → nhưng URL vẫn ở `/tai-khoan` hoặc `/quan-tri`. User thấy giao diện "trống" (sidebar không có menu vì `!user`) nhưng không được chuyển hướng.
- **Nguyên nhân:** `AuthContext.handleLogout` chỉ set state, không gọi `router.push('/dang-nhap')`. Component cha cũng không kiểm tra `!user` để redirect. Khác với behavior khi token hết hạn (có redirect).
- **Fix:** Thêm `router.push('/dang-nhap')` vào `handleLogout` trong `AuthContext.tsx`, hoặc thêm `useEffect` kiểm tra `!user && !isLoading` để redirect.

---

### 🟠 N3 — TRUNG BÌNH: Admin Overview thiếu nhãn "Số liệu minh họa"

- **Hiện tượng:** Tab Tổng quan admin hiển thị số liệu: "0 vé hoàn thành", "8.719.550₫ tổng doanh thu", "4 vé đã bán", "70 chuyến bay", "2 người dùng" — nhưng không có chip/nhãn "Số liệu minh họa" hay "Dữ liệu mẫu" như đã nêu trong fix L10.
- **Nguyên nhân:** Báo cáo L10 nói đã thêm chip nhưng `grep` toàn bộ `features/admin/` không tìm thấy text "minh họa" hoặc "mẫu" trong component OverviewTab. Fix có thể đã không được áp dụng hoặc bị revert.
- **Fix:** Thêm badge/chip `Dữ liệu minh họa` vào `OverviewTab.tsx` gần tiêu đề "Chỉ số tổng quan", màu amber/nhạt để phân biệt với dữ liệu thật.

### 🟠 N4 — TRUNG BÌNH: Text bảng hoạt động admin bị nối liền

- **Hiện tượng:** Cột "MÃ ĐẶT CHỖ" trong bảng "Hoạt động gần đây" hiển thị `VJ970877HOÀN TIỀN` — mã booking và badge trạng thái dính vào nhau không có khoảng trắng.
- **Fix:** Thêm margin/padding giữa mã booking và badge trạng thái trong component bảng.

### 🟠 N5 — TRUNG BÌNH: Kết quả tìm vé fallback không khớp tham số

- **Hiện tượng:** Tìm HAN→SGN ngày 25/09/2026, API `/api/chuyen-bay?from=HAN&to=SGN&date=2026-09-25` trả 200 nhưng empty, component dùng fallback data. Fallback chứa cả chuyến HAN→DAD (VJ 301) và SGN→PQC (VJ 201) không liên quan.
- **Log:** `[FlightResultsStep] API returned empty results, using fallback data`
- **Fix:** Fallback data nên lọc theo `from`/`to` trong URL params, hoặc hiển thị thông báo "Không tìm thấy chuyến bay cho tuyến đường này" thay vì hiển thị dữ liệu không liên quan.

---

### 🟡 N6 — NHẸ: 3 ảnh thiếu thuộc tính alt

- **Vị trí:** Trang chủ `/trang-chu` — 3 ảnh banner/services/destinations/sky_space không có `alt`.
- **Fix:** Thêm `alt` mô tả cho từng ảnh.

### 🟡 N7 — NHẸ: Mobile overflow cục bộ ~24px

- **Hiện tượng:** Ở viewport 375px, 5 phần tử card/link có `scrollWidth` 413px > `clientWidth` 389px (chênh ~24px). Không gây scrollbar ngang toàn trang nhưng padding/margin không cân đối.
- **Fix:** Kiểm tra class `rounded-md relative overflow-hidden` trên các card — có thể thêm `max-w-full` hoặc giảm padding ở breakpoint mobile.

### 🟡 N8 — NHẸ: Form submit trên trang chủ redirect đến `/tra-cuu`

- **Hiện tượng:** Bấm nút "Tìm chuyến bay" (submit) trên trang chủ → redirect đến `/tra-cuu` thay vì `/tim-ve?from=HAN&to=SGN&pax=1&depart=...`.
- **Nguyên nhân:** Form có thể có `action` không đúng, hoặc JavaScript handler redirect sai.
- **Fix:** Kiểm tra `HeroSection.tsx` form action / submit handler → phải chuyển hướng tới `/tim-ve` với đầy đủ params.

### 🟡 N9 — NHẸ: Thiếu aria-label trên input đăng nhập

- **Hiện tượng:** Input email và password trên `/dang-nhap` không có `aria-label`, chỉ có `placeholder=" "` (khoảng trắng).
- **Fix:** Thêm `aria-label="Email"` và `aria-label="Mật khẩu"`.

---

## Kế hoạch thực hiện (theo thứ tự ưu tiên)

### Phase 1: Sửa lỗi nghiêm trọng (N1, N2)
| # | Task | Effort | File |
|---|------|--------|------|
| N1 | Tạo route `/tro-chuyen` hoặc ẩn link | 30ph | `src/app/tro-chuyen/page.tsx` (mới) hoặc xóa link ở Header/sidebar |
| N2 | Thêm redirect sau logout | 15ph | `src/contexts/AuthContext.tsx` |

### Phase 2: Sửa lỗi trung bình (N3-N5)
| # | Task | Effort | File |
|---|------|--------|------|
| N3 | Thêm chip "Dữ liệu minh họa" vào Overview + Revenue | 20ph | `OverviewTab.tsx`, `RevenueTab.tsx` |
| N4 | Sửa separator trong bảng hoạt động | 10ph | `OverviewTab.tsx` |
| N5 | Lọc fallback data theo from/to | 20ph | `FlightResultsStep.tsx` |

### Phase 3: Sửa lỗi nhẹ (N6-N9)
| # | Task | Effort | File |
|---|------|--------|------|
| N6 | Thêm alt cho 3 ảnh | 10ph | Component banner/destination tương ứng |
| N7 | Fix mobile overflow card | 15ph | Card components |
| N8 | Sửa form action redirect | 15ph | `HeroSection.tsx` |
| N9 | Thêm aria-label cho input login | 5ph | `src/app/dang-nhap/page.tsx` |

### Tổng effort ước tính: ~2.5 giờ

---

## Kết quả thực hiện (24/09/2026)

### Đã sửa (3 mục thực sự là bug)

| # | Fix | File | Kiểm chứng |
|---|-----|------|-----------|
| **N2** | Sidebar "Đăng xuất" giờ gọi `signOut()` (clear session + `router.push('/dang-nhap')`) thay vì `<Link href="/dang-nhap">` (chỉ navigate, session còn → proxy revert về dashboard) | `UserDashboardDesktopSidebar.tsx`, `UserDashboardMobileNav.tsx` (thêm prop `onLogout`), `UserDashboardClient.tsx` (truyền `signOut`) | Click "Đăng xuất" → `/dang-nhap`; truy cập lại `/tai-khoan` → `307 → /dang-nhap?redirect=%2Ftai-khoan` |
| **N5** | Fallback mock lọc theo `from`/`to` của tìm kiếm | `FlightResultsStep.tsx` (helper `fallbackForRoute`) | `/tim-ve?from=HAN&to=SGN` → 8/8 chuyến là HAN→SGN; không còn VJ 301 (HAN→DAD) hay VJ 201 (SGN→PQC) |
| **N6** | 3 banner `<AppImage alt="">` → `alt={promotion.title}` | `PromotionalBannersSection.tsx` | `/trang-chu`: 43 ảnh, **0** thiếu alt (trước: 3) |
| **N9** | Thêm `aria-label` cho input email/password | `src/app/dang-nhap/page.tsx` | `aria-label="Email hoặc số điện thoại"` / `"Mật khẩu"` |

### Đính chính — KHÔNG phải bug (kế hoạch ban đầu đánh giá sai)

| # | Kết luận | Bằng chứng |
|---|----------|-----------|
| **N1** | Chat đã hoạt động — `ChatWidgets` (`UserChat` + `OpenClawAssistant`) mount sẵn trong `src/app/layout.tsx:125`, hiện floating trên mọi trang cho user đã đăng nhập. **Không có link nào trỏ tới `/tro-chuyen`** trong codebase. URL 404 đó là do tôi tự gõ thử, không phải đường dẫn người dùng gặp. Page `src/app/tro-chuyen/page.tsx` tạo ra đã bị **xóa** vì render `UserChat` lần hai gây trùng widget. | `grep 'ChatWidgets'` → `layout.tsx:125`; `grep 'tro-chuyen'` chỉ ra API endpoint + test, không có `<Link>` |
| **N3** | Số liệu admin **là dữ liệu thật từ DB**, không hardcoded. `getAdminAnalytics()` → `GET /api/quan-tri/doanh-thu` → `getRevenueStats()` (`sql\`SELECT ... FROM bookings\``). Chip **"Dữ liệu trực tiếp"** đã có sẵn ở `OverviewTab.tsx:140-142` và mô tả đúng. | `src/lib/db.ts:1255-1280`; browser: 4 vé / 70 chuyến / 2 user khớp DB thật |
| **N4** | `ml-2` đã có giữa mã booking và badge (`OverviewTab.tsx:298`). Chuỗi `VJ970877HOÀN TIỀN` chỉ là artifact của `innerText` (margin không sinh khoảng trắng trong text). Visual đúng. | `OverviewTab.tsx:297-303` |
| **N7** | Overflow ~24px không sinh scrollbar ngang toàn trang (`documentElement.scrollWidth === innerWidth`). Không phải lỗi hiển thị; là chênh lệch nội tại của card có `overflow-hidden`. | Browser đo ở viewport 375px |
| **N8** | `HeroSection.search()` đã `router.push('/tim-ve?...')` đúng (`HeroSection.tsx:70-77`). Redirect `/tra-cuu` quan sát được là do automation click nhầm phần tử, không phải đường đi của form. | `HeroSection.tsx:70-77` |

### Nợ kỹ thuật phát hiện thêm (ngoài scope, không sửa)

**`src/test/analytics.test.ts`** (untracked, chưa commit) — hỏng do mock lỗi thời, độc lập với các thay đổi trên:
- Mock `vi.mock('@/lib/neon', () => ({ sql: vi.fn() }))` rồi gọi `sql.query.mockResolvedValueOnce(...)`, nhưng `src/lib/db.ts` dùng **tagged template** `` await sql`SELECT ...` `` — không có `.query`.
- Hệ quả: **4 test fail** (`analytics.test.ts`) + **4 ESLint prettier error**.
- Baseline sạch: `npx vitest run --exclude src/test/analytics.test.ts` → **309/309 pass (27 files)** — khớp báo cáo RESTRUCTURING_STATUS.
- Hướng sửa: mock `vi.mocked(sql).mockResolvedValueOnce([...])` cho tagged template; `getRecentActivity` gọi `sql` **2 lần** (bookings + refunds) nên cần 2 mock liên tiếp; assertion `activity[2].total_price` phải đổi từ `null` sang số vì refund nay lấy `r.amount as total_price`.

### Cổng xác minh

| Hạng mục | Kết quả |
|---|---|
| `npm run type-check` | ✅ 0 lỗi |
| `npm run lint` | ✅ 0 lỗi từ file đã sửa; 4 error còn lại đều trong `analytics.test.ts` (pre-existing) |
| `npx vitest run --exclude src/test/analytics.test.ts` | ✅ **309/309** pass (27 files) |
| `npm run build` | ✅ thành công, `ƒ Proxy (Middleware)` |
| Browser E2E | ✅ logout redirect · không session rò rỉ · fallback lọc đúng tuyến · 0 ảnh thiếu alt · aria-label có |

---

## Tiêu chí kiểm chứng sau khi sửa (cập nhật)

- [x] ~~`/tro-chuyen` trả về 200~~ → **N/A**: chat là floating widget mount ở root layout; không có link trỏ tới route này (N1 đính chính)
- [x] Click "Đăng xuất" → redirect về `/dang-nhap`; session bị xóa thật (truy cập lại `/tai-khoan` → 307 → `/dang-nhap?redirect=…`)
- [x] ~~Admin Overview hiển thị chip "Dữ liệu minh họa"~~ → **N/A**: số liệu admin là dữ liệu thật từ DB; chip "Dữ liệu trực tiếp" đã có và đúng (N3 đính chính)
- [x] ~~Bảng "Hoạt động gần đây" có khoảng trắng giữa mã booking và badge~~ → **N/A**: `ml-2` đã có; artifact `innerText` (N4 đính chính)
- [x] Tìm vé HAN→SGN: 8/8 chuyến đều HAN→SGN, không còn tuyến lạ
- [x] 0 ảnh thiếu alt trên `/trang-chu` (43/43 ảnh có alt)
- [ ] ~~0 overflow cục bộ ở viewport 375px~~ → **N/A**: không sinh scrollbar ngang; là chênh lệch nội tại của card `overflow-hidden` (N7 đính chính)
- [x] ~~Form submit trang chủ chuyển đến `/tim-ve`~~ → **N/A**: `HeroSection.search()` đã push `/tim-ve?...` đúng (N8 đính chính)
- [x] Input đăng nhập có aria-label (email + password)

