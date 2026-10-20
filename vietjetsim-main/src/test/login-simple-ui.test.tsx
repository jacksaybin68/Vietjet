import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
});

describe('LoginPage — giao diện đơn giản hóa và đăng nhập mật khẩu', () => {
  it('render header đỏ, form đăng nhập, tab Đăng nhập/Đăng ký, banner, chatbot, ribbon', () => {
    render(<LoginPage />);

    expect(screen.getByTestId('checkin-header')).toBeInTheDocument();

    expect(screen.getByTestId('tab-register')).toBeInTheDocument();
    expect(screen.getByTestId('tab-login')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: /Đăng nhập/i })).toBeInTheDocument();

    expect(screen.getByText('(+84)')).toBeInTheDocument();
    const phone = screen.getByPlaceholderText('Số điện thoại');
    expect(phone).toBeInTheDocument();

    expect(screen.getByTestId('login-submit-btn')).toBeInTheDocument();
    expect(screen.getByTestId('login-submit-btn')).toHaveTextContent('Đăng nhập');

    expect(screen.getByText('Đăng ký ngay')).toBeInTheDocument();

    expect(screen.getByText('Được cung cấp và xác thực bởi SkyJoy ID')).toBeInTheDocument();

    const banner = screen.getByAltText(/Ngoại tệ sẵn sàng/i);
    expect(banner).toBeInTheDocument();
    expect((banner as HTMLImageElement).getAttribute('src')).toContain(
      'banner-chuyenbay-ngoai-te.jpg'
    );
    expect(banner.getAttribute('alt')).toMatch(/Hành trình an tâm/i);

    expect(screen.queryByAltText('Mascot Amy')).not.toBeInTheDocument();

    const ribbon = document.querySelector('svg[height="110"]');
    expect(ribbon).toBeInTheDocument();
  });

  it('gõ số điện thoại vào input, bấm Đăng nhập -> hiển thị ô mật khẩu, nhập mật khẩu và thực hiện đăng nhập', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        user: { id: 'u1', full_name: 'Nguyễn Văn A', email: '0912345678@vietjet.vn' },
        token: 'fake-token',
      }),
    } as unknown as Response);

    render(<LoginPage />);

    const phone = screen.getByPlaceholderText('Số điện thoại');
    fireEvent.change(phone, { target: { value: '0912345678' } });
    expect((phone as HTMLInputElement).value).toBe('0912345678');

    const submitBtn = screen.getByTestId('login-submit-btn');
    fireEvent.click(submitBtn);

    // Ô mật khẩu phải xuất hiện
    const passwordInput = screen.getByPlaceholderText('Mật khẩu');
    expect(passwordInput).toBeInTheDocument();

    // Nhập mật khẩu và bấm Đăng nhập lần 2
    fireEvent.change(passwordInput, { target: { value: 'Secret123!' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/xac-thuc/dang-nhap',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: '0912345678', password: 'Secret123!' }),
        })
      );
      expect(mockToast.success).toHaveBeenCalledWith(
        'Đăng nhập thành công',
        expect.stringContaining('Nguyễn Văn A')
      );
    });

    global.fetch = originalFetch;
  });

  it('hiển thị toast lỗi khi bấm nút để trống số điện thoại', () => {
    render(<LoginPage />);

    const submitBtn = screen.getByTestId('login-submit-btn');
    fireEvent.click(submitBtn);

    expect(mockToast.error).toHaveBeenCalledWith('Lỗi', 'Vui lòng nhập số điện thoại');
  });

  it('hiển thị toast lỗi khi đã hiện ô mật khẩu nhưng để trống mật khẩu', () => {
    render(<LoginPage />);

    const phone = screen.getByPlaceholderText('Số điện thoại');
    fireEvent.change(phone, { target: { value: '0912345678' } });

    const submitBtn = screen.getByTestId('login-submit-btn');
    fireEvent.click(submitBtn);

    expect(screen.getByPlaceholderText('Mật khẩu')).toBeInTheDocument();

    // Bấm khi chưa nhập mật khẩu
    fireEvent.click(submitBtn);
    expect(mockToast.error).toHaveBeenCalledWith('Lỗi', 'Vui lòng nhập mật khẩu');
  });

  it('chuyển qua giao diện đăng ký khi bấm tab Đăng ký và quay lại Đăng nhập khi bấm tab Đăng nhập', () => {
    render(<LoginPage />);

    const registerTab = screen.getByTestId('tab-register');
    const loginTab = screen.getByTestId('tab-login');

    // Ban đầu ở tab Đăng nhập
    expect(loginTab).toHaveAttribute('aria-pressed', 'true');
    expect(registerTab).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('heading', { name: /Đăng nhập/i })).toBeInTheDocument();

    // Bấm tab Đăng ký
    fireEvent.click(registerTab);

    expect(registerTab).toHaveAttribute('aria-pressed', 'true');
    expect(loginTab).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('heading', { name: /Đăng ký tài khoản/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Họ *')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Tên đệm & Tên *')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đăng ký tài khoản SkyJoy/i })).toBeInTheDocument();

    // Bấm tab Đăng nhập để quay lại
    fireEvent.click(loginTab);

    expect(loginTab).toHaveAttribute('aria-pressed', 'true');
    expect(registerTab).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('heading', { name: /Đăng nhập tài khoản/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Số điện thoại')).toBeInTheDocument();
  });
});
