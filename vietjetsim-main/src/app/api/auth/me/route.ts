import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('access_token')?.value;

    if (!token) {
      return NextResponse.json({ user: null, message: 'No session found' }, { status: 200 });
    }

    const payload = verifyAccessToken(token);

    if (!payload) {
      return NextResponse.json(
        { user: null, message: 'Invalid or expired session' },
        { status: 200 }
      );
    }

    return NextResponse.json({
      user: {
        id: payload.userId,
        email: payload.email,
        fullName: payload.fullName,
        role: payload.role,
      },
    });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to get user info' },
      { status: 500 }
    );
  }
}
