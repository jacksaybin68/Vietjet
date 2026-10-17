/**
 * Tra cứu chuyến bay cho trợ lý OpenClaw Coordinator.
 *
 * Trước đây file này **không tra cứu gì cả**: nó chỉ dựng một URL đặt vé rồi
 * trả về `flights: []` kèm cờ `isRealTime: true`. Tuyến trợ lý vì thế nhồi cho
 * model một câu sai sự thật ("Đã tìm thấy lộ trình thực tế … tại VietjetAir") và
 * model tự bịa số hiệu, giờ bay, giá.
 *
 * Giờ nó đọc chính bảng `flights` mà trang bán vé đọc, nên câu trả lời khớp với
 * thứ khách thật sự mua được — và khi ngày đó không có chuyến thì nói thẳng là
 * không có, kèm những ngày gần nhất còn chỗ.
 *
 * Lưu ý nguồn ngoài (đo được 2026-10-18, xem web-collection.ts): mạng lưới
 * sân bay/tuyến bay lấy được thật từ CMS `vietjetcms-api.vietjetair.com`;
 * còn lịch bay từng ngày + giá thì gateway `/booking` chặn 403 (WAF). Trong
 * module này vẫn chỉ đọc cơ sở dữ liệu — nguồn sự thật mà khách mua vé với.
 * Hướng thu thập web đi theo lệnh "thu thập" ở web-collection.ts.
 */
import { getAvailableDepartDates, searchFlights, type FlightRecord } from '@/lib/db';
import { AIRPORT_CITIES } from '@/shared/constants';
import { addDateDays, toVietnamWallClock } from '@/lib/utils';

export interface ResearchedFlight {
  flightNo: string;
  from: string;
  to: string;
  /** Giờ Việt Nam, `HH:MM`. */
  departTime: string;
  arriveTime: string;
  economyPrice: number;
  businessPrice: number;
  available: number;
}

export interface FlightResearchResult {
  origin: string;
  destination: string;
  date: string;
  flights: ResearchedFlight[];
  /** Những ngày gần nhất còn chuyến — chỉ tra khi ngày được hỏi trống. */
  availableDates: string[];
  bookingUrl: string;
  /** Nguồn dữ liệu thật của kết quả. Không còn cờ "real-time" khai man. */
  source: 'database';
}

export interface FlightQuery {
  origin: string;
  destination: string;
  date: string;
}

/**
 * `NUMERIC` về từ driver dưới dạng *chuỗi*, nên cộng/so sánh trực tiếp sẽ nối
 * chuỗi. Ép bằng `Number` trước khi dùng.
 */
const toPrice = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Hôm nay theo lịch Việt Nam (`YYYY-MM-DD`). */
export const todayInVietnam = (): string => toVietnamWallClock(new Date().toISOString()).date;

/**
 * Vietnamese city names a customer actually types. The IATA codes alone are not
 * enough: "chuyến bay Hà Nội đi Phú Quốc" carries no code at all, and the route
 * this feeds is the difference between a real answer and a fabricated one.
 */
const CITY_TO_CODE: Record<string, string> = {
  'hà nội': 'HAN',
  'sài gòn': 'SGN',
  'hồ chí minh': 'SGN',
  'đà nẵng': 'DAD',
  'phú quốc': 'PQC',
  'nha trang': 'CXR',
  'hải phòng': 'HPH',
  huế: 'HUI',
  'cần thơ': 'VCA',
  vinh: 'VII',
  'đà lạt': 'DLI',
  'thanh hóa': 'THD',
  'quy nhơn': 'UIH',
  'buôn ma thuột': 'BMV',
  pleiku: 'PXU',
  'điện biên': 'DIN',
  'rạch giá': 'VKG',
  'côn đảo': 'VCS',
  'tuy hòa': 'TBB',
  'chu lai': 'VCL',
  'quảng bình': 'VDH',
  'quảng ninh': 'VDO',
};

/**
 * Every airport code mentioned, with the position it appears at. Order matters:
 * "SGN đi DAD" and "DAD đi SGN" are two different routes and must not both read
 * as the first code in the list. Duplicates keep their first position.
 */
