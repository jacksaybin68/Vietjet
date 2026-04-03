import { NextRequest, NextResponse } from 'next/server';
import { searchFlights } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromCode = searchParams.get('from');
    const toCode = searchParams.get('to');
    const departDate = searchParams.get('date');
    const seatClass = searchParams.get('class');

    if (!fromCode || !toCode) {
      return NextResponse.json({ error: 'Thiếu tham số bắt buộc: from, to' }, { status: 400 });
    }

    const flights = await searchFlights({
      from_code: fromCode,
      to_code: toCode,
      depart_date: departDate || undefined,
      class: seatClass || undefined,
    });

    return NextResponse.json({ flights });
  } catch (error) {
    console.error('Flights API Error:', error);
    return NextResponse.json({ error: 'Không thể tìm kiếm chuyến bay' }, { status: 500 });
  }
}
