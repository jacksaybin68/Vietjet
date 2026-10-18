# PHƯƠNG ÁN THỰC HIỆN — GIAO DIỆN ĐẶT VÉ VIETJET

**Ngày soạn:** 18/10/2026  
**Nguồn phân tích:** Ảnh chụp màn hình vietjetair.com (trang đặt vé SGN → HAN)  
**Mục tiêu:** Bổ sung giao diện đặt vé, chọn ghế, chọn dịch vụ và thanh toán theo kiểu Vietjet Air vào dự án VietjetSim.  
**Ngôn ngữ:** Tiếng Việt  

---

## 1. TÓM TẮT PHÂN TÍCH GIAO DIỆN NGUỒN GỐC

### 1.1 Cấu trúc trang
- **Header:** Nền đỏ `#EC2029`, cao ~60px. Logo "VietjetAir.com" trái. Menu phải: Hỗ trợ / Đăng ký / Đăng nhập / Tiếng Việt.
- **Thanh hoạt động (dưới header):** Nền vàng `#FFDD00`. Hiển thị hành trình, điểm đi/đến, biểu tượng máy bay/người dùng/giỏ hàng/tiền tệ.
- **Cột trái (~70%):** Danh sách chuyến bay. Mỗi chuyến là thẻ ngang: giờ bay (lớn), mã chuyến bay, máy bay, 4 cột hạng ghế (BUSINESS / skyBOSS / Deluxe / Eco) với giá riêng.
- **Cột phải (~30%):** Panel "THÔNG TIN ĐẶT CHỐ". Header đỏ, chữ trắng. Các section: Chuyến đi, Giá vé, Thuế phí, Dịch vụ, Chuyến về. Mỗi section có nền xanh nhạt.
- **Footer acción:** "Tổng tiền: 0 VND" + nút "Đi tiếp" vàng bo tròn.

### 1.2 Bảng màu (Color palette)
| Tên | Mã màu | Vị trí sử dụng |
|-----|--------|----------------|
| `--vj-red` | `#EC2029` | Header, panel header, tab skyBOSS, chữ nhấn mạnh |
| `--vj-red-dark` | `#D91A21` | Hover nút đỏ |
| `--vj-yellow` | `#FFDD00` | Thanh hoạt động, nút CTA "Đi tiếp", tab Business |
| `--vj-amber` | `#FBB612` | Nền thẻ chuyến bay, gradient vàng |
| `--vj-brown` | `#B8860B` | Tab BUSINESS |
| `--vj-orange` | `#F4511E` | Tab Deluxe |
| `--vj-eco-green` | `#7CB342` | Tab Eco |
| `--vj-panel-blue` | `#B3E5FC` | Nền section trong panel bên phải |
| `--vj-bg-sky` | `#E9F2FB` | Nền toàn trang |
| `--vj-white` | `#FFFFFF` | Chữ trên đỏ, nền thẻ trắng |

### 1.3 Typography
| Phần | Kích thước | Độ dày | Màu | Ghi chú |
|------|-----------|--------|-----|---------|
| Logo | ~32px | Bold | Trắng | "Air" có accent đỏ |
| Menu chính | ~14px | Medium | Trắng | Uppercase, tracking-wide |
| Giờ bay (20:30) | ~28-32px | Black/900 | Đen | Lớn, nhấn mạnh |
| Mã chuyến bay | ~12px | Medium | Đen | Nhỏ, trên giờ bay |
| Giá vé chính | ~20px | Black/900 | Đen | Số lớn |
| "000 VND" | ~14px | Regular | Đen | Nhỏ hơn, cùng hàng giá |
| Tên máy bay | ~11px | Regular | Đen | "Airbus A321 - Bay thẳng" |
| Tab hạng ghế | ~12px | Bold | Trắng | Uppercase trên nền màu |
| Chữ panel | ~14px | Regular | Đen | "Thông tin hành khách" |
| Nút CTA | ~14px | Bold | Đen | Trên nền vàng |

**Font-family:** `Be Vietnam Pro`, `KoHo`, `ui-sans-serif`, `system-ui`, `sans-serif` (giống dự án hiện có).

### 1.4 Hiệu ứng (Effects)
- Không dùng gradient over-used; chỉ dùng flat màu theo token.
- Tab hạng ghế: active có nền màu, chữ trắng; inactive nền trắng, chữ xám.
- Thẻ chuyến bay: bo tròn, bóng mờ, hover nhẹ nâng lên.
- Nút CTA: bo tròn lớn, nền vàng, chữ đen in đậm.
- Badge "Giá nhất": nền đỏ cam, chữ trắng, bo tròn_full.
- Transition màu: 200ms ease-out.

---

## 2. THUẬT NGỮ & MAPPING SANG DỰ ÁN

