#!/usr/bin/env node
/**
 * Lịch bay dùng chung cho các script seed.
 *
 * Trước đây danh sách tuyến nằm riêng trong `seed-future-flights.cjs` và chỉ có
 * 20 tuyến, nên bảy sân bay nội địa đang khai thác thật — Điện Biên (DIN),
 * Pleiku (PXU), Tuy Hòa/Phú Yên (TBB), Quy Nhơn (UIH), Chu Lai (VCL), Đồng Hới
 * (VDH), Vân Đồn (VDO) — không có chuyến nào để bán, và các chặng trục thiếu
 * như HAN-PQC, SGN-DAD. Tách ra đây để hai script cùng dùng một lịch.
 *
 * Đây là lịch demo của một trình mô phỏng, dựng theo hình hub-and-spoke mà
 * migration 027 đã dùng (mọi sân bay nối Hà Nội và TP.HCM), với thời gian bay
 * và giá hợp lý chứ không phải bảng giờ thật của hãng. Tuyến không có thật thì
 * không dựng: Côn Đảo (VCS) và Rạch Giá (VKG) chỉ có từ TP.HCM.
 *
 * `businessNo` giữ nguyên quy ước cũ: mỗi tuyến có hai số, sóng economy trong
 * 3xx và sóng business trong 30xx, vì `flights.class` đã mang cabin nên hậu tố
 * chữ cái (`VJ341B`) là thừa và bị CHECK của migration 036 từ chối.
 */

/** Số hiệu sóng business; mỗi tuyến lấy `BUSINESS_NO_BASE + index` trong ROUTES. */
const BUSINESS_NO_BASE = 3001;
const businessNo = (index) => `VJ${BUSINESS_NO_BASE + index}`;

/**
 * Sân bay nội địa, cùng [thời gian bay (phút), giá economy] từ mỗi đầu trục.
 * `han: null` nghĩa là tuyến đó không tồn tại trên thực tế và không được dựng.
 */
const DOMESTIC_SPOKES = {
  DAD: { han: [85, 749000], sgn: [95, 899000] },
  PQC: { han: [130, 999000], sgn: [60, 699000] },
  CXR: { han: [105, 829000], sgn: [70, 759000] },
  HUI: { han: [80, 699000], sgn: [95, 799000] },
  VCA: { han: [135, 949000], sgn: [45, 599000] },
  HPH: { han: [60, 449000], sgn: [125, 899000] },
  VII: { han: [55, 499000], sgn: [120, 849000] },
  THD: { han: [70, 549000], sgn: [125, 899000] },
  UIH: { han: [100, 799000], sgn: [75, 699000] },
  TBB: { han: [95, 749000], sgn: [80, 729000] },
  PXU: { han: [105, 799000], sgn: [70, 699000] },
  BMV: { han: [110, 849000], sgn: [60, 649000] },
  DLI: { han: [110, 769000], sgn: [55, 649000] },
  DIN: { han: [65, 649000], sgn: [150, 1059000] },
  VCL: { han: [95, 699000], sgn: [90, 749000] },
  VDO: { han: [65, 559000], sgn: [135, 949000] },
  VDH: { han: [75, 599000], sgn: [105, 799000] },
  VCS: { han: null, sgn: [60, 649000] },
  VKG: { han: null, sgn: [55, 599000] },
};

/** Tuyến quốc tế, theo mạng của migration 028 và thời gian bay thật của nó. */
const INTERNATIONAL = [
  ['VJ401', 'HAN', 'SIN', '09:00', 210, 2450000, 6786500, 180],
  ['VJ411', 'SIN', 'HAN', '13:30', 210, 2550000, 7053500, 180],
  ['VJ421', 'SGN', 'ICN', '09:00', 320, 4900000, 13573000, 180],
  ['VJ431', 'ICN', 'SGN', '14:00', 320, 5000000, 13850000, 180],
  ['VJ441', 'HAN', 'BKK', '08:20', 165, 1650000, 4570500, 180],
  ['VJ451', 'SGN', 'MNL', '10:40', 205, 2650000, 7340500, 160],
  ['VJ461', 'HAN', 'KIX', '11:10', 350, 5600000, 15512000, 150],
  ['VJ471', 'SGN', 'HKG', '07:50', 200, 3250000, 9002500, 170],
  ['VJ481', 'HAN', 'ICN', '08:30', 320, 5100000, 14127000, 170],
  ['VJ491', 'SGN', 'BKK', '13:10', 165, 1750000, 4847500, 180],
];

