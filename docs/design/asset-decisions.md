# Mẫu Quyết Định: 3 Asset Thương Hiệu Vietjet Air

**Ngày:** 2026-10-18  
**Phạm vi:** Phase -1 (Kiểm kê và Quyết định Asset)  
**Mục đích:** Quyết định hành động cho 3 asset thương hiệu chính (`logo-vj.svg`, `logo.png`, `app_logo.png`) trước khi chuyển sang Phase 0.

---

## 1. Tổng Quan

Trong quá trình kiểm kê asset (task `asset-audit`), phát hiện 3 file thương hiệu Vietjet Air đang được sử dụng rộng rãi trong codebase nhưng **không có văn bản cho phép hoặc giấy phép** từ Vietjet Air. Tài liệu này cung cấp 3 lựa chọn rõ ràng cho mỗi asset để người quyết định có thể đánh dấu trước khi triển khai.

**Nguồn bằng chứng:**
- `docs/qa/brand-assets-evidence.md` (chi tiết tham chiếu, git history, kích thước)
- `docs/qa/asset-audit-22.md` (bối cảnh rủi ro chung cho 22 asset khác)
- `docs/design/asset-registry.md` (ghi nhận "nguồn chưa xác minh")

---

## 2. Bảng Tổng Hợp 3 Asset

| File | Đường dẫn | Kích thước | Số tham chiếu | Vị trí tham chiếu chính | Git origin | License hiện có | Rủi ro |
|------|-----------|------------|---------------|------------------------|------------|-----------------|--------|
| **logo-vj.svg** | `public/logo-vj.svg` | 5.2 KB | **8 file** | • `Header.tsx` (navigation)<br>• `Footer.tsx`<br>• `AuthShell.tsx` (login/register)<br>• `PaymentClient.tsx`<br>• `FlightResultsStep.tsx`<br>• `PassengerInfoStep.tsx`<br>• `UserDashboardClient.tsx`<br>• `FlightsTab.tsx` (admin) | Commit gốc: `81d19f9` (2026-04-14)<br>Author: jacksaybin68<br>Message: `feat: complete UI rebranding, SEO optimization, and Booking API integration` | ❌ **Không có**<br><br>Ghi chú: "Path vẽ chữ 'vietjet'; palette ghi chú 'lấy từ bundle vietjetair.com'" | 🔴 **CAO**<br><br>Logo chính thương hiệu, comment ghi "lấy từ vietjetair.com" → nguy cơ vi phạm trademark cao nhất |
| **logo.png** | `public/logo.png` | 901 B<br>(230×40) | **9 vị trí** | • `layout.tsx` (metadata, OpenGraph, Apple touch icon)<br>• `AppLogo.tsx` (component default)<br>• `mail.ts` (email template)<br>• `PassengerInfoStep.tsx`<br>• 3 test files | Commit gốc: `81d19f9` (2026-04-14)<br>Author: jacksaybin68<br>Message: `feat: complete UI rebranding, SEO optimization, and Booking API integration` | ❌ **Không có**<br><br>Ghi chú: "Nguồn chưa xác minh"<br><br>Nhắc đến trong `.env.local.example:63`: "Logo dùng trong email (file public/logo.png). Ghi đè khi dùng CDN." | 🟡 **TRUNG BÌNH**<br><br>Dùng trong metadata/email/OpenGraph → ảnh hưởng SEO và branding nếu thay |
| **app_logo.png** | `public/assets/images/app_logo.png` | 507 KB<br>(957×1068) | **3 vị trí** | • `UserChat.tsx:490` (chat widget launcher)<br>• 2 test files | Commit gốc: `d51acb0` (2026-04-03)<br>Author: HoanVe User<br>Message: `chore: initial commit of base project` | ❌ **Không có**<br><br>Ghi chú: "Logo 957×1068 trong chat widget" · "Nguồn chưa xác minh" | 🟢 **THẤP**<br><br>Chỉ dùng trong chat widget, ít ảnh hưởng nếu thay bằng placeholder hoặc avatar generic |

---

## 3. Lựa Chọn Cho Từng Asset

### Asset 1: `logo-vj.svg` (5.2 KB)

