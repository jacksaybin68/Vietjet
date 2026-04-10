import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getAllUsers, updateUserRole, findUserById, deleteUser } from '@/lib/db';
import { canManageRole } from '@/lib/rbac';
import type { AllRoles } from '@/lib/rbac';

// ─── GET: Get all users (admin) ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { payload, error, response } = await verifyAdminRequest(request, 'user:list');
    if (error) return response;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || undefined;

    let { users, total } = await getAllUsers(page, limit);

    // Filter by search if provided
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(
        (u) =>
          u.email.toLowerCase().includes(searchLower) ||
          u.full_name.toLowerCase().includes(searchLower)
      );
      total = users.length;
    }

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users (admin):', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// ─── PATCH: Update user role (admin) ────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const { payload, error, response } = await verifyAdminRequest(request, 'user:role_change');
    if (error) return response;

    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'userId and role are required' },
        { status: 400 }
      );
    }

    const validRoles = [
      'user',
      'admin',
      'super_admin',
      'admin_ops',
      'admin_finance',
      'admin_support',
      'admin_content',
    ];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Bad Request', message: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    // Prevent admin from changing their own role
    if (userId === payload.userId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Cannot change your own role' },
        { status: 400 }
      );
    }

    // RBAC: Check if actor can manage the target role
    const actorRole = payload.role as AllRoles;
    const targetRole = role as AllRoles;
    if (!canManageRole(actorRole, targetRole)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Không có quyền thay đổi role này' },
        { status: 403 }
      );
    }

    const success = await updateUserRole(userId, role);

    if (!success) {
      return NextResponse.json({ error: 'Not Found', message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `User role updated to ${role}`,
      userId,
      role,
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update user role' },
      { status: 500 }
    );
  }
}

// ─── DELETE: Delete a user (admin) ──────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const { payload, error, response } = await verifyAdminRequest(request, 'user:delete');
    if (error) return response;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'userId is required' },
        { status: 400 }
      );
    }

    // Prevent admin from deleting themselves
    if (userId === payload.userId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Cannot delete yourself' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await findUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'Not Found', message: 'User not found' }, { status: 404 });
    }

    // RBAC: Prevent deleting users with equal or higher role level
    const actorRole = payload.role as AllRoles;
    const targetRole = user.role as AllRoles;
    if (!canManageRole(actorRole, targetRole)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Không có quyền xóa người dùng này' },
        { status: 403 }
      );
    }

    // Delete user from PostgreSQL (CASCADE handles related records)
    await deleteUser(userId);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      userId,
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
