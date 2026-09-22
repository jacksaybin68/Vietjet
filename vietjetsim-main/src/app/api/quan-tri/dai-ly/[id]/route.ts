import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getAgencyById, updateAgency, deleteAgency } from '@/lib/db';

// ─── GET: Get agency by ID ──────────────────────────────────────────────────
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'agency:view' as any);
    if (error) return response;

    const { id } = await params;
    const agency = await getAgencyById(id);

    if (!agency) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Không tìm thấy đại lý' },
        { status: 404 }
      );
    }

    return NextResponse.json({ agency });
  } catch (error) {
    console.error('Error fetching agency:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ─── PATCH: Update an agency ────────────────────────────────────────────────
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'agency:edit' as any);
    if (error) return response;

    const { id } = await params;
    const body = await request.json();

    if (body.commission_rate !== undefined && body.commission_rate !== null) {
      const rate = Number(body.commission_rate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Tỷ lệ hoa hồng phải trong khoảng 0-100' },
          { status: 400 }
        );
      }
    }

    // Strip id/timestamps so a client cannot rewrite them through this route.
    const {
      id: _ignoredId,
      created_at: _createdAt,
      updated_at: _updatedAt,
      discount_count: _discountCount,
      ...updates
    } = body;

    const agency = await updateAgency(id, updates);
    if (!agency) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Không tìm thấy đại lý' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Đã cập nhật đại lý', agency });
  } catch (error) {
    console.error('Error updating agency:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ─── DELETE: Delete an agency ───────────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'agency:delete' as any);
    if (error) return response;

    const { id } = await params;
    await deleteAgency(id);

    return NextResponse.json({ success: true, message: 'Đã xóa đại lý' });
  } catch (error) {
    console.error('Error deleting agency:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
