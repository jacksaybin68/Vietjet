/**
 * CAPTCHA mô phỏng chống bot (không phụ thuộc dịch vụ ngoài).
 *
 * Câu hỏi là một phép cộng/trừ đơn giản, nhưng đáp án KHÔNG nằm ở client: server
 * ký payload (hai toán hạng + phép tính + nonce + thời điểm phát) bằng
 * HMAC-SHA256 và chỉ trả về câu hỏi cùng chữ ký. Client gửi lại chữ ký và câu
 * trả lời, server tự tính đáp án rồi so sánh. Một bot không đọc được đáp án từ
 * response, và không thể tự chế token mà không có khoá.
 *
 * Đây là giải pháp "mô phỏng": nó chặn được script gửi form mù, không thay được
 * reCAPTCHA Enterprise. Chỗ cắm để nâng cấp sang reCAPTCHA/hCaptcha thật là
 * `verifyCaptcha` — thay phần kiểm HMAC bằng lời gọi siteverify.
 */

import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';

/** Hiệu lực của một challenge. Ngắn để không thể dùng lại lâu dài. */
export const CAPTCHA_TTL_SECONDS = 5 * 60;

function captchaSecret(): string {
  return (
    process.env.CAPTCHA_SECRET ||
    process.env.JWT_SECRET ||
    'vietjet-dev-captcha-secret-do-not-use-in-production'
  );
}

interface CaptchaPayload {
  /** Toán hạng thứ nhất. */
  a: number;
  /** Toán hạng thứ hai. */
  b: number;
  /** `add` hoặc `sub`. */
  op: 'add' | 'sub';
  /** Nonce, để hai challenge giống nhau vẫn khác token. */
  n: string;
  /** Thời điểm phát (giây). */
  iat: number;
}

function sign(payloadPart: string): string {
  return createHmac('sha256', captchaSecret()).update(payloadPart).digest('base64url');
}

function expectedAnswer(payload: CaptchaPayload): number {
  return payload.op === 'add' ? payload.a + payload.b : payload.a - payload.b;
}

export interface CaptchaChallenge {
  /** Chữ ký client gửi lại kèm câu trả lời. */
  token: string;
  /** Câu hỏi hiển thị, ví dụ "7 + 5 = ?". */
  question: string;
  /** Hiệu lực, tính bằng giây. */
  expiresIn: number;
}

/** Phát một challenge mới. */
export function createCaptchaChallenge(): CaptchaChallenge {
  // `sub` luôn có kết quả >= 0 để không phải dạy người dùng số âm.
  const op: CaptchaPayload['op'] = randomInt(0, 2) === 0 ? 'add' : 'sub';
  const a = op === 'add' ? randomInt(1, 20) : randomInt(10, 30);
  const b = op === 'add' ? randomInt(1, 20) : randomInt(1, a);

  const payload: CaptchaPayload = { a, b, op, n: randomBytes(8).toString('hex'), iat: Date.now() };
  const payloadPart = Buffer.from(JSON.stringify(payload)).toString('base64url');

  return {
    token: `${payloadPart}.${sign(payloadPart)}`,
    question: `${a} ${op === 'add' ? '+' : '−'} ${b} = ?`,
    expiresIn: CAPTCHA_TTL_SECONDS,
  };
}

/**
 * Kiểm tra câu trả lời. Trả `false` cho mọi trường hợp không chứng minh được:
 * token hỏng/hết hạn/chữ ký sai, hoặc đáp án không khớp.
 */
export function verifyCaptcha(token: string | undefined | null, answer: string | number): boolean {
  if (!token) return false;

  const [payloadPart, signature] = String(token).split('.');
  if (!payloadPart || !signature) return false;

  const expectedSignature = sign(payloadPart);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return false;

  let payload: CaptchaPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as CaptchaPayload;
  } catch {
    return false;
  }

  if (
    typeof payload.a !== 'number' ||
    typeof payload.b !== 'number' ||
    (payload.op !== 'add' && payload.op !== 'sub') ||
    typeof payload.iat !== 'number'
  ) {
    return false;
  }

  const ageSeconds = (Date.now() - payload.iat) / 1000;
  if (ageSeconds < 0 || ageSeconds > CAPTCHA_TTL_SECONDS) return false;

  const providedAnswer = Number(String(answer).trim());
  if (!Number.isInteger(providedAnswer)) return false;

  return providedAnswer === expectedAnswer(payload);
}
