/**
 * Thu thập dữ liệu thật từ vietjetair.com cho trợ lý OpenClaw.
 *
 * Nguồn và giới hạn, đo được trực tiếp từ sandbox (2026-10-18):
 *
 * - `www.vietjetair.com` là SPA sau CloudFront + AWS WAF: mọi `/api/*` cùng
 *   origin chỉ trả lại vỏ HTML.
 * - `vietjetcms-api.vietjetair.com` (CMS) — MỞ qua HTTP từ máy chủ này, không
 *   cần token (`isTokenRequired: false` trong bundle web). Nguồn thật của
 *   danh sách sân bay với toàn bộ cặp tuyến đang bán: `/api/v1/citypair`
 *   (dữ liệu trang select-flight dựng từ đây), tiếng Việt lấy bằng
 *   `languageId` UUID của `/api/v1/language`.
 * - `vietjet-api.vietjetair.com/booking` (lịch bay + giá từng lượt:
 *   `/api/v1/search-flight`, `/api/v1/low-fare`) — CloudFront chặn 403 cứng
 *   với request máy chủ không mang `aws-waf-token` (token chỉ phát sau desafio
 *   JS trong trình duyệt). Bó vé thì phải nói thất bại rõ nguyên nhân,
 *   KHÔNG bịa chuyến/giá.
 *
 * Toàn bộ hàm nhận `fetcher` như tham số (mặc định `fetch` toàn cục) để test
 * thay thế không cần network thật.
 */
import { sql } from '@/lib/neon';
import { normalizeFlightNo, FLIGHT_NO_PATTERN } from '@/lib/flight-no';
import { parseFlightDate, todayInVietnam } from '@/lib/openclaw/flight-researcher';
import { addDateDays, toVietnamInstant } from '@/lib/utils';

export const VIETJET_CMS_BASE = 'https://vietjetcms-api.vietjetair.com';
export const VIETJET_BOOKING_BASE = 'https://vietjet-api.vietjetair.com/booking';

/** `languageId` UUID của Tiếng Việt — lấy thật từ `/api/v1/language`. */
export const VIETJET_LANGUAGE_ID = 'a6ca5a9f-6a9c-4f35-bf1c-c42ea3d62f14';

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
  Origin: 'https://www.vietjetair.com',
  Referer: 'https://www.vietjetair.com/',
};

export class WebCollectionError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'WebCollectionError';
    this.status = status;
  }
}

export type Json = Record<string, unknown>;

export type Fetcher = (
  url: string,
  init?: { headers?: Record<string, string> }
) => Promise<{
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}>;

/** WAF token của trình duyệt (nếu người vận hành đặt `VIETJET_WAF_COOKIE`) — ép vào Cookie. */
function wafCookieHeader(): string | null {
  const token = process.env.VIETJET_WAF_COOKIE?.trim();
  return token ? token.replace(/^Cookie:/i, '').trim() : null;
}

async function getJson(fetcher: Fetcher, url: string): Promise<Json> {
  const headers = { ...BROWSER_HEADERS };
  const cookie = wafCookieHeader();
  if (cookie) headers.Cookie = cookie;

  let response: Awaited<ReturnType<Fetcher>>;
  try {
    response = await fetcher(url, { headers });
  } catch (error) {
    throw new WebCollectionError(
      0,
      `Không kết nối được ${new URL(url).host}: ${error instanceof Error ? error.message : 'lỗi mạng'}.`
    );
  }
  const text = (await response.text()).trim();

  let data: Json;
  try {
    data = text ? (JSON.parse(text) as Json) : {};
  } catch {
    // WAF/CloudFront trả 403 kèm HTML lỗi — giữ đúng mã HTTP trong thông báo.
    throw new WebCollectionError(
      response.status,
      `Phản hồi của vietjetair.com không phải JSON (HTTP ${response.status}).`
    );
  }
  if (!response.ok) {
    throw new WebCollectionError(
      response.status,
      `Trang Vietjet trả HTTP ${response.status} từ ${new URL(url).host}${new URL(url).pathname}.`
    );
  }
  return data;
}

// ─── Mạng lưới: sân bay + cặp tuyến (CMS — mở) ──────────────────────────────

