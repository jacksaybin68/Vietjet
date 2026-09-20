import { NextRequest, NextResponse } from 'next/server';
import { createPaymentAndConfirmBooking, getBookingById } from '@/lib/db';
import { verifyAuthRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // Validate CSRF token
  try {
    const { user, error, response } = await verifyAuthRequest(request);
    if (error || !user) return response!;

    const payload = user;

    const body = await request.json();
    const { booking_id, method, amount, discount_code_id, discount_amount } = body;

    // Validation
    if (!booking_id || !method || amount === undefined) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          message: 'booking_id, method, and amount are required',
        },
        { status: 400 }
      );
    }

    if (amount < 0) {
      return NextResponse.json(
        { error: 'Invalid amount', message: 'Amount cannot be negative' },
        { status: 400 }
      );
    }

    // Verify booking exists and belongs to current user
    const booking = await getBookingById(booking_id);
    if (!booking || booking.user_id !== payload.userId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Booking not found or does not belong to you' },
        { status: 403 }
      );
    }

    // Create payment + confirm booking atomically (single transaction)
    const result = await createPaymentAndConfirmBooking({
      booking_id,
      method,
      amount,
      user_id: payload.userId,
      discount_code_id,
      discount_amount: discount_amount || 0,
    });

    return NextResponse.json(
      {
        success: true,
        payment: {
          id: result.payment.id,
          booking_id: result.payment.booking_id,
          method: result.payment.method,
          status: result.payment.status,
          amount: result.payment.amount,
          created_at: result.payment.created_at,
        },
        booking_status: result.booking.status,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create payment' },
      { status: 500 }
    );
  }
}
