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
  CHECKOUT: '/dat-ve',
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
