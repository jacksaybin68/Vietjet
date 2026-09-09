// Validation utilities

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  // Vietnamese phone number: starts with 0 and has 10-11 digits
  const phoneRegex = /^0\d{9,10}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

export const isValidPassword = (password: string, minLength: number = 8): boolean => {
  return password.length >= minLength;
};

export const isValidName = (name: string): boolean => {
  return name.trim().length >= 2;
};

export const isValidDate = (date: unknown): date is Date => {
  return date instanceof Date && !isNaN(date.getTime());
};

// Validate flight search parameters
export interface FlightSearchValidation {
  isValid: boolean;
  errors: string[];
}

export const validateFlightSearch = (params: {
  departure: string;
  arrival: string;
  departureDate: string;
}): FlightSearchValidation => {
  const errors: string[] = [];

  if (!params.departure || params.departure.trim() === '') {
    errors.push('Vui lòng chọn điểm khởi hành');
  }

  if (!params.arrival || params.arrival.trim() === '') {
    errors.push('Vui lòng chọn điểm đến');
  }

  if (params.departure === params.arrival) {
    errors.push('Điểm khởi hành và đích phải khác nhau');
  }

  if (!params.departureDate || params.departureDate.trim() === '') {
    errors.push('Vui lòng chọn ngày khởi hành');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Validate passenger data
export interface PassengerValidation {
  isValid: boolean;
  errors: Record<string, string>;
}

export const validatePassenger = (passenger: {
  fullName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
}): PassengerValidation => {
  const errors: Record<string, string> = {};

  if (!passenger.fullName || !isValidName(passenger.fullName)) {
    errors.fullName = 'Tên hành khách không hợp lệ';
  }

  if (!passenger.email || !isValidEmail(passenger.email)) {
    errors.email = 'Email không hợp lệ';
  }

  if (!passenger.phone || !isValidPhone(passenger.phone)) {
    errors.phone = 'Số điện thoại không hợp lệ';
  }

  if (!passenger.dateOfBirth) {
    errors.dateOfBirth = 'Vui lòng nhập ngày sinh';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
