import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { validateCsrfOrReject } from '@/lib/csrf';
import { rateLimit } from '@/lib/rate-limit';
import { createPasswordResetToken } from '@/lib/password-reset';

/**
 * Request a password-reset link.
 *
 * Always answers with the same success payload so the endpoint cannot be used
 * to enumerate which emails/phones have an account.
 *
 * No mail transport is configured in this project, so outside production the
 * generated reset link is echoed in the response (`resetUrl`) to keep the demo
 * flow usable. Production never includes it — wire a real mailer here.
 */
export async function POST(request: NextRequest) {
  try {
    const csrfError = await validateCsrfOrReject(request);
    if (csrfError) return csrfError;

    const limited = rateLimit(request, { windowMs: 60_000, maxRequests: 5 });
    if (limited) return limited;

    const body = await request.json();
    const identifier = typeof body?.email === 'string' ? body.email.trim() : '';

    if (!identifier) {
      return NextResponse.json(
        { error: 'Vui lòng nhập email hoặc số điện thoại.' },
        { status: 400 }
      );
    }

    const results = await sql`
      SELECT id, email FROM user_profiles
      WHERE email = ${identifier} OR phone = ${identifier}
    `;
    const user = (results as { id: string; email: string | null }[])[0];

    // Unknown identifier: return the same shape as success, without issuing a token.
    if (!user) {
      return NextResponse.json({ success: true });
    }

    const { token } = await createPasswordResetToken(user.id, user.email);

    const payload: { success: true; resetUrl?: string } = { success: true };
    if (process.env.NODE_ENV !== 'production') {
      payload.resetUrl = `/dat-lai-mat-khau?token=${token}`;
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại.' }, { status: 500 });
  }
}
