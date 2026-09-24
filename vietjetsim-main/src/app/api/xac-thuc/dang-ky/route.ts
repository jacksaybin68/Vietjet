import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { setCsrfCookieOnResponse } from '@/lib/csrf';
import {
  hashPassword,
  generateTokens,
  setAuthCookiesOnResponse,
  validatePassword,
} from '@/lib/auth';
import { normalizePhone } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, full_name, phone, dob } = body;

    // Validation: Require password, full_name, and AT LEAST ONE of email or phone
    if (!password || !full_name || (!email && !phone)) {
      return NextResponse.json(
        { error: 'Mật khẩu, họ tên và (Email hoặc Số điện thoại) là bắt buộc' },
        { status: 400 }
      );
    }

    // M2: Strengthened password policy (8+ chars + complexity)
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: passwordCheck.errors.join('; ') }, { status: 400 });
    }

    // Store the canonical spelling. Otherwise a number typed as 0986349061
    // and one typed as 986349061 pass the uniqueness check as different
    // strings and end up as two accounts for the same person.
    const normalizedPhone = normalizePhone(phone);

    // Check if user already exists
    let existingUsers: Array<{ id: string }> = [];
    if (email) {
      existingUsers = await sql`SELECT id FROM user_profiles WHERE email = ${email}`;
      if (existingUsers.length > 0) {
        return NextResponse.json({ error: 'Email đã được đăng ký' }, { status: 409 });
      }
    }

    if (normalizedPhone) {
      existingUsers = await sql`SELECT id FROM user_profiles WHERE phone = ${normalizedPhone}`;
      if (existingUsers.length > 0) {
        return NextResponse.json({ error: 'Số điện thoại đã được đăng ký' }, { status: 409 });
      }
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create user in Neon PostgreSQL
    const newUser = await sql`
      INSERT INTO user_profiles (email, password_hash, full_name, role, phone, dob)
      VALUES (${email || null}, ${password_hash}, ${full_name}, 'user', ${normalizedPhone}, ${dob || null})
      RETURNING id, email, full_name, role, phone, dob, created_at, updated_at
    `;

    const userRecord = newUser[0];

    // Generate tokens
    const user = {
      id: userRecord.id,
      email: userRecord.email,
      full_name: userRecord.full_name,
      role: userRecord.role || 'user',
      phone: userRecord.phone,
      dob: userRecord.dob,
      created_at: userRecord.created_at,
      updated_at: userRecord.updated_at,
    };

    const tokens = generateTokens(user);

    // Set cookies on response
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          phone: user.phone,
        },
      },
      { status: 201 }
    );

    setAuthCookiesOnResponse(response, tokens);
    setCsrfCookieOnResponse(response);

    return response;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Đã xảy ra lỗi khi đăng ký' }, { status: 500 });
  }
}
