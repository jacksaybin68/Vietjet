import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRequest } from '@/lib/auth';
import { sql } from '@/lib/neon';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error, response } = await verifyAuthRequest(request);
    if (error || !user) return response!;

    const payload = user;

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
    const { user, error, response } = await verifyAuthRequest(request);
    if (error || !user) return response!;

    const payload = user;

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
