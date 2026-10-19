# Kế Hoạch Phân Công Công Việc Giữa 2 Công Cụ

**Ngày lập:** 19/10/2026  
**Mục tiêu:** Tái hiện 100% giao diện và luồng tương tác của `vietjetair.com/vi` bằng cách chia đôi khối lượng công việc cho 2 công cụ làm việc song song, cam kết **không chạm chéo file**, **không xung đột git**.

---

## Nguyên Tắc Phân Chia (Zero-Conflict Contract)

1. **Phạm vi file độc lập tuyệt đối:** Mỗi công cụ chỉ chỉnh sửa danh sách file thuộc quyền của mình.
2. **Quy ước Interface/Token:** Mọi màu sắc và component dùng chung tuân theo design tokens đã chốt (`tailwind.config.js`).
3. **Cổng kiểm tra định kỳ:** Cả 2 công cụ đều phải giữ `npm run type-check`, `npm run lint`, và `npm test` luôn xanh sau mỗi batch thay đổi.

---

## 🛠️ Công Cụ 1 (Antigravity): Chrome, Navigation, Overlays & Foundation

> **Trọng tâm:** Khung ứng dụng toàn cục (Header 4 tầng, Sticky search bar, Overlays, Footer, Design Tokens)

### 1. Danh sách File Phụ Trách
- `src/styles/tailwind.css`
- `tailwind.config.js`
- `src/shared/components/navigation/Header.tsx`
- `src/shared/components/navigation/AnnouncementBar.tsx`
- `src/shared/components/navigation/ActivityBar.tsx`
- `src/shared/components/navigation/MobileBottomNav.tsx`
- `src/shared/components/feedback/SiteOverlays.tsx`
- `src/shared/components/navigation/Footer.tsx`

### 2. Các Đầu Việc Chi Tiết
1. **Design Tokens & Theme:**
   - Bổ sung biến màu đỏ đô rượu (`brand.wine`: `#780000`, `brand.wineDark`: `#5e0000`).
   - Củng cố màu vàng CTA (`brand.cta`: `#FFDD00`, hover `#FBB612`).
   - Font `KoHo` cho UI / đoạn ngắn và `Be Vietnam Pro` cho heading.
2. **Header 4 tầng đúng chuẩn Vietjet:**
   - **Tầng 1 (Announcement):** Ticker tin tức đỏ, nút điều hướng `< >`, nút đóng `✕`.
   - **Tầng 2 (Utility):** Logo Vietjet + `🎧 Hỗ trợ` + `👤 Đăng ký | Đăng nhập` + dropdown `Tiếng Việt ▾`.
   - **Tầng 3 (Primary Nav):** `CHUYẾN BAY CỦA TÔI`, `ONLINE CHECK-IN`, `DỊCH VỤ CHUYẾN BAY`, `DỊCH VỤ KHÁC`.
   - **Tầng 4 (Quick-rail):** Dải icon vàng/cát (`Đặt vé`, `Skyshop`, `Khách sạn`, `E-Visa`, `Mua ngoại tệ`, `Bảo hiểm`, `SkyJoy`).
3. **Sticky Search Bar khi cuộn trang:**
   - Lắng nghe sự kiện scroll (`scrollY > 600px`), hiển thị thanh tìm kiếm ghim ngang trên đỉnh màn hình (Trip type, Origin, Destination, Dates, Nút Tìm chuyến bay vàng).
4. **Site Overlays & Lifecycle:**
   - Hoàn thiện popup Cookie Consent có mascot máy bay Amy + 2 nút `Từ chối tất cả` / `Đồng ý`.
   - Popup ưu đãi cá nhân hoá (`Để sau` / `Đồng ý`).
5. **Footer:**
   - 4 cột liên kết đầy đủ, khu vực tải App (App Store, Google Play), biểu tượng Bộ Công Thương, các phương thức thanh toán và mạng xã hội.

---

## 💻 Công Cụ 2 (OpenCode): Trang Chủ, Hero Booking Box & Sections Nội Dung

> **Trọng tâm:** Trải nghiệm thân trang chủ (Floating Booking Box, Dải sóng mây, Carousel vé rẻ, 6 Squircles dịch vụ, Grid 6 Điểm đến, Ruy băng FAQ)

