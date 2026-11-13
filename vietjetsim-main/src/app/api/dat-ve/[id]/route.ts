import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRequest } from '@/lib/auth';
import { isAdminRole } from '@/lib/rbac';
import { getBookingByCodeOrId } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { isGuestBookingOwner } from '@/lib/guest-booking';

function maskEmail(email: string | null | undefined): string | null {
  if (!email || !email.includes('@')) return null;
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}${'*'.repeat(Math.max(4, local.length - 2))}${local.slice(-1)}@${domain}`;
}

/**
 * Reduce a full name to its initials: "Nguyễn Văn Anh" → "N.V.A".
 *
 * The customer still recognises their own reservation, but a caller who
 * guessed a PNR learns no more than the initial of every passenger.
 */
function maskName(name: string | null | undefined): string | null {
  if (!name) return null;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  return parts.map((part) => `${part.charAt(0).toUpperCase()}.`).join('');
}

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

    // Anonymous access has to be earned.
    //
    // This endpoint resolves a booking by PNR *or* by internal UUID, and the
    // PNR is only six alphanumeric characters. Without a rule, anyone could
    // walk the (small) PNR space and read passenger names, routes and fares
    // off a stranger's reservation.
    //
    // Two things still open the door legitimately:
    //   * the browser that created the booking (guest cookie), and
    //   * a lookup by PNR — the customer types the code printed on the ticket
    //     together with the passenger name on `/chuyen-bay-cua-toi`.
    //
    // A raw UUID id is never enough on its own: UUIDs leak (logs, referrers,
    // support screenshots) and carry no secret the customer knows.
    const lookedUpByPnr = booking.booking_code?.toUpperCase() === id.toUpperCase();
    if (!user && !lookedUpByPnr && !isGuestBookingOwner(request, booking.id)) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Vui lòng đăng nhập hoặc dùng mã đặt chỗ để tra cứu.',
        },
        { status: 403 }
      );
    }

    const firstPassengerEmail =
      booking.passengers && booking.passengers[0]?.email ? booking.passengers[0].email : null;
    const contactEmailMasked = maskEmail(firstPassengerEmail);
    const primaryContactName = (booking.passengers && booking.passengers[0]?.name) || null;

    if (!canViewFullBooking) {
      return NextResponse.json({
        booking: {
          ...booking,
          contact_name: primaryContactName,
          contact_email_masked: contactEmailMasked,
          receipt_image: null,
          transfer_note: null,
          passengers: (booking.passengers ?? []).map((passenger) => ({
            ...passenger,
            // The passenger's own name is PII too. A PNR lookup proves the
            // caller holds the booking reference, not that they are the
            // traveller, so the name is reduced to initials — enough for the
            // customer to recognise their own reservation without handing a
            // stranger the full name of every person on the flight.
            name: maskName(passenger.name),
            gender: null,
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

    return NextResponse.json({
      booking: {
        ...booking,
        contact_name: primaryContactName,
        contact_email_masked: contactEmailMasked,
      },
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 });
  }
}
