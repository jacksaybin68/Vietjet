/**
 * Who may read or settle a booking.
 *
 * Three routes used to answer this question independently and disagreed:
 * `POST /api/thanh-toan` and `GET /api/dat-ve/[id]` accept a guest cookie or
 * the PNR, while `GET /api/thanh-toan/vietqr` and `GET /api/thanh-toan/trang-thai`
 * only checked ownership when a session existed — so anyone holding a booking
 * UUID could read another customer's bank details and payment state without
 * logging in. Keeping the rule in one function is what stops the next route
 * from re-deriving it wrongly.
 *
 * The rules, in order:
 *
 * 1. A browser that created the booking (cookie `vj_guest_bookings`) owns it,
 *    even if the visitor has since signed in — the booking was made before an
 *    account existed.
 * 2. Signed out, presenting the PNR as the lookup key is proof enough. The
 *    PNR is the reference printed on the ticket and quoted to support.
 * 3. Signed in, the booking must belong to that account; admins may act on any.
 * 4. A booking with no `user_id` is legacy/anonymous and readable by any
 *    signed-in caller (it was never tied to an account).
 */
import type { NextRequest } from 'next/server';
import { isAdminRole } from './rbac';
import { isGuestBookingOwner } from './guest-booking';

export interface BookingAccessTarget {
  id: string;
  user_id?: string | null;
  booking_code?: string | null;
}

export interface BookingAccessUser {
  userId: string;
  role: string;
}

/**
 * @param lookup the value the caller used to address the booking (UUID or PNR),
 *               compared case-insensitively against `booking_code`.
 */
export function canAccessBooking(
  request: NextRequest,
  booking: BookingAccessTarget,
  user: BookingAccessUser | null,
  lookup: string
): boolean {
  if (isGuestBookingOwner(request, booking.id)) return true;

  const pnrMatches = Boolean(
    booking.booking_code && booking.booking_code.toUpperCase() === lookup.toUpperCase()
  );

  if (!user) return pnrMatches;
  if (!booking.user_id) return true;
  if (booking.user_id === user.userId) return true;
  return isAdminRole(user.role);
}
