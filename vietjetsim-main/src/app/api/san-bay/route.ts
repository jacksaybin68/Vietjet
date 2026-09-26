import { NextResponse } from 'next/server';
import { getAllAirports } from '@/lib/db';

/**
 * Airport list for the hero search form.
 *
 * The list used to be a hard-coded array in the page, which is how VDH slipped
 * through: the row was in the database but not in the array, so a customer could
 * pick it and get zero flights. Serving the table keeps the two in step.
 */
export async function GET() {
  try {
    const airports = await getAllAirports();
    return NextResponse.json({
      airports: airports.map((a) => ({ code: a.code, city: a.city, airport: a.name })),
    });
  } catch (error) {
    console.error('Airports API Error:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách sân bay' }, { status: 500 });
  }
}
