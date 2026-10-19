// Global API endpoints
//
// These mirror the route handlers under `src/app/api`. Paths are grouped by
// concern and use `:param` placeholders for dynamic segments.
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/xac-thuc/dang-nhap',
    REGISTER: '/api/xac-thuc/dang-ky',
    LOGOUT: '/api/xac-thuc/dang-xuat',
    REFRESH: '/api/xac-thuc/lam-moi',
    ME: '/api/xac-thuc/toi',
    FORGOT_PASSWORD: '/api/xac-thuc/quen-mat-khau',
    RESET_PASSWORD: '/api/xac-thuc/dat-lai-mat-khau',
    // OTP SMS: gửi mã cho đăng ký/đăng nhập, và đăng nhập không cần mật khẩu.
    SEND_OTP: '/api/xac-thuc/otp/gui',
    LOGIN_OTP: '/api/xac-thuc/dang-nhap-otp',
    // CAPTCHA mô phỏng (phát câu hỏi + chữ ký) và cấu hình Social Login.
    CAPTCHA: '/api/xac-thuc/captcha',
    SOCIAL: '/api/xac-thuc/social',
  },
  FLIGHTS: {
    SEARCH: '/api/chuyen-bay',
  },
  BOOKINGS: {
    LIST: '/api/dat-ve',
    CREATE: '/api/dat-ve',
    DETAIL: '/api/dat-ve/:id',
  },
  PAYMENTS: {
    CREATE: '/api/thanh-toan',
    HISTORY: '/api/thanh-toan/lich-su',
    // Sinh mã VietQR (EMVCo) cho một booking và polling trạng thái giao dịch.
    VIETQR: '/api/thanh-toan/vietqr',
    STATUS: '/api/thanh-toan/trang-thai',
  },
  LOYALTY: {
    MEMBERSHIP: '/api/thanh-vien',
    REDEEM: '/api/thanh-vien/doi-diem',
    TRANSACTIONS: '/api/thanh-vien/giao-dich',
  },
  WALLET: {
    ROOT: '/api/vi',
    PAYMENT_METHODS: '/api/vi/phuong-thuc-thanh-toan',
    PAYMENT_METHOD: '/api/vi/phuong-thuc-thanh-toan/:id',
  },
  CHAT: {
    MESSAGES: '/api/tro-chuyen',
    CONVERSATIONS: '/api/tro-chuyen/cuoc-hoi-thoai',
    PRESENCE: '/api/tro-chuyen/truc-tuyen',
    MARK_READ: '/api/tro-chuyen/danh-dau-da-doc',
    ASSISTANT: '/api/tro-ly-ai/tro-chuyen',
  },
  ADMIN: {
    REVENUE: '/api/quan-tri/doanh-thu',
    USERS: '/api/quan-tri/nguoi-dung',
    USER: '/api/quan-tri/nguoi-dung/:id',
    BOOKINGS: '/api/quan-tri/dat-ve',
    BOOKING_INVOICE: '/api/quan-tri/dat-ve/hoa-don',
    FLIGHTS: '/api/quan-tri/chuyen-bay',
    FLIGHT: '/api/quan-tri/chuyen-bay/:id',
    AIRPORTS: '/api/quan-tri/san-bay',
    AIRPORT: '/api/quan-tri/san-bay/:id',
    DISCOUNTS: '/api/quan-tri/ma-giam-gia',
    DISCOUNT: '/api/quan-tri/ma-giam-gia/:id',
    BANK_ACCOUNTS: '/api/quan-tri/tai-khoan-ngan-hang',
    BANK_ACCOUNT: '/api/quan-tri/tai-khoan-ngan-hang/:id',
    REFUNDS: '/api/quan-tri/hoan-tien',
    TRANSACTIONS: '/api/quan-tri/giao-dich',
    ANNOUNCEMENTS: '/api/quan-tri/thong-bao',
    ANNOUNCEMENT: '/api/quan-tri/thong-bao/:id',
    SETTINGS: '/api/quan-tri/cai-dat',
    RBAC: '/api/quan-tri/phan-quyen',
    AUDIT_LOGS: '/api/quan-tri/nhat-ky-kiem-toan',
    TOOLS: '/api/quan-tri/cong-cu',
    COLLECT_NETWORK: '/api/quan-tri/thu-thap-mang-luoi',
    COLLECT_SCHEDULE: '/api/quan-tri/thu-thap-lich-bay',
    COLLECT_BULK: '/api/quan-tri/thu-thap-hang-loat',
    COLLECT_AUTO: '/api/quan-tri/thu-thap-tu-dong',
    COLLECT_SOLVE_WAF: '/api/quan-tri/thu-thap-giai-waf',
    ADJUST_FLIGHT_PRICES: '/api/quan-tri/chuyen-bay/dieu-chinh-gia',
  },
} as const;