**Hiện trạng:**
- Được dùng làm logo chính trong Header, Footer, và 6 màn hình quan trọng (auth, payment, booking, admin).
- Comment trong `asset-registry.md` ghi: "palette lấy từ bundle vietjetair.com" → rủi ro trademark/copyright cao nhất.
- **8 tham chiếu** trong src/, tất cả là vị trí brand-critical.

**Lựa chọn:**

- [x] **T (Thay bằng asset nội bộ mới)**
  - **Hành động:** Team design tạo logo mới cho dự án, tránh vi phạm trademark Vietjet Air. Cập nhật tất cả 8 tham chiếu trong src/ để trỏ đến logo mới (vd: `/logo-internal.svg`).
  - **Thời gian ước tính:** 2-3 ngày (thiết kế + review + implement).
  - **Trade-off:** Mất đi nhận diện thương hiệu Vietjet Air, nhưng loại bỏ hoàn toàn rủi ro pháp lý.
  - **Khuyến nghị:** ✅ **ƯU TIÊN** — rủi ro pháp lý quá cao nếu không có giấy phép từ Vietjet Air.

- [ ] **G (Giữ kèm giấy phép)**
  - **Hành động:** Liên hệ legal/compliance Vietjet Air để xin văn bản cho phép sử dụng logo trong dự án nội bộ/demo. Lưu email/hợp đồng vào `docs/licenses/vietjet-air-brand-permission.pdf`. Cập nhật `docs/design/asset-registry.md` với số hợp đồng và ngày hết hạn.
  - **Thời gian ước tính:** 1-4 tuần (tùy quy trình pháp lý).
  - **Trade-off:** Giữ nguyên branding nhưng phụ thuộc vào approval từ bên thứ ba.
  - **Rủi ro:** Nếu không được phê duyệt, phải quay lại lựa chọn **T** hoặc **X** với deadline chặt.

- [ ] **X (Xoá và thay bằng placeholder)**
  - **Hành động:** Xoá `public/logo-vj.svg`. Tạo file `public/logo-placeholder.svg` (generic logo không chứa trademark). Cập nhật tất cả 8 tham chiếu trong src/ để trỏ đến placeholder. Thêm ghi chú "Brand logo pending" trong UI.
  - **Thời gian ước tính:** 1 ngày.
  - **Trade-off:** Nhanh nhất nhưng giao diện mất tính chuyên nghiệp, không phù hợp cho demo/production.
  - **Khuyến nghị:** ⚠️ Chỉ dùng khi cần loại bỏ rủi ro gấp và chưa có asset thay thế.

**Đề xuất:** Chọn **T** (Thay) — rủi ro thương hiệu cao nhất, không nên dựa vào approval chậm từ bên thứ ba.

---

### Asset 2: `logo.png` (901 B, 230×40)

**Hiện trạng:**
- Được dùng trong metadata (OpenGraph, Apple touch icon), email template, và component `AppLogo`.
- **9 vị trí tham chiếu**, bao gồm 3 test files.
- Ảnh hưởng SEO và social sharing nếu thay đổi.

**Lựa chọn:**

- [x] **T (Thay bằng asset nội bộ mới)**
  - **Hành động:** Team design tạo logo PNG mới (230×40 hoặc tương đương). Cập nhật 6 vị trí chính trong src/ (`layout.tsx`, `AppLogo.tsx`, `mail.ts`, `PassengerInfoStep.tsx`) + 3 test files. Kiểm tra OpenGraph preview và email rendering sau khi thay.
  - **Thời gian ước tính:** 1-2 ngày (cùng batch với `logo-vj.svg`).
  - **Trade-off:** Metadata/email cần thời gian để cache mới được index (Google/Facebook).
  - **Khuyến nghị:** ✅ Nếu đã chọn **T** cho `logo-vj.svg`, nên thống nhất thay cả `logo.png` để đồng bộ branding.

- [ ] **G (Giữ kèm giấy phép)**
  - **Hành động:** Xin giấy phép Vietjet Air cho logo PNG. Lưu văn bản vào `docs/licenses/`. Cập nhật asset registry với thông tin license.
  - **Thời gian ước tính:** 1-4 tuần.
  - **Trade-off:** Giữ nguyên SEO và metadata hiện tại.
  - **Khuyến nghị:** ⚠️ Chỉ khi Vietjet Air đồng ý cho phép sử dụng trong project này.

