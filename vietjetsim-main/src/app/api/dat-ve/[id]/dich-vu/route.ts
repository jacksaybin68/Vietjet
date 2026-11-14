import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRequest } from '@/lib/auth';
import { isAdminRole } from '@/lib/rbac';
import {
  getBookingByCodeOrId,
  addBookingBaggage,
  getBookingBaggage,
  getPendingBaggageAmount,
} from '@/lib/db';
import { BAGGAGE_PACKAGES, OVERSIZED_BAGGAGE } from '@/features/bookings/pricing';
import { rateLimit } from '@/lib/rate-limit';
import { isGuestBookingOwner } from '@/lib/guest-booking';

/**
 * Danh sách gói hành lý hợp lệ, giá lấy từ `pricing.ts`.
 *
 * `pricing.ts` là nguồn sự thật duy nhất của mọi khoản phí trong đặt vé — bảng
 * giá ở đây chỉ là *danh sách*, không phải nơi quyết định giá.
 */
const BAGGAGE_CATALOG = [...BAGGAGE_PACKAGES, ...OVERSIZED_BAGGAGE];

/**
 * Mua thêm hành lý ký gửi sau khi đã hoàn tất đặt vé.
 *
 * Giá luôn do SERVER tính lại từ `pricing.ts`: client chỉ gửi `package_id`.
 * Nếu tin giá của client, một request đã sửa giá sẽ bán hành lý với giá 1₫.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limited = rateLimit(request, { windowMs: 60_000, maxRequests: 20 });
    if (limited) return limited;

    const { user, error, response } = await verifyAuthRequest(request);
    if (error === 'CSRF validation failed') return response!;

    const { id } = await params;
    const booking = await getBookingByCodeOrId(id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const canViewFullBooking =
      !!user && (isAdminRole(user.role) || booking.user_id === user.userId);
    const lookedUpByPnr = booking.booking_code?.toUpperCase() === id.toUpperCase();
    if (!canViewFullBooking && !lookedUpByPnr && !isGuestBookingOwner(request, booking.id)) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Vui lòng đăng nhập hoặc dùng mã đặt chỗ để mua thêm dịch vụ.',
        },
        { status: 403 }
      );
    }

    // Chỉ đặt vé đã thanh toán mới mua thêm được: hành lý ký gửi đi kèm vé.
    if (booking.status !== 'confirmed' && booking.status !== 'completed') {
      return NextResponse.json(
        {
          error: 'Booking not payable',
          message: 'Chỉ có thể mua thêm dịch vụ cho đặt chỗ đã thanh toán.',
        },
        { status: 409 }
      );
    }

    const body = await request.json();
    const packageId = String(body.package_id ?? '').trim();
    const quantity = Math.max(1, Math.min(5, Number(body.quantity ?? 1) || 1));

    const pkg = BAGGAGE_CATALOG.find((item) => item.id === packageId);
    if (!pkg) {
      return NextResponse.json(
        { error: 'Invalid package', message: 'Gói hành lý không tồn tại.' },
        { status: 400 }
      );
    }

    // Giá do server quyết định — không đọc giá nào từ request.
    const unitPrice = pkg.price;
    const total = unitPrice * quantity;

    const record = await addBookingBaggage({
      bookingId: booking.id,
      packageId: pkg.id,
      weightKg: pkg.weight,
      unitPrice,
      quantity,
      status: 'pending',
    });

    const pendingAmount = await getPendingBaggageAmount(booking.id);

    return NextResponse.json(
      {
        success: true,
        message: `Đã thêm ${pkg.label}. Số tiền cần thanh toán bổ sung: ${pendingAmount.toLocaleString('vi-VN')}₫`,
        baggage: record,
        pendingAmount,
        total,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding baggage:', error);
    return NextResponse.json(
      { error: 'Failed to add baggage', message: 'Không thêm được hành lý.' },
      { status: 500 }
    );
  }
}

/** Danh sách dịch vụ khách đã mua thêm. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const booking = await getBookingByCodeOrId(id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const baggage = await getBookingBaggage(booking.id);
    const pendingAmount = await getPendingBaggageAmount(booking.id);

    return NextResponse.json({ baggage, pendingAmount });
  } catch (error) {
    console.error('Error fetching baggage:', error);
    return NextResponse.json({ error: 'Failed to fetch baggage' }, { status: 500 });
  }
}
