import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { sql } from '@/lib/neon';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    const body = await request.json();
    const { is_read } = body;

    if (is_read === undefined) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'is_read field is required' },
        { status: 400 }
      );
    }

    const result = await sql`
      UPDATE notifications 
      SET is_read = ${is_read} 
      WHERE id = ${id} AND user_id = ${payload.userId}
      RETURNING id, is_read
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      notification: result[0],
      message: 'Notification updated successfully',
    });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const result = await sql`
      DELETE FROM notifications 
      WHERE id = ${id} AND user_id = ${payload.userId}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
