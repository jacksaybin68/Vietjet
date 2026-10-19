# Phase 1 Baseline Verification Report

**Ngày:** 2026-10-18  
**Repo:** `/Users/user/orca/vietjet/Vietjet/vietjetsim-main`  
**Mục đích:** Đối chiếu baseline thực tế với kế hoạch Phase 1 trước khi triển khai

---

## 1. Arbitrary pixel values (`text-[Npx]`)

**Lệnh kiểm tra:**
```bash
grep -rn 'text-\[[0-9]' src/ | wc -l
```

**Kết quả thực tế:** **612** lần xuất hiện  
**Baseline kế hoạch:** 648 lần  
**Chênh lệch:** -36 lần (-5.6%)

**Phân tích:**
- Baseline thực tế **thấp hơn** kế hoạch 36 lần
- Có thể do:
  - Code đã được cleanup một phần trước khi verify
  - Kế hoạch đối chiếu dựa trên snapshot cũ hơn
  - Một số file đã được refactor thay `text-[Npx]` bằng class chuẩn
- **Tác động:** Khối lượng công việc thực tế **ít hơn** dự kiến → tốt cho tiến độ

---

## 2. Hardcoded hex colors (class dạng `text-[#...]`, `bg-[#...]`)

**Lệnh kiểm tra:**
```bash
grep -rnE '(bg|text|border|from|to|via)-\[#[0-9a-fA-F]{3,8}\]' src/ | wc -l
```

**Kết quả thực tế:** **301** lần xuất hiện  
**Baseline kế hoạch:** 390 lần  
**Chênh lệch:** -89 lần (-22.8%)

**Phân tích:**
- Baseline thực tế **thấp hơn đáng kể** so với kế hoạch (giảm gần 1/4)
- Có thể do:
  - Một số màu hex đã được migrate sang CSS variables (`var(--color)`)
  - Một số component đã được refactor dùng theme colors từ `tailwind.config.js`
  - Kế hoạch ban đầu đếm cả CSS variables dạng `bg-[var(--...)]` (không phải hex thuần)
- **Tác động:** Khối lượng công việc **ít hơn** 89 lần → giảm effort đáng kể

---

## 3. Skip link accessibility

**File kiểm tra:** `src/app/layout.tsx` dòng 84-92

**Kết quả:**

✅ **Skip link TỒN TẠI và hoạt động đúng**

**Chi tiết:**
- **Vị trí:** `layout.tsx:87-92`
- **href:** `#main-content`
- **Phần tử đích:** Có **15 file page** đặt `<main id="main-content">` sau `<Header />`
  - Ví dụ: `trang-chu/page.tsx:27`, `tim-ve/page.tsx:42`, `chuyen-bay-cua-toi/page.tsx:278`, v.v.
- **Cơ chế:**
  - Skip link ẩn mặc định (`sr-only`)
  - Hiện khi focus (`focus:not-sr-only focus:absolute focus:left-4 focus:top-4`)
  - Style: amber background (`focus:bg-[var(--primary)]`), white text, rounded, z-index 100
  - Nội dung: "Bỏ qua tới nội dung chính"
- **Kiến trúc:** `layout.tsx` comment dòng 84-86 giải thích rõ lý do không đặt `<main>` ở layout (để tránh landmark lồng nhau)

**Kết luận:** Skip link đáp ứng WCAG 2.4.1 (Bypass Blocks), không cần sửa trong Phase 1.

---

## 4. fontSize 40px trong `tailwind.config.js`

**File kiểm tra:** `tailwind.config.js` dòng 6-11

**Kết quả:**

✅ **fontSize 40px ĐÃ ĐƯỢC ĐỊNH NGHĨA**

**Chi tiết:**
- **Class names:** `text-2xl2` và `text-5xl2`
- **Giá trị:** `2.5rem` (= 40px)
- **Line-height:**
  - `text-2xl2`: `3rem` (48px)
  - `text-5xl2`: `2.75rem` (44px)
- **Lý do thêm:** Comment dòng 7-8 giải thích `text-4xl` của Tailwind mặc định là 36px, nên cần thêm 2 class để thay thế `text-[40px]`
- **Thang chuẩn Phase 1:** 12, 14, 16, 20, 24, 32, 40px (đã được ghi chú trong config)

**Kết luận:** Không cần tạo class mới, chỉ cần migrate `text-[40px]` → `text-2xl2` hoặc `text-5xl2` tùy ngữ cảnh.

---

## Tổng kết

| Tiêu chí | Kế hoạch | Thực tế | Chênh lệch | Trạng thái |
|----------|----------|---------|------------|------------|
| `text-[Npx]` | 648 | **612** | -36 (-5.6%) | ✅ Ít hơn dự kiến |
| Hex colors | 390 | **301** | -89 (-22.8%) | ✅ Ít hơn đáng kể |
| Skip link | Cần verify | **✅ Có & đúng** | N/A | ✅ Đạt WCAG |
| fontSize 40px | Cần tạo | **✅ Đã có** | N/A | ✅ Sẵn sàng dùng |

**Kết luận chính:**
1. **Khối lượng công việc thực tế nhẹ hơn kế hoạch:** 612 pixel values thay vì 648, và 301 hex colors thay vì 390
2. **Skip link accessibility đã hoàn chỉnh:** Không cần thêm công việc
3. **fontSize 40px đã được chuẩn bị sẵn:** Chỉ cần migrate từ `text-[40px]` sang `text-2xl2`/`text-5xl2`
4. **Phase 1 có thể bắt đầu ngay** với baseline rõ ràng và effort thấp hơn dự kiến

---

**Gợi ý tiếp theo:**
1. Bắt đầu Phase 1 với độ ưu tiên cao: migrate 612 `text-[Npx]` trước (dễ, có pattern rõ ràng)
2. Tiếp theo migrate 301 hex colors sang theme colors hoặc CSS variables (cần mapping màu cẩn thận)
3. Cập nhật kế hoạch đối chiếu với baseline mới (612/301) để tracking chính xác
