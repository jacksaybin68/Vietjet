import { NextRequest, NextResponse } from 'next/server';
import { getDiscountCodeByCode, countUserDiscountUsage } from '@/lib/db';
import { getToken } from '@/lib/auth';
import { validateCsrfOrReject } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  try {
    const csrfError = await validateCsrfOrReject(request);
    if (csrfError) return csrfError;

    // Identity comes from the signed session cookie, never a client header.
    const session = await getToken(request);
    const userId = session?.userId ?? null;

    const body = await request.json().catch(() => null);
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    const rawAmount = Number(body?.bookingAmount);
    const bookingAmount = Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : 0;

    if (!code) {
      return NextResponse.json(
        { valid: false, message: 'Vui lòng nhập mã giảm giá' },
        { status: 400 }
      );
    }

    const discount = await getDiscountCodeByCode(code);

    if (!discount) {
      return NextResponse.json(
        { valid: false, message: 'Mã giảm giá không tồn tại' },
        { status: 404 }
      );
    }

    // 1. Check active status
    if (!discount.is_active) {
      return NextResponse.json(
        { valid: false, message: 'Mã giảm giá này đã bị tạm dừng' },
        { status: 400 }
      );
    }

    // 2. Check dates
    const now = new Date();
    const startDate = new Date(discount.start_date);
    const endDate = new Date(discount.end_date);

    if (now < startDate) {
      return NextResponse.json(
        { valid: false, message: 'Mã giảm giá chưa được áp dụng' },
        { status: 400 }
      );
    }

    if (now > endDate) {
      return NextResponse.json(
        { valid: false, message: 'Mã giảm giá đã hết hạn' },
        { status: 400 }
      );
    }

    // 3. Check usage limit (global)
    if (discount.usage_limit !== null && discount.used_count >= discount.usage_limit) {
      return NextResponse.json(
        { valid: false, message: 'Mã giảm giá đã hết lượt sử dụng' },
        { status: 400 }
      );
    }

    // 4. Check usage per user limit against this user's own bookings
    if (userId && discount.usage_per_user_limit !== null) {
      const usedByUser = await countUserDiscountUsage(userId, discount.id);
      if (usedByUser >= discount.usage_per_user_limit) {
        return NextResponse.json(
          { valid: false, message: 'Bạn đã sử dụng mã giảm giá này rồi' },
          { status: 400 }
        );
      }
    }

    // 5. Check minimum booking amount
    if (bookingAmount <= 0) {
      return NextResponse.json(
        { valid: false, message: 'Giá trị đơn hàng không hợp lệ' },
        { status: 400 }
      );
    }

    if (bookingAmount < Number(discount.min_booking_amount)) {
      return NextResponse.json(
        {
          valid: false,
          message: `Mã giảm giá chỉ áp dụng cho đơn hàng từ ${Number(discount.min_booking_amount).toLocaleString('vi-VN')}₫`,
        },
        { status: 400 }
      );
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (discount.type === 'fixed') {
      discountAmount = Number(discount.value);
    } else {
      discountAmount = (bookingAmount * Number(discount.value)) / 100;
      if (discount.max_discount_amount) {
        discountAmount = Math.min(discountAmount, Number(discount.max_discount_amount));
      }
    }

    return NextResponse.json({
      valid: true,
      discount: {
        id: discount.id,
        code: discount.code,
        type: discount.type,
        value: discount.value,
        discountAmount: Math.round(discountAmount),
      },
      message: 'Áp dụng mã giảm giá thành công',
    });
  } catch (error: any) {
    console.error('Error validating discount:', error);
    return NextResponse.json(
      { valid: false, message: 'Có lỗi xảy ra khi kiểm tra mã giảm giá' },
      { status: 500 }
    );
  }
}
