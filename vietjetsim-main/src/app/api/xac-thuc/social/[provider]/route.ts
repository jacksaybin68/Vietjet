import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { buildAuthorizeUrl, isSocialProvider } from '@/lib/social-auth';

/**
 * Bắt đầu luồng Social Login: chuyển hướng sang provider.
 *
 * `state` được sinh ngẫu nhiên và đặt vào cookie `oauth_state` để callback (khi
 * được cắm) có thể chống CSRF. Provider chưa cấu hình trả 501 kèm thông báo
 * tiếng Việt — form đã biết trước qua `GET /api/xac-thuc/social`, nên nhánh này
 * chỉ xảy ra khi env đổi giữa chừng.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  if (!isSocialProvider(provider)) {
    return NextResponse.json({ error: 'Nhà cung cấp không hợp lệ.' }, { status: 404 });
  }

  const redirectUri = new URL(`/api/xac-thuc/social/${provider}/callback`, request.nextUrl.origin);
  const state = randomBytes(16).toString('hex');
  const authorizeUrl = buildAuthorizeUrl(provider, redirectUri.toString(), state);

  if (!authorizeUrl) {
    return NextResponse.json(
      {
        error: 'not_configured',
        message: `Đăng nhập bằng ${provider} chưa được cấu hình trên hệ thống này.`,
      },
      { status: 501 }
    );
  }

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
  });
  return response;
}
