// Payment-related constants

export const PAYMENT_API_ENDPOINTS = {
  PROCESS: '/api/payments/process',
  HISTORY: '/api/payments/history',
  VERIFY: '/api/payments/verify',
  REFUND: '/api/payments/:id/refund',
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;

export const PAYMENT_METHODS = {
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  BANK_TRANSFER: 'bank_transfer',
  E_WALLET: 'e_wallet',
  INSTALLMENT: 'installment',
} as const;

export const CURRENCIES = {
  VND: { code: 'VND', symbol: '₫' },
  USD: { code: 'USD', symbol: '$' },
  EUR: { code: 'EUR', symbol: '€' },
} as const;

export const PAYMENT_VALIDATION = {
  MIN_AMOUNT: 100000,
  MAX_AMOUNT: 999999999,
} as const;
