import { apiRequest } from '@/shared/services';
import { API_ENDPOINTS } from '@/shared/constants';
import type {
  AddPaymentMethodResponse,
  PaymentMethodsResponse,
  SavedPaymentMethodRecord,
  WalletMutationInput,
  WalletMutationResponse,
  WalletOverviewResponse,
} from '../types/wallet';

/** Wallet balance, linked bank accounts and recent transactions. */
export async function getWalletOverview(): Promise<WalletOverviewResponse> {
  return apiRequest<WalletOverviewResponse>(API_ENDPOINTS.WALLET.ROOT);
}

/** Top up from a saved payment method, or withdraw to a linked bank account. */
export async function mutateWallet(input: WalletMutationInput): Promise<WalletMutationResponse> {
  return apiRequest<WalletMutationResponse>(API_ENDPOINTS.WALLET.ROOT, {
    method: 'POST',
    body: input,
  });
}

export async function listPaymentMethods(): Promise<SavedPaymentMethodRecord[]> {
  const { methods } = await apiRequest<PaymentMethodsResponse>(
    API_ENDPOINTS.WALLET.PAYMENT_METHODS
  );
  return methods;
}

export async function addPaymentMethod(
  method: Record<string, unknown>
): Promise<SavedPaymentMethodRecord> {
  const response = await apiRequest<AddPaymentMethodResponse>(
    API_ENDPOINTS.WALLET.PAYMENT_METHODS,
    { method: 'POST', body: method }
  );
  return response.paymentMethod;
}

export async function deletePaymentMethod(id: string): Promise<void> {
  await apiRequest<{ success: boolean }>(API_ENDPOINTS.WALLET.PAYMENT_METHOD.replace(':id', id), {
    method: 'DELETE',
  });
}

export async function setDefaultPaymentMethod(id: string): Promise<void> {
  await apiRequest<{ success: boolean }>(API_ENDPOINTS.WALLET.PAYMENT_METHOD.replace(':id', id), {
    method: 'PUT',
    body: { action: 'set_default' },
  });
}
