import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getAllDiscountCodes, createDiscountCode } from '@/lib/db';

// ─── GET: List all discount codes ───────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'discount:list' as any);
    if (error) return response;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || undefined;
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const { discounts, total } = await getAllDiscountCodes({
      page,
      limit,
      search,
      activeOnly,
    });

    return NextResponse.json({
      discounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching admin discounts:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ─── POST: Create a new discount code ────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'discount:create' as any);
    if (error) return response;

    const body = await request.json();
    const {
      code,
      type,
      value,
      min_booking_amount,
      max_discount_amount,
      start_date,
      end_date,
      usage_limit,
      usage_per_user_limit,
      is_active,
    } = body;

    // Simple validation
    if (!code || !type || value === undefined || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const discount = await createDiscountCode({
      code,
      type,
      value: Number(value),
      min_booking_amount: Number(min_booking_amount || 0),
      max_discount_amount: max_discount_amount ? Number(max_discount_amount) : null,
      start_date,
      end_date,
      usage_limit: usage_limit ? Number(usage_limit) : null,
      usage_per_user_limit: usage_per_user_limit ? Number(usage_per_user_limit) : null,
      is_active: is_active !== false,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Discount code created successfully',
        discount,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating discount:', error);
    // Handle unique constraint error for 'code'
    if (
      (error instanceof Error ? error.message : 'Unknown error')?.includes('unique constraint') ||
      (error as any).code === '23505'
    ) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Discount code already exists' },
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
