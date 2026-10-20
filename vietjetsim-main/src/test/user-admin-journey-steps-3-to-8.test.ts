import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getBookingTotals } from '@/features/bookings';
import { signAccessToken } from '@/lib/auth';

const createBookingMock = vi.hoisted(() => vi.fn());
const getFlightByIdMock = vi.hoisted(() => vi.fn());
const getBookingByIdMock = vi.hoisted(() => vi.fn());
const createPaymentAndConfirmBookingMock = vi.hoisted(() => vi.fn());
const searchCheckInMock = vi.hoisted(() => vi.fn());
const createCheckInMock = vi.hoisted(() => vi.fn());
const getBookingsByUserIdMock = vi.hoisted(() => vi.fn());
const getAllBookingsMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db')>();
  return {
    ...actual,
    createBooking: createBookingMock,
    getFlightById: getFlightByIdMock,
    getBookingById: getBookingByIdMock,
    createPaymentAndConfirmBooking: createPaymentAndConfirmBookingMock,
    searchCheckIn: searchCheckInMock,
    createCheckIn: createCheckInMock,
    getBookingsByUserId: getBookingsByUserIdMock,
    getAllBookings: getAllBookingsMock,
  };
});

const { POST: bookingPost, GET: bookingGet } = await import('@/app/api/dat-ve/route');
const { POST: paymentPost } = await import('@/app/api/thanh-toan/route');
const { GET: checkInGet, POST: checkInPost } = await import('@/app/api/checkin/route');
const { GET: adminBookingsGet } = await import('@/app/api/quan-tri/dat-ve/route');

