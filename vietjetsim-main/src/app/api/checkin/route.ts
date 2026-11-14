import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRequest } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import {
  getBookingById,
  getFlightById,
  getTripByCodeOrId,
  getTripById,
  createCheckIn,
  getCheckInStatusByBookingId,
  setPassengerSeatNumber,
  type TripLegRecord,
} from '@/lib/db';
import { sql } from '@/lib/neon';
import { rateLimit } from '@/lib/rate-limit';
import { getApiErrorMessage } from '@/shared/services';

/**
 * Cửa sổ check-in: mở 24 giờ trước giờ bay.
 *
 * Quy định thật của Vietjet là "từ 24 giờ đến 60 phút trước giờ bay", nhưng
 * giờ đóng cửa sổ thay đổi theo sân bay và theo tuyến quốc tế, nên chỉ dùng
 * mốc mở 24 giờ (điều khách đã yêu cầu rõ) và không chặn ở mốc đóng — chặn
 * sớm sẽ hỏng luồng của khách đã thanh toán nhưng chưa tới giờ.
 */
const CHECKIN_WINDOW_HOURS = 24;

/** Cờ bật/tắt trong `system_config`, để admin tắt khi cần (mặc định bật). */
async function isCheckInWindowEnforced(): Promise<boolean> {
  try {
    const rows = await sql`
      SELECT value FROM system_config WHERE key = 'checkin_window_enforced'
    `;
    const value = (rows as Array<{ value?: string }>)[0]?.value;
    // Mặc định BẬT: cửa sổ 24 giờ là quy định, không phải tuỳ chọn. Admin
    // tắt được bằng cách đặt giá trị 'false'.
    return value !== 'false';
  } catch {
    return true;
  }
}

/** Số phút còn lại tới giờ bay (âm nghĩa là đã bay). */
function minutesUntilDeparture(departTime: string): number {
  const depart = new Date(departTime).getTime();
  if (Number.isNaN(depart)) return Number.POSITIVE_INFINITY;
  return Math.round((depart - Date.now()) / 60000);
}

/** Tra cứu chặng theo vai trò. */
function pickLeg(
  legs: TripLegRecord[],
  legRole: 'outbound' | 'inbound'
): TripLegRecord | undefined {
  return legs.find((leg) => leg.legRole === legRole);
}

/**
 * Chuẩn hoá tên để so khớp không phân biệt hoa thường và dấu.
 *
 * Tên hành khách trong DB viết "NGUYEN VAN A" còn khách gõ "nguyen" trên điện
 * thoại. Khác với PNR, ở đây dấu cũng không quan trọng — khách gõ "nguyen"
 * cho "Nguyễn" phải ra kết quả.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Mô tả cửa sổ check-in của một chặng cho UI. */
function describeCheckInWindow(leg: TripLegRecord, enforced: boolean) {
  const minutes = minutesUntilDeparture(leg.departTime);
  const opensAt = new Date(new Date(leg.departTime).getTime() - CHECKIN_WINDOW_HOURS * 3600_000);
  const isOpen = !enforced || minutes <= CHECKIN_WINDOW_HOURS * 60;
  return {
    enforced,
    opensAt: opensAt.toISOString(),
    minutesUntilDeparture: Number.isFinite(minutes) ? minutes : null,
    isOpen,
    reason: isOpen ? null : `Check-in mở từ ${CHECKIN_WINDOW_HOURS} giờ trước giờ bay.`,
  };
}

