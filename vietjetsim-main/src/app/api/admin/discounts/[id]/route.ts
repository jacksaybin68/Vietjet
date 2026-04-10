import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getDiscountCodeById, updateDiscountCode, deleteDiscountCode } from '@/lib/db';

// ─── GET: Get discount code by ID ───────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'discount:view' as any);
    if (error) return response;

    const { id } = await params;
    const discount = await getDiscountCodeById(id);

    if (!discount) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Discount code not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ discount });
  } catch (error: any) {
    console.error('Error fetching discount by ID:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}

// ─── PATCH: Update a discount code ──────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'discount:update' as any);
    if (error) return response;

    const { id } = await params;
    const body = await request.json();

    const updatedDiscount = await updateDiscountCode(id, body);

    if (!updatedDiscount) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Discount code not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Discount code updated successfully',
      discount: updatedDiscount,
    });
  } catch (error: any) {
    console.error('Error updating discount:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}

// ─── DELETE: Delete a discount code ─────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'discount:delete' as any);
    if (error) return response;

    const { id } = await params;
    await deleteDiscountCode(id);

    return NextResponse.json({
      success: true,
      message: 'Discount code deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting discount:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
