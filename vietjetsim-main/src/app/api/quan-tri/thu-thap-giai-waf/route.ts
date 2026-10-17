/**
 * API Trigger làm mới WAF Token tự động qua Headless Chrome
 * POST /api/quan-tri/thu-thap-giai-waf
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { fetchFreshWafToken, getCachedWafToken } from '@/lib/openclaw/waf-solver';

export async function GET(req: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(req, 'flight:price_edit');
    if (error) return response;

    const cachedToken = await getCachedWafToken();
    return NextResponse.json({
      hasToken: Boolean(cachedToken),
      preview: cachedToken ? `${cachedToken.slice(0, 30)}...` : null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Lỗi kiểm tra token', message: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(req, 'flight:price_edit');
    if (error) return response;

    const result = await fetchFreshWafToken();
    if (result.success && result.token) {
      return NextResponse.json({
        success: true,
        message: 'Đã tự động vượt AWS WAF và lưu token mới thành công!',
        tokenPreview: `${result.token.slice(0, 30)}...`,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: result.error || 'Không thể lấy được token từ Vietjet Air.',
      },
      { status: 500 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Lỗi thực thi Headless Chrome',
        message: err instanceof Error ? err.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}
