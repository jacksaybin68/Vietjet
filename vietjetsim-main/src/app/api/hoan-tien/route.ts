import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { getRefundsByUserId, createRefund, getBookingById } from '@/lib/db';
import { validateCsrfOrReject } from '@/lib/csrf';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('access_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(searchParams.get('limit') || '20', 10) || 20)
    );

    const refunds = await getRefundsByUserId(payload.userId, { page, limit });

    return NextResponse.json({ refunds, page, limit });
  } catch (error) {
    console.error('Error fetching refunds:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const csrfError = await validateCsrfOrReject(request);
  if (csrfError) return csrfError;

  try {
    const token = request.cookies.get('access_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const body = await request.json();
    const {
      booking_id,
      reason,
      bank_info,
      bank_name,
      account_number,
      account_holder,
      note,
      flight_no,
      route,
      flight_date,
      amount,
    } = body;
    const normalizedBookingId =
      typeof booking_id === 'string' ? booking_id.trim() : String(booking_id || '').trim();
    const normalizedReason = typeof reason === 'string' ? reason.trim() : '';

    if (!normalizedBookingId || !normalizedReason) {
      return NextResponse.json({ error: 'Booking ID and reason are required' }, { status: 400 });
    }

    // Verify booking belongs to current user
    const booking = await getBookingById(normalizedBookingId);
    if (!booking || booking.user_id !== payload.userId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Booking not found or does not belong to you' },
        { status: 403 }
      );
    }

    const normalizedBankInfo =
      bank_info && typeof bank_info === 'object'
        ? bank_info
        : {
            bank_name: typeof bank_name === 'string' ? bank_name.trim() : '',
            account_number: typeof account_number === 'string' ? account_number.trim() : '',
            account_holder: typeof account_holder === 'string' ? account_holder.trim() : '',
            note: typeof note === 'string' ? note.trim() : '',
            flight_no: typeof flight_no === 'string' ? flight_no.trim() : '',
            route: typeof route === 'string' ? route.trim() : '',
            flight_date: typeof flight_date === 'string' ? flight_date.trim() : '',
            amount: Number.isFinite(Number(amount)) ? Number(amount) : 0,
          };

    const refund = await createRefund({
      booking_id: normalizedBookingId,
      user_id: payload.userId,
      reason: normalizedReason,
      bank_info: normalizedBankInfo,
    });

    return NextResponse.json({ success: true, refund }, { status: 201 });
  } catch (error) {
    console.error('Error creating refund:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