- [ ] **X (Xoá và thay bằng placeholder)**
  - **Hành động:** Xoá `public/logo.png`. Tạo `public/no_image.png` (generic 230×40). Cập nhật 9 vị trí tham chiếu. Test lại email template và OpenGraph preview.
  - **Thời gian ước tính:** 4-6 giờ.
  - **Trade-off:** Social sharing sẽ hiển thị placeholder, giảm click-through rate.
  - **Khuyến nghị:** ⚠️ Không khuyến nghị trừ khi cần gỡ gấp.

**Đề xuất:** Chọn **G** (Giữ kèm giấy phép) nếu có thể xin được approval nhanh (≤ 1 tuần). Nếu không, chọn **T** (Thay) để đồng bộ với `logo-vj.svg`.

---

### Asset 3: `app_logo.png` (507 KB, 957×1068)

**Hiện trạng:**
- Chỉ dùng trong chat widget launcher (`UserChat.tsx:490`).
- **3 vị trí tham chiếu** (1 src/ + 2 test files).
- Kích thước lớn (507 KB) → có thể tối ưu.
- Commit message ghi: "thay icon launcher bang nhan vat Vietjet Air" → gợi ý là mascot/character từ Vietjet Air.

**Lựa chọn:**

- [x] **T (Thay bằng asset nội bộ mới)**
  - **Hành động:** Team design tạo avatar/icon mới cho chat widget (recommend 128×128 hoặc 256×256, tối đa 50 KB). Cập nhật `UserChat.tsx:490` và 2 test files. Chạy lại test suite.
  - **Thời gian ước tính:** 1 ngày (thiết kế icon đơn giản).
  - **Trade-off:** Mất đi nhân vật Vietjet Air, nhưng có thể dùng generic mascot hoặc logo nội bộ.
  - **Khuyến nghị:** ✅ **ƯU TIÊN** nếu đã chọn **T** cho 2 logo trên, để đồng bộ toàn bộ branding.

- [ ] **G (Giữ kèm giấy phép)**
  - **Hành động:** Xin giấy phép Vietjet Air cho nhân vật/mascot. Lưu văn bản vào `docs/licenses/`. Cập nhật asset registry.
  - **Thời gian ước tính:** 1-4 tuần.
  - **Trade-off:** Chat widget giữ nguyên nhận diện Vietjet Air.
  - **Khuyến nghị:** ⚠️ Ưu tiên thấp — chat widget ít quan trọng hơn logo chính.

- [ ] **X (Xoá và thay bằng placeholder)**
  - **Hành động:** Xoá `public/assets/images/app_logo.png`. Tạo `public/assets/images/chat-avatar-placeholder.png` (generic avatar, 128×128, < 20 KB). Cập nhật `UserChat.tsx:490` và 2 test files.
  - **Thời gian ước tính:** 2-3 giờ.
  - **Trade-off:** Chat widget mất đi tính cá nhân, nhưng vẫn hoạt động bình thường.
  - **Khuyến nghị:** ✅ Chấp nhận được — ít ảnh hưởng đến trải nghiệm người dùng.

**Đề xuất:** Chọn **T** (Thay) hoặc **X** (Xoá) — cả hai đều an toàn về mặt pháp lý và dễ thực hiện. Nếu có thời gian, ưu tiên **T** để có icon đẹp hơn.

---

## 4. Ma Trận Quyết Định

| Asset | Rủi ro | Lựa chọn ưu tiên 1 | Lựa chọn ưu tiên 2 | Lý do |
|-------|--------|--------------------|--------------------|-------|
| **logo-vj.svg** | 🔴 Cao | **T (Thay)** | G (Giữ kèm giấy phép) | Comment "lấy từ vietjetair.com" → rủi ro trademark cao nhất. Không nên phụ thuộc approval. |
| **logo.png** | 🟡 Trung bình | **G (Giữ kèm giấy phép)** | T (Thay) | Nếu xin được giấy phép ≤ 1 tuần, giữ để tránh ảnh hưởng SEO/metadata. Nếu không, thay cùng batch với logo-vj.svg. |
| **app_logo.png** | 🟢 Thấp | **T (Thay)** | X (Xoá) | Chỉ dùng trong chat widget, ít quan trọng. Thay hoặc xoá đều chấp nhận được. |

