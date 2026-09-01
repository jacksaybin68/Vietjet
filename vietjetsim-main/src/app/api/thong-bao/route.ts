import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { sql } from '@/lib/neon';
import { validateCsrfOrReject } from '@/lib/csrf';

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
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(searchParams.get('limit') || '20', 10) || 20)
    );
    const type = searchParams.get('type') || undefined;
    const unreadOnly = searchParams.get('unread') === 'true';
    const offset = (page - 1) * limit;

    let notifications: {
      id: string;
      type: string;
      title: string;
      message: string;
      is_read: boolean;
      created_at: string;
    }[] = [];
    let total = 0;
    let unreadCount = 0;

    if (unreadOnly && type) {
      const [rows, countResult, unread] = await Promise.all([
        sql`
          SELECT id, type, title, message, message as body, is_read, created_at,
                 CASE WHEN is_read THEN created_at ELSE NULL END as read_at
          FROM notifications
          WHERE user_id = ${payload.userId} AND is_read = false AND type = ${type}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `,
        sql`
          SELECT COUNT(*) as total FROM notifications
          WHERE user_id = ${payload.userId} AND is_read = false AND type = ${type}
        `,
        getUnreadNotificationCount(payload.userId),
      ]);
      notifications = rows as typeof notifications;
      total = Number(countResult[0]?.total || 0);
      unreadCount = unread;
    } else if (unreadOnly) {
      const [rows, countResult, unread] = await Promise.all([
        sql`
          SELECT id, type, title, message, message as body, is_read, created_at,
                 CASE WHEN is_read THEN created_at ELSE NULL END as read_at
          FROM notifications
          WHERE user_id = ${payload.userId} AND is_read = false
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `,
        sql`
          SELECT COUNT(*) as total FROM notifications
          WHERE user_id = ${payload.userId} AND is_read = false
        `,
        getUnreadNotificationCount(payload.userId),
      ]);
      notifications = rows as typeof notifications;
      total = Number(countResult[0]?.total || 0);
      unreadCount = unread;
    } else if (type) {
      const [rows, countResult, unread] = await Promise.all([
        sql`
          SELECT id, type, title, message, message as body, is_read, created_at,
                 CASE WHEN is_read THEN created_at ELSE NULL END as read_at
          FROM notifications
          WHERE user_id = ${payload.userId} AND type = ${type}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `,
        sql`
          SELECT COUNT(*) as total FROM notifications
          WHERE user_id = ${payload.userId} AND type = ${type}
        `,
        getUnreadNotificationCount(payload.userId),
      ]);
      notifications = rows as typeof notifications;
      total = Number(countResult[0]?.total || 0);
      unreadCount = unread;
    } else {
      const [rows, countResult, unread] = await Promise.all([
        sql`
          SELECT id, type, title, message, message as body, is_read, created_at,
                 CASE WHEN is_read THEN created_at ELSE NULL END as read_at
          FROM notifications
          WHERE user_id = ${payload.userId}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `,
        sql`
          SELECT COUNT(*) as total FROM notifications
          WHERE user_id = ${payload.userId}
        `,
        getUnreadNotificationCount(payload.userId),
      ]);
      notifications = rows as typeof notifications;
      total = Number(countResult[0]?.total || 0);
      unreadCount = unread;
    }

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
      unread_count: unreadCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const csrfError = await validateCsrfOrReject(request);
  if (csrfError) return csrfError;

  try {
    const token = request.cookies.get('access_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized', message: 'No access token found' }, { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const action = body?.action;

    if (action === 'mark_all_read') {
      await sql`
        UPDATE notifications
        SET is_read = true
        WHERE user_id = ${payload.userId} AND is_read = false
      `;
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (action === 'mark_read') {
      const notificationId =
        typeof body?.notification_id === 'string'
          ? body.notification_id.trim()
          : String(body?.notification_id || '').trim();

      if (!notificationId) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'notification_id is required' },
          { status: 400 }
        );
      }

      const updated = await sql`
        UPDATE notifications
        SET is_read = true
        WHERE id = ${notificationId} AND user_id = ${payload.userId}
        RETURNING id, is_read
      `;

      if (updated.length === 0) {
        return NextResponse.json(
          { error: 'Not Found', message: 'Notification not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, notification: updated[0] });
    }

    return NextResponse.json(
      { error: 'Bad Request', message: 'Unsupported action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
