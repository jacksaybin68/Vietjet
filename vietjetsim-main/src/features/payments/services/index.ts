import { apiRequest } from '@/shared/services';
import { API_ENDPOINTS } from '@/shared/constants';
import type {
  CreatePaymentInput,
  CreatePaymentResponse,
  PaymentHistoryResponse,
  PaymentStatus,
} from '../types';

export interface ListPaymentsQuery {
  page?: number;
  limit?: number;
  status?: PaymentStatus[];
}

/** Paginated payment history for the signed-in user. */
export async function listPayments(query: ListPaymentsQuery = {}): Promise<PaymentHistoryResponse> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.status?.length) params.set('status', query.status.join(','));

  const suffix = params.toString();
  return apiRequest<PaymentHistoryResponse>(
    `${API_ENDPOINTS.PAYMENTS.HISTORY}${suffix ? `?${suffix}` : ''}`
  );
}

/** Create a payment and confirm the associated booking in one transaction. */
export async function createPayment(input: CreatePaymentInput): Promise<CreatePaymentResponse> {
  return apiRequest<CreatePaymentResponse>(API_ENDPOINTS.PAYMENTS.CREATE, {
    method: 'POST',
    body: input,
  });
}

export * from './wallet';
