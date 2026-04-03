import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { findUserById, updateUserProfile } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth';

// ─── GET: Get current user profile ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('access_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No access token found' },
        { status: 401 }
      );
    }

    const payload = verifyAccessToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const user = await findUserById(payload.userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      profile: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        dob: (user as any).dob || null,
        gender: (user as any).gender || null,
        address: (user as any).address || null,
        city: (user as any).city || null,
        country: (user as any).country || null,
        preferredLanguage: (user as any).preferred_language || 'vi',
      },
    });
  } catch (error) {
    console.error('Error in GET /api/users/profile:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// ─── PUT: Update current user profile ───────────────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('access_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No access token found' },
        { status: 401 }
      );
    }

    const payload = verifyAccessToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { full_name, phone, avatar_url, dob, gender, address, city, country, preferred_language } = body;

    const updates: Record<string, string> = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (phone !== undefined) updates.phone = phone;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    // Build and execute dynamic query for enhanced profile fields
    const enhancedFields: Record<string, string> = {};
    if (dob !== undefined) enhancedFields.dob = dob;
    if (gender !== undefined) enhancedFields.gender = gender;
    if (address !== undefined) enhancedFields.address = address;
    if (city !== undefined) enhancedFields.city = city;
    if (country !== undefined) enhancedFields.country = country;
    if (preferred_language !== undefined) enhancedFields.preferred_language = preferred_language;

    if (Object.keys(updates).length === 0 && Object.keys(enhancedFields).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Update standard fields
    if (Object.keys(updates).length > 0) {
      await updateUserProfile(payload.userId, updates);
    }

    // Update enhanced profile fields
    if (Object.keys(enhancedFields).length > 0) {
      const setParts: string[] = [];
      const vals: any[] = [];
      let idx = 1;
      for (const [k, v] of Object.entries(enhancedFields)) {
        setParts.push(`${k} = $${idx}`);
        vals.push(v);
        idx++;
      }
      setParts.push(`updated_at = NOW()`);
      vals.push(payload.userId);
      await sql.query(
        `UPDATE user_profiles SET ${setParts.join(', ')} WHERE id = $${idx}`,
        vals
      );
    }

    const updatedUser = await findUserById(payload.userId);

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      profile: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.full_name,
        role: updatedUser.role,
        phone: updatedUser.phone,
        avatarUrl: updatedUser.avatar_url,
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at,
        dob: (updatedUser as any).dob || null,
        gender: (updatedUser as any).gender || null,
        address: (updatedUser as any).address || null,
        city: (updatedUser as any).city || null,
        country: (updatedUser as any).country || null,
        preferredLanguage: (updatedUser as any).preferred_language || 'vi',
      },
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Error in PUT /api/users/profile:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
