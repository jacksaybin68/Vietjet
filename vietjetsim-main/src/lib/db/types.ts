// ─── Types ──────────────────────────────────────────────────────────────────

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role:
    | 'user'
    | 'admin'
    | 'super_admin'
    | 'admin_ops'
    | 'admin_finance'
    | 'admin_support'
    | 'admin_content';
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AirportRecord {
  id: string;
  code: string;
  name: string;
  city: string;
  country: string;
  created_at: string;
}

export interface FlightRecord {
  id: string;
  flight_no: string;
  from_code: string;
  to_code: string;
  depart_time: string;
  arrive_time: string;
  price: number;
  class: 'economy' | 'business';
  available: number;
  created_at: string;
  updated_at: string;
}

export interface BookingRecord {
  id: string;
  user_id: string;
  flight_id: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded';
  total_price: number;
  discount_code_id?: string | null;
  discount_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface PassengerRecord {
  id: string;
  booking_id: string;
  name: string;
  dob: string | null;
  id_number: string | null;
  gender: 'male' | 'female' | 'other';
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  booking_id: string;
  method: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  amount: number;
  created_at: string;
}

/** Rich booking detail returned by getBookingById (includes nested flight, passengers, payment, seats) */
export interface BookingDetail {
  id: string;
  user_id: string;
  flight_id: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded';
  total_price: number;
  discount_code_id?: string | null;
  discount_amount?: number;
  created_at: string;
  updated_at: string;
  flight: Pick<
    FlightRecord,
    'flight_no' | 'from_code' | 'to_code' | 'depart_time' | 'arrive_time' | 'price' | 'class'
  >;
  passengers: PassengerRecord[];
  payment: PaymentRecord | null;
  seats: Record<string, unknown>[];
}

export interface NotificationRecord {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface RefundRecord {
  id: string;
  booking_id: string;
  user_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed' | 'archived';
  bank_info: any;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiscountCodeRecord {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_booking_amount: number;
  max_discount_amount: number | null;
  start_date: string;
  end_date: string;
  usage_limit: number | null;
  usage_per_user_limit: number | null;
  used_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatConversationRecord {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  status: 'active' | 'closed';
  last_message: string | null;
  unread_by_user: number;
  unread_by_admin: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageRecord {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: 'user' | 'admin';
  content: string;
  read_at: string | null;
  created_at: string;
}

export interface ChatPresenceRecord {
  id: string;
  user_id: string;
  conversation_id: string;
  role: 'user' | 'admin';
  is_online: boolean;
  is_typing: boolean;
  last_seen: string;
  updated_at: string;
}
