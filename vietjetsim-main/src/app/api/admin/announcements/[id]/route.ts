import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { verifyAdminRequest } from '@/lib/admin-auth';

// ─── PATCH: Update an announcement ──────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'announcement:crud');
    if (error) return response;

    const { id } = await params;
    const body = await request.json();
    const { title, content, type, target_role, is_active, start_date, end_date } = body;

    // Check if announcement exists
    const existing = await sql`
      SELECT id FROM announcements WHERE id = ${id}
    `;

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Announcement not found' },
        { status: 404 }
      );
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(content);
    }
    if (type !== undefined) {
      updates.push(`type = $${paramIndex++}`);
      values.push(type);
    }
    if (target_role !== undefined) {
      updates.push(`target_role = $${paramIndex++}`);
      values.push(target_role);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }
    if (start_date !== undefined) {
      updates.push(`start_date = $${paramIndex++}`);
      values.push(start_date || null);
    }
    if (end_date !== undefined) {
      updates.push(`end_date = $${paramIndex++}`);
      values.push(end_date || null);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const [announcement] = await sql`
      UPDATE announcements 
      SET ${sql.unsafe(updates.join(', '))}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      announcement,
      message: 'Announcement updated successfully',
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update announcement' },
      { status: 500 }
    );
  }
}

// ─── DELETE: Delete an announcement ─────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'announcement:crud');
    if (error) return response;

    const { id } = await params;

    const [deleted] = await sql`
      DELETE FROM announcements WHERE id = ${id}
      RETURNING id
    `;

    if (!deleted) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Announcement not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Announcement deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to delete announcement' },
      { status: 500 }
    );
  }
}