### 1. Danh sách File Phụ Trách
- `src/app/trang-chu/page.tsx`
- `src/app/trang-chu/components/HeroSection.tsx`
- `src/app/trang-chu/components/HeroBookingWidget.tsx` (hoặc sub-component của Hero)
- `src/app/trang-chu/components/DealsSection.tsx`
- `src/app/trang-chu/components/HotDealsSection.tsx`
- `src/app/trang-chu/components/LargePromoBanners.tsx`
- `src/app/trang-chu/components/PromotionalBannersSection.tsx`
- `src/app/trang-chu/components/AttractiveDestinationsSection.tsx`
- `src/app/trang-chu/components/HowItWorksSection.tsx`
- `src/app/trang-chu/components/TravelGuidesSection.tsx`

### 2. Các Đầu Việc Chi Tiết
1. **Hero Floating Booking Box (Hộp tìm kiếm đỏ đô nổi trên Hero):**
   - Nền đỏ rượu vang `#780000` viền bo góc 16px.
   - 3 Tab trên cùng: `Mua hành lý, suất ăn...` (Active), `Đổi thưởng & Mua SkyPoint`, `Gửi hàng nhanh`.
   - Radio chọn loại vé: `Khứ hồi` (chấm vàng), `Một chiều`, `Nhiều chặng ↗`, dropdown tiền tệ `VND ▾`.
   - Lưới 4 ô nhập (2x2):
     * Hàng 1: `✈ Điểm khởi hành` | `Ngày đi`
     * Hàng 2: `✈ Điểm đến` | `Ngày về`
     * Nút hoán đổi chiều bay `⇅` đặt giữa hai điểm.
   - Hàng tuỳ chọn: `👤 Hành khách` (popover chọn số lượng), `🏷️ Mã khuyến mại`, checkbox `☐ Tìm vé rẻ nhất`.
   - Nút CTA vàng rực rỡ `#FFDD00`: `Tìm chuyến bay`.
   - Mascot Amy cầm bảng vẫy tay "Xin chào!" ở góc phải form.
2. **Dải sóng mây (Cloud Wave Divider) & Thẻ vé rẻ:**
   - Đường phân cách hình mây lượn sóng uốn cong tự nhiên.
   - Dải thẻ vé rẻ theo tỉnh (`Từ Tp. Hồ Chí Minh`, `Từ Hà Nội`) với bong bóng giá tròn màu vàng chanh.
3. **Banner đôi khuyến mãi & Ngân hàng số:**
   - Cặp banner 16:9 (`Khuyến cáo di chuyển`, `Vé đoàn`).
   - Banner Vikki Digital Bank / Mua ngoại tệ toàn chiều rộng.
4. **6 Icon dịch vụ nhanh (Squircles 3D):**
   - 6 khối bo tròn rực rỡ: `Đặt chuyến bay` (Đỏ), `Mua hành lý/chỗ` (Xanh lá), `Ưu tiên làm thủ tục` (Xanh dương), `Hàng miễn thuế` (Đỏ mận), `Bảo hiểm` (Cyan), `Vietjet e-Voucher` (Tím).
5. **Lưới 6 Điểm đến du lịch (2×3 Grid):**
   - 6 thẻ hình ảnh sắc nét: `Quảng Bình`, `Gia Lai`, `Nghệ An`, `Hà Nội`, `Thành phố Hồ Chí Minh`, `Phú Quốc`.
   - Typography chữ trắng in đậm trên nền gradient chân ảnh.
6. **Ruy băng FAQ:**
   - Ribbon đỏ nếp gấp xanh `Câu hỏi thường gặp`.
   - 6 nút vàng: `Đặt vé trực tuyến`, `Chỗ ngồi`, `Hành lý`, `Check-in`, `Nối chuyến`, `Suất ăn`.

---

## Ma Trận Phối Hợp & Kiểm Tra Chéo

| Tiêu chí | Công cụ 1 (Antigravity) | Công cụ 2 (OpenCode) |
|---|---|---|
| **Vùng làm việc** | `src/shared/components/navigation/`, `src/styles/` | `src/app/trang-chu/components/` |
| **Xung đột Git** | 0 file trùng lặp | 0 file trùng lặp |
| **Lệnh xác thực** | `npm run lint` & `npm run type-check` | `npm run lint` & `npm run type-check` |
| **Tích hợp chung** | Đảm bảo header và sticky bar đồng bộ | Đảm bảo query tìm kiếm chuyển chuẩn sang `/tim-ve` |
| **Kiểm thử cuối** | `npm run test:ui` (35/35 màn hình) | `npm run test:ui` (35/35 màn hình) |
