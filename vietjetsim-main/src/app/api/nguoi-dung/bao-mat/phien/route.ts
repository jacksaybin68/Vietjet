import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAuthRequest } from '@/lib/auth';
import {
  deleteAllUserSessions,
  deleteUserSession,
  getLoginHistory,
  getUserSessions,
} from '@/lib/security-db';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/** Cookie set by the sign-in flow to mark which device row is "this one". */
const SESSION_COOKIE = 'session_id';

async function currentSessionId(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function GET(request: NextRequest) {
  const auth = await verifyAuthRequest(request);
  if (auth.error || !auth.user) return auth.response!;

  const type = request.nextUrl.searchParams.get('type');

  try {
    if (type === 'history') {
      const history = await getLoginHistory(auth.user.userId);
      return NextResponse.json({ history }, { headers: NO_STORE });
    }

    const currentId = await currentSessionId();
    const sessions = (await getUserSessions(auth.user.userId)).map((session) => ({
      ...session,
      is_current: session.id === currentId,
    }));

    return NextResponse.json({ sessions }, { headers: NO_STORE });
  } catch (error) {
    console.error('Error loading session data:', error);
    return NextResponse.json({ error: 'Không thể tải dữ liệu phiên' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAuthRequest(request);
  if (auth.error || !auth.user) return auth.response!;

  const { searchParams } = request.nextUrl;

  try {
    if (searchParams.get('action') === 'logoutAll') {
      await deleteAllUserSessions(auth.user.userId);
      return NextResponse.json({ success: true });
    }

    const sessionId = searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ error: 'Thiếu mã phiên' }, { status: 400 });
    }

    // deleteUserSession is scoped by user_id, so a foreign session id is
    // simply a no-op rather than another user's session.
    await deleteUserSession(auth.user.userId, sessionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json({ error: 'Không thể xoá phiên' }, { status: 500 });
  }
}
