// Shared error handling utilities

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ErrorResponse {
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Error type guards
export const isApiError = (error: unknown): error is ApiError => {
  return error instanceof ApiError;
};

// Error formatter
export const formatError = (error: unknown): ErrorResponse => {
  if (isApiError(error)) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
    };
  }

  if (error instanceof Error) {
    return {
      status: 500,
      code: 'INTERNAL_ERROR',
      message: error.message,
    };
  }

  return {
    status: 500,
    code: 'UNKNOWN_ERROR',
    message: 'Đã xảy ra lỗi không xác định',
  };
};

// Error messages by code
export const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'Bạn cần đăng nhập để tiếp tục',
  FORBIDDEN: 'Bạn không có quyền truy cập tài nguyên này',
  NOT_FOUND: 'Không tìm thấy tài nguyên',
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ',
  NETWORK_ERROR: 'Lỗi kết nối mạng',
  SERVER_ERROR: 'Lỗi máy chủ',
  UNKNOWN_ERROR: 'Đã xảy ra lỗi không xác định',
};
