# Baseline giao diện — 3 viewport canonical

**Ngày chụp:** 18/10/2026
**Phạm vi:** Phase 0 của `docs/plans/KE_HOACH_DOI_CHIEU_VIETJETAIR_2026-10-18.md`
**Trạng thái:** ✅ cổng xanh — **35/35 màn hình sạch**
**Thay thế:** `docs/qa/BASELINE_2026-10-18.md` (14 màn hình, 2 viewport) — nay lỗi thời.

## Viewport canonical

| Tên | Kích thước | Dùng cho |
| --- | --- | --- |
| `desktop` | 1440×900 | Toàn bộ route |
| `tablet` | 768×1024 | Toàn bộ route công khai + `/tai-khoan`; `/quan-tri` cũng chụp |
| `mobile` | 390×844 | Toàn bộ route công khai + `/tai-khoan` (`/quan-tri` không có thiết kế mobile) |

## Cách chạy (không đè `.next` của dev server)

`next.config.mjs` đọc biến `DIST_DIR`, nên có thể build bản production thứ hai trong khi `next dev` vẫn giữ cổng 4028 và thư mục `.next`:

```bash
cd vietjetsim-main
DIST_DIR=.next-uicheck npm run build
DIST_DIR=.next-uicheck npx next start -p 4029
UI_CHECK_BASE_URL=http://127.0.0.1:4029 node scripts/ui-check.cjs
```

**Cảnh báo:** lệnh build ghi lại `next-env.d.ts` và định dạng lại `tsconfig.json` để trỏ vào distDir vừa dùng. Sau khi chạy xong phải `git checkout -- next-env.d.ts tsconfig.json`, nếu không diff sẽ mang theo đường dẫn `.next-uicheck`.

## Kết quả

| Chỉ số | Giá trị |
| --- | --- |
| Màn hình chụp | **35** (desktop 12 · tablet 12 · mobile 11) |
| Màn hình bị flag | **0** |
| Tràn ngang lớn nhất | **0 px** (cả 35 màn hình, cả ba viewport) |
| Lỗi JS (`pageErrors`) | 0 |
| `console.error` | 0 |
| Lỗi HTTP ngoài 401 | 0 |
| `<img>` có `src` rỗng | 0 |
| Khung chồng nhau | 0 |
| Ảnh chụp kèm theo | 37 PNG (35 màn hình + 2 ảnh widget OpenClaw), ~21,8 MB |

Dòng kết luận của script:

```
✅ UI check passed — 35/35 màn hình sạch.
```

Đăng nhập demo hoạt động ở cả hai vai trò:

```
Đăng nhập: user={"status":200,"role":"user"} admin={"status":200,"role":"admin"}
```

Widget trợ lý (kiểm tra kèm, không nằm trong 35 màn hình):

```
Widget OpenClaw: launcher=true
   nhãn trạng thái: Đang trực tuyến • Ollama qwen3:1.7b
   gửi thử: {"typed":true,"clicked":true}
   sau khi gửi: {"hasOfflineNotice":false,"hasErrorBubble":false}
```

## Khiếm khuyết tìm được và đã sửa

Lần chạy đầu tiên: **3/35 màn hình bị flag** — cả ba đều là `/tim-ve` (desktop, tablet, mobile), cùng một nguyên nhân:

```
console.error x1 · HTTP lỗi x1
http: 404 Fetch http://127.0.0.1:4029/dat-ve?_rsc=mTj78A1HQtvYyyWz
```

Đây là một prefetch RSC tới `/dat-ve`. Route đó **không tồn tại** — chỉ có `/dat-ve/[id]` — nên `next/link` tải trước một trang trắng và nhận 404. `next dev` không prefetch, vì vậy lỗi chỉ hiện trong bản production, đúng như ghi chú trong `AGENTS.md`.

Hai nguồn trỏ tới route chết:

| Vị trí | Nội dung | Xử lý |
| --- | --- | --- |
| `src/shared/components/navigation/ActivityBar.tsx:22` | Nút "Giỏ hàng" → `/dat-ve` | Xoá mục này khỏi `ACTIVITY_ICONS` |
| `src/shared/constants/index.ts:86` | `ROUTES.CHECKOUT = '/dat-ve'` (không nơi nào dùng) | Xoá hằng số |

Luồng đặt vé thật không có bước "giỏ hàng": `FlightBookingClient` tạo booking rồi `router.push('/thanh-toan?bookingId=…')`. Vì vậy thanh hành động trên `/tim-ve` chỉ còn ba mục: Tìm chuyến bay, Tài khoản, Thanh toán.

Sau khi sửa, chạy lại: **0/35 flag**.

## Phạm vi và giới hạn

- Baseline này chụp từ một **working tree chưa tĩnh**: nó gồm cả thay đổi chưa commit của workstream asset (`src/app/trang-chu/components/HeroSection.tsx`) lẫn ghi chú asset mới trong `docs/qa/`. Vì vậy nó không gắn với một commit duy nhất. Cần chụp lại lần cuối khi tree sạch để khoá baseline cứng.
- Ảnh chụp **không được commit**: 21,8 MB cho một bộ tái tạo được bằng một lệnh, và công cụ so sánh ảnh (visual diff) còn chưa được chọn — xem Phase 6 của kế hoạch. Chạy lại lệnh ở mục "Cách chạy" là có lại đủ bộ.
- `/quan-tri` chỉ có desktop + tablet theo thiết kế (console nghiệp vụ desktop-first).
- Các route chưa nằm trong bộ chụp, thuộc phạm vi Phase 6: `/quen-mat-khau`, `/dat-lai-mat-khau`, `/thanh-toan`, `/dat-ve/[id]`, các biến thể `/dich-vu?service=…`.
