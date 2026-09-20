/**
 * Account locking is expressed through `user_profiles.locked_until`; there is
 * no separate `status` column. A timestamp in the future means the account is
 * locked, NULL means it is active.
 */

/** Sentinel written when an admin locks an account indefinitely. */
export const LOCKED_UNTIL_SENTINEL = '9999-12-31T23:59:59.000Z';

/** True when `locked_until` is set and still in the future. */
export function isAccountLocked(lockedUntil: string | Date | null | undefined): boolean {
  if (!lockedUntil) return false;
  const until = lockedUntil instanceof Date ? lockedUntil : new Date(lockedUntil);
  if (Number.isNaN(until.getTime())) return false;
  return until.getTime() > Date.now();
}
