import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signAccessToken } from '@/lib/auth';
import {
  renderTransferNote,
  findUnknownTransferNoteTokens,
  validateTransferNoteTemplate,
  TRANSFER_NOTE_TOKENS,
  DEFAULT_TRANSFER_NOTE_TEMPLATE,
} from '@/lib/transfer-note';
import { POST as createBankAccount } from '@/app/api/quan-tri/tai-khoan-ngan-hang/route';
import { PATCH as updateBankAccount } from '@/app/api/quan-tri/tai-khoan-ngan-hang/[id]/route';

vi.mock('@/lib/neon', () => {
  const queryMock = vi.fn().mockResolvedValue([{ total: '0' }]);
  const sqlMock = Object.assign(vi.fn().mockResolvedValue([{ id: 'bank-1' }]), {
    query: queryMock,
    begin: vi.fn(),
    transaction: vi.fn().mockResolvedValue([[]]),
  });
  return { sql: sqlMock };
});

describe('renderTransferNote', () => {
  it('substitutes the booking code', () => {
    expect(renderTransferNote('VJ {code}', { code: 'ABC123' })).toBe('VJ ABC123');
  });

  it('renders monetary tokens as separator-free digits', () => {
    const note = renderTransferNote('TT {amount}', { amount: 850000 });
    expect(note).toBe('TT 850000');
    expect(note).not.toContain(',');
    expect(note).not.toContain('.');
  });

  it('renders the original price, the discount and the final amount together', () => {
    const note = renderTransferNote('{code}|{original}|{discount}|{amount}|{discount_code}', {
      code: 'ABC123',
      originalAmount: 1000000,
      discountAmount: 300000,
      amount: 700000,
      discountCode: 'DL30',
    });
    expect(note).toBe('ABC123|1000000|300000|700000|DL30');
  });

  it.each([
    [10, 1000000, 100000, 900000],
    [20, 1000000, 200000, 800000],
    [30, 1000000, 300000, 700000],
  ])('renders a %i%% agency discount consistently', (pct, original, discount, payable) => {
    const note = renderTransferNote('{code} {amount}', {
      code: 'ABC123',
      originalAmount: original,
      discountAmount: discount,
      amount: payable,
    });
    expect(note).toBe(`ABC123 ${payable}`);
  });

  it('rounds fractional amounts rather than emitting a decimal', () => {
    expect(renderTransferNote('{amount}', { amount: 850000.7 })).toBe('850001');
  });

  it('renders a missing discount as 0', () => {
    expect(renderTransferNote('{discount}', {})).toBe('0');
  });

  it('renders missing amounts as empty instead of NaN', () => {
    expect(renderTransferNote('{amount}', {})).toBe('');
    expect(renderTransferNote('X{amount}Y', {})).toBe('XY');
  });

  it('leaves unknown tokens verbatim so a typo stays visible', () => {
    expect(renderTransferNote('{code} {amout}', { code: 'ABC123' })).toBe('ABC123 {amout}');
  });

  it('falls back to the booking code when there is no template', () => {
    expect(renderTransferNote(null, { code: 'ABC123' })).toBe('ABC123');
    expect(renderTransferNote('', { code: 'ABC123' })).toBe('ABC123');
  });

  it('supports a template with no tokens at all', () => {
    expect(renderTransferNote('THANH TOAN VE', { code: 'ABC123' })).toBe('THANH TOAN VE');
  });
});

describe('findUnknownTransferNoteTokens', () => {
  it('ignores known tokens', () => {
    expect(findUnknownTransferNoteTokens('{code} {amount} {original}')).toEqual([]);
  });

  it('reports each unknown token once', () => {
    expect(findUnknownTransferNoteTokens('{amout} {amout} {foo}')).toEqual(['{amout}', '{foo}']);
  });

  it('returns an empty list for a missing template', () => {
    expect(findUnknownTransferNoteTokens(null)).toEqual([]);
  });
});

