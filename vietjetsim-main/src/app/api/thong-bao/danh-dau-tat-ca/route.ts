import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { sql } from '@/lib/neon';
import { validateCsrfOrReject } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  const csrfError = await validateCsrfOrReject(request);
  if (csrfError) return csrfError;

  try {
    const token = request.cookies.get('access_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No access token found' },
        { status: 401 }
      );
    }

    const payload = verifyAccessToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    await sql`
      UPDATE notifications 
      SET is_read = true 
      WHERE user_id = ${payload.userId} AND is_read = false
    `;

    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
}
