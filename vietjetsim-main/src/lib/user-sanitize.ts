/**
 * User row sanitization for API responses.
 *
 * `user_profiles` rows carry `password_hash` (bcrypt). Spreading a raw row into a
 * JSON response leaks every user's hash, which is enough for an attacker to crack
 * passwords offline at leisure. Never serialize a `UserRecord` directly — always
 * pass it through `toPublicUser` (or `toPublicUsers`) first.
 */

import type { UserRecord } from '@/lib/db';

/** Shape returned to admin clients — `UserRecord` minus all credential fields. */
export type PublicUser = Omit<UserRecord, 'password_hash'> & {
  /** Derived from `locked_until`; never stored. */
  status: 'active' | 'locked';
};

/**
 * Strip credential fields from a user row and derive the display `status`.
 *
 * Built as an explicit allow-list rather than `delete user.password_hash` so that
 * any credential column added to `UserRecord` later is excluded by default.
 */
export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    phone: user.phone,
    avatar_url: user.avatar_url,
    locked_until: user.locked_until ?? null,
    created_at: user.created_at,
    updated_at: user.updated_at,
  } as PublicUser;
}

export function toPublicUsers(users: UserRecord[], isLocked: (until?: string | null) => boolean) {
  return users.map((user) => ({
    ...toPublicUser(user),
    status: isLocked(user.locked_until) ? ('locked' as const) : ('active' as const),
  }));
}