export interface WebAirport {
  code: string;
  name: string;
  city: string;
}

export interface VietjetNetwork {
  airports: WebAirport[];
  /** Định danh chuẩn của web, "ADL-KIX". */
  routes: string[];
  source: string;
}

/**
 * Cặp tuyến và sân bay Vietjet đang bán. Một request duy nhất, rẻ; dữ liệu
 * định danh thật (sửa theo bảng [[IATA]] của hãng) — dùng để chéo kiểm với
 * `airports` trong DB và gợi ý chặng hợp lệ cho lệnh thu thập lịch bay.
 */
export async function collectVietjetNetwork(fetcher: Fetcher = fetch): Promise<VietjetNetwork> {
  const data = await getJson(fetcher, `${VIETJET_CMS_BASE}/api/v1/citypair`);
  const citypairs = Array.isArray(data.citypairs) ? data.citypairs : [];
  if (citypairs.length === 0) {
    throw new WebCollectionError(
      502,
      'CMS trả danh sách cặp tuyến rỗng — không đọc được dữ liệu web.'
    );
  }

  const airports = new Map<string, WebAirport>();
  const routes = new Set<string>();

  // M.Entry sân bay lặp theo cặp: {id, code, name, engName, province:{provinceName}}.
  // Cùng code chỉ giữ bản đầu — tên lấy từ bản trong nước (encoding VN) tốt nhất có,
  // vẫn là dữ liệu web trả, không tự đặt.
  const visitAirport = (raw: unknown): string | null => {
    if (!raw || typeof raw !== 'object') return null;
    const node = raw as Json;
    const code = typeof node.code === 'string' ? node.code.toUpperCase() : '';
    if (!code) return null;
    if (!airports.has(code)) {
      const province =
        node.province && typeof node.province === 'object'
          ? String((node.province as Json).provinceName ?? '').trim()
          : '';
      airports.set(code, {
        code,
        name: String(node.name ?? node.engName ?? code).trim() || code,
        city: province || String(node.engName ?? '').trim(),
      });
    }
    return code;
  };

  for (const rawGroup of citypairs) {
    if (!rawGroup || typeof rawGroup !== 'object') continue;
    const group = rawGroup as Json;
    const pairs = Array.isArray(group.airportDepartureName) ? group.airportDepartureName : [];
    for (const rawPair of pairs) {
      if (!rawPair || typeof rawPair !== 'object') continue;
      const pair = rawPair as Json;
      const dep = visitAirport(pair.airportDepartureName);
      const arr = visitAirport(pair.airportArrivalName);
      if (typeof pair.identifier === 'string') routes.add(pair.identifier.toUpperCase());
      else if (dep && arr) routes.add(`${dep}-${arr}`);
    }
  }

  return {
    airports: [...airports.values()],
    routes: [...routes],
    source: 'vietjetair.com CMS /api/v1/citypair',
  };
}

// ─── Lịch bay + giá vé từng ngày (gateway booking — WAF) ────────────────────

export interface WebFlight {
  flightNo: string;
  from: string;
  to: string;
  /** Giờ Việt Nam `HH:MM`. */
  departTime: string;
  /** Giờ Việt Nam `HH:MM` — có thể là ngày hôm sau với bay trá đêm. */
  arriveTime: string;
  /** Giá rẻ nhất web bày cho lượt này (đồng). */
  price: number;
  /** Mỗi hạng giá web trả cho lượt, nếu có. */
  fares: Array<{ cabin: string; amount: number }>;
}

export type ScheduleResult =
  | { reachable: true; route: string; date: string; flights: WebFlight[] }
  | { reachable: false; reason: string };

/**
 * Lịch bay một chặng/ngày. Gateway /booking chặn 403 (WAF) với request máy chủ
 * không dùng trình duyệt — đây là trạng thái đo được — nên hàm trả
 * `reachable: false` kèm lý do, KHÔNG tự sinh dữ liệu. Khi có
 * `VIETJET_WAF_COOKIE` (token hợp lệ) hoặc chạy ở môi trường IP được phép,
 * phản hồi JSON của web được rót qua một parser khoan hồng.
 */
