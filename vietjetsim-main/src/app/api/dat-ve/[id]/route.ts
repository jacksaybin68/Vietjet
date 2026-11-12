import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRequest } from '@/lib/auth';
import { isAdminRole } from '@/lib/rbac';
import { getBookingByCodeOrId } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const limited = rateLimit(request, { windowMs: 60_000, maxRequests: 30 });
    if (limited) return limited;

    const { user } = await verifyAuthRequest(request);
    const { id } = await params;

    const booking = await getBookingByCodeOrId(id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const canViewFullBooking =
      !!user && (isAdminRole(user.role) || booking.user_id === user.userId);
    if (user && !canViewFullBooking) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!canViewFullBooking) {
      return NextResponse.json({
        booking: {
          ...booking,
          receipt_image: null,
          transfer_note: null,
          passengers: (booking.passengers ?? []).map((passenger) => ({
            ...passenger,
            dob: null,
            id_number: null,
            phone: null,
            email: null,
            residence: null,
            skyjoy_member_id: null,
          })),
          payment: booking.payment
            ? {
                ...booking.payment,
                receipt_image: null,
                transfer_note: null,
              }
            : null,
        },
      });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 });
  }
}