function airportCodeHits(text: string): Array<{ index: number; code: string }> {
  const lower = text.toLowerCase();
  const hits: Array<{ index: number; code: string }> = [];

  for (const code of Object.keys(AIRPORT_CITIES)) {
    const pattern = new RegExp(`(?<![a-z0-9])${code.toLowerCase()}(?![a-z0-9])`, 'g');
    for (const match of lower.matchAll(pattern)) hits.push({ index: match.index ?? 0, code });
  }
  for (const [name, code] of Object.entries(CITY_TO_CODE)) {
    let from = 0;
    for (;;) {
      const at = lower.indexOf(name, from);
      if (at < 0) break;
      hits.push({ index: at, code });
      from = at + name.length;
    }
  }

  hits.sort((a, b) => a.index - b.index);
  const seen = new Set<string>();
  return hits.filter((hit) => (seen.has(hit.code) ? false : (seen.add(hit.code), true)));
}

/** Every airport code mentioned, in the order it appears, duplicates collapsed. */
export function collectAirportCodes(text: string): string[] {
  return airportCodeHits(text).map((hit) => hit.code);
}

const ISO_DATE = /(\d{4})-(\d{2})-(\d{2})/;
/** `6/2`, `06-02-2027` — dấu `/` hoặc `-`, năm tùy chọn. */
const SHORT_DATE = /(?<!\d)(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?(?!\d)/;

/**
 * Ngày tương đối trong câu hỏi: "hôm nay", "mai", "mốt", "hôm qua" và
 * "N ngày nữa/sau". Trả về số ngày lệch so với hôm nay, `null` khi câu không
 * nói ngày tương đối nào.
 *
 * `\b` là ranh giới từ ASCII, nên "mai" trong "email" không khớp — ký tự
 * quanh nó vẫn là ký tự từ. Nhận cả hai dạng vì "ngày mai" là cụm tự nhiên
 * còn "mai bay" cũng xuất hiện.
 */
export function relativeDateOffset(text: string): number | null {
  const lower = text.toLowerCase();
  if (/hôm qua/.test(lower)) return -1;
  if (/hôm nay/.test(lower)) return 0;
  if (/(?<!\w)mai(?!\w)/.test(lower)) return 1;
  if (/(?<!\w)(?:mốt|ngày kia)(?!\w)/.test(lower)) return 2;
  // Hai trật tự từ đều có người viết: "3 ngày nữa"/"3 ngày sau" và "sau 3 ngày".
  const n =
    lower.match(/(?<!\d)(\d+)\s*ngày\s*(?:nữa|sau|tới|tiếp)/) ?? lower.match(/sau\s*(\d+)\s*ngày/);
  if (n) return Number(n[1]);
  return null;
}

/**
 * Ngày khách hỏi. Không có ngày trong câu thì là hôm nay (giờ Việt Nam).
 *
 * Một ngày không ghi năm mà đã qua thì hiểu là năm sau: hỏi "chuyến bay ngày
 * 6/2" vào tháng 10 phải là 6/2 năm sau (Tết), không phải một ngày đã trôi qua.
 */
export function parseFlightDate(text: string, today = todayInVietnam()): string {
  const iso = text.match(ISO_DATE);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const short = text.match(SHORT_DATE);
  if (short) {
    const day = Number(short[1]);
    const month = Number(short[2]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      let year = Number(today.slice(0, 4));
      let candidate = `${year}-${pad(month)}-${pad(day)}`;
      if (candidate < today) {
        year += 1;
        candidate = `${year}-${pad(month)}-${pad(day)}`;
      }
      return candidate;
    }
  }

  // Ngày tương đối ("mai", "hôm nay", "5 ngày nữa") chỉ được dùng khi câu không
  // mang ngày viết ra — ngày viết ra luôn thắng.
  const relative = relativeDateOffset(text);
  if (relative !== null) return addDateDays(today, relative);

  return today;
}

/**
 * Chặng và ngày từ câu hỏi. Hai mã sân bay trở lên thì mã đầu là đi, mã thứ hai
 * là đến. Một mã thì đọc giới từ đứng trước nó: "từ X" là điểm đi, còn "đi/đến/
 * tới X" là điểm đến — "vé máy bay đi Đà Nẵng" và "vé máy bay từ SGN" là hai câu
 * ngược nhau. Không có mã nào thì hỏi đúng cặp mặc định HAN-SGN của trang chủ.
 */
export function parseFlightQuery(text: string, today = todayInVietnam()): FlightQuery {
  const hits = airportCodeHits(text);

  let origin = 'HAN';
  let destination = 'SGN';

  if (hits.length >= 2) {
    origin = hits[0].code;
    destination = hits[1].code;
  } else if (hits.length === 1) {
    const { code, index } = hits[0];
    const before = text.slice(0, index).toLowerCase();
    const asOrigin = /(^|\s)(từ|khởi hành từ)\s*$/.test(before);
    if (asOrigin) {
      origin = code;
      destination = code === 'SGN' ? 'HAN' : 'SGN';
    } else {
      destination = code;
      origin = code === 'HAN' ? 'SGN' : 'HAN';
    }
  }

  return { origin, destination, date: parseFlightDate(text, today) };
}

const mapFlight = (row: FlightRecord): ResearchedFlight => ({
  flightNo: row.flight_no,
  from: row.from_code,
  to: row.to_code,
  departTime: toVietnamWallClock(row.depart_time).time,
  arriveTime: toVietnamWallClock(row.arrive_time).time,
  economyPrice: toPrice(row.economy_price),
  businessPrice: toPrice(row.business_price),
  available: Number(row.available) || 0,
});

export async function researchVietjetFlights(
  origin: string,
  destination: string,
  date: string
): Promise<FlightResearchResult> {
  const bookingUrl = `https://www.vietjetair.com/vi/dat-ve/search?origin=${origin}&destination=${destination}&departureDate=${date}&adults=1&currency=VND`;

  const rows = await searchFlights({
    from_code: origin,
    to_code: destination,
    depart_date: date,
  });
  const flights = rows.map(mapFlight);

  // Ngày trống thì gợi ý ngày gần nhất còn chuyến. Đây là tiện ích cộng thêm
  // trên một câu trả lời đã đúng, nên lỗi của nó không được làm hỏng tra cứu.
  let availableDates: string[] = [];
  if (flights.length === 0) {
    try {
      availableDates = await getAvailableDepartDates({
        from_code: origin,
        to_code: destination,
        limit: 5,
      });
    } catch (error) {
      console.error('Flight research available-dates error:', error);
    }
  }

  return { origin, destination, date, flights, availableDates, bookingUrl, source: 'database' };
}

const vnd = (n: number) => n.toLocaleString('vi-VN');

/**
 * Ngữ cảnh đưa cho model. Nói đúng những gì đã tra được và cấm bịa — câu cũ
 * ("Đã tìm thấy lộ trình thực tế") khiến model tưởng có dữ liệu nên tự chế ra.
 */
export function buildCoordinatorContext(result: FlightResearchResult): string {
  const { origin, destination, date, flights, availableDates, bookingUrl } = result;
  const header = `TRẠNG THÁI HIỆN TẠI — chặng ${origin}-${destination} (${date}), nguồn: bảng chuyến bay của hệ thống (giờ Việt Nam).`;

  if (flights.length === 0) {
    const near = availableDates.length
      ? `Các ngày gần nhất còn chuyến: ${availableDates.join(', ')}.`
      : 'Hệ thống hiện không còn ngày nào có chuyến cho chặng này.';
    return `${header}
KHÔNG có chuyến nào cho ngày ${date}. ${near}
Link tra cứu trên VietjetAir: ${bookingUrl}
Phải nói rõ với người dùng là hệ thống chưa có chuyến cho ngày đó. TUYỆT ĐỐI không bịa số hiệu, giờ bay hay giá.`;
  }

  const lines = flights
    .map(
      (f) =>
        `- ${f.flightNo} ${f.departTime}→${f.arriveTime} (${f.from}-${f.to}), economy ${vnd(f.economyPrice)} đ / business ${vnd(f.businessPrice)} đ, còn ${f.available} chỗ`
    )
    .join('\n');

  return `${header}
Có ${flights.length} chuyến cho ngày ${date}:
${lines}
Link tra cứu trên VietjetAir: ${bookingUrl}
Chỉ trả lời dựa trên danh sách trên. TUYỆT ĐỐI không bịa thêm số hiệu, giờ bay hay giá khác.`;
}
