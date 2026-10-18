import { NextRequest, NextResponse } from 'next/server';
import { getActiveAnnouncements } from '@/lib/db';

/**
 * Thông báo công khai cho thanh thông báo trên header (`AnnouncementBar`).
 *
 * Không cần phiên đăng nhập: đây là nội dung quảng cáo mà quản trị viên đã phát
 * hành cho mọi khách. Nằm dưới `/api/cong-khai/` cùng chỗ với cấu hình ngân hàng
 * công khai — KHÁC `/api/quan-tri/thong-bao` (trang quản trị, có phân quyền).
 * Đường dẫn này phải được khai báo trong `PUBLIC_API_ROUTES`
 * (`src/lib/route-access.ts`); thiếu khai báo thì proxy trả 307 về `/dang-nhap`
 * và thanh thông báo không bao giờ lấy được dữ liệu.
 *
 * Lỗi truy vấn KHÔNG trả 500. Thanh thông báo đã có nội dung mặc định trong
 * component, nên một sự cố DB chỉ nên làm thiếu thông báo mới chứ không được
 * biến trang chủ thành lỗi máy chủ — cùng lý do `getAvailableDepartDates` được
 * bọc riêng trong `/api/chuyen-bay`.
 */
export async function GET(_request: NextRequest) {
  try {
    const announcements = await getActiveAnnouncements();
    return NextResponse.json({ announcements });
  } catch (error) {
    console.error('Error fetching public announcements:', error);
    return NextResponse.json({ announcements: [] });
  }
}
