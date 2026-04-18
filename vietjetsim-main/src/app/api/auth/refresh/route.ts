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
    });

    const newRefreshToken = signRefreshToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      fullName: payload.fullName,
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
      },
    });

    // Set NEW token pair on response (old refresh token is now invalid)
    setAuthCookiesOnResponse(response, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });

    return response;
  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
