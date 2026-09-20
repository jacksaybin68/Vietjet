import { NextResponse } from 'next/server';
import {
  verifyAccessToken,
  clearAuthCookiesOnResponse,
  getAccessTokenFromCookies,
} from '@/lib/auth';
import { invalidateUserRefreshTokens } from '@/lib/db';

export async function POST() {
  try {
    // Verify the user has a valid access token before allowing logout
    const accessToken = await getAccessTokenFromCookies();

    if (accessToken) {
      const payload = verifyAccessToken(accessToken);

      if (payload) {
        // Revoke ALL of this user's refresh tokens so stolen tokens can't be reused
        try {
          await invalidateUserRefreshTokens(payload.userId);
        } catch (err) {
          console.error('Failed to invalidate refresh tokens on logout:', err);
          // Don't block logout — clearing cookies is sufficient for session termination
        }
      }
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    clearAuthCookiesOnResponse(response);
    clearSessionCookie(response);
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    // Even on error, clear cookies to best-effort terminate the session
    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    clearAuthCookiesOnResponse(response);
    clearSessionCookie(response);
    return response;
  }
}

function clearSessionCookie(response: NextResponse) {
  response.cookies.set('session_id', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
