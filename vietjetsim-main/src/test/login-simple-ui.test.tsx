import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import LoginPage from '@/app/dang-nhap/page';

const mockToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
  promo: vi.fn(),
  dismiss: vi.fn(),
  dismissAll: vi.fn(),
}));

vi.mock('@/shared/components/navigation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/components/navigation')>();
  return { ...actual, CheckInHeader: () => <div data-testid="checkin-header">Header đỏ</div> };
});

vi.mock('@/hooks/useToast', () => ({
  useToast: vi.fn(() => ({
    toasts: [],
    ...mockToast,
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('LoginPage — giao diện đơn giản hóa theo H1', () => {
  it('render header đỏ, form 1 input, tab Đăng nhập/Đăng ký, banner, chatbot, ribbon', () => {
    render(<LoginPage />);

    expect(screen.getByTestId('checkin-header')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Đăng ký/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đăng nhập/i })).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: /Đăng nhập/i })).toBeInTheDocument();

    expect(screen.getByText('(+84)')).toBeInTheDocument();
    const phone = screen.getByPlaceholderText('Số điện thoại');
    expect(phone).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Gửi mã OTP/i })).toBeInTheDocument();

    expect(screen.getByText('Đăng ký ngay')).toBeInTheDocument();

    expect(screen.getByText('Được cung cấp và xác thực bởi SkyJoy ID')).toBeInTheDocument();

    // The right column used to mock the promo with a gradient block plus the
    // copy as text; it now shows the real Vietjet banner graphic, so the copy
    // lives in the image's alt text and the asset itself is the assertion.
    const banner = screen.getByAltText(/Ngoại tệ sẵn sàng/i);
    expect(banner).toBeInTheDocument();
    expect((banner as HTMLImageElement).getAttribute('src')).toContain(
      'banner-chuyenbay-ngoai-te.jpg'
    );
    expect(banner.getAttribute('alt')).toMatch(/Hành trình an tâm/i);

    expect(screen.getByAltText('Mascot Amy')).toBeInTheDocument();

    const ribbon = document.querySelector('svg[height="110"]');
    expect(ribbon).toBeInTheDocument();
  });

  it('gõ số điện thoại vào input và hiển thị toast thành công', () => {
    render(<LoginPage />);

    const phone = screen.getByPlaceholderText('Số điện thoại');
    fireEvent.change(phone, { target: { value: '912345678' } });
    expect((phone as HTMLInputElement).value).toBe('912345678');

    fireEvent.click(screen.getByRole('button', { name: /Gửi mã OTP/i }));

    vi.advanceTimersByTime(600);

    expect(mockToast.success).toHaveBeenCalledWith(
      'Đã gửi mã OTP',
      expect.stringContaining('mã xác thực')
    );
  });

  it('hiển thị toast lỗi khi bấm nút để trống số điện thoại', () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: /Gửi mã OTP/i }));

    expect(mockToast.error).toHaveBeenCalledWith('Lỗi', 'Vui lòng nhập số điện thoại');
  });
});