---

## 5. Kế Hoạch Triển Khai (Khi Đã Chọn)

### Bước 1: Đánh dấu lựa chọn

Đánh dấu `[x]` vào một trong ba lựa chọn (T/G/X) cho mỗi asset ở phần 3.

### Bước 2: Tạo task tương ứng

**Nếu chọn T (Thay):**
1. Tạo issue tracking: "Design 3 asset thương hiệu mới (logo-vj.svg, logo.png, app_logo.png)".
2. Assign cho team design với spec:
   - `logo-vj.svg`: vector, ≤ 10 KB, responsive, không chứa trademark Vietjet Air.
   - `logo.png`: raster, 230×40 hoặc 460×80 (@2x), ≤ 5 KB.
   - `app_logo.png`: icon/avatar, 128×128 hoặc 256×256, ≤ 50 KB.
3. Sau khi có asset mới, chạy script replace:
   ```bash
   # Script tự động cập nhật tham chiếu (tạo sau)
   npm run replace-brand-assets
   ```
4. Test lại:
   - UI rendering tại 8 vị trí dùng `logo-vj.svg`.
   - Metadata/OpenGraph preview với `logo.png`.
   - Chat widget launcher với `app_logo.png`.
5. Chạy test suite:
   ```bash
   npm test -- --grep "logo|brand|asset"
   ```
6. Cập nhật `docs/design/asset-registry.md`: chuyển 3 file sang phần A (nội bộ) với cột "Nguồn: Nội bộ 2026-10".

**Nếu chọn G (Giữ kèm giấy phép):**
1. Soạn email/văn bản xin phép Vietjet Air (template trong `docs/templates/license-request.md` nếu có).
2. Gửi cho legal contact (cần xác định).
3. Đợi phản hồi (theo dõi mỗi 3-5 ngày).
4. Khi nhận được approval:
   - Lưu file PDF/email vào `docs/licenses/vietjet-air-brand-permission-YYYY-MM-DD.pdf`.
   - Cập nhật `docs/design/asset-registry.md` với cột "License: Vietjet Air approval email [link]", "Expiry: [date/indefinite]".
5. Nếu bị từ chối hoặc quá 2 tuần không phản hồi → fallback sang lựa chọn **T** (Thay).

**Nếu chọn X (Xoá):**
1. Tạo 3 placeholder:
   - `public/logo-placeholder.svg` (generic logo, 5 KB).
   - `public/no_image.png` (230×40, blank hoặc text "Logo", 2 KB).
   - `public/assets/images/chat-avatar-generic.png` (128×128, 10 KB).
2. Cập nhật tất cả tham chiếu trong src/.
3. Xoá 3 file gốc:
   ```bash
   git rm public/logo-vj.svg public/logo.png public/assets/images/app_logo.png
   ```
4. Test lại như trên.
5. Cập nhật asset registry: đánh dấu "Removed (placeholder)".

### Bước 3: Verify và commit

```bash
# Build để kiểm tra không có lỗi tham chiếu
npm run build

# Chạy UI check tại 3 viewport
npm run test:ui

# Commit với message rõ ràng
git add .
git commit -m "chore(assets): [T/G/X] 3 brand assets - logo-vj.svg, logo.png, app_logo.png

- logo-vj.svg: [mô tả hành động]
- logo.png: [mô tả hành động]
- app_logo.png: [mô tả hành động]

Ref: docs/design/asset-decisions.md"
```

---

## 6. Lưu Ý Quan Trọng

### Về Rủi Ro Pháp Lý

- **`logo-vj.svg` có rủi ro cao nhất** vì:
  - Comment rõ ràng "lấy từ bundle vietjetair.com".
  - Là logo chính thương hiệu, dễ bị phát hiện nếu Vietjet Air kiểm tra.
  - Nếu dự án này được public (GitHub, demo live), rủi ro bị yêu cầu gỡ bỏ hoặc kiện vi phạm trademark.

