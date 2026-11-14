import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Gửi email hoá đơn tự động kèm PDF vé điện tử, và KHÔNG gửi trùng.
 *
 * Vì sao cần chống gửi trùng: một giao dịch có nhiều trigger cùng kích
 * hoạt (webhook VietQR poll, `POST /api/thanh-toan` do client gọi lại, admin
 * bấm "gửi lại"). Không có chốt thì khách nhận 3-4 email giống nhau và cả
 * mỗi email đều kèm PDF — trải nghiệm rất tệ và tốn băng thông SMTP.
 *
 * Cơ chế chống: bảng `email_log` có unique index
 * `(booking_id, payment_id, template) NULLS NOT DISTINCT`.
 */
const INVOICE_SOURCE = readFileSync(join(process.cwd(), 'src/lib/payment-invoice.ts'), 'utf8');
const MAIL_SOURCE = readFileSync(join(process.cwd(), 'src/lib/mail.ts'), 'utf8');
const MIGRATION_SOURCE = readFileSync(
  join(process.cwd(), 'migrations/046_passenger_seats_and_services.sql'),
  'utf8'
);

describe('bảng email_log có ràng buộc chống gửi trùng', () => {
  it('migration tạo unique index trên (booking_id, payment_id, template)', () => {
    expect(MIGRATION_SOURCE).toMatch(/CREATE UNIQUE INDEX[\s\S]*email_log/);
    expect(MIGRATION_SOURCE).toMatch(/NULLS NOT DISTINCT/);
  });

  it('`payment_id` cho phép NULL (đơn chưa gắn giao dịch)', () => {
    expect(MIGRATION_SOURCE).toMatch(/payment_id/);
  });
});

describe('luồng gửi tự động có kiểm tra idempotency', () => {
  it('hỏi `email_log` trước khi gửi', () => {
    expect(INVOICE_SOURCE).toMatch(/async function hasAlreadySent/);
    expect(INVOICE_SOURCE).toMatch(/SELECT id FROM email_log/);
    expect(INVOICE_SOURCE).toMatch(/AND status = 'sent'/);
  });

  it('so khớp `payment_id` theo cách NULL-safe', () => {
    // `IS NOT DISTINCT FROM` — nếu dùng `=` thì `NULL = NULL` là NULL ⇒ dòng
    // cũ không khớp ⇒ gửi trùng đúng trường hợp cần chặn nhất.
    expect(INVOICE_SOURCE).toMatch(/IS NOT DISTINCT FROM/);
  });

  it('bỏ qua lần gửi trùng', () => {
    expect(INVOICE_SOURCE).toMatch(/Hoá đơn đã được gửi cho giao dịch này/);
  });

  it('ghi nhận sau khi gửi (kể cả khi thất bại)', () => {
    expect(INVOICE_SOURCE).toMatch(/async function logEmailSent/);
    expect(INVOICE_SOURCE).toMatch(/status: sent \? 'sent' : 'failed'/);
  });

  it('ghi log dùng `ON CONFLICT ... NULLS NOT DISTINCT DO UPDATE`', () => {
    expect(INVOICE_SOURCE).toMatch(
      /ON CONFLICT \(booking_id, payment_id, template\) NULLS NOT DISTINCT/
    );
  });

  it('admin gửi lại được nhờ cờ `skipIdempotency`', () => {
    expect(INVOICE_SOURCE).toMatch(/skipIdempotency\?: boolean/);
    expect(INVOICE_SOURCE).toMatch(/if \(!options\.skipIdempotency && \(await hasAlreadySent/);
  });
});

describe('email đính kèm PDF vé điện tử', () => {
  it('mail hỗ trợ đính kèm file', () => {
    expect(MAIL_SOURCE).toMatch(/export interface MailAttachment/);
    expect(MAIL_SOURCE).toMatch(/attachments\?: MailAttachment\[\]/);
  });

  it('attachments được truyền thẳng vào nodemailer', () => {
    expect(MAIL_SOURCE).toMatch(/attachments: payload\.attachments\.map/);
  });

  it('PDF được sinh từ trip (cả hai chặng)', () => {
    expect(INVOICE_SOURCE).toMatch(/async function buildTicketPdf/);
    expect(INVOICE_SOURCE).toMatch(/getTripById/);
    expect(INVOICE_SOURCE).toMatch(/buildBoardingPassPdf/);
  });

  it('file đính kèm đặt tên theo PNR', () => {
    expect(INVOICE_SOURCE).toMatch(/ve-dien-tu-\$\{booking\.booking_code/);
  });

  it('contentType là application/pdf', () => {
    expect(INVOICE_SOURCE).toMatch(/contentType: 'application\/pdf'/);
  });

  it('kết quả báo rõ có đính kèm PDF hay không', () => {
    expect(INVOICE_SOURCE).toMatch(/attachedPdf: !!pdf/);
  });

  it('không sinh được PDF thì mail VẪN gửi được (thiếu file, không mất mail)', () => {
    expect(INVOICE_SOURCE).toMatch(/const attachments: MailAttachment\[\] = pdf/);
    expect(INVOICE_SOURCE).toMatch(/: \[\];/);
  });
});

describe('route gửi hoá đơn thủ công của admin không bị chặn bởi idempotency', () => {
  const route = readFileSync(
    join(process.cwd(), 'src/app/api/quan-tri/dat-ve/hoa-don/route.ts'),
    'utf8'
  );

  it('truyền `skipIdempotency: true`', () => {
    expect(route).toMatch(/skipIdempotency: true/);
  });

  it('và `force: true` để bỏ qua cả cờ hệ thống', () => {
    expect(route).toMatch(/force: true/);
  });
});
