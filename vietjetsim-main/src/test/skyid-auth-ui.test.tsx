import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginPage from '@/app/dang-nhap/page';
import RegisterPage from '@/app/dang-ky/page';

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

describe('SkyID — vỏ giao diện xác thực thật của Vietjet', () => {
  // Từ 14/11/2026 site thật KHÔNG có trang đăng nhập riêng: mọi thao tác đều
  // mở popup 622×664 (băng đỏ 48px, khung form 500×208, bottom nav 62px).
  // `/dang-nhap` và `/dang-ky` render đúng popup đó để deep-link vẫn dùng được.
  it('trang đăng nhập mở popup 622×664 của site thật', () => {
    const { container } = render(<LoginPage />);

    // Khung popup + băng đỏ + khung form SkyID 500×208 + bottom nav 62px.
    expect(container.querySelector('.vj-popup-overlay')).toBeInTheDocument();
    expect(container.querySelector('.vj-popup-frame')).toBeInTheDocument();
    expect(container.querySelector('.vj-popup-header')).toBeInTheDocument();
    expect(container.querySelector('.vj-popup-viewport')).toBeInTheDocument();
    expect(container.querySelector('.vj-popup-nav')).toBeInTheDocument();
    expect(container.querySelector('.vj-skyid-popup-card')).toBeInTheDocument();

    // Tiêu đề băng đỏ đúng chữ của site thật.
    expect(screen.getByText('Đăng nhập SkyJoy')).toBeInTheDocument();

    // Landmark: đúng một `<main id="main-content">`, không có `<header>`.
    expect(container.querySelectorAll('main#main-content')).toHaveLength(1);
    expect(container.querySelector('header')).toBeNull();
  });

  it('nhãn nổi và ô nhập dùng đúng lớp SkyID', () => {
    const { container } = render(<LoginPage />);

    const label = container.querySelector('label.vj-skyid-label');
    expect(label).toBeInTheDocument();
    expect(label).toHaveClass('vj-skyid-label-phone');

    const input = container.querySelector('input.vj-skyid-input');
    expect(input).toBeInTheDocument();

    // Nút CTA dùng lớp riêng, không phải nút thương hiệu chung.
    const cta = screen.getByRole('button', { name: 'Tiếp tục' });
    expect(cta).toHaveClass('vj-skyid-btn');
  });

  it('bấm nút mã quốc gia mở danh sách mã quốc gia', async () => {
    render(<LoginPage />);

    const trigger = screen.getByRole('button', { name: 'Chọn mã quốc gia' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Chọn mã quốc gia' })).toHaveAttribute(
        'aria-expanded',
        'true'
      );
    });
    expect(screen.getByRole('listbox', { name: 'Mã quốc gia' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Hoa Kỳ/ })).toBeInTheDocument();
  });

  it('chuyển sang tab email / mã hội viên khi bấm', () => {
    render(<LoginPage />);

    expect(screen.queryByLabelText('Email hoặc mã hội viên SkyJoy')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Email / Mã hội viên' }));

    expect(screen.getByLabelText('Email hoặc mã hội viên SkyJoy')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Email / Mã hội viên' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });
});

describe('SkyID — luồng đăng ký', () => {
  it('bước đầu chỉ hỏi số điện thoại, không có tab định danh', () => {
    render(<RegisterPage />);

    expect(screen.getByRole('heading', { name: 'Nhập số điện thoại' })).toBeInTheDocument();
    expect(screen.getByLabelText('Số điện thoại')).toBeInTheDocument();

    // Đăng ký bắt buộc dùng số điện thoại (OTP đăng ký gửi về số này), nên
    // không có tab chuyển sang email/mã hội viên.
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('sau khi nhập số điện thoại thì sang bước khai báo hồ sơ', () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByPlaceholderText('Nhập số điện thoại của bạn'), {
      target: { value: '0912345678' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));

    expect(screen.getByLabelText('Họ')).toBeInTheDocument();
    expect(screen.getByLabelText('Tên đệm và tên')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Mã giới thiệu SkyJoy (nếu có)')).toBeInTheDocument();
    expect(screen.getByLabelText('Ngày')).toBeInTheDocument();
    expect(screen.getByLabelText('Tháng')).toBeInTheDocument();
    expect(screen.getByLabelText('Năm')).toBeInTheDocument();

    // Ô đồng ý đúng kích thước 18×18 của site thật.
    const consent = screen.getByRole('checkbox');
    expect(consent).toHaveClass('vj-skyid-consent');
  });
});
