import { NextResponse } from 'next/server';
import { getSocialProviders } from '@/lib/social-auth';

/**
 * Cấu hình Social Login cho form đăng nhập/đăng ký.
 *
 * Chỉ trả về provider nào đang bật — không lộ client id hay bất kỳ giá trị
 * credential nào. Form dùng kết quả này để quyết định nút nào bấm được và nút
 * nào hiện thông báo "sắp khả dụng".
 */
export async function GET() {
  return NextResponse.json({ providers: getSocialProviders() });
}