- **Không có license = không có quyền sử dụng:**
  - Theo pháp luật sở hữu trí tuệ, logo/thương hiệu được bảo vệ tự động (không cần đăng ký).
  - Việc sử dụng mà không có văn bản cho phép có thể vi phạm:
    - Luật Thương hiệu (Trademark Infringement).
    - Luật Sở hữu Trí tuệ (Copyright, nếu logo có yếu tố nghệ thuật).
  - Ngay cả khi dự án là nội bộ/demo, việc commit vào git public hoặc deploy lên domain công khai đều có thể tạo ra rủi ro.

### Về Timeline

- **Lựa chọn T (Thay):** 2-3 ngày (thiết kế) + 1 ngày (implement + test) = **3-4 ngày**.
- **Lựa chọn G (Giữ):** 1-4 tuần (legal approval), có thể kéo dài hơn nếu Vietjet Air yêu cầu thêm tài liệu.
- **Lựa chọn X (Xoá):** 1 ngày (placeholder + update code).

→ Nếu deadline Phase 0 còn < 1 tuần, **không nên chọn G** vì rủi ro trễ tiến độ.

### Về Đồng Bộ Branding

- Nếu chọn **T** cho `logo-vj.svg`, **nên thống nhất chọn T** cho cả `logo.png` và `app_logo.png` để:
  - Toàn bộ UI dùng cùng một bộ brand identity mới.
  - Tránh tình trạng "một nửa Vietjet Air, một nửa nội bộ" gây nhầm lẫn.
- Nếu chọn **G** (xin giấy phép thành công), có thể giữ cả 3 asset.

---

## 7. Tóm Tắt Đề Xuất (TL;DR)

| Asset | Lựa chọn đề xuất | Lý do ngắn gọn |
|-------|------------------|----------------|
| **logo-vj.svg** | ✅ **T (Thay)** | Rủi ro trademark cao nhất, comment "lấy từ vietjetair.com" rõ ràng. Không nên phụ thuộc approval từ bên thứ ba. |
| **logo.png** | ⚠️ **G (Giữ)** nếu xin được ≤ 1 tuần<br>✅ **T (Thay)** nếu không | Ảnh hưởng SEO/metadata, nhưng nếu không có license nhanh thì nên thay cùng batch với logo-vj.svg. |
| **app_logo.png** | ✅ **T (Thay)** hoặc **X (Xoá)** | Chỉ dùng trong chat widget, ít quan trọng. Cả hai lựa chọn đều an toàn và nhanh. |

**Kịch bản khuyến nghị:**
1. **Nếu có team design sẵn sàng:** Chọn **T** cho cả 3 asset (3-4 ngày), đồng bộ branding hoàn toàn.
2. **Nếu không có design resource:** Chọn **T** cho `logo-vj.svg` (bắt buộc), **X** cho `app_logo.png` (placeholder nhanh), **G** cho `logo.png` với fallback **T** nếu không xin được giấy phép trong 1 tuần.
3. **Nếu legal đã có liên hệ sẵn với Vietjet Air:** Thử **G** cho cả 3, nhưng chuẩn bị kế hoạch **T** backup.

---

## 8. Checklist Trước Khi Chuyển Sang Phase 0

- [ ] Đã đánh dấu lựa chọn (T/G/X) cho cả 3 asset ở phần 3.
- [ ] Đã tạo issue tracking hoặc giao task cho team design (nếu chọn T).
- [ ] Đã soạn email xin phép hoặc liên hệ legal (nếu chọn G).
- [ ] Đã chuẩn bị placeholder files (nếu chọn X).
- [ ] Đã đọc và hiểu rủi ro pháp lý trong phần 6.
- [ ] Đã thống nhất với stakeholder về lựa chọn cuối cùng.
- [ ] Đã cập nhật timeline Phase 0 dựa trên thời gian ước tính (3-4 ngày cho T, 1 ngày cho X, 1-4 tuần cho G).

---

**Gợi ý tiếp theo:**

1. Đánh dấu `[x]` vào một trong ba lựa chọn (T/G/X) cho mỗi asset ở phần 3, sau đó chạy bước tương ứng trong phần 5.
2. Nếu chọn **T** (Thay), tạo issue "Design 3 brand assets mới" với spec từ phần 5, assign cho team design.
3. Nếu chọn **G** (Giữ), soạn email xin phép Vietjet Air theo template (hoặc tạo template nếu chưa có), gửi cho legal contact, theo dõi mỗi 3-5 ngày.
