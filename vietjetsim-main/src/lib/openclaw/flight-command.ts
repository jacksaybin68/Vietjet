/**
 * Lệnh cập nhật chuyến bay cho trợ lý OpenClaw Coordinator.
 *
 * Trước đây lượt chat là chỉ đọc: quản trị hỏi "cập nhật giá VJ 3017 thành
 * 950000" và model nhỏ trả lời "giá hiện tại là 950.000 đ" — một khẳng định
 * bịa, vì không có đường ghi nào để nó gọi và số "950000" chỉ là số mà người
 * hỏi vừa gõ. Tệ nhất câu bịa kiểu này khiến người vận hành tin rằng đã có
 * người đổi giá rồi.
 *
 * Module này chia lệnh thành hai lớp để không lặp lại lỗi đó:
 *
 * 1. `parseFlightCommand` — nhận dạng câu lệnh bằng quy tắc, KHÔNG qua model:
 *    cú pháp khớp mới là lệnh, và các con số (giá, giờ, ngày) đến thẳng từ câu
 *    chữ. Model không bao giờ thấy được tách lệnh này nên không thể "khoác
 *    lác" một cập nhật đã diễn ra.
 * 2. `applyFlightCommand` — thực thi sau khi quản trị trả lời "xác nhận". Tái
 *    dùng đúng luật validate của PATCH /api/quan-tri/chuyen-bay/[id]
 *    (thang giá không đảo, khởi hành sớm hơn đến) và gọi `updateFlight` +
 *    `insertFlightUpdateLog` của lib/db, nên lệnh chat đi cùng một con đường
 *    ghi như form quản trị và để lại một dòng audit log.
 *
 * Lệnh chỉ là *đề xuất* cho tới khi `takePendingCommand` trả về nó sau một
 * tin nhắn xác nhận — không có khoá pending thì "xác nhận" là câu vô nghĩa và
 * được trả lời như vậy.
 */
import { parseFlightDate, todayInVietnam } from '@/lib/openclaw/flight-researcher';
import { normalizeFlightNo } from '@/lib/flight-no';
import {
  getFlightByNoAndDate,
  getFlightDatesNear,
  insertFlightUpdateLog,
  updateFlight,
  type FlightRecord,
} from '@/lib/db';
import { toVietnamInstant, toVietnamWallClock } from '@/lib/utils';

export type FareSide = 'economy' | 'business';

export interface UpdatePriceCommand {
  kind: 'update-price';
  flightNo: string;
  /** Ngày giờ Việt Nam (`YYYY-MM-DD`) của chuyến bay cần sửa. */
  date: string;
  fare: FareSide;
  /** Giá mới, đồng đã đổi hết đơn (950k → 950000). */
  amount: number;
  /**
   * Lọc chọn chuyến trong ngày khi cùng số hiệu bay nhiều lượt ("lúc 06:00").
   * Riêng với lệnh GIỜ thì giờ mới nằm ở `time` (lệnh update-time), hai nghĩa
   * này tách hẳn: applyFlightCommand từng lọc cả hai kiểu theo cùng một giờ và
   * "đổi ... sang 07:30" trên tuần có 06:00/11:45 rơi vào "không tìm thấy".
   */
  selectTime?: string;
}

export interface UpdateTimeCommand {
  kind: 'update-time';
  flightNo: string;
  date: string;
  /** Giờ khởi hành MỚI theo lịch Việt Nam, `HH:MM`. */
  time: string;
  /** Chọn lượt bay khi cùng ngày có nhiều chuyến cùng số hiệu ("lúc 06:00"). */
  selectTime?: string;
}

export interface InvalidCommand {
  kind: 'invalid';
  reasons: string[];
}

/**
 * `null` = câu không phải lệnh cập nhật (chỉ để trôi qua đường HOI module):
 * hỏi giá, hỏi giờ hay bất cứ gì không động vào cú pháp lệnh.
 */
export type FlightCommand = UpdatePriceCommand | UpdateTimeCommand | InvalidCommand | null;

/**
 * Số hiệu nằm trong câu, giữ nguyên vị trí viết (cho phép `VJ3017`,
 * `VJ 3017`, `vj 3017`). Ràng buộc 2 chữ cái + 2–4 số (tùy chọn `-NNNN`) theo
 * `FLIGHT_NO_PATTERN` của migration 036, nhưng cho viết thường để không đề
 * phòng người vận hành nhấn caps-lock.
 */
