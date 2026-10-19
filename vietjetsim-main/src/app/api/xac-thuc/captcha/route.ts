import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { createCaptchaChallenge } from '@/lib/captcha';

/**
 * Phát một CAPTCHA mới. Trả về câu hỏi và chữ ký; đáp án chỉ tồn tại ở server.
 *
 * Route này vô danh theo thiết kế (form đăng nhập/đăng ký gọi trước khi có
 * phiên), nên `proxy.ts` đã coi `/api/xac-thuc/*` là công khai.
 */
export async function GET(request: NextRequest) {
  const limited = rateLimit(request, { windowMs: 60_000, maxRequests: 30 });
  if (limited) return limited;

  const challenge = createCaptchaChallenge();
  return NextResponse.json(challenge, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
