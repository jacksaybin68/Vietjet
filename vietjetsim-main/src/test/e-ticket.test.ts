import { describe, it, expect } from 'vitest';
import {
  buildBoardingQrContent,
  buildETicketHtml,
  code39Svg,
  escapeHtml,
  sanitizeCode39Text,
  type ETicketData,
} from '@/features/payments/e-ticket';

const SAMPLE: ETicketData = {
  pnr: 'XY7K9P',
  flightNo: 'VJ123',
  from: 'SGN',
  to: 'HAN',
  fromCity: 'TP. Hồ Chí Minh',
  toCity: 'Hà Nội',
  date: '2026-10-20',
  departTime: '09:15',
  arriveTime: '11:20',
  passengers: [
    { name: 'Nguyễn Văn A', seat: '12A' },
    { name: 'Trần Thị B', seat: '12B' },
  ],
  amount: 1_500_000,
};

describe('E-ticket / e-boarding pass', () => {
  it('chuỗi QR mang đủ thông tin định danh vé', () => {
    const content = buildBoardingQrContent(SAMPLE, SAMPLE.passengers[0]);
    expect(content).toBe('ETKT|XY7K9P|NGUYEN VAN A|VJ123|2026-10-20|12A|SGN-HAN');
  });

  it('mã vạch Code 39 bọc start/stop và chỉ chứa ký tự hợp lệ', () => {
    expect(sanitizeCode39Text('XY7K9P<script>')).toBe('XY7K9PSCRIPT');
    const svg = code39Svg('XY7K9P');
    expect(svg).toContain('<svg');
    expect(svg).toContain('<rect');
    // Start/stop '*' nên luôn có ít nhất hai nhóm bar đầu/cuối.
    expect(svg.match(/<rect/g)!.length).toBeGreaterThan(18);
  });

  it('code39Svg rỗng khi không có dữ liệu (không render svg giả)', () => {
    expect(code39Svg('')).toBe('');
    expect(code39Svg('???')).toBe('');
  });

  it('bản in chứa PNR, QR data URL, khổ A4 và page-break mỗi hành khách', () => {
    const html = buildETicketHtml({
      ...SAMPLE,
      qrDataUrl: 'data:image/png;base64,FAKEQR',
    });
    expect(html).toContain('XY7K9P');
    expect(html).toContain('data:image/png;base64,FAKEQR');
    expect(html).toContain('@page');
    expect(html).toContain('THẺ LÊN TÀU ĐIỆN TỬ');
    expect(html).toContain('NGUYỄN VĂN A');
    expect(html).toContain('TRẦN THỊ B');
    // 2 hành khách → 2 section vé.
    expect(html.match(/class="ticket"/g)!.length).toBe(2);
    // Mã vạch Code 39 nhúng trong bản in.
    expect(html).toContain('Mã vạch vé');
  });

  it('escape dữ liệu khách hàng để chống XSS', () => {
    const xss = buildETicketHtml({
      ...SAMPLE,
      pnr: '<script>alert(1)</script>',
      passengers: [{ name: '<img src=x onerror=1>', seat: '1A' }],
    });
    expect(xss).not.toContain('<script>alert(1)</script>');
    expect(xss).not.toContain('<img src=x');
    expect(escapeHtml('<b>"x"</b>')).toBe('&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
  });
});