// GET /api/checkin - Tra cứu đặt chỗ (mã đặt chỗ + họ)
//
// Một PNR của chặng về phải ra được CẢ HAI chặng: khách không nhớ mình đặt
// chặng nào trước. Response trả `trip` gồm `outbound` + `inbound` (mỗi
// chặng có thể null nếu chuyến đó là một chặng đơn).
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = rateLimit(request, { windowMs: 60_000, maxRequests: 20 });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { searchParams } = new URL(request.url);
    const bookingCode = searchParams.get('bookingCode');
    const lastName = searchParams.get('lastName');
    const firstName = searchParams.get('firstName') || '';

    if (!bookingCode || !lastName) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Mã đặt chỗ và họ là bắt buộc' },
        { status: 400 }
      );
    }

    const trip = await getTripByCodeOrId(bookingCode.trim());
    if (!trip || trip.legs.length === 0) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Không tìm thấy đặt chỗ phù hợp' },
        { status: 404 }
      );
    }

    // Xác thực họ tên trên CHẶNG ĐI (chặng về có thể không tồn tại với vé 1
    // chặng). Họ tên là thông tin trên vé nên mọi chặng đều mang cùng hành
    // khách; kiểm một chặng là đủ và tránh việc khách phải nhớ họ của chặng
    // nào.
    const anchorLeg = pickLeg(trip.legs, 'outbound') ?? trip.legs[0];
    const nameMatches = anchorLeg.passengers.some((passenger) =>
      normalizeName(passenger.name).includes(normalizeName(`${lastName} ${firstName}`.trim()))
    );

    if (!nameMatches) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Không tìm thấy đặt chỗ phù hợp' },
        { status: 404 }
      );
    }

    const windowEnforced = await isCheckInWindowEnforced();
    const legs = trip.legs.map((leg) => ({
      ...leg,
      checkInWindow: describeCheckInWindow(leg, windowEnforced),
    }));

    return NextResponse.json({
      trip: {
        tripId: trip.tripId,
        outbound: pickLeg(legs, 'outbound') ?? null,
        inbound: pickLeg(legs, 'inbound') ?? null,
      },
      // Tương thích ngược: `booking` + `checkIn` + `hasCheckIn` là shape cũ,
      // vẫn trả về cho chặng đi để không phá màn hình cũ trong lúc chuyển.
      booking: legs[0]
        ? {
            id: legs[0].bookingId,
            booking_code: legs[0].bookingCode,
            status: legs[0].status,
            flight_id: legs[0].flightId,
            total_price: legs[0].totalPrice,
            created_at: '',
            flight_no: legs[0].flightNo,
            from_code: legs[0].fromCode,
            to_code: legs[0].toCode,
            depart_time: legs[0].departTime,
            arrive_time: legs[0].arriveTime,
            seat_number: legs[0].passengers[0]?.seat_number ?? null,
          }
        : null,
      checkIn: legs[0]?.checkIns[0] ?? null,
      hasCheckIn: (legs[0]?.checkIns.length ?? 0) > 0,
    });
  } catch (error) {
    console.error('Check-in search error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: getApiErrorMessage(error, 'Lỗi hệ thống') },
      { status: 500 }
    );
  }
}

