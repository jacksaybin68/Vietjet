// Global API endpoints
export const API_ENDPOINTS = {
  AUTH: '/api/auth',
  FLIGHTS: '/api/flights',
  BOOKINGS: '/api/bookings',
  PAYMENTS: '/api/payments',
  USERS: '/api/users',
  ADMIN: '/api/admin',
} as const;

// Route paths
export const ROUTES = {
  HOME: '/',
  LOGIN: '/dang-nhap',
  SIGNUP: '/dang-ky',
  SEARCH_FLIGHTS: '/tim-ve',
  BOOKINGS: '/chuyen-bay-cua-toi',
  ACCOUNT: '/tai-khoan',
  PAYMENT: '/thanh-toan',
  ADMIN: '/quan-tri',
  FAQ: '/hoi-dap',
  CONTACT: '/lien-he',
  CHECKOUT: '/dat-ve',
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
