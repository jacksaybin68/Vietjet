import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { validateCsrfOrReject } from '@/lib/csrf';
import { getAllAgencies, createAgency } from '@/lib/db';
import { parsePaginationParams } from '@/lib/pagination';

// ─── GET: List agencies ─────────────────────────────────────────────────────
/**
 * PostgreSQL raises `23505` (unique_violation) for duplicate keys. The driver
 * surfaces it as a `code` property on the thrown value, which TypeScript cannot
 * see on `unknown`.
 */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: unknown }).code === '23505'
  );
}

export async function GET(request: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'agency:list');
    if (error) return response;

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const search = searchParams.get('search') || undefined;
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const { agencies, total } = await getAllAgencies({ page, limit, search, activeOnly });

    return NextResponse.json({
      agencies,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching agencies:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ─── POST: Create an agency ─────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const csrfError = await validateCsrfOrReject(request);
  if (csrfError) return csrfError;

  try {
    const { error, response } = await verifyAdminRequest(request, 'agency:create');
    if (error) return response;

    const body = await request.json();
    const {
      code,
      name,
      contact_name,
      contact_email,
      contact_phone,
      address,
      commission_rate,
      notes,
      is_active,
    } = body;

    if (!code || !name) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Thiếu mã hoặc tên đại lý' },
        { status: 400 }
      );
    }

    const rate =
      commission_rate === undefined || commission_rate === null ? 0 : Number(commission_rate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Tỷ lệ hoa hồng phải trong khoảng 0-100' },
        { status: 400 }
      );
    }

    const agency = await createAgency({
      code: String(code).trim(),
      name: String(name).trim(),
      contact_name: contact_name || null,
      contact_email: contact_email || null,
      contact_phone: contact_phone || null,
      address: address || null,
      commission_rate: rate,
      notes: notes || null,
      is_active: is_active !== false,
    });

    return NextResponse.json({ success: true, message: 'Đã tạo đại lý', agency }, { status: 201 });
  } catch (error) {
    console.error('Error creating agency:', error);
    if (
      (error instanceof Error ? error.message : '')?.includes('unique constraint') ||
      isUniqueViolation(error)
    ) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Mã đại lý đã tồn tại' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
