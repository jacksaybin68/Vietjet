import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { sql } from '@/lib/neon';

async function getUnreadNotificationCount(userId: string): Promise<number> {
  const result = await sql`
    SELECT COUNT(*) as count FROM notifications 
    WHERE user_id = ${userId} AND is_read = false
  `;
  return Number(result[0]?.count || 0);
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const type = searchParams.get('type') || undefined;
    const unreadOnly = searchParams.get('unread') === 'true';
    const offset = (page - 1) * limit;

    let notifications;
    let total = 0;

    if (unreadOnly && type) {
      notifications = await sql`
        SELECT id, type, title, message, is_read, created_at
        FROM notifications
        WHERE user_id = ${payload.userId} AND is_read = false AND type = ${type}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`
        SELECT COUNT(*) as total FROM notifications
        WHERE user_id = ${payload.userId} AND is_read = false AND type = ${type}
      `;
      total = Number(countResult[0]?.total || 0);
    } else if (unreadOnly) {
      notifications = await sql`
        SELECT id, type, title, message, is_read, created_at
        FROM notifications
        WHERE user_id = ${payload.userId} AND is_read = false
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`
        SELECT COUNT(*) as total FROM notifications
        WHERE user_id = ${payload.userId} AND is_read = false
      `;
      total = Number(countResult[0]?.total || 0);
    } else if (type) {
      notifications = await sql`
        SELECT id, type, title, message, is_read, created_at
        FROM notifications
        WHERE user_id = ${payload.userId} AND type = ${type}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`
        SELECT COUNT(*) as total FROM notifications
        WHERE user_id = ${payload.userId} AND type = ${type}
      `;
      total = Number(countResult[0]?.total || 0);
    } else {
      notifications = await sql`
        SELECT id, type, title, message, is_read, created_at
        FROM notifications
        WHERE user_id = ${payload.userId}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`
        SELECT COUNT(*) as total FROM notifications
        WHERE user_id = ${payload.userId}
      `;
      total = Number(countResult[0]?.total || 0);
    }

    const unreadCount = await getUnreadNotificationCount(payload.userId);

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
