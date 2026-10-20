/**
 * Hoàn tất một lần đăng nhập: cấp token, ghi phiên thiết bị và trả response.
 *
 * Tách ra khỏi route vì có **hai** đường đăng nhập — mật khẩu và OTP SMS — và
 * cả hai phải cấp cookie, CSRF, `session_id` giống hệt nhau. Trước đây chỉ có
 * một đường nên không ai thấy; thêm đường thứ hai bằng cách chép lại khối này
 * là cách chắc chắn nhất để hai đường trôi khỏi nhau (ví dụ một đường quên
 * `setCsrfCookieOnResponse` và mọi mutation sau đó 403).
 */

import { NextResponse } from 'next/server';
import {
  generateTokens,
  hashToken,
  setAuthCookiesOnResponse,
  generateTokenFamily,
  type User,
} from '@/lib/auth';
import { storeRefreshToken } from '@/lib/db';
import { createUserSession, recordLoginAttempt, type DeviceInfo } from '@/lib/security-db';
import { setCsrfCookieOnResponse } from '@/lib/csrf';

/** Cookie theo dõi phiên thiết bị, khớp cách `security-db` định danh phiên. */
export const SESSION_COOKIE = 'session_id';

/** Response JSON dùng chung cho cả hai đường đăng nhập. */
export function buildAuthResponse(user: User): NextResponse {
  const cleanFullName = user.full_name
    ? user.full_name.replace(/\s*\(CCCD:.*?\)/gi, '').trim()
    : user.full_name;

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: cleanFullName,
      role: user.role,
      phone: user.phone,
      avatarUrl: user.avatar_url,
    },
  });
}

/**
 * Cấp phiên cho một tài khoản đã xác thực. Mọi bước phụ (lưu refresh token,
 * ghi phiên thiết bị) đều fail-soft: chúng là hardening, không phải điều kiện
 * để đăng nhập được.
 */
export async function establishSession(user: User, device: DeviceInfo): Promise<NextResponse> {
  const tokens = generateTokens(user);

  try {
    await storeRefreshToken(user.id, hashToken(tokens.refreshToken), generateTokenFamily());
  } catch (storeErr) {
    console.error('Failed to store refresh token (rotation disabled):', storeErr);
  }

  let sessionId: string | null = null;
  try {
    const session = await createUserSession(user.id, device);
    sessionId = session.id;
  } catch (sessionErr) {
    console.error('Failed to record session (session list unavailable):', sessionErr);
  }

  void recordLoginAttempt(user.id, { ...device, success: true });

  const response = buildAuthResponse(user);
  setAuthCookiesOnResponse(response, tokens);
  // Đặt cookie CSRF cùng lúc với cookie phiên, nếu không các mutation có guard
  // CSRF sẽ 403 ngay sau một lần đăng nhập sạch.
  setCsrfCookieOnResponse(response);

  if (sessionId) {
    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });
  }

  return response;
}
