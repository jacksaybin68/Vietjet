import { NextRequest, NextResponse } from 'next/server';
import {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
  setAuthCookiesOnResponse,
  clearAuthCookiesOnResponse,
  hashToken,
} from '@/lib/auth';
import { rotateRefreshToken, revokeRefreshTokenFamily, getStoredRefreshToken } from '@/lib/db';
import { sql } from '@/lib/neon';
import { isAccountLocked } from '@/lib/account-lock';
import { setCsrfCookieOnResponse } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token provided' }, { status: 401 });
    }

    // Verify the JWT signature & expiry
    const payload = verifyRefreshToken(refreshToken);

    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 });
    }

    // A locked account must not be able to extend its session, otherwise the
    // lock only takes effect once the refresh token expires.
    const account = await sql`
      SELECT locked_until FROM user_profiles WHERE id = ${payload.userId}
    `;
    const lockedUntil =
      (account as Array<{ locked_until: string | null }>)[0]?.locked_until ?? null;

    if (isAccountLocked(lockedUntil)) {
      const lockedResponse = NextResponse.json(
        { error: 'Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên.' },
        { status: 403 }
      );
      clearAuthCookiesOnResponse(lockedResponse);
      return lockedResponse;
    }

    // Hash the incoming token and look it up in DB
    const tokenHash = hashToken(refreshToken);
    const stored = await getStoredRefreshToken(tokenHash);

    if (!stored) {
      // Token not found in DB — possible forgery; clear cookies
      const errResponse = NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
      clearAuthCookiesOnResponse(errResponse);
      return errResponse;
    }

    // ─── Rotation ────────────────────────────────────────────────────────
    // Generate new access + refresh tokens
    const newAccessToken = signAccessToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      fullName: payload.fullName,
      phone: payload.phone,
    });

    const newRefreshToken = signRefreshToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      fullName: payload.fullName,
      phone: payload.phone,
    });

    const newHash = hashToken(newRefreshToken);

    // Atomically rotate: mark old token used → insert new token under same family
    const result = await rotateRefreshToken(tokenHash, newHash, payload.userId, stored.family_id);

    if (!result.success) {
      if (result.reuseDetected) {
        // Possible token theft — entire family revoked
        const reuseResponse = NextResponse.json(
          { error: 'Session compromised — please log in again' },
          { status: 401 }
        );
        clearAuthCookiesOnResponse(reuseResponse);
        return reuseResponse;
      }
      // Token was already used or missing
      const failResponse = NextResponse.json(
        { error: 'Refresh token no longer valid' },
        { status: 401 }
      );
      clearAuthCookiesOnResponse(failResponse);
      return failResponse;
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
        fullName: payload.fullName,
        phone: payload.phone,
      },
    });

    // Set NEW token pair on response (old refresh token is now invalid)
    setAuthCookiesOnResponse(response, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
    setCsrfCookieOnResponse(response);

    return response;
  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
