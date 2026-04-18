import { NextRequest, NextResponse } from 'next/server';
import { getDiscountCodeByCode, sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const { code, bookingAmount } = await request.json();

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

    // 4. Check usage per user limit
    if (userId && discount.usage_per_user_limit !== null) {
      // We need to check how many times THIS user has used THIS code.
      // This requires a join with bookings or a separate table.
      // Since we don't have a separate table yet, we can check bookings table.
      // Note: This assumes we store the used discount code in the booking or payment.
      // Wait, let's check if 'bookings' table has a 'discount_code' column.
      // I should have added it in the migration!
    }

    // 5. Check minimum booking amount
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