const pad = (n) => String(n).padStart(2, '0');

/** Vietnam-local ISO timestamp with an explicit +07:00 offset. */
function vnTime(date, hhmm, extraMin = 0) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m + extraMin);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00+07:00`;
}

/** `HH:MM` cộng thêm phút, dùng để rải giờ khởi hành cho khỏi trùng một giờ. */
const shiftTime = (hhmm, extraMin) => {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + extraMin;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
};

/**
 * Bậc giá của migration 030, nguyên văn: hàng business lấy `price / 2.77` làm
 * giá economy, mọi hạng khác lấy `price`; chiều ngược lại nhân 2.77. Giữ đúng
 * công thức này để hàng seed không lệch bậc so với hàng tạo qua admin.
 */
const fareLadder = (cls, price) =>
  cls === 'business'
    ? { economy_price: Math.round(price / 2.77), business_price: Math.round(price) }
    : { economy_price: Math.round(price), business_price: Math.round(price * 2.77) };

/**
 * Danh sách tuyến: `[flight_no, from, to, depart, durationMin, economyPrice,
 * businessPrice, seats]` — giữ nguyên hình dạng mà `seed-future-flights.cjs`
 * đang đọc.
 */
function buildRoutes() {
  const routes = [];
  let eco = 301;
  const push = (from, to, depart, durationMin, economyPrice, seats) => {
    routes.push([
      `VJ${eco++}`,
      from,
      to,
      depart,
      durationMin,
      economyPrice,
      Math.round(economyPrice * 2.77),
      seats,
    ]);
  };

  // Trục Bắc–Nam, tuyến đông khách nhất nước.
  push('HAN', 'SGN', '06:00', 145, 899000, 189);
  push('SGN', 'HAN', '09:15', 145, 949000, 189);

  const codes = Object.keys(DOMESTIC_SPOKES);
  codes.forEach((code, i) => {
    const spread = (i % 8) * 45;
    const seats = i % 3 === 0 ? 189 : 150;
    const spoke = DOMESTIC_SPOKES[code];

    if (spoke.han) {
      const [minutes, price] = spoke.han;
      push('HAN', code, shiftTime('06:00', spread), minutes, price, seats);
      push(code, 'HAN', shiftTime('12:00', spread), minutes, Math.round(price * 0.94), seats);
    }
    if (spoke.sgn) {
      const [minutes, price] = spoke.sgn;
      push('SGN', code, shiftTime('06:30', spread), minutes, price, seats);
      push(code, 'SGN', shiftTime('13:00', spread), minutes, Math.round(price * 0.94), seats);
    }
  });

  for (const entry of INTERNATIONAL) routes.push(entry);

  return routes;
}

const ROUTES = buildRoutes();

/** Business là sóng thứ hai trong ngày, sau economy 3 tiếng. */
const BUSINESS_SHIFT_MIN = 180;

/**
 * Mọi chuyến của lịch trong khoảng `[from, until]` (bao gồm hai đầu), mỗi tuyến
 * hai sóng. Trả về mảng hàng đã sẵn sàng để ghi, kèm bậc giá của 030.
 */
function buildSchedule({ from, until }) {
  const rows = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const last = new Date(until.getFullYear(), until.getMonth(), until.getDate());

  while (cursor <= last) {
    const date = new Date(cursor);
    ROUTES.forEach(
      ([no, fromCode, toCode, depart, durationMin, ecoPrice, bizPrice, seats], index) => {
        const waves = [
          { cls: 'economy', price: ecoPrice, available: seats, shift: 0, no },
          {
            cls: 'business',
            price: bizPrice,
            available: Math.max(20, Math.round(seats / 3)),
            shift: BUSINESS_SHIFT_MIN,
            no: businessNo(index),
          },
        ];
        for (const wave of waves) {
          rows.push({
            flight_no: wave.no,
            from_code: fromCode,
            to_code: toCode,
            depart_time: vnTime(date, depart, wave.shift),
            arrive_time: vnTime(date, depart, wave.shift + durationMin),
            price: wave.price,
            class: wave.cls,
            available: wave.available,
            ...fareLadder(wave.cls, wave.price),
          });
        }
      }
    );
    cursor.setDate(cursor.getDate() + 1);
  }

  return rows;
}

module.exports = {
  ROUTES,
  BUSINESS_NO_BASE,
  BUSINESS_SHIFT_MIN,
  businessNo,
  buildSchedule,
  fareLadder,
  shiftTime,
  vnTime,
};
