import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { collectVietjetNetwork } from '@/lib/openclaw/web-collection';
import { sql } from '@/lib/neon';

// Danh sách mã sân bay nội địa Việt Nam
const VN_AIRPORT_CODES = new Set([
  'HAN',
  'SGN',
  'DAD',
  'PQC',
  'CXR',
  'HPH',
  'HUI',
  'VDO',
  'VCA',
  'PXU',
  'BMV',
  'DLI',
  'VCS',
  'THD',
  'VII',
  'VDH',
  'UIH',
  'VCL',
  'DIN',
  'VKG',
  'HXX',
  'TUQ',
  'BBU',
  'TBB',
  'CAH',
]);

const COUNTRY_MAP: Record<string, string> = {
  // Australia
  ADL: 'Australia',
  MEL: 'Australia',
  SYD: 'Australia',
  BNE: 'Australia',
  PER: 'Australia',
  // China
  CAN: 'China',
  XIY: 'China',
  PVG: 'China',
  PKX: 'China',
  SHA: 'China',
  PEK: 'China',
  HGH: 'China',
  CTU: 'China',
  CKG: 'China',
  KMG: 'China',
  WNZ: 'China',
  // Taiwan
  TPE: 'Taiwan',
  KHH: 'Taiwan',
  RMQ: 'Taiwan',
  // Hong Kong / Macau
  HKG: 'Hong Kong',
  MFM: 'Macau',
  // India
  DEL: 'India',
  BOM: 'India',
  HYD: 'India',
  AMD: 'India',
  TRZ: 'India',
  COK: 'India',
  BLR: 'India',
  MAA: 'India',
  CCU: 'India',
  // Japan
  HND: 'Japan',
  NRT: 'Japan',
  KIX: 'Japan',
  FUK: 'Japan',
  HIJ: 'Japan',
  NGO: 'Japan',
  CTS: 'Japan',
  OKA: 'Japan',
  // South Korea
  ICN: 'South Korea',
  GMP: 'South Korea',
  PUS: 'South Korea',
  TAE: 'South Korea',
  CJU: 'South Korea',
  // Southeast Asia
  SIN: 'Singapore',
  BKK: 'Thailand',
  DMK: 'Thailand',
  CNX: 'Thailand',
  HKT: 'Thailand',
  KUL: 'Malaysia',
  PEN: 'Malaysia',
  CGK: 'Indonesia',
  DPS: 'Indonesia',
  MNL: 'Philippines',
  CEB: 'Philippines',
  PNH: 'Cambodia',
  REP: 'Cambodia',
  RGN: 'Myanmar',
  VTE: 'Laos',
};

function resolveCountry(code: string, city: string, name: string): string {
  const upper = code.toUpperCase();
  if (VN_AIRPORT_CODES.has(upper)) return 'Vietnam';
  if (COUNTRY_MAP[upper]) return COUNTRY_MAP[upper];
  const text = `${city} ${name}`.toLowerCase();
  if (
    text.includes('việt nam') ||
    text.includes('vietnam') ||
    (text.includes('sân bay') &&
      (text.includes('nội bài') ||
        text.includes('tân sơn nhất') ||
        text.includes('đà nẵng') ||
        text.includes('cà mau')))
  ) {
    return 'Vietnam';
  }
  return 'Quốc tế';
}

export interface DiffAirport {
  id?: string;
  code: string;
  name: string;
  city: string;
  country: string;
}

export async function POST(req: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(req, 'flight:price_edit');
    if (error) return response;

    let dryRun = false;
    try {
      const body = await req.json();
      dryRun = Boolean(body?.dryRun);
    } catch {
      // Body is optional or empty
    }

    const network = await collectVietjetNetwork();

    // Lấy danh sách mã sân bay hiện có trong DB
    const existingDbRows = (await sql`
      SELECT UPPER(code) as code FROM airports
    `) as Array<{ code: string }>;
    const existingSet = new Set(existingDbRows.map((r: { code: string }) => r.code));

    const existing: string[] = [];
    const diffAirports: Array<{ code: string; name: string; city: string; country: string }> = [];

    for (const ap of network.airports) {
      const code = ap.code.toUpperCase();
      if (existingSet.has(code)) {
        existing.push(code);
      } else {
        const country = resolveCountry(code, ap.city, ap.name);
        diffAirports.push({
          code,
          name: ap.name,
          city: ap.city,
          country,
        });
      }
    }

    let added: DiffAirport[] = [];

    if (!dryRun && diffAirports.length > 0) {
      for (const ap of diffAirports) {
        try {
          const rows = (await sql`
            INSERT INTO airports (code, name, city, country)
            VALUES (${ap.code}, ${ap.name}, ${ap.city}, ${ap.country})
            ON CONFLICT (code) DO NOTHING
            RETURNING id, code, name, city, country
          `) as Array<{
            id: string;
            code: string;
            name: string;
            city: string;
            country: string;
          }>;
          if (Array.isArray(rows) && rows.length > 0) {
            added.push(rows[0]);
          }
        } catch (dbErr) {
          console.error(`Lỗi khi thêm sân bay ${ap.code}:`, dbErr);
        }
      }
    } else {
      // Khi dryRun, danh sách "added" là những sân bay mới sẽ được thêm
      added = diffAirports;
    }

    return NextResponse.json({
      added,
      existing,
      total: network.airports.length,
      routesCount: network.routes.length,
      source: network.source,
      dryRun,
    });
  } catch (err) {
    console.error('Lỗi thu thập mạng lưới Vietjet:', err);
    return NextResponse.json(
      {
        error: 'Lỗi thu thập mạng lưới',
        message: err instanceof Error ? err.message : 'Không kết nối được CMS vietjetair.com',
      },
      { status: 500 }
    );
  }
}
