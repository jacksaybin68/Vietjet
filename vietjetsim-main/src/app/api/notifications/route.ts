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

    let whereClause = 'WHERE user_id = $1';
    const params: any[] = [payload.userId];
    let paramIndex = 2;

    if (unreadOnly) {
      whereClause += ` AND is_read = false`;
    }

    if (type) {
      whereClause += ` AND type = $${paramIndex++}`;
      params.push(type);
    }

    params.push(limit, offset);

    const notifications = await sql`
      SELECT id, type, title, message, is_read, created_at
      FROM notifications
      ${sql.unsafe(whereClause)}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `.params(...params);

    const unreadCount = await getUnreadNotificationCount(payload.userId);

    // Get total count
    let countWhere = whereClause;
    const countParams = params.slice(0, paramIndex - 1);
    const countResult = await sql`
      SELECT COUNT(*) as total FROM notifications
      ${sql.unsafe(countWhere)}
    `.params(...countParams);

    const total = Number(countResult[0]?.total || 0);

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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

    const body = await request.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      await sql`
        UPDATE notifications 
        SET is_read = true 
        WHERE user_id = ${payload.userId} AND is_read = false
      `;
      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
      });
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'notificationId is required' },
        { status: 400 }
      );
    }

    // Verify ownership before updating
    const result = await sql`
      UPDATE notifications 
      SET is_read = true 
      WHERE id = ${notificationId} AND user_id = ${payload.userId}
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
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
