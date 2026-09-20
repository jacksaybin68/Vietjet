import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRequest } from '@/lib/auth';
import { sql } from '@/lib/neon';

export async function POST(request: NextRequest) {
  try {
    const { user, error, response } = await verifyAuthRequest(request);
    if (error || !user) return response!;

    const payload = user;

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