| Thành phần vietjetair.com | Thành phần dự án (hiện có / cần tạo) | File |
|---------------------------|--------------------------------------|------|
| Header đỏ | `Header.tsx` (đã có, cần căn lại) | `src/shared/components/navigation/Header.tsx` |
| Thanh vàng hoạt động | Cần tạo `ActivityBar.tsx` | `src/shared/components/navigation/ActivityBar.tsx` |
| Thanh chọn ngày | Cần tạo `DateStrip.tsx` | `src/app/tim-ve/components/DateStrip.tsx` |
| Thẻ chuyến bay | Cần tạo `FlightCard.tsx` | `src/app/tim-ve/components/FlightCard.tsx` |
| Tab hạng ghế | Cần tạo `FareClassTabs.tsx` | `src/app/tim-ve/components/FareClassTabs.tsx` |
| Panel bên phải | Cần tạo `BookingSummaryPanel.tsx` | `src/app/tim-ve/components/BookingSummaryPanel.tsx` |
| Nút "Đi tiếp" | Cần tạo `ContinueButton.tsx` | `src/app/tim-ve/components/ContinueButton.tsx` |
| Trang kết quả tìm kiếm | `/tim-ve` (có sẵn skeleton) | `src/app/tim-ve/page.tsx` |

---

## 3. COMPONENT CAN THIẾT (DANH SÁCH CHI TIẾT)

### 3.1 `ActivityBar.tsx` — Thanh hoạt động vàng
- Nền `#FFDD00`, cao ~46px.
- Nội dung: Hành trình (điểm đi → điểm đến), biểu tượng máy bay, người dùng, giỏ hàng, tiền tệ.
- Responsive: trên mobile co lại, chỉ hiện biểu tượng chính.

### 3.2 `DateStrip.tsx` — Thanh chọn ngày bay
- Danh sách ngày ngang, cuộn ngang (`overflow-x-auto`).
- Mỗi ngày: thứ, ngày tháng, badge giá nếu có.
- Ngày được chọn: viền đỏ, nền nhạt, chữ đậm.
- Badge "Giá nhất": nằm phía trên hoặc chèn giữa strip, nền đỏ cam, chữ trắng.

### 3.3 `FareClassTabs.tsx` — Tab hạng ghế
- 4 tab ngang: BUSINESS, skyBOSS, Deluxe, Eco.
- Màu nền tab: Business = vàng nâu, skyBOSS = đỏ, Deluxe = cam, Eco = xanh lá.
- Active: nền màu, chữ trắng, có underline.
- Inactive: nền trắng, chữ xám, viền nhạt.

### 3.4 `FlightCard.tsx` — Thẻ chuyến bay
- Layout ngang: [Giờ bay] [Mã chuyến bay + máy bay] [4 cột giá hạng ghế].
- Giờ bay: lớn, đậm (28px+), màu đen.
- Giờ đi → Giờ đến, có mũi tên bay giữa.
- Mã chuyến bay (VJ194): nhỏ, trên giờ bay.
- Máy bay: "Airbus A321 - Bay thẳng", nhỏ, xám.
- 4 cột giá: mỗi cột có giá lớn + "000 VND" nhỏ, nút chọn (viền hoặc nền).
- Hover: bóng nhẹ, translate-y -2px.

### 3.5 `BookingSummaryPanel.tsx` — Panel thông tin đặt chỗ (bên phải)
- Header: nền đỏ `#EC2029`, chữ trắng in đậm "THÔNG TIN ĐẶT CHỐ".
- Section "Chuyến đi": nền xanh nhạt `#B3E5FC`, tiêu đề xanh đậm, ô nhập điểm đi/đến.
- Section "Giá vé": ô nhập số.
- Section "Thuế, phí": ô nhập số.
- Section "Dịch vụ": dropdown, mặc định "0 VND".
- Section "Chuyến về": cùng cấu trúc chuyến đi (nếu khứ hồi).
- Responsive: trên mobile stack lên trên danh sách hoặc biến thành bottom sheet.

### 3.6 `ContinueButton.tsx` — Nút "Đi tiếp"
- Nền vàng `#FFDD00`, chữ đen in đậm, bo tròn lớn.
- Kích thước đầy đủ chiều rộng container trên mobile.
- Hover: tối màu nhẹ, escala 1.02.

---

## 4. CHIẾN THUẬT TÍCH HỢP VÀO DỰ ÁN

