// Date & time formatting utilities
import { format, parse, differenceInMinutes, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';

export const formatDate = (date: Date | string, fmt: string = 'dd/MM/yyyy'): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, fmt, { locale: vi });
  } catch {
    return 'Ngày không hợp lệ';
  }
};

export const formatTime = (date: Date | string, fmt: string = 'HH:mm'): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, fmt, { locale: vi });
  } catch {
    return 'Giờ không hợp lệ';
  }
};

export const formatDateTime = (date: Date | string, fmt: string = 'dd/MM/yyyy HH:mm'): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, fmt, { locale: vi });
  } catch {
    return 'Ngày giờ không hợp lệ';
  }
};

// Get flight duration in hours and minutes
export const getFlightDuration = (
  departureTime: Date | string,
  arrivalTime: Date | string
): string => {
  try {
    const departure = typeof departureTime === 'string' ? new Date(departureTime) : departureTime;
    const arrival = typeof arrivalTime === 'string' ? new Date(arrivalTime) : arrivalTime;

    const minutes = differenceInMinutes(arrival, departure);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    return `${hours}h ${mins}m`;
  } catch {
    return '-- --';
  }
};

// Check if flight is departing soon (within 24 hours)
export const isDepartingSoon = (departureTime: Date | string): boolean => {
  const departure = typeof departureTime === 'string' ? new Date(departureTime) : departureTime;
  const tomorrow = addDays(new Date(), 1);
  return departure <= tomorrow;
};

// Get relative time (e.g., "Hôm nay", "Ngày mai")
export const getRelativeDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  const tomorrow = addDays(today, 1);

  if (format(dateObj, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
    return 'Hôm nay';
  }
  if (format(dateObj, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd')) {
    return 'Ngày mai';
  }

  return formatDate(dateObj, 'EEE, dd MMM');
};
