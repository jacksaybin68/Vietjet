import { sql } from '@/lib/neon';

// ─── Admin Analytics Queries ────────────────────────────────────────────────

export async function getRevenueStats(): Promise<{
  totalRevenue: number;
  totalBookings: number;
  avgBookingValue: number;
  completedBookings: number;
  pendingBookings: number;
}> {
  const result = await sql`
    SELECT
      COALESCE(SUM(total_price), 0) as total_revenue,
      COUNT(*) as total_bookings,
      COALESCE(AVG(total_price), 0) as avg_booking_value,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
      COUNT(*) FILTER (WHERE status = 'pending') as pending_bookings
    FROM bookings
  `;

  const r = (result as any)[0];
  return {
    totalRevenue: parseFloat(r.total_revenue),
    totalBookings: parseInt(r.total_bookings, 10),
    avgBookingValue: parseFloat(r.avg_booking_value),
    completedBookings: parseInt(r.completed_bookings, 10),
    pendingBookings: parseInt(r.pending_bookings, 10),
  };
}

export async function getBookingStatusDistribution(): Promise<
  Array<{ status: string; count: number }>
> {
  return (await sql`
    SELECT status, COUNT(*) as count
    FROM bookings
    GROUP BY status
  `) as any[];
}

export async function getRecentActivity(limit: number = 20): Promise<
  Array<{
    type: 'booking' | 'refund';
    id: string;
    created_at: string;
    status: string;
    total_price?: number;
    reason?: string;
  }>
> {
  const bookings = await sql`
    SELECT 'booking' as type, id, created_at, status, total_price, NULL as reason
    FROM bookings
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  const refunds = await sql`
    SELECT 'refund' as type, id, created_at, status, NULL as total_price, reason
    FROM refund_requests
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  const combined = [...(bookings as any[]), ...(refunds as any[])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);

  return combined;
}
