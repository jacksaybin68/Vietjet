# Vietjet Air

Ứng dụng **mô phỏng** đặt vé máy bay: tìm chuyến bay, chọn ghế, giữ chỗ, thanh toán,
điểm thưởng, phân quyền và trang quản trị. Không phải website chính thức của hãng hàng không nào.

Next.js 16 · React 19 · TypeScript · Tailwind · Neon Postgres

## Bố cục

```
.
├── vietjetsim-main/     # toàn bộ mã nguồn ứng dụng (thư mục giữ tên cũ để không vỡ config/editor)
└── docs/                # tài liệu — xem docs/README.md để có chỉ mục đầy đủ
    ├── app/             # tài liệu nghiệp vụ: hệ thống bán vé, luồng xử lý, sơ đồ luồng
    ├── plans/           # kế hoạch + trạng thái tái cấu trúc
    ├── qa/              # ảnh chụp kiểm thử + bản mẫu giao diện
    └── reports/         # các báo cáo đã thực hiện
```

## Chạy

Mọi lệnh chạy trong `vietjetsim-main/` (dev server ở cổng **4028**):

```bash
cd vietjetsim-main
npm install
npm run dev          # next dev --turbo -p 4028
npm run type-check   # tsc --noEmit
npm run lint         # eslint .  (không dùng `next lint`)
npm test             # vitest run
npm run build        # next build (chứa luôn bước kiểm tra type)
```

Chi tiết lệnh và quy ước repo: `vietjetsim-main/AGENTS.md`.
Setup và build từ đầu: `docs/SETUP.md`.

## Ghi chú về tên

Ngày 2026-09-26 dự án đổi hiển thị từ `VietjetSim` sang **Vietjet Air**:
metadata, logo, header/footer, chat launcher, `TOTP_ISSUER`, package `vietjet-air`,
tài liệu, và email demo `@vietjetsim.vn` → `@vietjetair.vn`.

Đổi email **không** sửa migration `014` đã chạy, mà thêm migration
`migrations/022_rename_demo_email_domain.sql` để đổi dòng có sẵn trong DB.

Chủ ý **chưa đổi** ở những nốt dễ vỡ:

- dữ liệu đang có trong DB (`loyalty_programs.name = 'VietjetSim Rewards'`)
- `database-backup/` — bản dump DB thật
- thư mục `vietjetsim-main/`
- khoá localStorage `vietjetsim-theme` (đổi sẽ reset theme người dùng đã lưu)

Đổi 4 nốt trên cần migration riêng, xem `docs/plans/`.
