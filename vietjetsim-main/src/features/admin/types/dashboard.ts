export interface KPIData {
  bookingsToday: number;
  bookingsTodayChange?: number;
  revenueToday: number;
  revenueTodayChange?: number;
  activeUsers: number;
  activeUsersChange?: number;
  loadFactor: number; // 0 - 100%
  loadFactorChange?: number;
}

export interface RevenuePoint {
  date: string; // 'YYYY-MM-DD'
  revenue: number;
  bookings: number;
}

export interface SeatDistribution {
  name: string;
  class: string;
  count: number;
  percent: number;
  color?: string;
}

export interface TopRoute {
  route: string; // 'SGN - HAN'
  bookings: number;
  revenue: number;
}

export interface CancellationRate {
  total: number;
  cancelled: number;
  rate: number; // percentage 0 - 100
}

export interface DashboardBookingSummary {
  id: string;
  bookingCode: string;
  customerName: string;
  route: string;
  totalPrice: number;
  status: string;
  createdAt: string;
}

export interface DashboardFlightSummary {
  id: string;
  flightNo: string;
  route: string;
  departTime: string;
  availableSeats: number;
  status: string;
}

export interface DashboardSummary {
  kpi: KPIData;
  revenue: RevenuePoint[];
  seatDistribution: SeatDistribution[];
  topRoutes: TopRoute[];
  cancellationRate: CancellationRate;
  recentBookings: DashboardBookingSummary[];
  upcomingFlights: DashboardFlightSummary[];
}