### 4.1 Trang `/tim-ve` (Kết quả tìm kiếm)
Hiện tại trang `/tim-ve` có sẵn route nhưng cần xem lại cấu trúc. Kế hoạch:
- Giữ `FlightResultsStep` hiện có làm danh sách chuyến bay (cột trái).
- Thêm `BookingSummaryPanel` ở cột phải (desktop) hoặc dưới danh sách (mobile).
- Thêm `ActivityBar` dưới header (nếu chưa có).
- Thêm `DateStrip` ở trên danh sách chuyến bay.
- Nút "Đi tiếp" ở dưới cùng panel bên phải.

### 4.2 Luồng dữ liệu
- Khi người dùng chọn hạng ghế trên `FlightCard` → cập nhật trạng thái chọn trong zustate/React context (hoặc `useState` trong `FlightBookingClient`).
- Tổng tiền tự động tính lại: giá vé + thuế + dịch vụ.
- Nút "Đi tiếp" bật/tắt tùy thuộc có chọn hạng ghế hay không.

### 4.3 Responsive breakpoint
- `< lg`: Cột phải stack dưới cột trái. `DateStrip` cuộn ngang. `ActivityBar` co gọn.
- `≥ lg`: Layout 2 cột (70% / 30%). `DateStrip` hiển thị đầy đủ.

---

## 5. CHIẶC CÔNG VIỆC (WBS)

### Mốc 1: Design system & Token (1 ngày)
| ID | Công việc | Mô tả | File | Ước tính |
|----|-----------|-------|------|----------|
| M1.1 | Thêm màu token vào `tailwind.config.js` | `--vj-orange`, `--vj-amber`, `--vj-brown`, `--vj-eco-green`, `--vj-panel-blue`, `--vj-bg-sky` | `tailwind.config.js` | 30 phút |
| M1.2 | Cập nhật `Header.tsx` nếu cần | Đảm bảo màu đỏ flat, không gradient | `src/shared/components/navigation/Header.tsx` | 30 phút |
| M1.3 | Tạo `ActivityBar.tsx` | Thanh vàng hoạt động | `src/shared/components/navigation/ActivityBar.tsx` | 1 giờ |

### Mốc 2: Component tìm kiếm chuyến bay (2 ngày)
| ID | Công việc | Mô tả | File | Ước tính |
|----|-----------|-------|------|----------|
| M2.1 | Tạo `DateStrip.tsx` | Thanh chọn ngày bay cuộn ngang + badge giá | `src/app/tim-ve/components/DateStrip.tsx` | 2 giờ |
| M2.2 | Tạo `FareClassTabs.tsx` | 4 tab hạng ghế | `src/app/tim-ve/components/FareClassTabs.tsx` | 1 giờ |
| M2.3 | Tạo `FlightCard.tsx` | Thẻ chuyến bay với 4 cột giá | `src/app/tim-ve/components/FlightCard.tsx` | 3 giờ |
| M2.4 | Tạo `BookingSummaryPanel.tsx` | Panel thông tin đặt chỗ bên phải | `src/app/tim-ve/components/BookingSummaryPanel.tsx` | 3 giờ |
| M2.5 | Tạo `ContinueButton.tsx` | Nút Đi tiếp vàng | `src/app/tim-ve/components/ContinueButton.tsx` | 1 giờ |

### Mốc 3: Tích hợp vào trang `/tim-ve` (1-2 ngày)
| ID | Công việc | Mô tả | File | Ước tính |
|----|-----------|-------|------|----------|
| M3.1 | Cập nhật `page.tsx` của `/tim-ve` | Layout 2 cột, thêm ActivityBar, DateStrip, Panel | `src/app/tim-ve/page.tsx` | 3 giờ |
| M3.2 | Kết nối trạng thái chọn hạng ghế | State management: chọn vé → cập nhật tổng tiền | `src/features/bookings/` | 2 giờ |
| M3.3 | Xử lý nút "Đi tiếp" | Chuyển đến bước chọn ghế / thông tin hành khách | `src/app/tim-ve/page.tsx` | 1 giờ |

### Mốc 4: Responsive & Chỉnh sửa chi tiết (1 ngày)
| ID | Công việc | Mô tả | File | Ước tính |
|----|-----------|-------|------|----------|
| M4.1 | Mobile stack | Panel bên phải chuyển xuống dưới trên mobile | Tất cả component Mốc 2 | 2 giờ |
| M4.2 | Kiểm tra tràn ngang | Đảm bảo không có chiều rộng cố định gây overflow | Tất cả | 1 giờ |
| M4.3 | Chỉnh lại khoảng cách | Padding, gap giữa các mục theo hình mẫu | Tất cả | 1 giờ |

### Mốc 5: Kiểm thử & Dọn dẹp (1 ngày)
| ID | Công việc | Mô tả | File | Ước tính |
|----|-----------|-------|------|----------|
| M5.1 | Chạy `tsc --noEmit` | Kiểm tra TypeScript | Toàn dự án | 30 phút |
| M5.2 | Chạy `eslint` | Kiểm tra lint | Toàn dự án | 30 phút |
| M5.3 | Kiểm tra responsive | Xem trên mobile/tablet/desktop | Trình duyệt | 2 giờ |
| M5.4 | Commit & Push | Lưu mã nguồn | Git | 30 phút |

