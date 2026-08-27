import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { verifyAdminRequest } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'payment:view');
    if (error) return response;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const method = searchParams.get('method');

    // Use multiple queries or a more structured approach since tagged templates don't easily support dynamic building without helpers
    // For simplicity with this library, we'll branch based on filters

    let result;
    if (status && status !== 'all') {
      result = await sql`
        SELECT 
          p.id,
          p.amount,
          p.method,
          p.status,
          p.created_at as "createdAt",
          b.id as "bookingId",
          u.email as "userEmail",
          u.full_name as "userName"
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        JOIN user_profiles u ON b.user_id = u.id
        WHERE p.status = ${status}
        ORDER BY p.created_at DESC LIMIT 50
      `;
    } else {
      result = await sql`
        SELECT 
          p.id,
          p.amount,
          p.method,
          p.status,
          p.created_at as "createdAt",
          b.id as "bookingId",
          u.email as "userEmail",
          u.full_name as "userName"
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        JOIN user_profiles u ON b.user_id = u.id
        ORDER BY p.created_at DESC LIMIT 50
      `;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