// POST /api/checkin - Tạo check-in cho một chặng
export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = rateLimit(request, { windowMs: 60_000, maxRequests: 5 });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { user, error: authError, response: authResponse } = await verifyAuthRequest(request);
    if (authError || !user) return authResponse!;

    const body = await request.json();

    // `bookingId` là UUID của dòng `bookings`; `leg` chọn chặng cần check-in.
    const bookingId = String(body.bookingId ?? '').trim();
    const leg: 'outbound' | 'inbound' = body.leg === 'inbound' ? 'inbound' : 'outbound';

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Thiếu mã đặt chỗ' },
        { status: 400 }
      );
    }

    // Self-service check-in must only touch the caller's own booking; without
    // this, any signed-in user could check in a stranger's reservation by id.
    const booking = await getBookingById(bookingId);
    if (!booking) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Không tìm thấy đặt chỗ' },
        { status: 404 }
      );
    }
    if (!isAdminRole(user.role) && booking.user_id !== user.userId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Không có quyền truy cập' },
        { status: 403 }
      );
    }

    // Only confirmed bookings can be checked in. Cancelled / refunded /
    // completed bookings must not issue a boarding pass.
    if (booking.status !== 'confirmed') {
      return NextResponse.json(
        {
          error: 'Booking not payable',
          message: `Không thể check-in đặt chỗ có trạng thái '${booking.status}'.`,
        },
        { status: 400 }
      );
    }

    const trip = await getTripById(String((booking as { trip_id?: string }).trip_id ?? ''));
    const legRecord = trip ? pickLeg(trip.legs, leg) : undefined;
    if (!legRecord) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Không tìm thấy chặng bay cần check-in' },
        { status: 404 }
      );
    }

    // Chặng về chỉ check-in được khi chặng đi đã hoàn tất — khách phải đi
    // chặng đi trước, nên chặng đi phải `confirmed`.
    if (leg === 'inbound') {
      const outbound = pickLeg(trip!.legs, 'outbound');
      if (outbound && outbound.status !== 'confirmed') {
        return NextResponse.json(
          {
            error: 'Outbound not completed',
            message:
              'Chặng đi chưa được xác nhận nên chưa thể check-in chặng về. Vui lòng hoàn tất thanh toán chặng đi trước.',
            outboundBookingId: outbound.bookingId,
          },
          { status: 409 }
        );
      }
    }

    // The flight must not already have departed or completed.
    const flight = await getFlightById(legRecord.flightId);
    if (!flight) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Không tìm thấy chuyến bay' },
        { status: 404 }
      );
    }
    if (['departed', 'completed', 'cancelled'].includes(flight.status)) {
      return NextResponse.json(
        {
          error: 'Flight not check-inable',
          message: `Chuyến bay đã ${flight.status}, không thể check-in.`,
        },
        { status: 400 }
      );
    }

    // Cửa sổ 24 giờ trước giờ bay.
    if (await isCheckInWindowEnforced()) {
      const minutes = minutesUntilDeparture(legRecord.departTime);
      if (minutes > CHECKIN_WINDOW_HOURS * 60) {
        return NextResponse.json(
          {
            error: 'Check-in window not open',
            message: `Check-in chỉ mở từ ${CHECKIN_WINDOW_HOURS} giờ trước giờ bay. Chặng ${leg === 'inbound' ? 'về' : 'đi'} khởi hành lúc ${new Date(legRecord.departTime).toLocaleString('vi-VN')}.`,
            opensAt: new Date(
              new Date(legRecord.departTime).getTime() - CHECKIN_WINDOW_HOURS * 3600_000
            ).toISOString(),
          },
          { status: 409 }
        );
      }
    }

    // Đã check-in chặng này chưa? Trả 409 (không 400) để client phân biệt
    // "đã check-in" với "lỗi".
    const existingCheckIn = await getCheckInStatusByBookingId(bookingId);
    if (existingCheckIn?.has_check_in) {
      return NextResponse.json(
        {
          error: 'Already Checked In',
          message: 'Bạn đã thực hiện check-in cho chuyến bay này rồi',
          checkInNumber: existingCheckIn.check_in_number,
        },
        { status: 409 }
      );
    }

    // Ghế: mỗi hành khách một ghế. Client gửi danh sách ghế theo hành khách;
    // server ghi vào `seats` + `passengers.seat_number` (migration 046).
    const seatAssignments = Array.isArray(body.seats)
      ? (body.seats as Array<{ passengerId?: string; seatId?: string; seatNumber?: string }>)
      : [];

    const created: Array<{
      passengerId: string | null;
      seatNumber: string;
      checkInNumber: string;
      boardingPassNumber: string | null;
    }> = [];

    for (const assignment of seatAssignments) {
      const passenger = legRecord.passengers.find((p) => p.id === assignment.passengerId);
      const seatNumber = (assignment.seatNumber ?? passenger?.seat_number ?? '').trim();
      if (!seatNumber) continue;

      // Ghi ghế vào DB. `idx_seats_flight_seat_unique` chặn ghế trùng ⇒ khi
      // ghế vừa có người chọn, Postgres báo 23505 và route trả 409.
      if (assignment.seatId) {
        await sql`
          UPDATE seats
          SET check_in_status = 'checked_in', check_in_time = NOW()
          WHERE id = ${assignment.seatId} AND booking_id = ${bookingId}
        `;
      }

      if (assignment.passengerId) {
        await setPassengerSeatNumber(assignment.passengerId, seatNumber);
      }

      const checkIn = await createCheckIn({
        bookingId,
        passengerId: assignment.passengerId ?? null,
        seatId: assignment.seatId ?? null,
        seatNumber,
        flightNo: legRecord.flightNo,
        fromCode: legRecord.fromCode,
        toCode: legRecord.toCode,
        departTime: legRecord.departTime,
        passengerName: passenger?.name ?? body.passengerName ?? '',
        idNumber: passenger?.id_number ?? body.idNumber ?? null,
        baggageInfo: body.baggageInfo || null,
        gate: legRecord.gate ?? null,
        terminal: legRecord.terminal ?? null,
      });

      created.push({
        passengerId: assignment.passengerId ?? null,
        seatNumber,
        checkInNumber: checkIn.check_in_number,
        boardingPassNumber: checkIn.boarding_pass_number ?? checkIn.check_in_number,
      });
    }

    if (created.length === 0) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Thiếu thông tin ghế của hành khách để check-in',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Check-in thành công!',
        leg,
        bookingId,
        checkIns: created,
        // Giữ shape cũ cho client chưa chuyển sang mảng.
        checkIn: {
          check_in_number: created[0].checkInNumber,
          gate: legRecord.gate ?? null,
          terminal: legRecord.terminal ?? null,
          boarding_pass_number: created[0].boardingPassNumber,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Check-in creation error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: getApiErrorMessage(error, 'Lỗi hệ thống') },
      { status: 500 }
    );
  }
}
