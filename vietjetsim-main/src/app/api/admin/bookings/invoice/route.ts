import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { verifyAdminRequest } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'payment:process');
    if (error) return response;

    const body = await request.json();
    const { booking_id, amount, method, status } = body;

    if (!booking_id || !amount || !method) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create payment record
    const payment = await sql`
      INSERT INTO payments (booking_id, amount, method, status, created_at)
      VALUES (${booking_id}, ${amount}, ${method}, ${status || 'completed'}, NOW())
      RETURNING *
    `;

    // If payment is completed, also update booking status
    if (status === 'completed' || !status) {
      await sql`
        UPDATE bookings 
        SET status = 'confirmed', updated_at = NOW() 
        WHERE id = ${booking_id}
      `;
    }

    return NextResponse.json({
      success: true,
      payment: payment[0],
    });
  } catch (error) {
    console.error('Error creating admin invoice:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