const FLIGHT_NO_IN_TEXT = /(?<![a-z0-9])([a-z]{2})\s?([0-9]{2,4}(?:-[0-9]{1,4})?)(?![0-9])/i;

/** Động từ của "cập nhật" — không có thì câu không phải lệnh ghi. */
const UPDATE_VERB = /cập nhật|cập nhap|chỉnh sửa|chỉnh|sửa|thay đổi|thay|đổi|đặt lại/iu;
/** "xác nhận" — tin nhắn áp dụng lệnh đang chờ. */
const CONFIRM_WORD = /xác nhận|chắc chắn|đồng ý|áp dụng|làm đi|confirm/i;

/**
 * Lưu ý cú pháp các từ khoá dưới đây đi trong `parseFlightCommand`:
 * `giá` phải mang theo một *số tiền mới* ngay sau "thành/sang/là/lên/=/→";
 * `giờ` phải mang theo `HH:MM` hoặc `10h00`. Không đủ thì lệnh được coi là
 * `invalid` với lý do cụ thể — câu LLM tự bịa chỉ sinh ra ở đường trôi qua
 * (free flow), không phải đường ghi.
 */
const PRICE_SIDE: Array<{ pattern: RegExp; fare: FareSide }> = [
  { pattern: /phổ thông|pho thong|economy|eco\b/iu, fare: 'economy' },
  {
    pattern: /thương gia|thuong gia|skyboss|sky boss|business|deluxe|đầu tiên|first/iu,
    fare: 'business',
  },
];

const PRICE_CUE = /(?:thành|sang|là|lên|đặt thành|=|→|to)\s*/gi;
const AMOUNT_GROUP =
  /(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)(\s*(?:k|nghìn|ngin|triệu|tr|vnd|đồng|đ))?/i;
const TIME_GROUP = /(\d{1,2})(?::|h)(\d{2})/;

/** "xác nhận" — tin nhắn áp dụng lệnh đang chờ. */
export function isConfirmationMessage(text: string): boolean {
  return CONFIRM_WORD.test(text);
}

/** Trùng `vnd` của flight-researcher; tách riêng để hai module không trỏ nhau. */
const vnd = (n: number) => n.toLocaleString('vi-VN');

/**
 * Đọc số tiền mới từ câu. Không có cue ("thành", "sang"...) thì trả `null`:
 * quản trị cần nói rõ giá MỚI là bao nhiêu, và LLM không bao giờ bị thả tự
 * suy ra một con số nào để "trả lời cho có".
 */
