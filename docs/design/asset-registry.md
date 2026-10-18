# Asset Registry — Giao diện đối chiếu vietjetair.com

**Ngày lập:** 18/10/2026  
**Mục đích:** Đăng ký mọi tài sản media (ảnh, video, icon, font) được dùng trong giao diện công khai của `vietjetsim-main`, kèm chủ sở hữu / giấy phép, route sử dụng và kích thước tối ưu. Không tải asset từ trang web tham chiếu vào repo.

## Quy tắc sử dụng asset

- Mỗi file đưa vào `public/` phải có dòng đăng ký trong bảng dưới đây trước khi được import vào component.
- Không đặt tên file trùng với asset của vietjetair.com.
- Nên dùng SVG nội bộ / placeholder có quyền thay cho ảnh sản phẩm nhà航 hàng không.
- Font: chỉ dùng `KoHo` và `Be Vietnam Pro` qua `next/font` (có trong `tailwind.config.js` và `src/styles/tailwind.css`).

## Bảng đăng ký tài sản

| Tên file | Đường dẫn | Mục đích | Route sử dụng | Chủ sở hữu / Giấy phép | Kích thước tối ưu | Trạng thái |
|----------|-----------|----------|---------------|------------------------|-------------------|------------|
| `logo-vj.svg` | `public/logo-vj.svg` | Logo chính hiển thị header | Tất cả trang | Nội bộ | — | Có sẵn |
| `sky-clouds.svg` | `public/sky-clouds.svg` | Nền trang chủ / hero | `/trang-chu` | Nội bộ | — | Có sẵn |
| `public/images/promos/` | `public/images/promos/*.*` | Banner ưu đãi | `/trang-chu` | Nội bộ | — | Thêm mới (chưa tracked) |

> **Lưu ý:** Thư mục `public/images/promos/` đã tồn tại trong worktree nhưng chưa tracked git. Trước khi commit, mỗi file ảnh trong đó phải có dòng đăng ký trên bảng này với kích thước và giấy phép rõ ràng.

## Font (không lưu file trong repo)

| Font | Nguồn | Cách khai báo | Sử dụng |
|------|-------|---------------|---------|
| `KoHo` | Google Fonts qua `next/font` | `src/styles/tailwind.css`, `tailwind.config.js` | Giao diện, đoạn ngắn |
| `Be Vietnam Pro` | Google Fonts qua `next/font` | `src/styles/tailwind.css`, `tailwind.config.js` | Heading, nội dung dài |

## Cổng duyệt Phase 0

- [ ] Mọi file trong `public/` có dòng đăng ký trong bảng trên.
- [ ] Không có asset nào trỏ trực tiếp đến `vietjetair.com` (hotlink cấm).
- [ ] Kích thước ảnh trong bảng đã được đo và ghi nhận.
