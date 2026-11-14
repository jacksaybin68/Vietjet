import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Thẻ lên máy bay điện tử phải có mã QUÉT ĐƯỢC.
 *
 * `/lam-thu-tuc` trước đây vẽ một icon `<MdQrCode2>` — đó là HÌNH ẢNH, không
 * phải mã, nên không máy quét nào ở cổng lên máy bay đọc được. Thẻ lên máy
 * bay không quét được thì check-in online vô nghĩa về mặt nghiệp vụ.
 *
 * Test này quét mã nguồn: điều kiện cần giữ là "component phải sinh mã thật
 * từ `qrcode`", và render để xác nhận điều đó tốn nhiều hơn giá trị của nó.
 */
const BOARDING_PASS_CARD = join(
  process.cwd(),
  'src/features/payments/components/BoardingPassCard.tsx'
);
const CHECKIN_PAGE = join(process.cwd(), 'src/app/lam-thu-tuc/page.tsx');

/**
 * Bỏ comment trước khi kiểm tra — lời giải thích "trước đây vẽ icon
 * `<MdQrCode2>`" nằm ngay trong component và sẽ làm test báo đỏ vì chính nó.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('thẻ lên máy bay sinh mã thật', () => {
  const source = stripComments(readFileSync(BOARDING_PASS_CARD, 'utf8'));

  it('QR được sinh từ package `qrcode` (không phải icon)', () => {
    expect(source).toMatch(/import\('qrcode'\)/);
    expect(source).toMatch(/QRCode\.toString\(/);
    // Icon placeholder cũ không còn được render (chỉ còn nhắc trong chú thích).
    expect(source).not.toMatch(/<MdQrCode2/);
  });

  it('QR dùng nội dung payload BCBP-lite dùng chung với PDF', () => {
    // Cùng hàm với `src/lib/pdf/boarding-pass.ts` ⇒ mã trên màn hình và mã
    // trong PDF không thể lệch nhau.
    expect(source).toMatch(/buildBoardingQrContent\(data, passenger\)/);
  });

  it('có mã vạch Code 39 vẽ bằng vector', () => {
    expect(source).toMatch(/code39Svg\(data\.pnr\)/);
  });

  it('QR và mã vạch có testid để test UI định vị được', () => {
    expect(source).toMatch(/data-testid="boarding-qr"/);
    expect(source).toMatch(/data-testid="boarding-barcode"/);
  });
});

describe('tải thẻ về điện thoại', () => {
  const source = stripComments(readFileSync(BOARDING_PASS_CARD, 'utf8'));

  it('có nút tải PDF và tải ảnh PNG', () => {
    expect(source).toMatch(/data-testid="download-pdf"/);
    expect(source).toMatch(/data-testid="download-image"/);
  });

  it('tải PDF trỏ tới endpoint vé điện tử', () => {
    expect(source).toMatch(/ve-dien-tu/);
  });

  it('ảnh PNG được vẽ vào canvas rồi tải xuống', () => {
    expect(source).toMatch(/canvas\.toBlob/);
    expect(source).toMatch(/link\.download =/);
  });
});

describe('trang check-in dùng thẻ lên máy bay thật', () => {
  const source = stripComments(readFileSync(CHECKIN_PAGE, 'utf8'));

  it('render BoardingPassCard ở bước thành công', () => {
    expect(source).toMatch(/<BoardingPassCard/);
  });

  it('không còn icon QR giả ở bước thành công', () => {
    expect(source).not.toMatch(/<MdQrCode2/);
  });

  it('có chọn chặng: chỉ đi / chỉ về / cả hai', () => {
    expect(source).toMatch(/Chỉ chặng đi/);
    expect(source).toMatch(/Chỉ chặng về/);
    expect(source).toMatch(/Cả 2 chặng/);
  });

  it('mỗi chặng là một lần POST riêng (không gộp)', () => {
    expect(source).toMatch(/for \(const leg of selectedLegs\)/);
    expect(source).toMatch(/leg: leg\.legRole/);
  });
});
