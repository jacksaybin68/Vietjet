export const AIRPORTS = ['HAN', 'SGN', 'DAD', 'PQC', 'CXR', 'HPH', 'HUI'] as const;

export type FlightStatus = 'active' | 'cancelled' | 'delayed';

export const STATUS_MAP: Record<FlightStatus, { label: string; cls: string }> = {
  active: { label: 'Hoạt động', cls: 'badge-success' },
  cancelled: { label: 'Đã huỷ', cls: 'badge-error' },
  delayed: { label: 'Trễ giờ', cls: 'badge-warning' },
};

export const STATUS_TABS: { value: 'all' | FlightStatus; label: string; color: string }[] = [
  { value: 'all', label: 'Tất cả', color: 'text-stone-600 bg-stone-100' },
  { value: 'active', label: 'Hoạt động', color: 'text-green-700 bg-green-100' },
  { value: 'delayed', label: 'Trễ giờ', color: 'text-amber-700 bg-amber-100' },
  { value: 'cancelled', label: 'Đã huỷ', color: 'text-red-700 bg-red-100' },
];

export const FLIGHT_CLASSES = [
  { value: 'economy', label: 'Economy' },
  { value: 'business', label: 'Business' },
] as const;

export type FlightClass = (typeof FLIGHT_CLASSES)[number]['value'];
