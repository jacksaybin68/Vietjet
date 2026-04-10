import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { updateUserRole, findUserById } from '@/lib/db';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const { payload, error, response } = await verifyAdminRequest(
      request as unknown as NextRequest,
      'user:role_change'
    );
    if (error) return response;

    let body: { newRole?: string } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!body.newRole) {
      return NextResponse.json(
        { error: 'Missing required field', message: 'newRole is required' },
        { status: 400 }
      );
    }

    // Validate new role against system roles
    const validRoles = [
      'user',
      'admin',
      'super_admin',
      'admin_ops',
      'admin_finance',
      'admin_support',
      'admin_content',
    ];
    if (!validRoles.includes(body.newRole)) {
      return NextResponse.json(
        { error: 'Invalid role', message: `Role must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    // Check RBAC role management permission
    // (already verified by verifyAdminRequest with user:role_change permission)

    const userToUpdate = await findUserById(id);
    if (!userToUpdate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updatedUser = await updateUserRole(id, body.newRole as any);

    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.full_name,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to update user role' },
      { status: 500 }
    );
  }
}
