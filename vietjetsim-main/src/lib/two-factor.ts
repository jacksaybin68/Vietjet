/**
 * Two-factor authentication helpers (TOTP + single-use backup codes).
 *
 * Secrets live in `user_2fa.secret`; backup codes are stored as SHA-256
 * digests in `user_2fa.backup_codes` so a database leak does not hand out
 * second factors. Plain codes are shown to the user exactly once, at setup.
 */

import { createHash, randomInt } from 'crypto';
import { generateSecret, generateURI, verifySync } from 'otplib';

export const BACKUP_CODE_COUNT = 10;
export const TOTP_ISSUER = 'VietjetSim';

/** Drift tolerated per side of the current 30s step (clock-skewed phones). */
const EPOCH_TOLERANCE_SECONDS = 30;

export function createTotpSecret(): string {
  return generateSecret();
}

export function buildOtpAuthUri(secret: string, accountLabel: string): string {
  return generateURI({ issuer: TOTP_ISSUER, label: accountLabel, secret });
}

/** True when `token` is a 6-digit code matching `secret` right now. */
export function verifyTotpToken(secret: string, token: string): boolean {
  if (!/^\d{6}$/.test(token)) return false;
  try {
    return verifySync({ secret, token, epochTolerance: EPOCH_TOLERANCE_SECONDS }).valid;
  } catch {
    return false;
  }
}

export function hashBackupCode(code: string): string {
  return createHash('sha256').update(normalizeBackupCode(code)).digest('hex');
}

/** Users often retype the code with the display hyphen or in lower case. */
export function normalizeBackupCode(code: string): string {
  return code.trim().toLowerCase().replace(/[\s-]/g, '');
}

export function createBackupCodes(): { plain: string[]; hashed: string[] } {
  const plain = Array.from({ length: BACKUP_CODE_COUNT }, generateBackupCode);
  return { plain, hashed: plain.map(hashBackupCode) };
}

/** `xxxx-xxxx`, drawn from a 32-char alphabet free of ambiguous glyphs. */
function generateBackupCode(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const pick = () => alphabet[randomInt(alphabet.length)];
  const block = () => Array.from({ length: 4 }, pick).join('');
  return `${block()}-${block()}`;
}
