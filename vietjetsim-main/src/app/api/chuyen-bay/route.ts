import { NextRequest, NextResponse } from 'next/server';
import { getAvailableDepartDates, searchFlights } from '@/lib/db';
import { getFareForClass } from '@/features/bookings/pricing';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromCode = searchParams.get('from');
    const toCode = searchParams.get('to');
    const departDate = searchParams.get('date');
    const seatClass = searchParams.get('class');

    if (!fromCode || !toCode) {
      return NextResponse.json({ flights: [] });
    }

    const flights = await searchFlights({
      from_code: fromCode,
      to_code: toCode,
      depart_date: departDate || undefined,
      class: seatClass || undefined,
    });

    // An empty result gets the dates that do have flights, so the results page
    // can offer a real departure instead of telling the customer to look at a
    // strip of equally empty days. The lookup is a convenience on top of an
    // answer that is already correct, so its own failure is swallowed — losing
    // the suggestions beats turning a legitimate empty result into a 500.
    if (flights.length === 0 && departDate) {
      let availableDates: string[] = [];
      try {
        availableDates = await getAvailableDepartDates({
          from_code: fromCode,
          to_code: toCode,
        });
      } catch (error) {
        console.error('Flights API available-dates error:', error);
      }
      return NextResponse.json({ flights: [], availableDates });
    }

    // Bổ sung đầy đủ 4 hạng vé (Eco, Deluxe, SkyBoss, Business) theo công thức chuẩn
    // Single Source of Truth từ `getFareForClass`. Đồng thời giữ nguyên các trường gốc
    // để đảm bảo tương thích ngược hoàn toàn.
    const enrichedFlights = flights.map((flight) => {
      const faresSource = {
        economyPrice: flight.economy_price ?? flight.price,
        businessPrice: flight.business_price ?? Math.round(Number(flight.price || 0) * 2.5),
      };
      const ecoPrice = getFareForClass('eco', faresSource);
      const deluxePrice = getFareForClass('deluxe', faresSource);
      const skybossPrice = getFareForClass('skyboss', faresSource);
      const businessPrice = getFareForClass('business', faresSource);

      return {
        ...flight,
        // Tiện ích alias camelCase cho các client bên ngoài
        flightNo: flight.flight_no,
        from: flight.from_code,
        to: flight.to_code,
        departTime: flight.depart_time,
        arriveTime: flight.arrive_time,
        // Giá 4 hạng vé chi tiết
        economyPrice: ecoPrice,
        ecoPrice,
        deluxePrice,
        skybossPrice,
        businessPrice,
        fares: {
          eco: ecoPrice,
          deluxe: deluxePrice,
          skyboss: skybossPrice,
          business: businessPrice,
        },
      };
    });

    return NextResponse.json({ flights: enrichedFlights });
  } catch (error) {
    console.error('Flights API Error:', error);
    return NextResponse.json({ error: 'Không thể tìm kiếm chuyến bay' }, { status: 500 });
  }
}
