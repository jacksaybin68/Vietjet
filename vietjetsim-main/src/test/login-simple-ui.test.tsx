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

// `SkyIdAuthFlow` dùng `useAuth()` để gọi `/api/xac-thuc/*`. Ở test này ta
// chỉ kiểm tra hình dạng form và luồng bấm, nên context được stub.
const mockAuth = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  requestOtp: vi.fn(),
  signInWithOtp: vi.fn(),
  getCaptcha: vi.fn(),
  getSocialProviders: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.signIn.mockResolvedValue({ user: { fullName: 'Nguyễn Văn A' } });
  mockAuth.signUp.mockResolvedValue({});
  mockAuth.requestOtp.mockResolvedValue({ success: true });
  mockAuth.signInWithOtp.mockResolvedValue({ user: { fullName: 'Nguyễn Văn A' } });
  mockAuth.getCaptcha.mockResolvedValue({ token: 'x.y', question: '1 + 1 = ?' });
  mockAuth.getSocialProviders.mockResolvedValue([]);
});

describe('LoginPage — form SkyID trong popup 622×664', () => {
  it('render popup của site thật: khung form, tiêu đề và nút bấm', () => {
    const { container } = render(<LoginPage />);

    // Bản popup: KHÔNG còn header đỏ `CheckInHeader` (site thật không có
    // subheader ở màn này) và KHÔNG còn modal 2 cột + hero ảnh 600×600.
    expect(screen.queryByTestId('checkin-header')).not.toBeInTheDocument();
    expect(screen.queryByAltText('Khoang cabin Vietjet Air')).not.toBeInTheDocument();

    // Khung popup 622×664 + khung form SkyID 500×208.
    expect(container.querySelector('.vj-popup-frame')).toBeInTheDocument();
    expect(container.querySelector('.vj-popup-viewport')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();

    // Ô điện thoại có nhãn "Số điện thoại" và placeholder đúng site thật.
    expect(screen.getByLabelText('Số điện thoại')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nhập số điện thoại của bạn')).toBeInTheDocument();

    // Nút "Tiếp tục" bị disable khi ô trống.
    const continueBtn = screen.getByRole('button', { name: 'Tiếp tục' });
    expect(continueBtn).toBeDisabled();

    // Nút social.
    expect(screen.getByRole('button', { name: 'Apple' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Google' })).toBeInTheDocument();

    // Link sang đăng ký.
    expect(screen.getByRole('button', { name: 'Đăng ký ngay' })).toBeInTheDocument();
  });

  it('bấm "Tiếp tục" chuyển sang bước nhập mật khẩu và đăng nhập qua API', async () => {
    render(<LoginPage />);

    const phone = screen.getByPlaceholderText('Nhập số điện thoại của bạn');
    fireEvent.change(phone, { target: { value: '0912345678' } });
    expect((phone as HTMLInputElement).value).toBe('0912345678');

    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));

    const passwordInput = await screen.findByPlaceholderText('Nhập mật khẩu');
    expect(passwordInput).toBeInTheDocument();

    fireEvent.change(passwordInput, { target: { value: 'Secret123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => {
      expect(mockAuth.signIn).toHaveBeenCalledWith('0912345678', 'Secret123!');
      expect(mockToast.success).toHaveBeenCalledWith(
        'Đăng nhập thành công',
        expect.stringContaining('Nguyễn Văn A')
      );
    });
  });

  it('báo lỗi khi bỏ trống số điện thoại', () => {
    render(<LoginPage />);

    // Nút "Tiếp tục" disabled nên bấm không làm gì; kiểm tra trạng thái disabled.
    expect(screen.getByRole('button', { name: 'Tiếp tục' })).toBeDisabled();
  });
});
