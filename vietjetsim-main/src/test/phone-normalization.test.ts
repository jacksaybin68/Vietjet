import { describe, it, expect } from 'vitest';
import { normalizePhone } from '@/lib/utils';

describe('normalizePhone', () => {
  it('adds the trunk zero to a 9-digit local number', () => {
    // The real bug: `986349061` and `0986349061` were two accounts.
    expect(normalizePhone('986349061')).toBe('0986349061');
  });

  it('leaves an already-canonical number untouched', () => {
    expect(normalizePhone('0986349061')).toBe('0986349061');
  });

  it.each([
    ['+84 986 349 061', '0986349061'],
    ['+84986349061', '0986349061'],
    ['84986349061', '0986349061'],
    ['84 986 349 061', '0986349061'],
    ['0986 349 061', '0986349061'],
    ['0986-349-061', '0986349061'],
    ['(098) 634-9061', '0986349061'],
    ['  0986349061  ', '0986349061'],
  ])('collapses %s to %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it('returns null for empty or unusable input', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone('   ')).toBeNull();
    expect(normalizePhone('abc')).toBeNull();
  });

  it('leaves foreign-length numbers as digits instead of reshaping them', () => {
    // A US number must not gain a Vietnamese trunk zero.
    expect(normalizePhone('+1 415 555 2671')).toBe('14155552671');
  });

  it('is idempotent', () => {
    const once = normalizePhone('+84 986 349 061');
    expect(normalizePhone(once)).toBe(once);
    const twice = normalizePhone('986349061');
    expect(normalizePhone(twice)).toBe(twice);
  });

  it('treats the two real-world spellings as the same identity', () => {
    expect(normalizePhone('0986349061')).toBe(normalizePhone('986349061'));
  });
});
