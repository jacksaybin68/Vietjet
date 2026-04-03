import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { hashPassword, generateTokens, setAuthCookiesOnResponse, validatePassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, full_name, phone } = body;

    // Validation
    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'Email, mật khẩu và họ tên là bắt buộc' }, { status: 400 });
    }

    // M2: Strengthened password policy (8+ chars + complexity)
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: passwordCheck.errors.join('; ') }, { status: 400 });
    }

    // Check if user already exists
    const existingUsers = await sql`
      SELECT id FROM user_profiles WHERE email = ${email}
    `;

    if (existingUsers.length > 0) {
      return NextResponse.json({ error: 'Email đã được đăng ký' }, { status: 409 });
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create user in Neon PostgreSQL
    const newUser = await sql`
      INSERT INTO user_profiles (email, password_hash, full_name, role, phone)
      VALUES (${email}, ${password_hash}, ${full_name}, 'user', ${phone || null})
      RETURNING id, email, full_name, role, phone, created_at, updated_at
    `;

    const userRecord = newUser[0];

    // Generate tokens
    const user = {
      id: userRecord.id,
      email: userRecord.email,
      full_name: userRecord.full_name,
      role: userRecord.role || 'user',
      phone: userRecord.phone,
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

    return response;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Đã xảy ra lỗi khi đăng ký' }, { status: 500 });
  }
}