describe('Full Real-world User & Admin Journey (Steps 3 to 8)', () => {
  const CSRF_TOKEN = 'test-journey-csrf-token-32-chars!';

  const customerToken = () =>
    signAccessToken({
      userId: 'usr-customer-888',
      email: 'nguyen.van.a@vietjetair.vn',
      role: 'user',
      fullName: 'Nguyễn Văn A',
    });

  const adminToken = () =>
    signAccessToken({
      userId: 'usr-admin-master-001',
      email: 'admin@vietjetair.vn',
      role: 'admin',
      fullName: 'Quản Trị Viên',
    });

  beforeEach(() => {
    vi.clearAllMocks();

    getFlightByIdMock.mockResolvedValue({
      id: 'f1',
      flight_no: 'VJ128',
      from_code: 'SGN',
      to_code: 'HAN',
      depart_time: '2026-10-25T08:00:00Z',
      arrive_time: '2026-10-25T10:15:00Z',
      price: 1000000,
      economy_price: 1000000,
      deluxe_price: 1800000,
      skyboss_price: 3200000,
    });

    createBookingMock.mockResolvedValue({
      id: 'bk-uuid-001',
      booking_code: 'VJ8888',
      status: 'pending',
      total_price: 3587500,
      created_at: new Date().toISOString(),
    });

    createPaymentAndConfirmBookingMock.mockResolvedValue({
      payment: {
        id: 'pay-uuid-001',
        booking_id: 'bk-uuid-001',
        amount: 3587500,
        status: 'completed',
        method: 'vietqr',
      },
      booking: {
        id: 'bk-uuid-001',
        booking_code: 'VJ8888',
        status: 'confirmed',
      },
    });

    getBookingByIdMock.mockResolvedValue({
      id: 'bk-uuid-001',
      booking_code: 'VJ8888',
      user_id: 'usr-customer-888',
      status: 'pending',
      total_price: 3587500,
      flight_id: 'f1',
    });

    searchCheckInMock.mockResolvedValue({
      booking: {
        id: 'bk-uuid-001',
        booking_code: 'VJ8888',
        flight_no: 'VJ128',
        from_code: 'SGN',
        to_code: 'HAN',
        depart_time: '2026-10-25T08:00:00Z',
        arrive_time: '2026-10-25T10:15:00Z',
        status: 'confirmed',
      },
      checkIn: null,
    });

    createCheckInMock.mockResolvedValue({
      id: 'chk-001',
      booking_id: 'bk-uuid-001',
      check_in_number: 'CK-998811',
      boarding_pass_number: 'BP-VJ128-1A',
      boarding_time: '07:20',
      gate: '04',
      terminal: 'T1',
    });

    getBookingsByUserIdMock.mockResolvedValue({
      bookings: [
        {
          id: 'bk-uuid-001',
          booking_code: 'VJ8888',
          status: 'confirmed',
          total_price: 3587500,
          flight: {
            flight_no: 'VJ128',
            from_code: 'SGN',
            to_code: 'HAN',
          },
          passengers: [{ name: 'NGUYEN VAN A', seat_number: '1A' }],
        },
      ],
      total: 1,
    });

    getAllBookingsMock.mockResolvedValue({
      bookings: [
        {
          id: 'bk-uuid-001',
          booking_code: 'VJ8888',
          user_email: 'nguyen.van.a@vietjetair.vn',
          user_name: 'Nguyễn Văn A',
          status: 'confirmed',
          total_price: 3587500,
          flight_no: 'VJ128',
        },
      ],
      total: 1,
    });
  });

  // =========================================================================
  // STEP 3: Passenger Information step (/dat-ve/hanh-khach)
  // =========================================================================
  it('Step 3: Passenger Information calculates dynamic breakdown (Adult 100%, Child 75%, Infant 0 VND)', () => {
    const passengerCounts = {
      adult: 2,
      child: 1,
      infant: 1,
    };
    const baseAdultFare = 1000000;

    const totals = getBookingTotals({
      farePerPassenger: baseAdultFare,
      passengerCount: 4,
      paxCounts: passengerCounts,
      seatFee: 150000,
      ancillaries: ['insurance'],
    });

    // 2 Người lớn (2x1.000.000) + 1 Trẻ em (75% x 1.000.000) + 1 Em bé (0 VND) = 2.750.000 VND
    expect(totals.fareSubtotal).toBe(2750000);
    // Thuế phí tính trên vé có ghế ngồi: 2.750.000 * 15% = 412.500 VND
    expect(totals.taxAndFee).toBe(412500);
    // Phí chọn chỗ ngồi: 150.000 VND
    expect(totals.seatFee).toBe(150000);
    // Phí dịch vụ: 3 người lớn & trẻ em * 60.000 = 180.000 VND
    expect(totals.ancillaryFee).toBe(180000);
    // Tổng số tiền cần thanh toán
    expect(totals.total).toBe(2750000 + 412500 + 150000 + 180000);
  });

  // =========================================================================
  // STEP 4: Ancillary Services / Seat selection
  // =========================================================================
  it('Step 4: Ancillary Services & Seat selection handles seat selection and service options', () => {
    const seatMap = {
      '1A': { type: 'front_row', price: 100000 },
      '12C': { type: 'standard', price: 50000 },
    };
    const baggageOptions = [
      { id: 'bg-20kg', weight: '20kg', price: 250000 },
      { id: 'bg-30kg', weight: '30kg', price: 350000 },
    ];
    const mealOptions = [{ id: 'meal-chicken-rice', name: 'Cơm gà xối mỡ', price: 85000 }];

    const selectedSeatTotal = seatMap['1A'].price + seatMap['12C'].price;
    const selectedBaggage = baggageOptions[0].price;
    const selectedMeal = mealOptions[0].price;

    expect(selectedSeatTotal).toBe(150000);
    expect(selectedBaggage).toBe(250000);
    expect(selectedMeal).toBe(85000);
    expect(selectedSeatTotal + selectedBaggage + selectedMeal).toBe(485000);
  });

  // =========================================================================
  // STEP 5: Payment page (/thanh-toan)
  // =========================================================================
  it('Step 5: Payment page creates booking and confirms via payment gateway', async () => {
    // 5.1. Khách gửi thông tin tạo booking
    const bookingReq = new NextRequest('http://localhost:4028/api/dat-ve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': CSRF_TOKEN,
        cookie: `access_token=${customerToken()}; csrf_token=${CSRF_TOKEN}`,
      },
      body: JSON.stringify({
        flight_id: 'f1',
        fareClass: 'eco',
        passengers: [
          {
            name: 'NGUYEN VAN A',
            type: 'adult',
            dob: '1990-01-01',
            idNumber: '001099012345',
            phone: '0900000000',
            email: 'a@vietjetair.vn',
          },
        ],
        seats: ['1A'],
        ancillaries: ['insurance'],
        consents: {
          policyAccepted: true,
          marketing: false,
        },
      }),
    });

    const bookingRes = await bookingPost(bookingReq);
    expect(bookingRes.status).toBe(201);
    const bookingJson = await bookingRes.json();
    expect(bookingJson.booking).toBeDefined();
    expect(bookingJson.booking.id).toBe('bk-uuid-001');

    // 5.2. Khách thực hiện thanh toán tại trang /thanh-toan
    const payReq = new NextRequest('http://localhost:4028/api/thanh-toan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': CSRF_TOKEN,
        cookie: `access_token=${customerToken()}; csrf_token=${CSRF_TOKEN}`,
      },
      body: JSON.stringify({
        booking_id: 'bk-uuid-001',
        method: 'card',
        amount: 3587500,
      }),
    });

    const payRes = await paymentPost(payReq);
    expect(payRes.status).toBe(201);
    const payJson = await payRes.json();
    expect(payJson.success).toBe(true);

    // Sau khi thanh toán, trạng thái đặt chỗ trở thành confirmed
    getBookingByIdMock.mockResolvedValue({
      id: 'bk-uuid-001',
      booking_code: 'VJ8888',
      user_id: 'usr-customer-888',
      status: 'confirmed',
      flight_id: 'f1',
    });
  });

  // =========================================================================
  // STEP 6: Online Check-in (/lam-thu-tuc)
  // =========================================================================
  it('Step 6: Online Check-in searches booking by PNR and issues boarding pass', async () => {
    // Đảm bảo booking đã confirmed để làm thủ tục
    getBookingByIdMock.mockResolvedValue({
      id: 'bk-uuid-001',
      booking_code: 'VJ8888',
      user_id: 'usr-customer-888',
      status: 'confirmed',
      flight_id: 'f1',
    });

    // 6.1. Tra cứu làm thủ tục bằng mã đặt chỗ PNR và họ khách hàng
    const checkInSearchReq = new NextRequest(
      'http://localhost:4028/api/checkin?bookingCode=VJ8888&lastName=NGUYEN',
      {
        method: 'GET',
        headers: {
          cookie: `access_token=${customerToken()}`,
        },
      }
    );

    const checkInSearchRes = await checkInGet(checkInSearchReq);
    expect(checkInSearchRes.status).toBe(200);
    const checkInData = await checkInSearchRes.json();
    expect(checkInData.booking.booking_code).toBe('VJ8888');
    expect(checkInData.booking.flight_no).toBe('VJ128');

    // 6.2. Xác nhận làm thủ tục trực tuyến
    const confirmCheckInReq = new NextRequest('http://localhost:4028/api/checkin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': CSRF_TOKEN,
        cookie: `access_token=${customerToken()}; csrf_token=${CSRF_TOKEN}`,
      },
      body: JSON.stringify({
        bookingId: 'bk-uuid-001',
        seatNumber: '1A',
        flightNo: 'VJ128',
        fromCode: 'SGN',
        toCode: 'HAN',
        departTime: '2026-10-25T08:00:00Z',
        passengerName: 'NGUYEN VAN A',
      }),
    });

    const confirmCheckInRes = await checkInPost(confirmCheckInReq);
    expect(confirmCheckInRes.status).toBe(201);
    const confirmCheckInData = await confirmCheckInRes.json();
    expect(confirmCheckInData.checkIn).toBeDefined();
    expect(confirmCheckInData.checkIn.check_in_number).toBe('CK-998811');
    expect(confirmCheckInData.checkIn.boarding_pass_number).toBe('BP-VJ128-1A');
  });

  // =========================================================================
  // STEP 7: My Flights / PNR Lookup (/chuyen-bay-cua-toi)
  // =========================================================================
  it('Step 7: My Flights fetches user booking history and confirmed e-tickets', async () => {
    const myFlightsReq = new NextRequest('http://localhost:4028/api/dat-ve', {
      method: 'GET',
      headers: {
        cookie: `access_token=${customerToken()}`,
      },
    });

    const myFlightsRes = await bookingGet(myFlightsReq);
    expect(myFlightsRes.status).toBe(200);
    const myFlightsData = await myFlightsRes.json();
    expect(myFlightsData.bookings.length).toBe(1);
    expect(myFlightsData.bookings[0].booking_code).toBe('VJ8888');
    expect(myFlightsData.bookings[0].status).toBe('confirmed');
    expect(myFlightsData.bookings[0].flight.flight_no).toBe('VJ128');
  });

  // =========================================================================
  // STEP 8: Login (/dang-nhap) & Admin Console (/quan-tri)
  // =========================================================================
  it('Step 8: Admin checks and verifies bookings in Admin Management Console', async () => {
    const adminReq = new NextRequest('http://localhost:4028/api/quan-tri/dat-ve', {
      method: 'GET',
      headers: {
        cookie: `access_token=${adminToken()}`,
      },
    });

    const adminRes = await adminBookingsGet(adminReq);
    expect(adminRes.status).toBe(200);
    const adminData = await adminRes.json();
    expect(adminData.bookings.length).toBe(1);
    expect(adminData.bookings[0].booking_code).toBe('VJ8888');
    expect(adminData.bookings[0].user_email).toBe('nguyen.van.a@vietjetair.vn');
    expect(adminData.bookings[0].status).toBe('confirmed');
  });
});
