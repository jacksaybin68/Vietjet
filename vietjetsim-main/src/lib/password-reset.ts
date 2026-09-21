/**
 * Password reset backed by the `account_recovery` table (migration 004).
 *
 * The plaintext token is returned to the caller once and never persisted: only
 * its SHA-256 digest is stored, matching how refresh tokens and backup codes
 * are handled. Consumption is a conditional UPDATE so a token cannot be spent
 * twice even under concurrent requests.
 */

import { randomBytes } from 'crypto';
import { sql } from '@/lib/neon';
import { hashToken } from '@/lib/auth';

/** How long a reset link stays valid. */
export const RESET_TOKEN_TTL_MINUTES = 30;

const TOKEN_BYTES = 32;

export interface RecoveryRequest {
  id: string;
  user_id: string;
  email: string | null;
}

/**
 * Issue a reset token for a user. Any earlier unused tokens are invalidated so
 * only the newest link works.
 *
 * @returns the plaintext token (to embed in the reset link) and its expiry.
 */
export async function createPasswordResetToken(
  userId: string,
  email: string | null
): Promise<{ token: string; expiresAt: Date }> {
  await invalidateUserResetTokens(userId);

  const token = randomBytes(TOKEN_BYTES).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await sql`
    INSERT INTO account_recovery (user_id, email, token, token_expires_at)
    VALUES (${userId}, ${email}, ${tokenHash}, ${expiresAt.toISOString()})
  `;

  return { token, expiresAt };
}

/** Resolve a plaintext token to its still-valid request, or null. */
export async function getValidResetRequest(token: string): Promise<RecoveryRequest | null> {
  if (!token) return null;

  const rows = await sql`
    SELECT id, user_id, email
    FROM account_recovery
    WHERE token = ${hashToken(token)}
      AND used = false
      AND token_expires_at > NOW()
  `;

  return (rows as RecoveryRequest[])[0] ?? null;
}

/** Mark every outstanding token for the user as spent. */
export async function invalidateUserResetTokens(userId: string): Promise<void> {
  await sql`
    UPDATE account_recovery
    SET used = true, used_at = NOW()
    WHERE user_id = ${userId} AND used = false
  `;
}

/**
 * Spend a token. The `used = false` guard makes this idempotent-safe: a second
 * concurrent request sees zero rows and reports failure.
 */
export async function consumeResetToken(token: string): Promise<boolean> {
  const rows = await sql`
    UPDATE account_recovery
    SET used = true, used_at = NOW()
    WHERE token = ${hashToken(token)}
      AND used = false
      AND token_expires_at > NOW()
    RETURNING id
  `;
  return (rows as unknown[]).length > 0;
}
