import { sql } from '@/lib/neon';

// ─── Security: 2FA, sessions, login history ─────────────────────────────────

export interface User2FARecord {
  user_id: string;
  secret: string;
  is_enabled: boolean;
  backup_codes: string[] | null;
  backup_codes_used: number;
  last_verified: string | null;
}

export interface UserSessionRecord {
  id: string;
  device_name: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  ip_address: string | null;
  last_active: string;
  is_current: boolean;
  created_at: string;
}

export interface LoginHistoryRecord {
  id: string;
  ip_address: string | null;
  device_type: string | null;
  location: string | null;
  success: boolean;
  failure_reason: string | null;
  created_at: string;
}

/**
 * Pending enrollment for a user: a row exists but is not yet enabled.
 * Callers must gate behaviour on `is_enabled`, never on row presence.
 */
export async function get2FAConfig(userId: string): Promise<User2FARecord | null> {
  const rows = await sql`
    SELECT user_id, secret, is_enabled, backup_codes, backup_codes_used, last_verified
    FROM user_2fa
    WHERE user_id = ${userId}
  `;
  return (rows as User2FARecord[])[0] ?? null;
}

/**
 * Store a fresh secret, replacing any prior enrollment. Backup codes are
 * invalidated along with the old secret, so a user who re-enrolls must save
 * the new set.
 */
export async function upsert2FASecret(
  userId: string,
  secret: string,
  hashedBackupCodes: string[]
): Promise<void> {
  await sql`
    INSERT INTO user_2fa (user_id, secret, is_enabled, backup_codes, backup_codes_used)
    VALUES (${userId}, ${secret}, false, ${hashedBackupCodes}, 0)
    ON CONFLICT (user_id) DO UPDATE SET
      secret = EXCLUDED.secret,
      is_enabled = false,
      backup_codes = EXCLUDED.backup_codes,
      backup_codes_used = 0,
      updated_at = NOW()
  `;
}

/** Promote a pending enrollment to active after the first valid token. */
export async function enable2FA(userId: string): Promise<void> {
  await sql`
    UPDATE user_2fa
    SET is_enabled = true, last_verified = NOW(), updated_at = NOW()
    WHERE user_id = ${userId}
  `;
}

export async function disable2FA(userId: string): Promise<void> {
  await sql`DELETE FROM user_2fa WHERE user_id = ${userId}`;
}

/**
 * Consume a backup code. The update is conditional on the code still being
 * present, so two concurrent logins cannot both spend the same code.
 */
export async function consumeBackupCodeHash(userId: string, codeHash: string): Promise<boolean> {
  const rows = await sql`
    UPDATE user_2fa
    SET backup_codes = array_remove(backup_codes, ${codeHash}),
        backup_codes_used = backup_codes_used + 1,
        last_verified = NOW(),
        updated_at = NOW()
    WHERE user_id = ${userId}
      AND is_enabled = true
      AND ${codeHash} = ANY(backup_codes)
    RETURNING user_id
  `;
  return (rows as unknown[]).length > 0;
}

export async function mark2FAVerified(userId: string): Promise<void> {
  await sql`
    UPDATE user_2fa SET last_verified = NOW(), updated_at = NOW()
    WHERE user_id = ${userId}
  `;
}

// ─── User sessions ──────────────────────────────────────────────────────────

/**
 * Device metadata parsed once per request. Shared by session and login-history
 * writes so a device is described identically in both tables.
 */
export interface DeviceInfo {
  device_name?: string | null;
  device_type?: string | null;
  browser?: string | null;
  os?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  location?: string | null;
}

/**
 * Sessions carry no `is_current` flag: which session is "current" depends on
 * who is asking, so the API derives it per request from the `session_id`
 * cookie instead of storing a value that every concurrent device would fight
 * over.
 */
export async function createUserSession(
  userId: string,
  data: DeviceInfo
): Promise<UserSessionRecord> {
  const rows = await sql`
    INSERT INTO user_sessions (
      user_id, device_name, device_type, browser, os, ip_address, user_agent
    )
    VALUES (
      ${userId}, ${data.device_name ?? null}, ${data.device_type ?? null},
      ${data.browser ?? null}, ${data.os ?? null}, ${data.ip_address ?? null},
      ${data.user_agent ?? null}
    )
    RETURNING id, device_name, device_type, browser, os, ip_address, last_active,
              created_at
  `;
  return (rows as UserSessionRecord[])[0];
}

export async function getUserSessions(userId: string): Promise<UserSessionRecord[]> {
  const rows = await sql`
    SELECT id, device_name, device_type, browser, os, ip_address, last_active,
           created_at
    FROM user_sessions
    WHERE user_id = ${userId} AND expires_at > NOW()
    ORDER BY last_active DESC
  `;
  return rows as UserSessionRecord[];
}

/** Scoped by user_id so a session id from another account is a no-op. */
export async function deleteUserSession(userId: string, sessionId: string): Promise<void> {
  await sql`
    DELETE FROM user_sessions
    WHERE id = ${sessionId} AND user_id = ${userId}
  `;
}

/** Keeps the session list ordered by real activity rather than login time. */
export async function touchUserSession(userId: string, sessionId: string): Promise<void> {
  await sql`
    UPDATE user_sessions
    SET last_active = NOW()
    WHERE id = ${sessionId} AND user_id = ${userId}
  `;
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  await sql`DELETE FROM user_sessions WHERE user_id = ${userId}`;
}

// ─── Login history ──────────────────────────────────────────────────────────

export async function recordLoginAttempt(
  userId: string,
  data: DeviceInfo & { success: boolean; failureReason?: string | null }
): Promise<void> {
  await sql`
    INSERT INTO login_history (
      user_id, ip_address, user_agent, device_type, location, success, failure_reason
    )
    VALUES (
      ${userId}, ${data.ip_address ?? null}, ${data.user_agent ?? null},
      ${data.device_type ?? null}, ${data.location ?? null}, ${data.success},
      ${data.failureReason ?? null}
    )
  `;
}

export async function getLoginHistory(userId: string, limit = 20): Promise<LoginHistoryRecord[]> {
  const rows = await sql`
    SELECT id, ip_address, device_type, location, success, failure_reason, created_at
    FROM login_history
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows as LoginHistoryRecord[];
}
