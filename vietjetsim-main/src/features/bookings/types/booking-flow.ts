import type { Flight } from '@/features/flights/types';

export type { Flight };

/**
 * Passenger categories. Vietnam domestic fares follow the standard airline
 * split: a child (2-11) pays 75% of the adult fare, an infant (under 2) travels
 * on a lap for free so it is neither seated nor charged fare, tax or fees.
 */
export type PassengerType = 'adult' | 'child' | 'infant';

/** Passengers who occupy a seat; an infant is excluded. */
export const SEATED_PASSENGER_TYPES: readonly PassengerType[] = ['adult', 'child'];

export const PASSENGER_TYPE_LABELS: Record<PassengerType, string> = {
  adult: 'Người lớn',
  child: 'Trẻ em',
  infant: 'Em bé',
};

export interface CountryDialCode {
  code: string;
  dialCode: string;
  name: string;
}

export const COUNTRY_DIAL_CODES: readonly CountryDialCode[] = [
  { code: 'VN', dialCode: '+84', name: 'Việt Nam (+84)' },
  { code: 'TH', dialCode: '+66', name: 'Thái Lan (+66)' },
  { code: 'SG', dialCode: '+65', name: 'Singapore (+65)' },
  { code: 'MY', dialCode: '+60', name: 'Malaysia (+60)' },
  { code: 'KR', dialCode: '+82', name: 'Hàn Quốc (+82)' },
  { code: 'JP', dialCode: '+81', name: 'Nhật Bản (+81)' },
  { code: 'TW', dialCode: '+886', name: 'Đài Loan (+886)' },
  { code: 'HK', dialCode: '+852', name: 'Hồng Kông (+852)' },
  { code: 'CN', dialCode: '+86', name: 'Trung Quốc (+86)' },
  { code: 'IN', dialCode: '+91', name: 'Ấn Độ (+91)' },
  { code: 'AU', dialCode: '+61', name: 'Úc (+61)' },
  { code: 'ID', dialCode: '+62', name: 'Indonesia (+62)' },
  { code: 'PH', dialCode: '+63', name: 'Philippines (+63)' },
  { code: 'KH', dialCode: '+855', name: 'Campuchia (+855)' },
  { code: 'LA', dialCode: '+856', name: 'Lào (+856)' },
  { code: 'MM', dialCode: '+95', name: 'Myanmar (+95)' },
  { code: 'US', dialCode: '+1', name: 'Hoa Kỳ (+1)' },
  { code: 'CA', dialCode: '+1', name: 'Canada (+1)' },
  { code: 'GB', dialCode: '+44', name: 'Vương quốc Anh (+44)' },
  { code: 'FR', dialCode: '+33', name: 'Pháp (+33)' },
  { code: 'DE', dialCode: '+49', name: 'Đức (+49)' },
  { code: 'RU', dialCode: '+7', name: 'Nga (+7)' },
  { code: 'AE', dialCode: '+971', name: 'UAE / Dubai (+971)' },
  { code: 'NZ', dialCode: '+64', name: 'New Zealand (+64)' },
];

export function getCountryDialCode(code: string | undefined): string {
  const match = COUNTRY_DIAL_CODES.find((c) => c.code === code);
  return match ? match.dialCode : '+84';
}

/** A passenger rides free only when they are seated. */
export function isSeated(type: PassengerType | undefined): boolean {
  return SEATED_PASSENGER_TYPES.includes(type ?? 'adult');
}

/** A passenger needs an identity document; an infant may travel on a birth certificate. */
export function requiresIdNumber(type: PassengerType | undefined): boolean {
  return (type ?? 'adult') !== 'infant';
}

/** Head count per category, used by every step that prices or labels a booking. */
export function countPassengerTypes(
  passengers: readonly Pick<Passenger, 'type'>[]
): Record<PassengerType, number> {
  const counts: Record<PassengerType, number> = { adult: 0, child: 0, infant: 0 };
  for (const passenger of passengers) {
    counts[passenger.type ?? 'adult'] += 1;
  }
  return counts;
}

export interface Passenger {
  /** Absent only on objects built before passenger types existed; read as 'adult'. */
  type?: PassengerType;
  /** Họ theo giấy tờ tùy thân. */
  name: string;
  /** Tên đệm và tên theo giấy tờ tùy thân. */
  firstName?: string;
  dob: string;
  idNumber: string;
  gender: string;
  countryCode: string;
  phone: string;
  email: string;
  residence: string;
  skyJoyMemberId: string;
}

/**
 * Tên đầy đủ của hành khách: họ + tên đệm & tên, viết liền bằng một dấu cách.
 *
 * Form đặt vé tách hai ô theo giấy tờ tùy thân ("Họ" và "Tên đệm & tên"), còn vé,
 * thẻ lên máy bay, check-in và email đều cần đúng một chuỗi tên. Gửi riêng phần
 * họ làm vé in ra một tên cụt ("Hoàng "), lệch với giấy tờ và không khớp với tên
 * mà quầy check-in đối chiếu.
 */
export function fullPassengerName(p: Pick<Passenger, 'name' | 'firstName'>): string {
  return [p.name, p.firstName]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(' ');
}

export interface BookingConsents {
  marketing: boolean;
  survey: boolean;
  retainForFutureBooking: boolean;
  policyAccepted: boolean;
}

import type { AncillaryId } from '../pricing';

export type BookingState = {
  selectedFlight: Flight | null;
  returnFlight?: Flight | null;
  passengers: Passenger[];
  selectedSeats: string[];
  returnSeats?: string[];
  ancillaries: AncillaryId[];
  selectedBaggage?: string | null;
  returnBaggage?: string | null;
  hasInsurance?: boolean;
};

export type SearchParams = {
  from?: string;
  to?: string;
  depart?: string;
  return?: string;
  /** Adults (12+). */
  pax?: string;
  /** Children aged 2-11. */
  child?: string;
  /** Infants under 2, travelling on a lap. */
  infant?: string;
  /** Auto-select cheapest fare when set to '1'. */
  cheapest?: string;
};