describe('validateTransferNoteTemplate', () => {
  it('defaults an empty template to the standard one', () => {
    expect(validateTransferNoteTemplate(undefined)).toEqual({
      valid: true,
      template: DEFAULT_TRANSFER_NOTE_TEMPLATE,
    });
    expect(validateTransferNoteTemplate('')).toEqual({
      valid: true,
      template: DEFAULT_TRANSFER_NOTE_TEMPLATE,
    });
  });

  it('accepts every documented token', () => {
    const template = TRANSFER_NOTE_TOKENS.map((t) => t.token).join(' ');
    const result = validateTransferNoteTemplate(template);
    expect(result.valid).toBe(true);
  });

  it('trims surrounding whitespace', () => {
    const result = validateTransferNoteTemplate('  VJ {code}  ');
    expect(result).toEqual({ valid: true, template: 'VJ {code}' });
  });

  it('rejects an unknown token — a literal would otherwise reach the customer', () => {
    const result = validateTransferNoteTemplate('VJ {amout}');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.message).toContain('{amout}');
  });

  it('rejects an over-long template', () => {
    const result = validateTransferNoteTemplate('x'.repeat(201));
    expect(result.valid).toBe(false);
  });

  it('rejects a non-string template', () => {
    expect(validateTransferNoteTemplate(123).valid).toBe(false);
  });
});

describe('Bank account payment-content API', () => {
  const CSRF = 'csrf-token';

  const adminHeaders = () => ({
    cookie: `access_token=${signAccessToken({
      userId: 'admin-1',
      email: 'admin@vietjetsim.vn',
      role: 'admin',
      fullName: 'Admin',
    })}; csrf_token=${CSRF}`,
    'x-csrf-token': CSRF,
  });

  const req = (url: string, body: unknown, method = 'POST') =>
    new NextRequest(url, {
      method,
      headers: { 'content-type': 'application/json', ...adminHeaders() },
      body: JSON.stringify(body),
    });

  beforeEach(() => vi.clearAllMocks());

  it('rejects a bank account whose template uses an unknown token', async () => {
    const res = await createBankAccount(
      req('http://localhost:4028/api/quan-tri/tai-khoan-ngan-hang', {
        bank_name: 'Vietcombank',
        account_number: '123',
        account_holder: 'CONG TY',
        transfer_note_template: 'VJ {amout}',
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('{amout}');
  });

  it('accepts the price/discount tokens an admin configures', async () => {
    const res = await createBankAccount(
      req('http://localhost:4028/api/quan-tri/tai-khoan-ngan-hang', {
        bank_name: 'Vietcombank',
        account_number: '123',
        account_holder: 'CONG TY',
        transfer_note_template: 'VJ {code} {amount}',
      })
    );
    expect(res.status).toBe(201);
  });

  it('defaults the template when none is supplied', async () => {
    const { sql } = await import('@/lib/neon');
    await createBankAccount(
      req('http://localhost:4028/api/quan-tri/tai-khoan-ngan-hang', {
        bank_name: 'Vietcombank',
        account_number: '123',
        account_holder: 'CONG TY',
      })
    );
    const interpolated = (sql as unknown as { mock: { calls: unknown[][] } }).mock.calls.flat();
    expect(interpolated).toContain(DEFAULT_TRANSFER_NOTE_TEMPLATE);
  });

  it('rejects an invalid template on update', async () => {
    const res = await updateBankAccount(
      req(
        'http://localhost:4028/api/quan-tri/tai-khoan-ngan-hang/bank-1',
        { transfer_note_template: 'VJ {nope}' },
        'PATCH'
      ),
      { params: Promise.resolve({ id: 'bank-1' }) }
    );
    expect(res.status).toBe(400);
  });

  it('allows a status toggle that omits the template field', async () => {
    const res = await updateBankAccount(
      req(
        'http://localhost:4028/api/quan-tri/tai-khoan-ngan-hang/bank-1',
        { is_active: false },
        'PATCH'
      ),
      { params: Promise.resolve({ id: 'bank-1' }) }
    );
    expect(res.status).toBe(200);
  });
});
