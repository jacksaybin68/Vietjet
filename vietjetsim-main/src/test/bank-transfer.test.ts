import { describe, it, expect } from 'vitest';
import { normalizeTransferAmount, validateBankTransferInput } from '@/lib/bank-transfer';

const EXPECTED = { transferNote: 'VJ ABC123', amount: 1_500_000 };

describe('normalizeTransferAmount', () => {
  it('reads the plain digits a customer pastes from their bank app', () => {
    expect(normalizeTransferAmount('1500000')).toBe(1_500_000);
  });

  it('accepts the separators Vietnamese and international formatting produce', () => {
    // A customer typing 1.500.000 into a keyboard that also offers 1,500,000
    // must not be told the amount is wrong — that is the whole reason the
    // comparison can be an equality rather than a fuzzy match.
    expect(normalizeTransferAmount('1.500.000')).toBe(1_500_000);
    expect(normalizeTransferAmount('1,500,000')).toBe(1_500_000);
    expect(normalizeTransferAmount('1 500 000')).toBe(1_500_000);
    expect(normalizeTransferAmount('1_500_000')).toBe(1_500_000);
  });

  it('strips the non-breaking space a bank app copy button carries along', () => {
    expect(normalizeTransferAmount('1\u00a0500\u00a0000')).toBe(1_500_000);
  });

  it('rejects a half-typed amount rather than reading it as zero', () => {
    // `Number('')` is 0, so an empty or separator-only field would otherwise
    // coerce and could satisfy a zero-total booking.
    expect(Number.isNaN(normalizeTransferAmount(''))).toBe(true);
    expect(Number.isNaN(normalizeTransferAmount('   '))).toBe(true);
    expect(Number.isNaN(normalizeTransferAmount(null))).toBe(true);
    expect(Number.isNaN(normalizeTransferAmount(undefined))).toBe(true);
  });

  it('keeps a numeric input on the same path as a typed one', () => {
    expect(normalizeTransferAmount(1_500_000)).toBe(1_500_000);
    expect(Number.isNaN(normalizeTransferAmount(Number.NaN))).toBe(true);
  });
});

describe('validateBankTransferInput', () => {
  it('accepts the memo and amount exactly as displayed', () => {
    const result = validateBankTransferInput(
      { transferNote: 'VJ ABC123', amount: '1500000' },
      EXPECTED
    );
    expect(result).toEqual({ valid: true });
  });

  it('rejects a memo that differs from the one shown', () => {
    // The memo is what an operator matches the incoming transfer on, so an
    // approximate match is worse than none: it would confirm a payment the
    // bank statement cannot be tied to this booking.
    const result = validateBankTransferInput(
      { transferNote: 'VJ XXX999', amount: '1500000' },
      EXPECTED
    );
    expect(result.valid).toBe(false);
    expect(result.valid === false && result.field).toBe('transferNote');
  });

  it('rejects an empty memo and names the field to correct', () => {
    const result = validateBankTransferInput({ transferNote: '', amount: '1500000' }, EXPECTED);
    expect(result.valid).toBe(false);
    expect(result.valid === false && result.field).toBe('transferNote');
  });

  it('tolerates padding and runs of whitespace a bank app may add', () => {
    const result = validateBankTransferInput(
      { transferNote: '  VJ   ABC123  ', amount: '1500000' },
      EXPECTED
    );
    expect(result).toEqual({ valid: true });
  });

  it('is case sensitive on the memo', () => {
    const result = validateBankTransferInput(
      { transferNote: 'vj abc123', amount: '1500000' },
      EXPECTED
    );
    expect(result.valid).toBe(false);
  });

  it('rejects an amount that is short by an order of magnitude', () => {
    // The failure this guards against is a customer confirming 15,000 against
    // 1,500,000 and the booking being marked paid for a fraction of the fare.
    const result = validateBankTransferInput(
      { transferNote: 'VJ ABC123', amount: '15000' },
      EXPECTED
    );
    expect(result.valid).toBe(false);
    expect(result.valid === false && result.field).toBe('amount');
  });

  it('rejects an amount greater than what was displayed', () => {
    const result = validateBankTransferInput(
      { transferNote: 'VJ ABC123', amount: '1600000' },
      EXPECTED
    );
    expect(result.valid).toBe(false);
  });

  it('reports the amount before it checks nothing else', () => {
    const result = validateBankTransferInput({ transferNote: 'VJ ABC123', amount: '' }, EXPECTED);
    expect(result.valid).toBe(false);
    expect(result.valid === false && result.field).toBe('amount');
  });

  it('tells the customer the exact value to type', () => {
    // A bare "does not match" leaves them guessing; the memo and amount are
    // both on screen, so the message can quote them.
    const result = validateBankTransferInput(
      { transferNote: 'wrong', amount: '1500000' },
      EXPECTED
    );
    expect(result.valid === false && result.message).toContain('VJ ABC123');
  });
});
