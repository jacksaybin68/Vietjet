import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TrackBookingPage from '@/app/tra-cuu/page';

const apiRequestMock = vi.fn();
vi.mock('@/shared/services', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/services')>();
  return {
    ...actual,
    apiRequest: (...args: unknown[]) => apiRequestMock(...args),
  };
});

const useAuthMock = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toasts: [],
    dismiss: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  }),
}));

vi.mock('@/shared/components/navigation', () => ({
  Header: () => null,
  Footer: () => null,
}));

vi.mock('@/shared/components/feedback', () => ({
  ToastContainer: () => null,
}));

const booking = {
  id: 'b1',
  booking_code: 'VJ644052',
  status: 'confirmed' as const,
  total_price: 1_038_900,
  created_at: '2026-03-20T00:00:00.000Z',
  flight: {
    flight_no: 'VJ 101',
    from_code: 'HAN',
    to_code: 'SGN',
    depart_time: '2026-03-20T06:00:00.000Z',
    arrive_time: '2026-03-20T08:10:00.000Z',
  },
  passengers: [{ name: 'NGUYEN VAN A' }],
};

function renderPage() {
  return render(<TrackBookingPage />);
}

describe('Tra cứu đặt chỗ', () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    useAuthMock.mockReturnValue({ user: { email: 'user@vietjetsim.vn' } });
  });

  // A 6-character booking code is enumerable, so a signed-out visitor must not
  // reach a search box at all — only a sign-in prompt.
  it('asks a signed-out visitor to sign in instead of showing the form', () => {
    useAuthMock.mockReturnValue({ user: null });
    renderPage();
    expect(screen.getByText('Cần đăng nhập để tra cứu')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/VJ\d+/)).not.toBeInTheDocument();
  });

  it('searches the session-scoped booking list, not a public lookup', async () => {
    apiRequestMock.mockResolvedValue({ bookings: [booking] });
    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/VJ\d+/), { target: { value: 'VJ644052' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tra cứu' }));

    await waitFor(() => expect(apiRequestMock).toHaveBeenCalled());
    expect(apiRequestMock).toHaveBeenCalledWith('/api/dat-ve?limit=100');
    expect(await screen.findByText('VJ644052')).toBeInTheDocument();
  });

  it('matches the code case-insensitively', async () => {
    apiRequestMock.mockResolvedValue({ bookings: [booking] });
    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/VJ\d+/), { target: { value: 'vj644052' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tra cứu' }));

    expect(await screen.findByText('VJ644052')).toBeInTheDocument();
  });

  it("reports not found for a code that is not the customer's", async () => {
    apiRequestMock.mockResolvedValue({ bookings: [booking] });
    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/VJ\d+/), { target: { value: 'VJ000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tra cứu' }));

    expect(await screen.findByText('Không tìm thấy đặt chỗ')).toBeInTheDocument();
  });

  it('does not crash when the request fails', async () => {
    apiRequestMock.mockRejectedValue(new Error('Mạng lỗi'));
    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/VJ\d+/), { target: { value: 'VJ644052' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tra cứu' }));

    // The form must remain usable rather than leaving a stuck spinner.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tra cứu' })).toBeEnabled());
  });
});
