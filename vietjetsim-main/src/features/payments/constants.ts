// Payment-related constants
import { API_ENDPOINTS } from '@/shared/constants';
import type { PaymentMethod, PaymentStatus } from './types';

export const PAYMENT_API_ENDPOINTS = API_ENDPOINTS.PAYMENTS;

/** Matches the `payments.status` CHECK constraint. */
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const satisfies Record<string, PaymentStatus>;

/** Methods the payment API and wallet UI accept. */
export const PAYMENT_METHODS = {
  WALLET: 'wallet',
  CARD: 'card',
  BANK: 'bank',
  VIETQR: 'vietqr',
  E_WALLET: 'e_wallet',
} as const satisfies Record<string, PaymentMethod>;

export const CURRENCIES = {
  VND: { code: 'VND', symbol: '₫' },
  USD: { code: 'USD', symbol: '$' },
  EUR: { code: 'EUR', symbol: '€' },
} as const;

export const PAYMENT_PAGE_SIZE = 10;

export const PAYMENT_VALIDATION = {
  MIN_AMOUNT: 100000,
  MAX_AMOUNT: 999999999,
} as const;
