import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import {
  comparePassword,
  generateTokens,
  setAuthCookiesOnResponse,
  hashToken,
  generateTokenFamily,
} from '@/lib/auth';
import { storeRefreshToken } from '@/lib/db';
import type { User } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email và mật khẩu là bắt buộc' }, { status: 400 });
    }

    // Find user in Neon PostgreSQL
    // Identifier can be either email or phone number
    const results = await sql`
      SELECT id, email, password_hash, full_name, role, phone, avatar_url, created_at, updated_at
      FROM user_profiles
      WHERE email = ${email} OR phone = ${email}
    `;

    console.log(`[AUTH] Login attempt for identifier: ${email}`);
    if (results.length === 0) {
      console.warn(`[AUTH] Login failed: User not found in database for identifier: ${email}`);
      return NextResponse.json(
        { error: 'Email/Số điện thoại hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    console.log(`[AUTH] User found, comparing password for: ${email}`);
    const userRecord = results[0];
    const isValidPassword = await comparePassword(password, userRecord.password_hash);

    if (!isValidPassword) {
      console.warn(`[AUTH] Login failed: Invalid password for email: ${email}`);
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 });
    }

    // Build user object
    const user: User = {
      id: userRecord.id,
      email: userRecord.email,
      full_name: userRecord.full_name,
      role: userRecord.role || 'user',
      phone: userRecord.phone,
      avatar_url: userRecord.avatar_url,
      created_at: userRecord.created_at,
      updated_at: userRecord.updated_at,
    };

    // Generate tokens
    const tokens = generateTokens(user);

    // Store refresh token hash in DB for rotation / revocation tracking
    const tokenHash = hashToken(tokens.refreshToken);
    const familyId = generateTokenFamily();
    try {
      await storeRefreshToken(user.id, tokenHash, familyId);
    } catch (storeErr) {
      // Log but don't block login — rotation is a security hardening, not a hard dependency
      console.error('Failed to store refresh token (rotation disabled):', storeErr);
    }

    // Create response with user data
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        phone: user.phone,
        avatarUrl: user.avatar_url,
      },
    });

    // Set cookies on response
    setAuthCookiesOnResponse(response, tokens);

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Đã xảy ra lỗi khi đăng nhập' }, { status: 500 });
  }
}