**Tổng cộng ước tính:** 6–8 ngày làm việc (tùy mức độ phức tạp của state management).

---

## 6. MÔ HÌNH THỰC HIỆN (EXECUTION MODEL)

Tôi khuyên dùng mô hình **Phát triển theo tính năng (Feature-driven)** với các nguyên tắc sau:

### 6.1 Nguyên tắc code
- **Không dùng gradient không cần thiết:** Chỉ dùng flat màu theo token (theo feedback trước).
- **Màu đỏ chủ đạo:** `#EC2029` (`--vj-red`) cho header và các nút chính.
- **Vàng accent:** `#FFDD00` (`--vj-yellow`) cho nút CTA và thanh hoạt động.
- **Không cứng chiều rộng:** Tránh `w-[fixed-px]` gây tràn ngang trên mobile. Dùng `max-w`, `w-full`, `lg:w-[...]`.
- **Responsive đầu tiên:** Viết mobile-first, sau đó mở rộng với `lg:` prefix.

### 6.2 Quy trình từng component
1. Viết component TypeScript với props rõ ràng.
2. Đảm bảo `tsc --noEmit` pass.
3. Chạy `eslint --fix` trước khi commit.
4. Kiểm tra trên 3 kích thước: mobile (375px), tablet (768px), desktop (1440px+).

### 6.3 State management gợi ý
- Sử dụng `React Context` hoặc `Zustand` (nếu dự án đã có) để lưu:
  - Chuyến bay đã chọn
  - Hạng ghế đã chọn (Business / skyBOSS / Deluxe / Eco)
  - Tổng tiền hiện tại
- Tránh lưu state trong localStorage trừ khi cần lưu tạm giữa các reload trang.

---

## 7. ĐỊNH NGHĨA HOÀN THÀNH (DEFINITION OF DONE)

- [ ] Màu sắc khớp hình mẫu: đỏ `#EC2029`, vàng `#FFDD00`, xanh nhạt panel, xanh lá Eco, cam Deluxe, vàng nâu Business, đỏ skyBOSS.
- [ ] Layout 2 cột trên desktop: danh sách chuyến bay trái (~70%), panel thông tin phải (~30%).
- [ ] Trên mobile: cột phải stack dưới, không tràn ngang, không xuất hiện thanh cuộn ngang toàn trang.
- [ ] Nút "Đi tiếp" vàng, bo tròn, bật/tắt tùy trạng thái chọn vé.
- [ ] Tab hạng ghế 4 loại có màu riêng, active state rõ ràng.
- [ ] Badge giá tốt nhất hiển thị trên thanh chọn ngày.
- [ ] `tsc --noEmit` không lỗi.
- [ ] `eslint` không lỗi.
- [ ] Không dùng gradient không cần thiết.

---

## 8. RANGRO BUỔ & GIẢI PHÁP

| Rủi ro | Mức độ | Giải pháp |
|--------|--------|-----------|
| Không truy cập được vietjetair.com để lấy thiết kế chính xác | Cao | Dùng ảnh chụp màn hình đã có + ước lượng từ kinh nghiệm. Có thể điều chỉnh sau khi xem thiết kế thực tế. |
| State management phức tạp giữa chọn vé và chọn ghế | Trung bình | Bắt đầu đơn giản với `useState` trong `page.tsx`, sau đó tách ra context nếu cần. |
| Responsive bị lỗi trên tablet | Trung bình | Dùng `lg:` breakpoint rõ ràng, kiểm tra trên 3 kích thước chuẩn. |

---

## 9. LỊCH TRÌNH ĐỀ XUẤT (VÍ DỤ)

| Ngày | Công việc |
|------|-----------|
| Ngày 1 | Mốc 1: Design system + ActivityBar |
| Ngày 2-3 | Mốc 2: DateStrip, FareClassTabs, FlightCard, BookingSummaryPanel, ContinueButton |
| Ngày 4-5 | Mốc 3: Tích hợp vào `/tim-ve`, kết nối state |
| Ngày 6 | Mốc 4: Responsive, chỉnh khoảng cách |
| Ngày 7-8 | Mốc 5: Kiểm thử, lint, commit |

---

**Lưu ý:** File này là phương án tham khảo. Bạn có thể điều chỉnh thời gian và chi tiết công việc tùy theo quy trình làm việc của nhóm. Tôi sẵn sàng hỗ trợ viết code cho bất kỳ component nào trong danh sách trên.
