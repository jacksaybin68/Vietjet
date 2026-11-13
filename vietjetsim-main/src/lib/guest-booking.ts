/**
 * Guest booking ownership.
 *
 * A guest (anonymous) booking is created by `POST /api/dat-ve` and paid at
 * `POST /api/thanh-toan`. Before this module existed, *anyone* who knew a
 * booking id could pay it — the ownership check was
 *
 *   if (user && booking.user_id !== user.userId) → 403
 *
 * which is skipped entirely when `user` is null, so an unauthenticated caller
 * could settle somebody else's reservation and flip it to `confirmed`.
 *
 * The guest is not signed in, so there is no account to check against. Instead
 * the server hands the browser a cookie listing the bookings it created. Only
 * a browser that actually made the booking can settle it; a stranger who
 * guesses a UUID cannot.
 *
 * The cookie is a convenience, not the credential: a guest who lost the cookie
 * (different device, cleared storage) can still reach their booking through
 * the PNR lookup on `/chuyen-bay-cua-toi`, which requires the booking code —
 * a 6-character alphanumeric code with 36^6 possibilities, checked against the
 * passenger's name by `/api/checkin`.
 */
import { type NextRequest, NextResponse } from 'next/server';

export const GUEST_BOOKING_COOKIE = 'vj_guest_bookings';

const MAX_TRACKED_BOOKINGS = 20;

/** Bookings this browser created, oldest first. */
export function getGuestBookingIds(request: NextRequest): string[] {
  const raw = request.cookies.get(GUEST_BOOKING_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string').slice(-MAX_TRACKED_BOOKINGS);
  } catch {
    return [];
  }
}

/** Does this browser own the booking? */
export function isGuestBookingOwner(request: NextRequest, bookingId: string): boolean {
  return getGuestBookingIds(request).includes(bookingId);
}

/**
 * Record a booking as owned by this browser.
 *
 * The cookie is `httpOnly` and `sameSite=lax`, so it rides the same-site
 * navigation from the booking page to the payment page but is not readable
 * from cross-site scripts.
 */
export function setGuestBookingCookie(
  response: NextResponse,
  request: NextRequest,
  bookingId: string
): void {
  const existing = getGuestBookingIds(request).filter((id) => id !== bookingId);
  const next = [...existing, bookingId].slice(-MAX_TRACKED_BOOKINGS);
  response.cookies.set(GUEST_BOOKING_COOKIE, JSON.stringify(next), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}