export async function collectVietjetSchedule(
  fromCode: string,
  toCode: string,
  date: string,
  fetcher: Fetcher = fetch
): Promise<ScheduleResult> {
  const from = fromCode.toUpperCase();
  const to = toCode.toUpperCase();
  const url = `${VIETJET_BOOKING_BASE}/api/v1/search-flight?languageId=${VIETJET_LANGUAGE_ID}&from=${from}&to=${to}&depDate=${encodeURIComponent(date)}`;

  let data: Json;
  try {
    data = await getJson(fetcher, url);
  } catch (error) {
    const status = error instanceof WebCollectionError ? error.status : 0;
    return {
      reachable: false,
      reason:
        status === 403
          ? 'CloudFront/WAF chặn HTTP 403 với request máy chủ (gateway /booking chỉ trả dữ liệu cho trình duyệt đã qua desafio aws-waf-token).'
          : error instanceof Error
            ? error.message
            : 'Không kết nối được vietjetair.com.',
    };
  }

  return {
    reachable: true,
    route: `${from}-${to}`,
    date,
    flights: parseScheduleResponse(from, to, data),
  };
}

/** Trích chọn khoan hồng trên trường có thể có của response search-flight. */
function pick(obj: unknown, keys: string[]): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  const node = obj as Json;
  for (const key of keys) {
    const value = node[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function listFromPayload(data: Json): Json[] {
  const candidates: Array<unknown> = [
    pick(data, ['flights', 'flightList', 'results']),
    pick(data.data, ['flights', 'flightList', 'results']),
  ];
  if (Array.isArray(data.data)) candidates.push(data.data);
  const bucket = candidates.find((c) => Array.isArray(c) && c.length > 0);
  if (!bucket) return [];
  return (bucket as Array<unknown>).filter((r): r is Json => Boolean(r) && typeof r === 'object');
}

interface RowFlight {
  flightNo: string;
  departTime: string;
  arriveTime: string;
  price: number;
  fares: Array<{ cabin: string; amount: number }>;
}

function parseFlightRow(row: Json): RowFlight | null {
  const rawNo = pick(row, ['flightNumber', 'flightNo', 'flightDesignator']);
  const no = typeof rawNo === 'string' ? rawNo : pick(rawNo, ['flightNumber', 'number']);
  if (typeof no !== 'string' || !no.trim()) return null;

  // Cặp giờ: thông thường một lượt thẳng có 1 segment; khung tên trường đo
  // được từ chính code SPA (departureSegment/…).
  const segment = pick(row, ['departureSegment', 'firstSegment']);
  const rawDepart =
    pick(row, ['departureDateTime', 'departTime']) ??
    pick(segment, ['departureDateTime', 'depTime']);
  const rawArrive =
    pick(row, ['arrivalDateTime', 'arriveTime']) ?? pick(segment, ['arrivalDateTime', 'arrTime']);
  if (typeof rawDepart !== 'string' || typeof rawArrive !== 'string') return null;

  const departTime = hhmm(rawDepart);
  const arriveTime = hhmm(rawArrive);
  if (!departTime || !arriveTime) return null;

  const fares = (Array.isArray(row.fares) ? row.fares : []).filter(Boolean).map((rawFare) => {
    const fare = rawFare as Json;
    return {
      cabin: String(pick(fare, ['cabin', 'classOfService', 'farePlanCode', 'name']) ?? ''),
      amount: toAmount(pick(fare, ['amount', 'price', 'total'])),
    };
  });

  const price =
    toAmount(pick(row, ['fareAmount', 'price', 'totalPrice'])) ||
    fares
      .map((f) => f.amount)
      .filter((n) => n > 0)
      .sort((a, b) => a - b)[0] ||
    0;

  return { flightNo: no.trim().toUpperCase(), departTime, arriveTime, price, fares };
}

function toAmount(value: unknown): number {
  const n = Number(String(value ?? '').replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** "07:30:00", "07:30", hay ISO "…T00:30:00Z" → giờ Việt Nam `HH:MM`. */
function hhmm(raw: string): string {
  const clock = /^(\d{1,2}):(\d{2})/.exec(raw.trim());
  if (clock) {
    const h = Number(clock[1]);
    const m = Number(clock[2]);
    if (h > 23 || m > 59) return '';
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const instant = new Date(raw);
  if (Number.isNaN(instant.getTime())) return '';
  // Đọc giờ ở lịch Việt Nam cho đúng múi giờ, cùng quy tắc toVietnamWallClock.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instant);
}

function parseScheduleResponse(from: string, to: string, data: Json): WebFlight[] {
  return listFromPayload(data)
    .map((row) => {
      const flight = parseFlightRow(row);
      if (!flight) return null;
      return { ...flight, flightNo: normalizeFlightNo(flight.flightNo), from, to };
    })
    .filter((row): row is WebFlight => {
      if (!row) return false;
      return row.flightNo.length > 0;
    });
}

// ─── Nhập chuyến thu được vào bảng flights (sau "xác nhận") ─────────────────

export const FARE_LADDER_RATIO = 2.77; // đúng hệ số migration 030 dùng khi seed

export interface ImportResult {
  imported: string[];
  skipped: string[];
}

/**
 * Đưa lịch bay thu được từ web vào bảng `flights`:
 * - một LƯỢT bay thành một dòng `economy` (cùng quy ước `createFlight`);
 *   Thương gia = 2.77× — hệ số seed migration 030, giữ thang giá nhất quán;
 * - trùng (from,to,depart_time) — index `idx_flights_route_depart_time` —
 *   bỏ qua (`DO NOTHING`), KHÔNG viết đè giá người quản trị đã sửa;
 * - số hiệu không đạt chuẩn `VJ <digits>` (migration 036) thì bỏ và báo lại
 *   trong `skipped`, không để CHECK ném 500.
 */
export async function importWebFlights(
  route: { from: string; to: string },
  date: string,
  flights: WebFlight[]
): Promise<ImportResult> {
  const imported: string[] = [];
  const skipped: string[] = [];

  for (const flight of flights) {
    const flightNo = normalizeFlightNo(flight.flightNo);
    if (!flightNo || !FLIGHT_NO_PATTERN.test(flightNo)) {
      skipped.push(`${flight.flightNo} (số hiệu không khớp mẫu VJ <số>)`);
      continue;
    }
    const price = Math.round(flight.price);
    if (!(price > 0)) {
      skipped.push(`${flightNo} ${flight.departTime} (không đọc được giá)`);
      continue;
    }
    const arriveISO = computeArriveInstant(date, flight.departTime, flight.arriveTime);
    if (!arriveISO) {
      skipped.push(`${flightNo} ${flight.departTime} (giờ đi/đến không đọc được)`);
      continue;
    }

    const rows = await sql`
      INSERT INTO flights (
        flight_no, from_code, to_code, depart_time, arrive_time,
        price, economy_price, business_price, class, available
      )
      VALUES (
        ${flightNo}, ${route.from.toUpperCase()}, ${route.to.toUpperCase()},
        ${toVietnamInstant(date, flight.departTime)}, ${arriveISO},
        ${price}, ${price}, ${Math.round(price * FARE_LADDER_RATIO)}, 'economy', 180
      )
      ON CONFLICT (from_code, to_code, depart_time) DO NOTHING
      RETURNING id
    `;
    if (Array.isArray(rows) && rows.length > 0) imported.push(`${flightNo} ${flight.departTime}`);
    else skipped.push(`${flightNo} ${flight.departTime} (lượt này đã có trong bảng)`);
  }

  return { imported, skipped };
}

// ─── Bộ chờ xác nhận "nhập chuyến thu được" ─────────────────────────────────

export type PendingCollectImport = {
  kind: 'import-web-flights';
  from: string;
  to: string;
  date: string;
  flights: WebFlight[];
  createdAt: number;
};

const pendingImportByAdmin = new Map<string, PendingCollectImport>();

export function setPendingImport(adminId: string, pending: PendingCollectImport): void {
  pendingImportByAdmin.set(adminId, { ...pending, createdAt: Date.now() });
}

/** Lấy (và xóa) bộ chờ của admin; hết hạn 5 phút — trực tiếp null. */
export function takePendingImport(adminId: string, now = Date.now()): PendingCollectImport | null {
  const pending = pendingImportByAdmin.get(adminId);
  if (!pending) return null;
  pendingImportByAdmin.delete(adminId);
  if (now - pending.createdAt > 5 * 60_000) return null;
  return pending;
}

export function clearPendingImport(adminId: string): void {
  pendingImportByAdmin.delete(adminId);
}

/** Chỉ dành cho test — xóa sạch bộ chờ giữa các case. */
export function clearAllPendingImports(): void {
  pendingImportByAdmin.clear();
}

// ─── Lời trả lời lịch sự và đúng sự thật ────────────────────────────────────

const vnd = (n: number) => n.toLocaleString('vi-VN');

export function buildNetworkReply(net: VietjetNetwork): string {
  const sampleAirports = net.airports.slice(0, 6).map((a) => `${a.code} (${a.city || a.name})`);
  const sampleRoutes = net.routes.slice(0, 8).join(', ');
  return [
    `Đã thu thập từ vietjetair.com (nguồn: ${net.source}) — ${net.airports.length} sân bay, ${net.routes.length} cặp tuyến đang bán.`,
    `Vài sân bay: ${sampleAirports.join(' · ')}.`,
    `Vài tuyến: ${sampleRoutes}${net.routes.length > sampleRoutes.split(', ').length ? ' …' : ''}.`,
    '',
    'Muốn nhập lịch bay vào bảng chuyến của hệ thống? Hỏi tiếp "thu thập chuyến bay SGN-HAN ngày mai" — tôi đi lấy lịch + giá từng lượt rồi chờ chữ "xác nhận" của bạn mới ghi.',
  ].join('\n');
}

export function buildScheduleReply(result: ScheduleResult): string {
  if (!result.reachable) {
    return [
      'Không lấy được lịch bay từ VietjetAir — không có số liệu nào được đưa vào hệ thống.',
      `• Lý do: ${result.reason}`,
      '',
      'Đường lấy lịch/giá (`/booking/api/v1/search-flight`) chỉ mở cho trình duyệt đã vượt qua WAF token.',
      'Cách sơ cứu: bật web vietjetair.com bằng trình duyệt trên máy chủ, lấy cookie `aws-waf-token`, đặt env',
      '`VIETJET_WAF_COOKIE=aws-waf-token=...` rồi chạy lại lệnh. Bản ghi nào lấy được sẽ hiện hết trước khi ghi.',
    ].join('\n');
  }
  return describeSchedule(result);
}

function describeSchedule(result: Extract<ScheduleResult, { reachable: true }>): string {
  const head = `Lịch bay ${result.route} ngày ${result.date} trên vietjetair.com: ${result.flights.length} lượt.`;
  if (result.flights.length === 0) {
    return `${head}\nWeb không bày lượt nào cho ngày này (hoặc cấu trúc JSON không nhận diện được — hãy mở GitHub issue kèm phản hồi thật).`;
  }
  const lines = result.flights
    .slice(0, 12)
    .map(
      (f) =>
        `• ${f.flightNo}  ${f.departTime} → ${f.arriveTime}  ${
          f.price > 0 ? `từ ${vnd(f.price)} đ` : 'giá không đọc được'
        }`
    );
  const more = result.flights.length > 12 ? `\n… và ${result.flights.length - 12} lượt nữa.` : '';
  return [
    `${head} (nguồn: vietjetair.com — dữ liệu bày trên web thật)`,
    ...lines,
    more,
    '',
    'Trả lời "xác nhận" để nhập các lượt này vào bảng chuyến bay (lượt trùng giờ sẽ bỏ qua, giá Thương gia sinh 2.77× theo thang 030). Lệnh chờ hết hạn sau 5 phút.',
  ].join('\n');
}

/**
 * Từ ngày lịch Việt Nam `YYYY-MM-DD` + giờ đi `HH:MM` + giờ đến `HH:MM` →
 * thời điểm đến dạng ISO UTC; giờ đến có thể trọn nửa đêm (+1 ngày) — bay trá
 * đêm (SGN 22:30 → HAN 00:45+) phải giữ đúng thời hạn.
 */
function computeArriveInstant(date: string, departTime: string, arriveTime: string): string | null {
  const dep = new Date(toVietnamInstant(date, departTime)).getTime();
  if (!Number.isFinite(dep)) return null;
  const arr = new Date(toVietnamInstant(date, arriveTime)).getTime();
  if (!Number.isFinite(arr)) return null;
  // Giờ đến trước giờ đi → bay trá đêm: dịch sang lịch ngày hôm sau, giữ
  // dạng offset +07:00 như cột departure (both cột cùng một kiểu chuỗi).
  return toVietnamInstant(arr >= dep ? date : addDateDays(date, 1), arriveTime);
}

// ─── Command lane: nhận lệnh "thu thập dữ liệu" ─────────────────────────────

export type CollectCommand =
  | { kind: 'collect-network' }
  | { kind: 'collect-schedule'; from: string; to: string; date: string; dateText?: string }
  | { kind: 'collect-invalid'; reasons: string[] };

/**
 * Lệnh thu thập đi bằng quy tắc, không qua model — nguyên tắc của đường ghi
 * flight-command áp dụng cả ở đây: con số/giờ/giá đều đến từ câu chữ của
 * quản trị hoặc từ phản hồi JSON thật của web, model không bao giờ đoán.
 */
export function parseCollectCommand(text: string, today = todayInVietnam()): CollectCommand | null {
  const lower = text.toLowerCase();

  // Động từ "thu thập" cả khi gõ mất dấu (/thu thap/), "crawl"/"collect", hay
  // "lấy dữ liệu"/"tải dữ liệu" (kể cả mất dấu: /lay du lieu/).
  const hasDuLieu = /(?:d[ựúùữ]?\s?li[ệe]?u|du li[ệe]?u)/.test(lower);
  const verbThuThap = /(?:thu\s*th[ậa]p|thu\s*t[ậa]p|thuthap|crawl|collect)/.test(lower);
  const verbDuLieu = hasDuLieu && /(?:l[ấa]y|t[ảa]i)/.test(lower);
  if (!verbThuThap && !verbDuLieu) return null;

  // "sân bay" / "tuyến bay" / "citypair" — mạng lưới định danh.
  if (
    /(?:s[âa]n bay|san bay|airports?|tuy[ếe]n bay|tuyen bay|citypairs?|mạng lưới|mang luoi)/.test(
      lower
    )
  ) {
    return { kind: 'collect-network' };
  }

  // Chặng SGN-HAN / "từ SGN đến HAN" / "chặng SGN HAN" / "SGN đi HAN".
  const pair =
    lower.match(/([a-z]{3})\s*(?:-|–|→|>)\s*([a-z]{3})\b/i) ??
    lower.match(/(?:từ|tu)\s+([a-z]{3})\b.{0,20}?(?:đến|den|to)\s+([a-z]{3})\b/i) ??
    lower.match(/\b([a-z]{3})\s*-\s*([a-z]{3})\b/i) ??
    lower.match(/\b([a-z]{3})\s+(?:đi|di)\s+([a-z]{3})\b/i);
  let fromCode: string | null = null;
  let toCode: string | null = null;
  if (pair) {
    const groups = [pair[1], pair[2], pair[3]].filter(Boolean) as string[];
    const codes = groups.filter((g) => /^[a-z]{3}$/i.test(g.trim())).map((g) => g.toUpperCase());
    // Nhóm đúng là hai mã sân bay: cắt từ khóa đứng xen ("đi") — mã luôn là
    // chuỗi 3 chữ cái đứng cạnh nhau.
    if (codes.length >= 2) {
      [fromCode, toCode] = [codes[0], codes[1]];
    }
  }
  if (fromCode && toCode) {
    if (fromCode === toCode) {
      return {
        kind: 'collect-invalid',
        reasons: ['Hai mã sân bay giống nhau — chặng đi và đến phải khác nhau.'],
      };
    }
    return {
      kind: 'collect-schedule',
      from: fromCode,
      to: toCode,
      date: parseFlightDate(text, today),
    };
  }

  return {
    kind: 'collect-invalid',
    reasons: [
      'Lệnh thu thập cần nói rõ muốn lấy gì. Dùng được ngay:',
      '• "thu thập sân bay và tuyến bay từ vietjetair.com" — mạng lưới hãng đang bán',
      '• "thu thập chuyến bay SGN-HAN ngày mai" — lịch bay một chặng/ngày (kèm giá)',
    ],
  };
}
