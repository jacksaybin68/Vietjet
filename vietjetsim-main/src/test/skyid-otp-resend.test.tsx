import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RegisterPage from '@/app/dang-ky/page';

/**
 * Kiểm thử nút "Gửi lại mã" (`.gid-resend-otp`) của bước OTP theo SkyID thật:
 * sau khi gửi mã, nút bị khóa kèm đồng hồ đếm ngược; hết giờ thì bấm được
 * và bắn lời gọi gửi lại mã.
 *
 * Đồng hồ chạy bằng `setInterval` nên test dùng fake timer để không phải chờ
 * 60 giây thật.
 */

const mockToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
  promo: vi.fn(),
  dismiss: vi.fn(),
  dismissAll: vi.fn(),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: vi.fn(() => ({ toasts: [], ...mockToast })),
}));

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
  mockAuth.requestOtp.mockResolvedValue({ success: true });
  mockAuth.getCaptcha.mockResolvedValue({ token: 'x.y', question: '1 + 1 = ?' });
  mockAuth.getSocialProviders.mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
});

/** Điền đủ form đăng ký rồi bấm nút gửi mã để sang bước OTP. */
async function goToOtpStep() {
  render(<RegisterPage />);

  fireEvent.change(screen.getByPlaceholderText('Nhập số điện thoại của bạn'), {
    target: { value: '0912345678' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));

  fireEvent.change(screen.getByLabelText('Họ'), { target: { value: 'Nguyễn' } });
  fireEvent.change(screen.getByLabelText('Tên đệm và tên'), { target: { value: 'Văn A' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: /Tiếp tục/ }));

  await waitFor(() => {
    expect(screen.getByText(/Mã xác thực gồm/)).toBeInTheDocument();
  });
}

describe('SkyID — bước OTP và nút gửi lại mã', () => {
  it('sau khi gửi mã thì nút gửi lại bị khóa kèm đồng hồ đếm ngược', async () => {
    await goToOtpStep();

    const resend = screen.getByRole('button', { name: /Gửi lại mã/ });
    expect(resend).toBeDisabled();
    expect(resend).toHaveTextContent(/Gửi lại mã \(\d+s\)/);
    expect(mockAuth.requestOtp).toHaveBeenCalledTimes(1);
  });

  it('đồng hồ đếm ngược chạy và nút mở khóa khi hết giờ', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await goToOtpStep();

    const resend = screen.getByRole('button', { name: /Gửi lại mã/ });
    expect(resend).toHaveTextContent('Gửi lại mã (60s)');

    // Tua 60 giây — mỗi bước 1 giây khớp với `setInterval` của hook đồng hồ.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(screen.getByRole('button', { name: 'Gửi lại mã' })).toBeEnabled();
  });

  it('bấm gửi lại mã thì gọi lại API và khoá lại nút trong 60 giây', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await goToOtpStep();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Gửi lại mã' }));

    await waitFor(() => {
      expect(mockAuth.requestOtp).toHaveBeenCalledTimes(2);
    });

    const resend = screen.getByRole('button', { name: /Gửi lại mã/ });
    expect(resend).toBeDisabled();
    expect(resend).toHaveTextContent(/Gửi lại mã \(\d+s\)/);
  });
});
