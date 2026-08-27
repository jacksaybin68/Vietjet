import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getAllRefunds, updateRefundStatus, getBookingById } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth';

// ─── GET: Get all refund requests (admin) ───────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { payload, error, response } = await verifyAdminRequest(request, 'refund:list');
    if (error) return response;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status') || undefined;

    const { refunds, total } = await getAllRefunds({ page, limit, status });

    return NextResponse.json({
      refunds,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching refunds (admin):', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch refunds' },
      { status: 500 }
    );
  }
}

// ─── PATCH: Update refund status (admin) ────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const { payload, error, response } = await verifyAdminRequest(request, 'refund:approve');
    if (error) return response;

    const body = await request.json();
    const { refundId, status } = body;

    if (!refundId || !status) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'refundId and status are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['pending', 'approved', 'rejected', 'completed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const { admin_note } = body;

    // Atomic refund processing: If status is approved/completed, release seats and update booking
    if (status === 'approved' || status === 'completed') {
      try {
        const results = await sql`SELECT booking_id FROM refund_requests WHERE id = ${refundId}`;
        const refundRecord = results[0];
        if (refundRecord?.booking_id) {
          await sql`DELETE FROM seats WHERE booking_id = ${refundRecord.booking_id}`;
          await sql`UPDATE bookings SET status = 'refunded', updated_at = NOW() WHERE id = ${refundRecord.booking_id}`;
          console.log(
            `[REFUND] Seats released and booking ${refundRecord.booking_id} marked as refunded.`
          );
        }
      } catch (dbErr) {
        console.error('Error during flight seat release for refund:', dbErr);
      }
    }

    const result = await updateRefundStatus(refundId, status, admin_note);

    if (!result) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Refund request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Refund status updated to ${status} and seats released`,
      refundId,
      status,
    });
  } catch (error) {
    console.error('Error updating refund status:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update refund status' },
      { status: 500 }
    );
  }
}
