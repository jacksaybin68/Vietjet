// Currency & number formatting utilities

export const formatCurrency = (
  amount: number,
  currency: 'VND' | 'USD' | 'EUR' = 'VND',
  locale: string = 'vi-VN'
): string => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
};

export const formatNumber = (
  value: number,
  options: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    useGrouping?: boolean;
  } = {}
): string => {
  try {
    return new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      useGrouping: true,
      ...options,
    }).format(value);
  } catch {
    return value.toString();
  }
};

// Percentage formatting
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

// Parse currency string to number
export const parseCurrency = (value: string): number => {
  // Remove currency symbols and spaces, then convert to number
  const cleaned = value
    .replace(/[^\d,-]/g, '') // Keep only digits, comma, and minus
    .replace(/\./g, '') // Remove thousands separators
    .replace(',', '.'); // Replace decimal comma with dot

  return parseFloat(cleaned) || 0;
};
