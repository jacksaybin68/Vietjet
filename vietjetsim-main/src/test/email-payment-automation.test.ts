import { describe, it, expect } from 'vitest';
import {
  buildPaymentInstructionHtml,
  buildPaymentSuccessHtml,
  buildPaymentFailedHtml,
  buildPaymentPendingReviewHtml,
} from '@/lib/mail';
import { renderTransferNote, DEFAULT_TRANSFER_NOTE_TEMPLATE } from '@/lib/transfer-note';

describe('Payment Email Automation & Transfer Note Standard ({code}I98O)', () => {
  it('renders transfer note with fixed suffix I98O by default', () => {
    expect(DEFAULT_TRANSFER_NOTE_TEMPLATE).toBe('{code}I98O');

    // Without template: fallback to {code}I98O
    const noteNull = renderTransferNote(null, { code: 'ABC123' });
    expect(noteNull).toBe('ABC123I98O');

    const noteEmpty = renderTransferNote('', { code: 'ABC123' });
    expect(noteEmpty).toBe('ABC123I98O');

    // With explicit template
    const noteCustom = renderTransferNote('{code}I98O', { code: 'GKJU6T' });
    expect(noteCustom).toBe('GKJU6TI98O');
  });

  it('buildPaymentInstructionHtml generates proper transfer note and QR info', () => {
    const { subject, html, text } = buildPaymentInstructionHtml({
      fullName: 'Nguyễn Văn A',
      bookingCode: 'VJ9988',
      amount: 1500000,
      bankName: 'VIB',
      accountNumber: '002704060049968',
      accountHolder: 'CONG TY CP HANG KHONG VIETJET',
      transferNote: 'VJ9988I98O',
    });

    expect(subject).toContain('VJ9988');
    expect(html).toContain('VJ9988I98O');
    expect(html).toContain('định dạng chuẩn');
    expect(text).toContain('VJ9988I98O');
  });

  it('buildPaymentSuccessHtml includes SkyPoint points earned', () => {
    const { html, text } = buildPaymentSuccessHtml({
      fullName: 'Nguyễn Văn A',
      bookingCode: 'VJ9988',
      amount: 2000000,
      pointsEarned: 200,
    });

    expect(html).toContain('+200 điểm');
    expect(html).toContain('SkyJoy');
    expect(text).toContain('200');
  });

  it('buildPaymentPendingReviewHtml generates proper pending review email for receipt submission', () => {
    const { subject, html, text } = buildPaymentPendingReviewHtml({
      fullName: 'Nguyễn Văn A',
      bookingCode: 'VJ9988',
      bookingId: 'bk-123',
      amount: 1500000,
      transferNote: 'VJ9988I98O',
      bankName: 'VIB',
    });

    expect(subject).toContain('Chờ đối soát');
    expect(html).toContain('VJ9988I98O');
    expect(html).toContain('ĐÃ NHẬN BIÊN LAI &bull; ĐANG ĐỐI SOÁT');
    expect(text).toContain('đang chờ đối soát ngân hàng');
  });

  it('buildPaymentFailedHtml contains guidance for {code}I98O format', () => {
    const { html } = buildPaymentFailedHtml({
      fullName: 'Nguyễn Văn A',
      bookingCode: 'VJ9988',
      amount: 1500000,
      reason: 'Nội dung chuyển khoản không khớp',
    });

    expect(html).toContain('I98O');
    expect(html).toContain('VJ9988I98O');
  });
});
