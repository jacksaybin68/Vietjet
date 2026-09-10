import { sql } from '@/lib/neon';
import type { NotificationRecord } from './types';

// ─── Notification Queries ───────────────────────────────────────────────────

export async function getNotificationsByUserId(
  userId: string,
  params?: { page?: number; limit?: number; is_read?: boolean }
): Promise<NotificationRecord[]> {
  const page = params?.page || 1;
  const limit = params?.limit || 50;
  const offset = (page - 1) * limit;

  if (params?.is_read !== undefined) {
    return (await sql`
      SELECT * FROM notifications
      WHERE user_id = ${userId} AND is_read = ${params.is_read}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `) as NotificationRecord[];
  }

  return (await sql`
    SELECT * FROM notifications
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `) as NotificationRecord[];
}

export async function createNotification(notification: {
  user_id: string;
  type: string;
  title: string;
  message: string;
}): Promise<NotificationRecord> {
  const results = await sql`
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (${notification.user_id}, ${notification.type}, ${notification.title}, ${notification.message})
    RETURNING *
  `;
  return (results as NotificationRecord[])[0];
}

export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<NotificationRecord | null> {
  const results = await sql`
    UPDATE notifications
    SET is_read = true
    WHERE id = ${notificationId} AND user_id = ${userId}
    RETURNING *
  `;
  return (results as NotificationRecord[])[0] || null;
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  await sql`
    UPDATE notifications
    SET is_read = true
    WHERE user_id = ${userId} AND is_read = false
  `;
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const result = await sql`
    SELECT COUNT(*) as count FROM notifications
    WHERE user_id = ${userId} AND is_read = false
  `;
  return parseInt((result as any)[0].count, 10);
}
