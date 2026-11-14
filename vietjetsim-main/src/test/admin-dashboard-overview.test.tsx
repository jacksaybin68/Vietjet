import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  KPIWidget,
  RevenueChart,
  SeatClassPieChart,
  TopRoutesBarChart,
  CancellationDonutChart,
  RecentBookingsTable,
  UpcomingFlightsTable,
  OverviewTab,
} from '@/features/admin/components';
import type { DashboardSummary } from '@/features/admin/types/dashboard';

// Mock Recharts ResponsiveContainer to avoid jsdom zero width/height issues
vi.mock('recharts', async () => {
  const original = await vi.importActual<Record<string, unknown>>('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container" style={{ width: 500, height: 300 }}>
        {children}
      </div>
    ),
  };
});

const mockSummary: DashboardSummary = {
  kpi: {
    bookingsToday: 142,
    bookingsTodayChange: 12.5,
    revenueToday: 350000000,
    revenueTodayChange: 8.3,
    activeUsers: 1250,
    activeUsersChange: -2.1,
    loadFactor: 86,
    loadFactorChange: 3.5,
  },
  revenue: [
    { date: '2026-11-13', revenue: 320000000, bookings: 130 },
    { date: '2026-11-14', revenue: 350000000, bookings: 142 },
  ],
  seatDistribution: [
    { name: 'Eco', class: 'eco', count: 850, percent: 68, color: '#7CB342' },
    { name: 'Deluxe', class: 'deluxe', count: 250, percent: 20, color: '#F4511E' },
    { name: 'SkyBoss', class: 'skyboss', count: 100, percent: 8, color: '#EC2029' },
    { name: 'Business', class: 'business', count: 50, percent: 4, color: '#B8860B' },
  ],
  topRoutes: [
    { route: 'SGN - HAN', bookings: 540, revenue: 1200000000 },
    { route: 'HAN - DAD', bookings: 320, revenue: 650000000 },
    { route: 'SGN - DAD', bookings: 290, revenue: 580000000 },
    { route: 'SGN - PQC', bookings: 210, revenue: 420000000 },
    { route: 'HAN - CXR', bookings: 180, revenue: 360000000 },
  ],
  cancellationRate: {
    total: 1000,
    cancelled: 45,
    rate: 4.5,
  },
  recentBookings: [
    {
      id: 'b-1',
      bookingCode: 'VJ888123',
      customerName: 'Nguyễn Văn A',
      route: 'SGN - HAN',
      totalPrice: 2450000,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'b-2',
      bookingCode: 'VJ888124',
      customerName: 'Trần Thị B',
      route: 'HAN - DAD',
      totalPrice: 1650000,
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
  ],
  upcomingFlights: [
    {
      id: 'f-1',
      flightNo: 'VJ120',
      route: 'SGN - HAN',
      departTime: new Date(Date.now() + 3600000).toISOString(),
      availableSeats: 35,
      status: 'scheduled',
    },
    {
      id: 'f-2',
      flightNo: 'VJ230',
      route: 'HAN - DAD',
      departTime: new Date(Date.now() + 7200000).toISOString(),
      availableSeats: 12,
      status: 'boarding',
    },
  ],
};

vi.mock('@/features/admin/services/dashboard.service', () => ({
  getDashboardSummary: vi.fn(async () => mockSummary),
}));

describe('Admin Dashboard Recharts & KPI Components', () => {
  it('renders KPIWidget with title, value, and change', () => {
    render(
      <KPIWidget
        title="Bookings hôm nay"
        value={142}
        change={12.5}
        icon={<span data-testid="test-icon">✈</span>}
      />
    );

    expect(screen.getByText('Bookings hôm nay')).toBeInTheDocument();
    expect(screen.getByText('142')).toBeInTheDocument();
    expect(screen.getByText(/12\.5%/)).toBeInTheDocument();
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('renders RevenueChart correctly', () => {
    render(<RevenueChart data={mockSummary.revenue} />);
    expect(screen.getByText('Doanh thu & Số lượng đặt vé')).toBeInTheDocument();
  });

  it('renders SeatClassPieChart with seat distribution', () => {
    render(<SeatClassPieChart data={mockSummary.seatDistribution} />);
    expect(screen.getByText('Phân bổ hạng vé (Seat Class)')).toBeInTheDocument();
  });

  it('renders TopRoutesBarChart and switches metric', () => {
    render(<TopRoutesBarChart data={mockSummary.topRoutes} />);
    expect(screen.getByText('Top chặng bay hiệu quả')).toBeInTheDocument();

    const bookingsBtn = screen.getByRole('button', { name: /Lượt đặt/i });
    fireEvent.click(bookingsBtn);
    expect(bookingsBtn).toHaveClass('bg-primary');
  });

  it('renders CancellationDonutChart with rate and total', () => {
    render(<CancellationDonutChart data={mockSummary.cancellationRate} />);
    expect(screen.getByText('Tỷ lệ hoàn thành & Huỷ vé')).toBeInTheDocument();
    expect(screen.getByText('4.5%')).toBeInTheDocument();
    expect(screen.getByText('1.000')).toBeInTheDocument();
  });

  it('renders RecentBookingsTable with booking rows', () => {
    render(<RecentBookingsTable data={mockSummary.recentBookings} />);
    expect(screen.getByText('Đặt vé gần đây')).toBeInTheDocument();
    expect(screen.getByText('VJ888123')).toBeInTheDocument();
    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByText('2.450.000₫')).toBeInTheDocument();
  });

  it('renders UpcomingFlightsTable with flight rows', () => {
    render(<UpcomingFlightsTable data={mockSummary.upcomingFlights} />);
    expect(screen.getByText('Chuyến bay sắp cất cánh')).toBeInTheDocument();
    expect(screen.getByText('VJ120')).toBeInTheDocument();
    expect(screen.getByText('35')).toBeInTheDocument();
  });

  it('renders OverviewTab with live hook data', async () => {
    render(<OverviewTab />);

    // Check header
    expect(screen.getByText('Bảng điều khiển tổng quan')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Doanh thu hôm nay')).toBeInTheDocument();
    });

    expect(screen.getByText('Bookings hôm nay')).toBeInTheDocument();
    expect(screen.getByText('Người dùng hoạt động')).toBeInTheDocument();
    expect(screen.getByText('Tỷ lệ lấp đầy ghế')).toBeInTheDocument();
    expect(screen.getByText('86%')).toBeInTheDocument();

    // Refresh button exists and is clickable
    const refreshBtn = screen.getByRole('button', { name: /Làm mới/i });
    expect(refreshBtn).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(refreshBtn);
    });
  });
});
