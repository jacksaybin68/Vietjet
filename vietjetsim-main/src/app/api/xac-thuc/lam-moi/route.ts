import { NextRequest, NextResponse } from 'next/server';
import {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
  setAuthCookiesOnResponse,
  clearAuthCookiesOnResponse,
  hashToken,
  type JWTPayload,
} from '@/lib/auth';
import { rotateRefreshToken, getStoredRefreshToken } from '@/lib/db';
import { sql } from '@/lib/neon';
import { isAccountLocked } from '@/lib/account-lock';
import { setCsrfCookieOnResponse } from '@/lib/csrf';
import { touchUserSession } from '@/lib/security-db';

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
      SELECT locked_until, role, email, full_name, phone FROM user_profiles WHERE id = ${payload.userId}
    `;
    const accountRow = (
      account as Array<{
        locked_until: string | null;
        role: string | null;
        email: string | null;
        full_name: string | null;
        phone: string | null;
      }>
    )[0];
    const lockedUntil = accountRow?.locked_until ?? null;

    if (isAccountLocked(lockedUntil)) {
      const lockedResponse = NextResponse.json(
        { error: 'Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên.' },
        { status: 403 }
      );
      clearAuthCookiesOnResponse(lockedResponse);
      return lockedResponse;
    }

    // The role is re-read from the database rather than copied out of the
    // incoming token.
    //
    // The refresh token is valid for seven days, and its `role` claim is
    // whatever it was when the token was minted. Copying that claim into the
    // new token meant a demoted admin kept full admin rights for up to a week
    // after the demotion: the new access token was signed with the *old*
    // role, `verifyAdminRequest` reads the role from the token, and the
    // `role_permissions` lookup then granted the former admin's permissions.
    //
    // The account may have been deleted outright, in which case there is
    // nothing to refresh.
    if (!accountRow) {
      const goneResponse = NextResponse.json({ error: 'Tài khoản không tồn tại' }, { status: 401 });
      clearAuthCookiesOnResponse(goneResponse);
      return goneResponse;
    }

    const currentRole = (accountRow.role || 'user') as JWTPayload['role'];
    const currentEmail = accountRow.email ?? payload.email;
    const currentFullName = accountRow.full_name ?? payload.fullName;
    const currentPhone = accountRow.phone ?? payload.phone;

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
      email: currentEmail,
      role: currentRole,
      fullName: currentFullName,
      phone: currentPhone,
    });

    const newRefreshToken = signRefreshToken({
      userId: payload.userId,
      email: currentEmail,
      role: currentRole,
      fullName: currentFullName,
      phone: currentPhone,
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
        email: currentEmail,
        role: currentRole,
        fullName: currentFullName,
        phone: currentPhone,
      },
    });

    // Set NEW token pair on response (old refresh token is now invalid)
    setAuthCookiesOnResponse(response, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
    setCsrfCookieOnResponse(response);

    const sessionId = request.cookies.get('session_id')?.value;
    if (sessionId) {
      // Best-effort: activity tracking must not fail the refresh itself.
      try {
        await touchUserSession(payload.userId, sessionId);
      } catch (touchErr) {
        console.error('Failed to update session activity:', touchErr);
      }
    }

    return response;
  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
