/**
 * VietQR webhook verification and payload normalisation.
 *
 * There is no real bank integration in this simulator, so the "bank" side of
 * the VietQR flow is a signed webhook. Keeping the crypto and the payload
 * parsing here — rather than in the route — makes both testable without a
 * database and keeps the HTTP handler to routing/response concerns.
 *
 * Security model:
 *   - `VIETQR_WEBHOOK_SECRET` is required in production. In development/test a
 *     documented constant is used so the flow is usable out of the box; the
 *     route still rejects every request that does not carry the secret.
 *   - `x-vietqr-signature: sha256=<hex>` is accepted as an alternative to the
 *     plain shared secret, so a real gateway can sign the raw body.
 */

import { createHmac, timingSafeEqual } from 'crypto';

export const VIETQR_WEBHOOK_SECRET_ENV = 'VIETQR_WEBHOOK_SECRET';

/**
 * Only used when `NODE_ENV !== 'production'` and the operator did not set a
 * secret. It is intentionally not a secret in any meaningful sense: the point
 * is that the request must still opt in with a header, never that an open
 * endpoint exists.
 */
export const DEV_VIETQR_WEBHOOK_SECRET = 'vietqr-dev-webhook-secret';

export type EnvLike = Record<string, string | undefined>;

export function resolveVietQrWebhookSecret(env: EnvLike = process.env): string | null {
  const configured = (env[VIETQR_WEBHOOK_SECRET_ENV] ?? '').trim();
  if (configured) return configured;
  if (env.NODE_ENV !== 'production') return DEV_VIETQR_WEBHOOK_SECRET;
  return null;
}

export type WebhookAuthResult =
  | { ok: true; mode: 'secret' | 'signature' }
  | { ok: false; status: 401 | 503; message: string };

function timingSafeEqualText(expected: string, received: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function readHeader(headers: Headers, name: string): string {
  return (headers.get(name) ?? '').trim();
}

/**
 * Accept either the shared secret (three header spellings, all common in
 * gateway docs) or an HMAC-SHA256 signature of the raw request body. The raw
 * body must be passed as text — re-serialising JSON would change the bytes and
 * invalidate every signature.
 */
export function verifyVietQrWebhookAuth(
  headers: Headers,
  rawBody: string,
  env: EnvLike = process.env
): WebhookAuthResult {
  const secret = resolveVietQrWebhookSecret(env);
  if (!secret) {
    return {
      ok: false,
      status: 503,
      message: `Webhook chưa được cấu hình (${VIETQR_WEBHOOK_SECRET_ENV})`,
    };
  }

  const signature = readHeader(headers, 'x-vietqr-signature');
  if (signature) {
    const hex = signature.replace(/^sha256=/i, '').trim().toLowerCase();
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    if (timingSafeEqualText(expected, hex)) return { ok: true, mode: 'signature' };
  }

  const provided =
    readHeader(headers, 'x-vietqr-webhook-secret') ||
    readHeader(headers, 'x-webhook-secret') ||
    (readHeader(headers, 'authorization').replace(/^Bearer\s+/i, '') ?? '');

  if (provided && timingSafeEqualText(secret, provided)) return { ok: true, mode: 'secret' };

  return { ok: false, status: 401, message: 'Webhook secret không hợp lệ' };
}

export interface VietQrWebhookPayload {
  bookingId?: string;
  bookingCode?: string;
  amount?: number;
  transferNote?: string;
  transactionId?: string;
}

export type PayloadParseResult =
  | { ok: true; payload: VietQrWebhookPayload }
  | { ok: false; message: string };

function firstString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function parseAmount(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const numeric =
    typeof value === 'number' ? value : Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : undefined;
}

/**
 * Accept the names a bank/gateway actually uses (`booking_code`, `pnr`,
 * `content`, `transaction_id`, …) rather than forcing the simulator's own
 * vocabulary onto a real integration.
 */
export function parseVietQrWebhookPayload(raw: unknown): PayloadParseResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, message: 'Body phải là một JSON object' };
  }
  const record = raw as Record<string, unknown>;

  const bookingId = firstString(record, ['bookingId', 'booking_id', 'id']);
  const bookingCode = firstString(record, ['bookingCode', 'booking_code', 'pnr', 'code']);
  if (!bookingId && !bookingCode) {
    return {
      ok: false,
      message: 'Cần bookingCode (hoặc bookingId) để xác nhận thanh toán',
    };
  }

  const amountRaw = record.amount ?? record.transferAmount ?? record.transfer_amount;
  const amount = parseAmount(amountRaw);
  if (amountRaw !== undefined && amountRaw !== null && amountRaw !== '' && amount === undefined) {
    return { ok: false, message: 'amount không hợp lệ' };
  }

  if (bookingCode && bookingCode.length > 64) {
    return { ok: false, message: 'bookingCode quá dài' };
  }

  return {
    ok: true,
    payload: {
      bookingId,
      bookingCode,
      amount,
      transferNote: firstString(record, [
        'transferNote',
        'transfer_note',
        'content',
        'addInfo',
        'add_info',
      ]),
      transactionId: firstString(record, [
        'transactionId',
        'transaction_id',
        'reference',
        'referenceId',
      ]),
    },
  };
}
