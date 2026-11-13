# KẾ HOẠCH CẢI THIỆN MODULE QUẢN TRỊ (ADMIN)

**Ngày lập:** 2026-11-14  
**Phiên bản:** 1.0  
**Tác giả:** AI Coding Agent  
**Trạng thái:** Đề xuất

---

## 1. Mục tiêu

Nâng cấp khu vực Quản trị (`/quan-tri`) từ hệ thống CRUD thuần thành **Dashboard vận hành chuyên nghiệp**, giúp admin:

- Nắm bắt tình hình kinh doanh realtime
- Ra quyết định nhanh hơn
- Giảm thao tác thủ công
- Tăng tính minh bạch và kiểm soát

---

## 2. Phân tích hiện trạng

**Điểm mạnh:**
- 27 API routes admin đầy đủ chức năng
- Có audit log, phân quyền RBAC
- Có công cụ thu thập dữ liệu hàng loạt

**Điểm yếu:**
- Dashboard chỉ là danh sách CRUD, thiếu tổng quan
- Không có biểu đồ, KPI
- Thiếu khả năng xuất báo cáo
- Chưa có CMS nội dung
- Giám sát hệ thống còn thủ công

---

## 3. Các hạng mục đề xuất (ưu tiên giảm dần)

### Phase 1 — Dashboard & KPI (Ưu tiên cao nhất)
| STT | Tính năng | Mô tả | Độ khó | Ước tính |
|-----|-----------|-------|--------|----------|
| 1.1 | Trang Dashboard tổng quan | Biểu đồ doanh thu 7/30 ngày, booking mới, load factor, top route | Trung bình | 2-3 ngày |
| 1.2 | Widget KPI realtime | Số booking hôm nay, doanh thu hôm nay, user active | Dễ | 1 ngày |
| 1.3 | Biểu đồ Recharts | Doanh thu theo ngày, phân bố hạng ghế, tỷ lệ hủy | Trung bình | 1 ngày |

### Phase 2 — Báo cáo & Xuất dữ liệu
| STT | Tính năng | Mô tả | Độ khó | Ước tính |
|-----|-----------|-------|--------|----------|
| 2.1 | Xuất Excel/PDF | Báo cáo doanh thu, danh sách booking, danh sách user | Trung bình | 2 ngày |
| 2.2 | Lịch sử xuất báo cáo | Lưu log các lần export | Dễ | 0.5 ngày |

### Phase 3 — CMS & Quản lý nội dung
| STT | Tính năng | Mô tả | Độ khó | Ước tính |
|-----|-----------|-------|--------|----------|
| 3.1 | Quản lý trang tĩnh | Giới thiệu, điều khoản, FAQ (rich text) | Trung bình | 2 ngày |
| 3.2 | Quản lý banner & khuyến mãi | Upload ảnh, đặt lịch hiển thị | Trung bình | 2 ngày |

### Phase 4 — Giám sát & Vận hành
| STT | Tính năng | Mô tả | Độ khó | Ước tính |
|-----|-----------|-------|--------|----------|
| 4.1 | Giám sát lỗi realtime | Log lỗi từ client + server | Khó | 3 ngày |
| 4.2 | Active users / SSE | Số người đang online | Trung bình | 1.5 ngày |
| 4.3 | Health check dashboard | Trạng thái DB, Redis, external services | Trung bình | 1 ngày |

### Phase 5 — Mở rộng phân quyền & Nhân sự
| STT | Tính năng | Mô tả | Độ khó | Ước tính |
|-----|-----------|-------|--------|----------|
| 5.1 | Quản lý nhân viên nội bộ | Staff account + chi tiết quyền | Trung bình | 2 ngày |
| 5.2 | Phân quyền chi tiết theo module | Ví dụ: chỉ xem báo cáo, không được xóa | Khó | 2-3 ngày |

---

## 4. Kế hoạch thực hiện đề xuất

**Giai đoạn 1 (1 tuần):**  
- Hoàn thành Phase 1 (Dashboard + KPI + Biểu đồ)

**Giai đoạn 2 (1 tuần):**  
- Hoàn thành Phase 2 (Export) + Phase 3 (CMS cơ bản)

**Giai đoạn 3 (2 tuần):**  
- Phase 4 + Phase 5 (nâng cao)

---

## 5. Rủi ro & Giảm thiểu

| Rủi ro | Mức độ | Giảm thiểu |
|--------|--------|------------|
| Tăng kích thước bundle | Trung bình | Lazy load biểu đồ, dùng dynamic import |
| Query DB nặng khi load dashboard | Cao | Thêm index + cache (Redis hoặc in-memory) |
| Phân quyền phức tạp | Cao | Dùng bảng `permissions` + middleware rõ ràng |
| Editor files hiện tại có warning Turbopack | Thấp | Thêm `/* turbopackIgnore: true */` comment |

---

## 6. Tài nguyên cần thiết

- Recharts (đã có dependency)
- Thư viện export: `xlsx` hoặc `exceljs` (cần thêm)
- Rich text editor: `tiptap` hoặc `react-quill` (cần thêm)

---

## 7. Kết luận

Module Admin hiện đã có nền tảng API rất tốt. Việc bổ sung **Dashboard trực quan + khả năng xuất báo cáo** sẽ mang lại giá trị sử dụng cao nhất trong ngắn hạn.

**Đề xuất bắt đầu từ Phase 1** — Dashboard KPI với Recharts.