export function parseNewAmount(text: string): number | null {
  PRICE_CUE.lastIndex = 0;
  const cue = PRICE_CUE.exec(text.toLowerCase());
  if (!cue) return null;

  const after = text.slice(cue.index + cue[0].length);
  const amount = after.match(AMOUNT_GROUP);
  if (!amount) return null;

  const raw = amount[1].trim();
  const unit = (amount[2] ?? '').trim().toLowerCase();
  let value: number;

  if (unit === 'k' || unit === 'nghìn' || unit === 'ngin') {
    value = Number(raw) * 1000;
  } else if (unit === 'triệu' || unit === 'tr') {
    value = Number(raw.replace(',', '.')) * 1_000_000;
  } else if (/^\d{1,3}([.,]\d{3})+$/.test(raw)) {
    // Nhóm nghìn (`950.000`, `950,000`): dấu chấm/phẩy là ngăn cách nghìn,
    // không phải dấu thập phân — với lý do toFareAmount của route PATCH ghi chú.
    value = Number(raw.replace(/[.,]/g, ''));
  } else {
    value = Number(raw);
  }

  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

/**
 * Lệnh cập nhật rút ra từ câu chữ của quản trị viên. Số liệu nằm trong lệnh,
 * không trong mô hình — đây là ranh giới chống bịa số liệu của đường ghi.
 */
export function parseFlightCommand(text: string, today = todayInVietnam()): FlightCommand {
  const lower = text.toLowerCase();

  if (!UPDATE_VERB.test(lower)) return null;

  const flightHit = lower.match(FLIGHT_NO_IN_TEXT);
  const flightNo = flightHit ? normalizeFlightNo(flightHit[0]) : null;

  const wantsPrice = /giá/.test(lower);
  const timeHit = lower.match(TIME_GROUP);
  const amount = parseNewAmount(text);

  // "lúc HH:MM" là điều kiện CHỌN chuyến trong ngày ("lúc 06:00"). Nghĩa đổi
  // giờ là mọi thời điểm KHÔNG đứng sau "lúc": "sang 10:00", "thành 10:00",
  // hay "đổi giờ bay VJ 3040 ngày mai 10h30" (động từ `đổi giờ` tự nói thay).
  // Lệnh giá có một thời điểm "lúc" là hợp lệ; lệnh giá có một thời điểm đổi
  // là hai thay đổi trong một câu → chặn.
  let changeTimeMatch: RegExpMatchArray | null = null;
  const plainTime = lower.match(/(?:sang|thành)\s*(\d{1,2})(?::|h)(\d{2})/) ?? null;
  if (plainTime) {
    changeTimeMatch = plainTime;
  } else {
    const bare = lower.match(/(?:^|\s)(\d{1,2})(?::|h)(\d{2})/);
    if (bare) {
      const start = bare.index ?? 0;
      const before = lower.slice(Math.max(0, start - 5), start);
      // "lúc 06:00" → chọn; còn lại ("10h30", "giờ 10:00"...) → đổi thành.
      if (!/lúc\s*$/.test(before)) changeTimeMatch = bare;
    }
  }
  const changeTime = Boolean(changeTimeMatch);

  const rowTimeMatch = lower.match(/lúc\s*(\d{1,2})(?::|h)(\d{2})/);
  let selectTime: string | null = null;
  if (rowTimeMatch) {
    const rowHh = Number(rowTimeMatch[1]);
    const rowMm = Number(rowTimeMatch[2]);
    const candidate = `${String(rowHh).padStart(2, '0')}:${String(rowMm).padStart(2, '0')}`;
    // "lúc 06:00" là điều kiện chọn lượt — kể cả khi câu còn có giờ đổi khác
    // ("lúc 06:00 sang 07:30"). Chỉ bỏ qua khi nó trùng chính giờ mới.
    const changeHit = changeTimeMatch;
    const sameAsChange =
      changeHit && Number(changeHit[1]) === rowHh && Number(changeHit[2]) === rowMm;
    if (rowHh <= 23 && rowMm <= 59 && !sameAsChange) selectTime = candidate;
  }

  // Một lượt chỉ thay đổi một thứ: cả giá lẫn giờ trong cùng câu là chỗ
  // mà khung lệnh rời rạc dễ ghi nhầm nửa sau.
  if (wantsPrice && amount && changeTime) {
    return {
      kind: 'invalid',
      reasons: ['Một lượt chỉ sửa được một thứ: giá hoặc giờ bay. Hãy tách thành hai lệnh riêng.'],
    };
  }

  if (wantsPrice && amount) {
    if (!flightNo) {
      return {
        kind: 'invalid',
        reasons: ['Thiếu số hiệu chuyến bay. Ví dụ: "cập nhật giá vé VJ 3017 ...".'],
      };
    }
    // "phổ thông" trước "thương gia" thì phổ thông thắng và ngược lại — chọn
    // theo thứ tự xuất hiện, vì một câu chỉ nên mang một hạng. Không có /g: chỉ
    // cần biết vị trí xuất hiện đầu tiên.
    const sides = PRICE_SIDE.map((entry) => {
      const hit = entry.pattern.exec(lower);
      return hit ? { index: hit.index, fare: entry.fare } : null;
    })
      .filter((x): x is { index: number; fare: FareSide } => x !== null)
      .sort((a, b) => a.index - b.index);
    const fare = sides[0]?.fare ?? 'economy';

    return {
      kind: 'update-price',
      flightNo,
      date: parseFlightDate(text, today),
      fare,
      amount,
      ...(selectTime ? { selectTime } : {}),
    };
  }

  if (wantsPrice) {
    return {
      kind: 'invalid',
      reasons: [
        'Chưa nói rõ giá mới. Ví dụ: "cập nhật giá vé VJ 3017 ngày mai phổ thông thành 950.000".',
        'Nếu cùng ngày có nhiều chuyến cùng số hiệu, thêm thời điểm: "... lúc 06:00 phổ thông thành 950.000".',
      ],
    };
  }

  if (timeHit) {
    const source = changeTimeMatch;
    if (!source) {
      // Giờ duy nhất còn lại chỉ đến sau "lúc" → là điều kiện, không phải
      // giờ mới. Chưa nói rõ muốn đổi thành giờ nào.
      return {
        kind: 'invalid',
        reasons: [
          'Chưa nói rõ giờ bay mới. Hãy dùng "sang HH:MM": "đổi giờ bay VJ 3040 ngày mai sang 10:00".',
        ],
      };
    }
    const hh = Number(source[1]);
    const mm = Number(source[2]);
    if (!flightNo) {
      return {
        kind: 'invalid',
        reasons: ['Thiếu số hiệu chuyến bay. Ví dụ: "đổi giờ bay VJ 3040 ... sang 10:00".'],
      };
    }
    if (hh > 23 || mm > 59) {
      return {
        kind: 'invalid',
        reasons: [`Giờ "${source[0].trim()}" không hợp lệ (khung HH:MM, 00:00–23:59).`],
      };
    }
    return {
      kind: 'update-time',
      flightNo,
      date: parseFlightDate(text, today),
      time: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
      ...(selectTime ? { selectTime } : {}),
    };
  }

  return {
    kind: 'invalid',
    reasons: [
      'Câu có ý cập nhật nhưng chưa nói rõ thay đổi gì. Hai dạng lệnh:',
      '• Giá: "cập nhật giá vé VJ 3017 ngày 2026-10-19 phổ thông thành 950.000"',
      '• Giờ: "đổi giờ bay VJ 3040 ngày mai sang 10:00"',
    ],
  };
}

// ─── Lệnh đang chờ xác nhận ─────────────────────────────────────────────────

export interface PendingCommand {
  command: UpdatePriceCommand | UpdateTimeCommand;
  createdAt: number;
}

export const PENDING_TTL_MS = 5 * 60_000;

/**
 * Một quản trị viên một lệnh chờ duy nhất. Map module-level chấp nhận được:
 * triển khai là một tiến trình Node duy nhất (pm2), và mất lệnh chờ khi server
 * khởi động lại chỉ có nghĩa là quản trị phải gõ lại lệnh — không có gì-coded
 * đã ghi vào cơ sở dữ liệu mà chưa được xác nhận.
 */
const pendingByAdmin = new Map<string, PendingCommand>();

export function setPendingCommand(
  adminId: string,
  command: UpdatePriceCommand | UpdateTimeCommand
): void {
  pendingByAdmin.set(adminId, { command, createdAt: Date.now() });
}

/** Lấy (và xoá) lệnh chờ của quản trị viên; hết hạn thì coi như không có. */
export function takePendingCommand(
  adminId: string,
  now = Date.now()
): UpdatePriceCommand | UpdateTimeCommand | null {
  const pending = pendingByAdmin.get(adminId);
  if (!pending) return null;
  if (now - pending.createdAt > PENDING_TTL_MS) {
    pendingByAdmin.delete(adminId);
    return null;
  }
  pendingByAdmin.delete(adminId);
  return pending.command;
}

/** Chỉ dành cho test — xoá sạch lệnh chờ giữa các case. */
export function clearPendingCommands(): void {
  pendingByAdmin.clear();
}

export function formatCommandConfirmPreview(
  command: UpdatePriceCommand | UpdateTimeCommand
): string {
  const at = command.selectTime ? ` lúc ${command.selectTime}` : '';
  if (command.kind === 'update-price') {
    return `Sửa giá ${command.fare === 'economy' ? 'Phổ thông' : 'Thương gia'} chuyến ${command.flightNo} ngày ${command.date}${at} thành ${vnd(command.amount)} đ`;
  }
  return `Đổi giờ khởi hành chuyến ${command.flightNo} ngày ${command.date}${at} sang ${command.time} (giờ Việt Nam)`;
}

// ─── Thực thi lệnh đã xác nhận ──────────────────────────────────────────────

export type ApplyResult =
  | { status: 'applied'; changes: string[]; flight: FlightRecord }
  | { status: 'not-found'; message: string; nearby: Array<{ date: string; time: string }> }
  | { status: 'rejected'; message: string };

/**
 * NUMERIC về từ driver dưới dạng chuỗi (AGENTS: "Coerce the two fares with
 * Number"). So thang giá trên chuỗi sẽ đọc `950.000` thành `950000.00` hay
 * `899000.00`, còn `+` sẽ nối chuỗi — cùng lỗi đã từng làm SkyBOSS quote
 * 10,682,000₫ nhưng bill 13,573,000₫.
 */
function toFareAmount(value: unknown): number {
  return Number(String(value).replace(/[₫\s]/g, '').replace(/,/g, ''));
}

export interface ApplyOptions {
  /** Ai xác nhận lệnh — vào `updated_by` của flight_update_logs. */
  adminId: string;
}

/**
 * Thực thi lệnh đã được xác nhận. Tái dùng luật của PATCH
 * /api/quan-tri/chuyen-bay/[id] (route.ts):
 *
 * - thang giá không đảo (migration 030 `flights_fare_ladder_ordered`): chỉ đúng
 *   một vế được đổi, vế kia đọc từ chính dòng đang sửa, và nếu cặp mới đảo thì
 *   trả `rejected` với đúng câu thông báo 400 của route;
 * - `price` hiển thị phải đồng bộ theo hạng của dòng (`class`), cùng logic
 *   `derivedPrice` của route;
 * - audit log ghi cùng một công cụ `insertFlightUpdateLog` — lệnh chat và form
 *   quản trị để lại cùng một dạng vết.
 */
export async function applyFlightCommand(
  command: UpdatePriceCommand | UpdateTimeCommand,
  options: ApplyOptions
): Promise<ApplyResult> {
  let rows = await getFlightByNoAndDate(command.flightNo, command.date);

  // Lệnh có "lúc HH:MM" chọn đúng lượt trong ngày (cả lệnh giá lẫn lệnh giờ —
  // giờ MỚI của lệnh giờ nằm ở `time`, không phải điều kiện lọc; từng lọc cả
  // hai theo cùng một giờ và "đổi ... sang 07:30" rơi vào "không tìm thấy").
  if (rows.length > 0 && command.selectTime) {
    const filtered = rows.filter(
      (row) => toVietnamWallClock(row.depart_time).time === command.selectTime
    );
    if (filtered.length === 0) {
      const times = rows
        .map((row) => toVietnamWallClock(row.depart_time).time)
        .filter(Boolean)
        .join(', ');
      return {
        status: 'rejected',
        message: `Không có chuyến ${command.flightNo} nào khởi hành lúc ${command.selectTime} ngày ${command.date}. Các lượt trong ngày: ${times}.`,
      };
    }
    rows = filtered;
  }

  if (rows.length === 0) {
    let nearby: Array<{ date: string; time: string }> = [];
    try {
      nearby = await getFlightDatesNear(command.flightNo, command.date);
    } catch (error) {
      console.error('Flight command nearby lookup failed:', error);
    }
    return {
      status: 'not-found',
      message: `Không tìm thấy chuyến ${command.flightNo} nào bay ngày ${command.date}.`,
      nearby,
    };
  }

  if (rows.length > 1) {
    const times = rows
      .map((row) => toVietnamWallClock(row.depart_time).time)
      .filter(Boolean)
      .join(', ');
    return {
      status: 'rejected',
      message: `Chuyến ${command.flightNo} ngày ${command.date} có ${rows.length} chuyến (${times}). Nói rõ giờ khởi hành của chuyến cần sửa, vd: "cập nhật giá vé ${command.flightNo} ngày ${command.date} lúc ${rows[0] ? toVietnamWallClock(rows[0].depart_time).time : 'HH:MM'} ..."`,
    };
  }

  const row = rows[0];

  if (command.kind === 'update-price') {
    const nextEconomy =
      command.fare === 'economy' ? command.amount : toFareAmount(row.economy_price);
    const nextBusiness =
      command.fare === 'business' ? command.amount : toFareAmount(row.business_price);

    if (
      !Number.isFinite(nextEconomy) ||
      !Number.isFinite(nextBusiness) ||
      nextEconomy > nextBusiness
    ) {
      return {
        status: 'rejected',
        message: `Thang giá bị đảo: Phổ thông (${vnd(nextEconomy)} đ) cao hơn Thương gia (${vnd(nextBusiness)} đ). Hãy sửa cả hai hạng nếu muốn.`,
      };
    }

    // `price` là giá của hạng mà dòng này bán (route PATCH: derivedPrice).
    const derivedPrice = row.class === 'business' ? nextBusiness : nextEconomy;
    const updates: Record<string, unknown> = {};
    if (command.fare === 'economy') updates.economy_price = command.amount;
    else updates.business_price = command.amount;
    if (derivedPrice !== toFareAmount(row.price)) updates.price = derivedPrice;

    const side = command.fare === 'economy' ? 'Giá vé Phổ thông' : 'Giá vé Thương gia';
    const oldFare = toFareAmount(
      command.fare === 'economy' ? row.economy_price : row.business_price
    );

    const after = await updateFlight(row.id, updates);
    const changes = [`${side}: ${vnd(oldFare)} đ → ${vnd(command.amount)} đ`];

    await writeAudit(row, options.adminId, [
      {
        field: command.fare === 'economy' ? 'economy_price' : 'business_price',
        oldValue: oldFare,
        newValue: command.amount,
      },
    ]);

    return { status: 'applied', changes, flight: after };
  }

  // ─── update-time: giữ nguyên thời lượng (arr − dep), dịch đúng cặp giờ ──
  const oldDepart = new Date(row.depart_time);
  const oldArrive = new Date(row.arrive_time);
  const durationMs = oldArrive.getTime() - oldDepart.getTime();
  if (
    !Number.isFinite(oldDepart.getTime()) ||
    !Number.isFinite(oldArrive.getTime()) ||
    durationMs <= 0
  ) {
    return {
      status: 'rejected',
      message:
        'Dữ liệu giờ bay hiện tại không hợp lệ nên không đổi được qua lệnh; hãy sửa bằng form quản trị.',
    };
  }

  const departTime = toVietnamWallClock(row.depart_time);
  // Ghi mới với offset +07:00 (AGENTS: timestamp seed phải kèm múi giờ rõ), theo
  // cùng công cụ `toVietnamInstant` form quản trị dùng. Cả hai cột trong cùng
  // một UPDATE phải cùng dạng: depart dùng toVietnamInstant trực tiếp, arrive
  // đọc lại giờ Việt Nam từ thời điểm đích rồi format lại — từng cột này ra
  // dạng `Z` từ toISOString() trong khi kia là `+07:00`, cùng thời điểm nhưng
  // hai chuỗi khác nhau gây bối rối khi đọc audit log.
  const newDepart = toVietnamInstant(command.date, command.time);
  const newDepartMs = new Date(newDepart).getTime();
  const arriveMs = new Date(newDepartMs + durationMs).toISOString();
  const arriveWc = toVietnamWallClock(arriveMs);
  const newArrive = toVietnamInstant(arriveWc.date, arriveWc.time);

  const after = await updateFlight(row.id, {
    depart_time: newDepart,
    arrive_time: newArrive,
  });

  await writeAudit(row, options.adminId, [
    { field: 'depart_time', oldValue: row.depart_time, newValue: newDepart },
    { field: 'arrive_time', oldValue: row.arrive_time, newValue: newArrive },
  ]);

  const newVN = toVietnamWallClock(newDepart);
  return {
    status: 'applied',
    changes: [
      `Giờ khởi hành: ${departTime.time} → ${newVN.time} (cùng lịch bay, giữ thời lượng ${Math.round(durationMs / 60000)} phút)`,
    ],
    flight: after,
  };
}

async function writeAudit(
  before: FlightRecord,
  adminId: string,
  changes: Array<{ field: string; oldValue: unknown; newValue: unknown }>,
  requestMeta?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  try {
    await insertFlightUpdateLog({
      flightId: before.id,
      flightNo: before.flight_no,
      updatedBy: adminId,
      changesJson: JSON.stringify(changes.map((change) => ({ ...change, label: change.field }))),
      previousSnapshot: JSON.stringify(before),
      ipAddress: requestMeta?.ipAddress ?? 'chat/OpenClaw',
      userAgent: requestMeta?.userAgent ?? 'OpenClaw Assistant (admin chat)',
    });
  } catch (logErr) {
    // Route PATCH cũng bỏ qua lỗi log; một thất bại log không huỷ lệnh đã ghi.
    console.error('[AUDIT-LOG-ERROR] Failed to write flight command log:', logErr);
  }
}
