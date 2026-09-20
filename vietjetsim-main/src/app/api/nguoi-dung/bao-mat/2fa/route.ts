import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRequest } from '@/lib/auth';
import { disable2FA, enable2FA, get2FAConfig, upsert2FASecret } from '@/lib/security-db';
import {
  buildOtpAuthUri,
  createBackupCodes,
  createTotpSecret,
  verifyTotpToken,
} from '@/lib/two-factor';

/** Never let a cached response leak enrollment state between accounts. */
const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export async function GET(request: NextRequest) {
  const auth = await verifyAuthRequest(request);
  if (auth.error || !auth.user) return auth.response!;

  try {
    const config = await get2FAConfig(auth.user.userId);

    return NextResponse.json(
      {
        twoFA: {
          isEnabled: config?.is_enabled ?? false,
          backupCodesUsed: config?.backup_codes_used ?? 0,
          backupCodesRemaining: config?.backup_codes?.length ?? 0,
          lastVerified: config?.last_verified ?? null,
        },
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error('Error reading 2FA config:', error);
    return NextResponse.json({ error: 'Không thể tải cấu hình 2FA' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuthRequest(request);
  if (auth.error || !auth.user) return auth.response!;

  let body: { action?: string; token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
  }

  try {
    if (body.action === 'setup') return await handleSetup(auth.user.userId, auth.user.email);
    if (body.action === 'verify') return await handleVerify(auth.user.userId, body.token ?? '');
    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (error) {
    console.error('Error in 2FA action:', error);
    return NextResponse.json({ error: 'Không thể xử lý yêu cầu 2FA' }, { status: 500 });
  }
}

/**
 * Issues a new secret. The row is written disabled, so an abandoned enrollment
 * — the user closes the modal without proving possession — cannot lock them
 * out of their own account.
 */
async function handleSetup(userId: string, email: string) {
  const existing = await get2FAConfig(userId);
  if (existing?.is_enabled) {
    return NextResponse.json({ error: '2FA đã được kích hoạt.' }, { status: 409 });
  }

  const secret = createTotpSecret();
  const { plain, hashed } = createBackupCodes();
  await upsert2FASecret(userId, secret, hashed);

  return NextResponse.json(
    {
      secret,
      uri: buildOtpAuthUri(secret, email),
      // Returned exactly once; only hashes are persisted.
      backupCodes: plain,
    },
    { headers: NO_STORE }
  );
}

async function handleVerify(userId: string, token: string) {
  const config = await get2FAConfig(userId);
  if (!config) {
    return NextResponse.json({ error: 'Chưa có phiên thiết lập 2FA.' }, { status: 400 });
  }

  if (!verifyTotpToken(config.secret, token)) {
    return NextResponse.json({ error: 'Mã xác thực không đúng.' }, { status: 401 });
  }

  await enable2FA(userId);
  return NextResponse.json({ success: true, isEnabled: true });
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAuthRequest(request);
  if (auth.error || !auth.user) return auth.response!;

  try {
    await disable2FA(auth.user.userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    return NextResponse.json({ error: 'Không thể tắt 2FA' }, { status: 500 });
  }
}
