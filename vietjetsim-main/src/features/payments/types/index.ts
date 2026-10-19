import type { PaymentRecord } from '@/lib/db';

export type { PaymentRecord };

export interface CreatePaymentInput {
  booking_id: string;
  method: PaymentMethod;
  amount: number;
  discount_code_id?: string;
  discount_amount?: number;
  /** The promo code as typed, so the server can render `{discount_code}` in the memo. */
  discount_code?: string;
  /**
   * Bank-transfer confirmation. The API re-derives the expected memo from the
   * account's template and compares; these two are the customer's re-typed
   * values and carry no authority of their own.
   */
  bank_account_id?: string | number;
  transfer_note?: string;
  transfer_amount?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * A payment row from the history list. Narrowed from `PaymentRecord`: the
 * endpoint inner-joins `bookings`, so `booking_code` is always present and the
 * UI prints it as "Mã đặt chỗ" instead of a row UUID.
 */
export interface PaymentHistoryEntry extends PaymentRecord {
  booking_code: string;
}

export interface PaymentHistoryResponse {
  success: boolean;
  payments: PaymentHistoryEntry[];
  pagination: Pagination;
}

export interface CreatePaymentResponse {
  success: boolean;
  payment: PaymentRecord;
  booking_status: string;
}

export type PaymentStatus = PaymentRecord['status'];

/** Methods accepted by `POST /api/thanh-toan`, matching UI usage. */
export type PaymentMethod = 'wallet' | 'card' | 'bank' | 'vietqr' | 'e_wallet' | 'skypoint';

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
  skypoint: 'SkyPoint / Ví SkyJoy',
};