// Route paths
export const ROUTES = {
  HOME: '/trang-chu',
  LOGIN: '/dang-nhap',
  SEARCH_FLIGHTS: '/tim-ve',
  BOOKINGS: '/chuyen-bay-cua-toi',
  ACCOUNT: '/tai-khoan',
  PAYMENT: '/thanh-toan',
  ADMIN: '/quan-tri',
  FAQ: '/hoi-dap',
  CONTACT: '/lien-he',
  ABOUT: '/gioi-thieu',
  SERVICES: '/dich-vu',
  BAGGAGE: '/hanh-ly',
  CHECK_IN: '/lam-thu-tuc',
  LOOKUP: '/tra-cuu',
} as const;

// Time formats
export const TIME_FORMATS = {
  DATE: 'DD/MM/YYYY',
  TIME: 'HH:mm',
  DATETIME: 'DD/MM/YYYY HH:mm',
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
} as const;

// Validation messages
export const VALIDATION_MESSAGES = {
  REQUIRED: 'Trường này là bắt buộc',
  INVALID_EMAIL: 'Email không hợp lệ',
  INVALID_PHONE: 'Số điện thoại không hợp lệ',
  PASSWORD_MIN_LENGTH: 'Mật khẩu phải có ít nhất 8 ký tự',
  PASSWORDS_DONT_MATCH: 'Mật khẩu không khớp',
} as const;

// Error codes
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Vietnamese airports
//
// The `airports` table is the source of truth for the hero picker's list, but
// plenty of screens render a bare code from a booking record with no join to it
// (the results step, "My bookings", the dashboard history). Those need a
// code → city map in the bundle.
//
// This used to be three separate maps that had drifted apart: one called VCA
// "Tam Kỳ" (VCA is Cần Thơ), one used PUI for Phù Cát (the real code is UIH),
// one used VKO for Rạch Giá (VKG), and one spelled VDO "Vũng Tàu" (Vân Đồn).
// A flight booked through the wrong entry showed a different city than the
// ticket. Every entry below matches the `airports` table seeded by
// migrations/014 and /025; add a new airport to both together.
export const AIRPORT_CITIES: Record<string, string> = {
  HAN: 'Hà Nội',
  SGN: 'TP. Hồ Chí Minh',
  DAD: 'Đà Nẵng',
  PQC: 'Phú Quốc',
  CXR: 'Nha Trang',
  HPH: 'Hải Phòng',
  HUI: 'Huế',
  VDO: 'Quảng Ninh',
  VCA: 'Cần Thơ',
  PXU: 'Pleiku',
  BMV: 'Buôn Ma Thuột',
  DLI: 'Đà Lạt',
  VCS: 'Côn Đảo',
  THD: 'Thanh Hóa',
  VII: 'Vinh',
  VDH: 'Quảng Bình',
  UIH: 'Quy Nhơn',
  VCL: 'Chu Lai',
  DIN: 'Điện Biên Phủ',
  VKG: 'Rạch Giá',
  HXX: 'Hà Giang',
  TUQ: 'Tuyên Quang',
  BBU: 'Quảng Trạch',
  TBB: 'Phú Yên',
  // International, added by 028. These are needed here for the same reason the
  // domestic entries are: the results step and "My bookings" render a bare code
  // with no join, so a flight to Seoul would otherwise print "ICN" to the
  // customer instead of "Seoul". Bangkok and Tokyo each have two airports in
  // the table and so need two distinct entries.
  SIN: 'Singapore',
  BKK: 'Bangkok',
  DMK: 'Bangkok',
  KUL: 'Kuala Lumpur',
  CGK: 'Jakarta',
  MNL: 'Manila',
  PNH: 'Phnom Penh',
  RGN: 'Yangon',
  VTE: 'Vientiane',
  ICN: 'Seoul',
  KIX: 'Osaka',
  NRT: 'Tokyo',
  HKG: 'Hong Kong',
};

/**
 * Airports served outside Vietnam.
 *
 * The seat picker needs to know which aircraft flies a route: the narrow-body
 * A321 (3-3, one aisle) works the domestic network, while the wide-body A330
 * (3-3-3 with a 2-2-2 business cabin) is what Vietjet puts on the international
 * trunk routes. A route is international when either end sits outside the list
 * below — derived from `AIRPORT_CITIES`'s own entries rather than a second map
 * that could drift from it, so every foreign airport added there must be added
 * here too.
 */
export const INTERNATIONAL_AIRPORT_CODES: readonly string[] = [
  'SIN',
  'BKK',
  'DMK',
  'KUL',
  'CGK',
  'MNL',
  'PNH',
  'RGN',
  'VTE',
  'ICN',
  'KIX',
  'NRT',
  'HKG',
];

/** Whether `code` is an airport outside Vietnam (case-insensitive). */
export function isInternationalAirport(code: string | undefined): boolean {
  if (!code) return false;
  return INTERNATIONAL_AIRPORT_CODES.includes(code.trim().toUpperCase());
}

/** Whether a search route leaves Vietnam, i.e. needs the wide-body cabin. */
export function isInternationalRoute(from: string | undefined, to: string | undefined): boolean {
  return isInternationalAirport(from) || isInternationalAirport(to);
}
