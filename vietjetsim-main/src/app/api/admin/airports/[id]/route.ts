import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { verifyAdminRequest } from '@/lib/admin-auth';

// ─── PATCH: Update an airport ──────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'airport:manage');
    if (error) return response;

    const { id } = params;
    const body = await request.json();
    const { code, name, city, country } = body;

    // Check if airport exists
    const existing = await sql`
      SELECT id FROM airports WHERE id = ${id}
    `;

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Airport not found' },
        { status: 404 }
      );
    }

    // Check if new code conflicts with another airport
    if (code) {
      const conflict = await sql`
        SELECT id FROM airports WHERE code = ${code.toUpperCase()} AND id != ${id}
      `;

      if (conflict.length > 0) {
        return NextResponse.json(
          { error: 'Conflict', message: 'Airport code already exists' },
          { status: 409 }
        );
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (code !== undefined) {
      updates.push(`code = $${paramIndex++}`);
      values.push(code.toUpperCase());
    }
    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (city !== undefined) {
      updates.push(`city = $${paramIndex++}`);
      values.push(city);
    }
    if (country !== undefined) {
      updates.push(`country = $${paramIndex++}`);
      values.push(country);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'No fields to update' },
        { status: 400 }
      );
    }

    values.push(id);

    const updateQuery = `
      UPDATE airports 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, code, name, city, country, created_at
    `;

    const [airport] = await sql(updateQuery, ...values);

    return NextResponse.json({
      success: true,
      airport,
      message: 'Airport updated successfully',
    });
  } catch (error) {
    console.error('Error updating airport:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update airport' },
      { status: 500 }
    );
  }
}

// ─── DELETE: Delete an airport ──────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'airport:manage');
    if (error) return response;

    const { id } = params;

    // Check if airport is used by any flights
    const flightsUsingAirport = await sql`
      SELECT id FROM flights WHERE from_code = (
        SELECT code FROM airports WHERE id = ${id}
      ) OR to_code = (
        SELECT code FROM airports WHERE id = ${id}
      )
      LIMIT 1
    `;

    if (flightsUsingAirport.length > 0) {
      return NextResponse.json(
        { 
          error: 'Conflict', 
          message: 'Cannot delete airport that is used by existing flights. Please remove or reassign flights first.' 
        },
        { status: 409 }
      );
    }

    const [deleted] = await sql`
      DELETE FROM airports WHERE id = ${id}
      RETURNING id
    `;

    if (!deleted) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Airport not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Airport deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting airport:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to delete airport' },
      { status: 500 }
    );
  }
}
