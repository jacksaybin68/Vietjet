import { sql } from '@/lib/neon';

// ─── Refresh Token Store (for rotation / revocation) ───────────────────────

export async function storeRefreshToken(
  userId: string,
  tokenHash: string,
  familyId: string
): Promise<void> {
  await sql`
    INSERT INTO refresh_tokens (user_id, token_hash, family_id)
    VALUES (${userId}, ${tokenHash}, ${familyId})
  `;
}

export async function getStoredRefreshToken(
  tokenHash: string
): Promise<{ id: string; user_id: string; family_id: string; revoked: boolean } | null> {
  const rows = await sql`
    SELECT id, user_id, family_id, revoked
    FROM refresh_tokens
    WHERE token_hash = ${tokenHash}
  `;
  return (rows as any)[0] || null;
}

/**
 * Rotate a refresh token:
 *  1. Mark the old token as used (but keep its family_id alive)
 *  2. Insert the new token hash under the same family
 * Returns true if rotation succeeded, false if the old token was already revoked (reuse detected).
 */
export async function rotateRefreshToken(
  oldTokenHash: string,
  newTokenHash: string,
  userId: string,
  familyId: string
): Promise<{ success: boolean; reuseDetected: boolean }> {
  // Check current state of the old token
  const existing = await getStoredRefreshToken(oldTokenHash);

  if (!existing) {
    // Token not found — reject entirely (possible forgery)
    return { success: false, reuseDetected: false };
  }

  if (existing.revoked) {
    // This token was already used → possible theft! Revoke entire family.
    await revokeRefreshTokenFamily(userId, familyId);
    return { success: false, reuseDetected: true };
  }

  // Mark old token as used
  await sql`
    UPDATE refresh_tokens SET revoked = true, used_at = NOW()
    WHERE token_hash = ${oldTokenHash}
  `;

  // Insert new token in same family
  await storeRefreshToken(userId, newTokenHash, familyId);
  return { success: true, reuseDetected: false };
}

/** Revoke every token in a family (called when reuse is detected). */
export async function revokeRefreshTokenFamily(userId: string, familyId: string): Promise<void> {
  await sql`
    UPDATE refresh_tokens SET revoked = true
    WHERE user_id = ${userId} AND family_id = ${familyId} AND revoked = false
  `;
}

/** Revoke ALL refresh tokens for a user (used on logout / password change). */
export async function invalidateUserRefreshTokens(userId: string): Promise<void> {
  await sql`
    UPDATE refresh_tokens SET revoked = true
    WHERE user_id = ${userId} AND revoked = false
  `;
}
