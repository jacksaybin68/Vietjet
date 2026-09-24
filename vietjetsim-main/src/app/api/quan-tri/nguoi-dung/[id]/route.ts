import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { findUserById, updateUserRole, deleteUser } from '@/lib/db';
import type { UserRecord } from '@/lib/db';
import { canManageRole } from '@/lib/rbac';
import { ASSIGNABLE_ROLES, isAssignableRole } from '@/lib/roles';
import { LOCKED_UNTIL_SENTINEL } from '@/lib/account-lock';
import { sql } from '@/lib/neon';

// ─── GET: Get specific user ──────────────────────────────────────────────────

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'user:view');
    if (error) return response;

    const { id } = await params;
    const user = await findUserById(id);

    if (!user) {
      return NextResponse.json({ error: 'Not Found', message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// ─── PATCH: Update user role or status ───────────────────────────────────────

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { payload, error, response } = await verifyAdminRequest(request, 'user:role_change');
    if (error) return response;

    const { id } = await params;
    const body = await request.json();
    const { role, status } = body;

    // Prevent actor from changing their own role/status
    if (id === payload.userId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Cannot change your own role or status' },
        { status: 400 }
      );
    }

    // Load target user to check RBAC level
    const targetUser = await findUserById(id);
    if (!targetUser) {
      return NextResponse.json({ error: 'Not Found', message: 'User not found' }, { status: 404 });
    }

    // RBAC: Check if actor can manage the target
    const actorRole = payload.role;
    const targetRole = targetUser.role;

    if (!canManageRole(actorRole, targetRole)) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Không có quyền thay đổi người dùng này (cùng cấp hoặc cao hơn)',
        },
        { status: 403 }
      );
    }

    let updatedUser;

    if (role) {
      // Logic for role update
      // Only the two real roles are assignable; legacy admin names remain valid
      // as stored data (they still grant admin) but cannot be handed out.
      if (!isAssignableRole(role)) {
        return NextResponse.json(
          {
            error: 'Bad Request',
            message: `Invalid role. Must be one of: ${ASSIGNABLE_ROLES.join(', ')}`,
          },
          { status: 400 }
        );
      }

      // Also check if actor can manage the NEW role (don't promote to higher level than themselves)
      if (!canManageRole(actorRole, role)) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Không thể gán role cao hơn role hiện tại của bạn' },
          { status: 403 }
        );
      }

      updatedUser = await updateUserRole(id, role);
    }

    if (status) {
      if (status !== 'active' && status !== 'locked') {
        return NextResponse.json(
          { error: 'Bad Request', message: 'status must be "active" or "locked"' },
          { status: 400 }
        );
      }

      // There is no `status` column; `locked_until` is the lock flag. A future
      // timestamp locks the account, NULL unlocks it. Login and token refresh
      // both reject while it is in the future.
      const results = await sql`
        UPDATE user_profiles
        SET locked_until = ${status === 'locked' ? LOCKED_UNTIL_SENTINEL : null},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      updatedUser = (results as UserRecord[])[0];
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// ─── DELETE: Delete a user ───────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { payload, error, response } = await verifyAdminRequest(request, 'user:delete');
    if (error) return response;

    const { id } = await params;

    // Prevent deletion of self
    if (id === payload.userId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Cannot delete yourself' },
        { status: 400 }
      );
    }

    const user = await findUserById(id);
    if (!user) {
      return NextResponse.json({ error: 'Not Found', message: 'User not found' }, { status: 404 });
    }

    // RBAC: Check hierarchy
    const actorRole = payload.role;
    const targetRole = user.role;
    if (!canManageRole(actorRole, targetRole)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Không có quyền xóa người dùng này' },
        { status: 403 }
      );
    }

    await deleteUser(id);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
