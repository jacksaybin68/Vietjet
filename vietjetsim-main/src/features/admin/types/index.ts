export interface AdminRevenueStats {
  totalRevenue: number;
  totalBookings: number;
  avgBookingValue: number;
  completedBookings: number;
  pendingBookings: number;
}

export interface AdminRecentActivity {
  type: 'booking' | 'refund';
  id: string;
  booking_code?: string;
  user_name?: string;
  route?: string;
  created_at: string;
  status: string;
  total_price?: number;
  reason?: string;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  tickets: number;
}

export interface RouteRevenue {
  route: string;
  revenue: number;
  tickets: number;
}

export interface SeatClassCount {
  class: string;
  count: number;
}

/** Response contract consumed by admin overview and revenue charts. */
export interface AdminAnalytics {
  revenue: AdminRevenueStats;
  statusDistribution: Array<{ status: string; count: number }>;
  recentActivity: AdminRecentActivity[];
  /** Aggregates absent from older API responses are normalised to empty arrays. */
  monthly: MonthlyRevenue[];
  routes: RouteRevenue[];
  classSplit: SeatClassCount[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** List responses are `{ <key>: items[], pagination }` — e.g. `{ airports, pagination }`. */
export type AdminList<K extends string, T> = { pagination: Pagination } & { [P in K]: T[] };

export interface Airport {
  id: string;
  code: string;
  name: string;
  city: string;
  country: string;
  created_at: string;
}

export interface AdminAirportInput {
  code: string;
  name: string;
  city: string;
  country: string;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name?: string;
  name?: string;
  phone?: string;
  role: string;
  status?: 'active' | 'locked';
  loyalty_points?: number;
  bookings_count?: number;
  total_spent?: number;
  last_login?: string;
  address?: string;
  notes?: string;
  created_at: string;
}

export interface AdminFlight {
  id: string;
  flight_no: string;
  airline: string;
  from_code: string;
  to_code: string;
  depart_time: string;
  arrive_time: string;
  price: number;
  class: string;
  available: number;
  available_seats?: number;
  status?: string;
}

export interface AdminBooking {
  id: string;
  booking_code: string;
  user_id?: string;
  flight_id: string;
  status: string;
  total_price: number;
  created_at: string;
  // Joined columns returned by `getAllBookings`.
  user_email?: string;
  user_name?: string;
  flight_no?: string;
}

export interface AdminDiscount {
  id: string;
  code: string;
  discount_type?: string;
  discount_value?: number;
  min_order_value?: number;
  max_discount?: number;
  usage_limit?: number;
  used_count?: number;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  created_at?: string;
}

export interface AdminBankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  bank_bin?: string;
  branch?: string;
  is_default?: boolean;
  is_active?: boolean;
  transfer_note_template?: string;
  created_at?: string;
}

export interface AdminBankAccountInput {
  bank_name: string;
  account_number: string;
  account_holder: string;
  bank_bin?: string;
  branch?: string;
  is_default?: boolean;
  is_active?: boolean;
  transfer_note_template?: string;
}

export interface AdminAnnouncement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'promotion' | 'system';
  target_role: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  created_by_name?: string;
}

export interface AdminRefund {
  id: string;
  booking_id?: string;
  amount: number;
  status: string;
  reason?: string;
  created_at?: string;
}

export interface AdminTransaction {
  id: string;
  amount: number;
  method?: string;
  status: string;
  createdAt?: string;
  bookingId?: string;
  userEmail?: string;
  userName?: string;
  created_at?: string;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  actor_email?: string;
  actor_name?: string;
  target_type?: string;
  target_id?: string;
  details?: unknown;
  created_at: string;
}

/** Row shape returned by `?section=roles` on the RBAC endpoint. */
export interface AdminRoleRow {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role_name: string;
  custom_permissions: string | null;
  created_at: string;
}

/** Row shape returned by `?section=audit` on the RBAC endpoint. */
export interface AdminRbacAuditRow {
  id: string;
  admin_email: string;
  action: string;
  target_type: string;
  target_id?: string;
  details_json: string;
  status: 'success' | 'error' | 'denied';
  created_at: string;
}
