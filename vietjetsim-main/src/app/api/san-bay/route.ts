import { NextResponse } from 'next/server';
import { getAllAirports } from '@/lib/db';

const DOMESTIC_CODES = new Set([
  'SGN', 'HAN', 'DAD', 'PQC', 'CXR', 'HPH', 'HUI', 'DLI', 'VII', 'VDO',
  'VCA', 'UIH', 'BMV', 'PXU', 'TBB', 'VCL', 'THD', 'VDH', 'DIN', 'VCS', 'VKG',
]);

/**
 * Airport list for the hero search form.
 * Sắp xếp các sân bay nội địa (Việt Nam) lên đầu danh sách.
 */
export async function GET() {
  try {
    const airports = await getAllAirports();
    return NextResponse.json({
      airports: airports.map((a) => {
        const isDomestic =
          a.country === 'Vietnam' ||
          a.country === 'Việt Nam' ||
          DOMESTIC_CODES.has(a.code.toUpperCase());
        return {
          code: a.code,
          city: a.city,
          airport: a.name,
          country: a.country,
          isDomestic,
        };
      }),
    });
  } catch (error) {
    console.error('Airports API Error:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách sân bay' }, { status: 500 });
  }
}
