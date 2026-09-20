import type { PaymentRecord } from '@/lib/db/types';

export type { PaymentRecord };

export interface CreatePaymentInput {
  booking_id: string;
  method: PaymentMethod;
  amount: number;
  discount_code_id?: string;
  discount_amount?: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaymentHistoryResponse {
  success: boolean;
  payments: PaymentRecord[];
  pagination: Pagination;
}

export interface CreatePaymentResponse {
  success: boolean;
  payment: PaymentRecord;
  booking_status: string;
}

export type PaymentStatus = PaymentRecord['status'];

/** Methods accepted by `POST /api/thanh-toan`, matching UI usage. */
export type PaymentMethod = 'wallet' | 'card' | 'bank' | 'vietqr' | 'e_wallet';

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Đang xử lý',
  completed: 'Thành công',
  failed: 'Thất bại',
  refunded: 'Đã hoàn tiền',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  credit_card: 'Thẻ tín dụng',
  bank_transfer: 'Chuyển khoản',
  e_wallet: 'Ví điện tử',
  vietqr: 'VietQR',
  wallet: 'Ví Vietjet Air',
  card: 'Thẻ',
  bank: 'Tài khoản ngân hàng',
};
