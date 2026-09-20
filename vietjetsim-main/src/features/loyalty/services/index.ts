import { apiRequest } from '@/shared/services';
import { API_ENDPOINTS } from '@/shared/constants';
import type {
  LoyaltyTransactionsResponse,
  MembershipResponse,
  RedeemPointsInput,
  RedeemPointsResponse,
} from '../types';

/** Current membership plus the program's tier ladder. */
export async function getMembership(): Promise<MembershipResponse> {
  return apiRequest<MembershipResponse>(API_ENDPOINTS.LOYALTY.MEMBERSHIP);
}

/** Loyalty point transactions, newest first. */
export async function listLoyaltyTransactions(
  query: { page?: number; limit?: number } = {}
): Promise<LoyaltyTransactionsResponse> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));

  const suffix = params.toString();
  return apiRequest<LoyaltyTransactionsResponse>(
    `${API_ENDPOINTS.LOYALTY.TRANSACTIONS}${suffix ? `?${suffix}` : ''}`
  );
}

/** Redeem points for a reward. */
export async function redeemPoints(input: RedeemPointsInput): Promise<RedeemPointsResponse> {
  return apiRequest<RedeemPointsResponse>(API_ENDPOINTS.LOYALTY.REDEEM, {
    method: 'POST',
    body: input,
  });
}
