import { sql } from '@/lib/neon';
import type { BookingRecord, PaymentRecord } from './types';
import { spendWalletBalance } from './wallet';

// ─── Payment Queries ────────────────────────────────────────────────────────

export async function createPayment(payment: {
  booking_id: string;
  method: string;
  amount: number;
}): Promise<PaymentRecord> {
  const results = await sql`
    INSERT INTO payments (booking_id, method, status, amount)
    VALUES (${payment.booking_id}, ${payment.method}, 'completed', ${payment.amount})
    RETURNING *
  `;
  return (results as PaymentRecord[])[0];
}

/**
 * Atomically create a payment record AND confirm the booking.
 * Wraps both INSERTs in a single transaction so they succeed or fail together.
 * Without this: payment could be created but booking stays 'pending' on failure → data inconsistency.
 */
export async function createPaymentAndConfirmBooking(payment: {
  booking_id: string;
  method: string;
  amount: number;
  user_id?: string;
  discount_code_id?: string;
  discount_amount?: number;
}): Promise<{ payment: PaymentRecord; booking: BookingRecord }> {
  if (payment.method === 'wallet') {
    if (!payment.user_id) {
      throw new Error('User id is required for wallet payment');
    }
    await spendWalletBalance(
      payment.user_id,
      payment.amount,
      payment.booking_id,
      `Thanh toán vé máy bay #${payment.booking_id}`
    );
  }

  await sql.transaction([
    sql`
      INSERT INTO payments (booking_id, method, status, amount)
      VALUES (${payment.booking_id}, ${payment.method}, 'completed', ${payment.amount})
    `,
    sql`
      UPDATE bookings
      SET status = 'confirmed', 
          discount_code_id = ${payment.discount_code_id || null},
          discount_amount = ${payment.discount_amount || 0},
          updated_at = NOW()
      WHERE id = ${payment.booking_id}
    `,
    ...(payment.discount_code_id
      ? [
          sql`UPDATE discount_codes SET used_count = used_count + 1 WHERE id = ${payment.discount_code_id}`,
        ]
      : []),
  ]);

  // Re-fetch both records (transaction guarantees consistency)
  const [pay] = (await sql`
    SELECT * FROM payments WHERE booking_id = ${payment.booking_id} ORDER BY created_at DESC LIMIT 1
  `) as PaymentRecord[];

  const [booking] = (await sql`
    SELECT * FROM bookings WHERE id = ${payment.booking_id}
  `) as BookingRecord[];

  return { payment: pay, booking };
}

export async function getPaymentsByBookingId(bookingId: string): Promise<PaymentRecord[]> {
  return (await sql`
    SELECT * FROM payments WHERE booking_id = ${bookingId} ORDER BY created_at DESC
  `) as PaymentRecord[];
}

/**
 * Get payment history for a user with pagination and status filtering.
 */
export async function getPaymentHistory(
  userId: string,
  params?: { page?: number; limit?: number; status?: string[] }
): Promise<{ payments: PaymentRecord[]; total: number }> {
  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const offset = (page - 1) * limit;
  const statuses = params?.status;

  // Build query with optional status filtering
  if (statuses && statuses.length > 0) {
    const payments = (await sql`
      SELECT p.* FROM payments p
      INNER JOIN bookings b ON p.booking_id = b.id
      WHERE b.user_id = ${userId} AND p.status = ANY(${statuses})
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `) as PaymentRecord[];

    const countResult = (await sql`
      SELECT COUNT(*) as total FROM payments p
      INNER JOIN bookings b ON p.booking_id = b.id
      WHERE b.user_id = ${userId} AND p.status = ANY(${statuses})
    `) as any[];

    return {
      payments,
      total: parseInt(countResult[0]?.total || '0', 10),
    };
  }

  // No status filter - get all payments
  const payments = (await sql`
    SELECT p.* FROM payments p
    INNER JOIN bookings b ON p.booking_id = b.id
    WHERE b.user_id = ${userId}
    ORDER BY p.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `) as PaymentRecord[];

  const countResult = (await sql`
    SELECT COUNT(*) as total FROM payments p
    INNER JOIN bookings b ON p.booking_id = b.id
    WHERE b.user_id = ${userId}
  `) as any[];

  return {
    payments,
    total: parseInt(countResult[0]?.total || '0', 10),
  };
}
