import { apiRequest } from '@/shared/services';
import { API_ENDPOINTS } from '@/shared/constants';
import type {
  BookingDetailResponse,
  BookingListResponse,
  BookingStatus,
  CreateBookingInput,
  CreateBookingResponse,
} from '../types';

export interface ListBookingsQuery {
  page?: number;
  limit?: number;
  /** One or more statuses to filter on; the API accepts a comma-separated list. */
  status?: BookingStatus[];
}

/** List the signed-in user's bookings, paginated. */
export async function listBookings(query: ListBookingsQuery = {}): Promise<BookingListResponse> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.status?.length) params.set('status', query.status.join(','));

  const suffix = params.toString();
  return apiRequest<BookingListResponse>(
    `${API_ENDPOINTS.BOOKINGS.LIST}${suffix ? `?${suffix}` : ''}`
  );
}

/** Create a booking. Works for guests too, but authenticated users get ownership. */
export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResponse> {
  return apiRequest<CreateBookingResponse>(API_ENDPOINTS.BOOKINGS.CREATE, {
    method: 'POST',
    body: input,
  });
}

/** Fetch one booking. Only the owner (or an admin) may read it. */
export async function getBooking(id: string): Promise<BookingDetailResponse> {
  return apiRequest<BookingDetailResponse>(API_ENDPOINTS.BOOKINGS.DETAIL.replace(':id', id));
}
