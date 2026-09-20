import type { SavedPaymentMethodRecord, WalletRecord, WalletTransactionRecord } from '@/lib/db';

export type { SavedPaymentMethodRecord, WalletRecord, WalletTransactionRecord };

export interface WalletOverviewResponse {
  success: boolean;
  wallet: WalletRecord;
  linkedBankAccounts: SavedPaymentMethodRecord[];
  transactions: WalletTransactionRecord[];
}

export type WalletAction = 'topup' | 'withdraw';

export interface WalletMutationInput {
  action: WalletAction;
  amount: number;
  /** Required for both actions: the funding source, or the bank to withdraw to. */
  paymentMethodId: string;
  description?: string;
}

export interface WalletMutationResponse {
  success: boolean;
  wallet: WalletRecord;
  transaction: WalletTransactionRecord;
}

export interface PaymentMethodsResponse {
  methods: SavedPaymentMethodRecord[];
}

export interface AddPaymentMethodResponse {
  success: boolean;
  method: SavedPaymentMethodRecord;
  paymentMethod: SavedPaymentMethodRecord;
}
