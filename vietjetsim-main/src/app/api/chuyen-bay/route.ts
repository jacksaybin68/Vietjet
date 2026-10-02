import { NextRequest, NextResponse } from 'next/server';
import { getAvailableDepartDates, searchFlights } from '@/lib/db';

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

    return NextResponse.json({ flights });
  } catch (error) {
    console.error('Flights API Error:', error);
    return NextResponse.json({ error: 'Không thể tìm kiếm chuyến bay' }, { status: 500 });
  }
}
