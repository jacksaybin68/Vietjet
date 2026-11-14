import { NextRequest, NextResponse } from 'next/server';
import { getPageLayout } from '@/lib/db';
import { normalizeLayout } from '@/features/visual-editor/utils/layout';

export const dynamic = 'force-dynamic';

/**
 * Bố cục trang cho khách chưa đăng nhập.
 *
 * Trang chủ đọc endpoint này để áp dụng bố cục mà người vận hành đã sắp xếp
 * trong trình soạn thảo trực quan (`/editor`). Nội dung trả về chỉ gồm
 * thứ tự section + style đã được allow-list — cùng thứ khách nhìn thấy trên
 * trang, nên không có gì bí mật cần che.
 *
 * Phải khai báo trong `PUBLIC_API_ROUTES` (`src/lib/route-access.ts`); thiếu
 * khai báo thì proxy trả 307 về `/dang-nhap` và trang chủ không lấy được
 * bố cục.
 *
 * Lỗi truy vấn DB KHÔNG trả 500: trang chủ đã có bố cục mặc định, một sự cố
 * DB chỉ nên làm mất tuỳ biến chứ không được biến trang chủ thành lỗi máy
 * chủ — cùng lý do `/api/cong-khai/thong-bao` trả mảng rỗng khi lỗi.
 */
export async function GET(request: NextRequest) {
  const pagePath = request.nextUrl.searchParams.get('page') ?? '/trang-chu';

  try {
    const record = await getPageLayout(pagePath);
    return NextResponse.json({
      ok: true,
      pagePath,
      layout: record ? normalizeLayout(record.layout) : null,
    });
  } catch (error) {
    console.error('Error fetching public page layout:', error);
    return NextResponse.json({ ok: true, pagePath, layout: null });
  }
}
