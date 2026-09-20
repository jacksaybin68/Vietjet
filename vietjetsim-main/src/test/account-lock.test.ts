import { describe, it, expect } from 'vitest';
import { isAccountLocked, LOCKED_UNTIL_SENTINEL } from '@/lib/account-lock';

describe('account lock helpers', () => {
  it('treats a null/undefined lock as active', () => {
    expect(isAccountLocked(null)).toBe(false);
    expect(isAccountLocked(undefined)).toBe(false);
  });

  it('treats a past timestamp as active', () => {
    expect(isAccountLocked('2000-01-01T00:00:00.000Z')).toBe(false);
    expect(isAccountLocked(new Date(Date.now() - 60_000))).toBe(false);
  });

  it('treats a future timestamp as locked', () => {
    expect(isAccountLocked(new Date(Date.now() + 60_000))).toBe(true);
    expect(isAccountLocked(LOCKED_UNTIL_SENTINEL)).toBe(true);
  });

  it('ignores unparseable values instead of locking the account', () => {
    expect(isAccountLocked('not-a-date')).toBe(false);
  });
});
