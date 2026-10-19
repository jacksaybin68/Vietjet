import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { auth } = vi.hoisted(() => ({
  auth: {
    signIn: vi.fn(),
    signUp: vi.fn(),
    requestOtp: vi.fn(),
    getCaptcha: vi.fn(),
    getSocialProviders: vi.fn(),
  },
}));

vi.mock('@/contexts/AuthContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/contexts/AuthContext')>()),
  useAuth: () => auth,
}));

import SignUpLoginPage from '@/app/dang-nhap/page';

type Fields = ReturnType<typeof queryRegisterFields>;

function queryRegisterFields() {
  const q = <T extends Element>(selector: string) => document.querySelector(selector) as T | null;

  return {
    surname: q<HTMLInputElement>('#surname')!,
    givenName: q<HTMLInputElement>('#given_name')!,
    phone: q<HTMLInputElement>('#phone')!,
    // Ô mật khẩu của tab đăng ký chưa có id, nên lấy theo type.
    password: q<HTMLInputElement>('input[type="password"]')!,
  };
}

function openRegisterTab() {
  render(<SignUpLoginPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Đăng ký' }));
  return {
    ...queryRegisterFields(),
    day: screen.getByLabelText('Ngày sinh: ngày') as HTMLSelectElement,
    month: screen.getByLabelText('Ngày sinh: tháng') as HTMLSelectElement,
    year: screen.getByLabelText('Ngày sinh: năm') as HTMLSelectElement,
  };
}

/**
 * Điền form bước 1. CAPTCHA giờ bắt buộc khi đăng ký, nên phải chờ câu hỏi tải
 * xong rồi mới trả lời — nếu trả lời trước khi challenge về, `token` còn rỗng và
 * form bị chặn.
 */
async function fillRequiredFields(f: Fields) {
  fireEvent.change(f.surname, { target: { value: 'Nguyễn' } });
  fireEvent.change(f.givenName, { target: { value: 'Văn A' } });
  fireEvent.change(f.phone, { target: { value: '912345678' } });
  fireEvent.change(f.password, { target: { value: 'Matkhau@1' } });
  fireEvent.click(screen.getByRole('checkbox'));

  await screen.findByText('3 + 4 = ?');
  fireEvent.change(screen.getByLabelText('Câu trả lời CAPTCHA'), { target: { value: '7' } });
}

describe('Sign-up — trường Ngày / Tháng / Năm sinh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.signUp.mockResolvedValue({ user: { id: 'u1', role: 'user' } });
    auth.requestOtp.mockResolvedValue({ success: true, message: 'sent' });
    auth.getCaptcha.mockResolvedValue({
      token: 'captcha-token',
      question: '3 + 4 = ?',
      expiresIn: 300,
    });
    auth.getSocialProviders.mockResolvedValue([]);
  });

  it('renders the three-part date of birth field', () => {
    const { day, month, year } = openRegisterTab();
    expect(day).toBeInTheDocument();
    expect(month).toBeInTheDocument();
    expect(year).toBeInTheDocument();
    expect(screen.getByText('Ngày sinh')).toBeInTheDocument();
  });

  it('blocks registration when the date of birth is missing', async () => {
    const fields = openRegisterTab();
    await fillRequiredFields(fields);
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục/i }));

    // Báo lỗi ở cả banner đầu trang và ngay dưới khung Ngày sinh.
    expect(screen.getAllByText('Vui lòng nhập Ngày / Tháng / Năm sinh.')).toHaveLength(2);
    expect(auth.requestOtp).not.toHaveBeenCalled();
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it('limits the day list to the selected month (no 31 February)', () => {
    const { day, month, year } = openRegisterTab();
    fireEvent.change(year, { target: { value: '2023' } });
    fireEvent.change(month, { target: { value: '2' } });

    const values = Array.from(day.options).map((option) => option.value);
    expect(values).toContain('28');
    expect(values).not.toContain('29'); // 2023 không nhuận
    expect(values).not.toContain('31');
  });

  it('keeps 29 February available in a leap year', () => {
    const { day, month, year } = openRegisterTab();
    fireEvent.change(year, { target: { value: '2024' } });
    fireEvent.change(month, { target: { value: '2' } });

    expect(Array.from(day.options).map((option) => option.value)).toContain('29');
  });

  it('clears a day that no longer exists after switching to February', () => {
    const { day, month, year } = openRegisterTab();
    fireEvent.change(year, { target: { value: '2023' } });
    fireEvent.change(day, { target: { value: '31' } });
    fireEvent.change(month, { target: { value: '2' } });
    expect(day.value).toBe('');
  });

  it('sends the ISO date to signUp after the OTP step', async () => {
    const fields = openRegisterTab();
    await fillRequiredFields(fields);
    fireEvent.change(fields.day, { target: { value: '5' } });
    fireEvent.change(fields.month, { target: { value: '7' } });
    fireEvent.change(fields.year, { target: { value: '1990' } });

    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục/i }));

    // Đăng ký bằng số điện thoại phải qua bước xác thực OTP trước khi tạo tài khoản.
    await waitFor(() =>
      expect(auth.requestOtp).toHaveBeenCalledWith(
        expect.objectContaining({ phone: '912345678', purpose: 'register' })
      )
    );

    const otpInput = (await waitFor(() => {
      const el = document.querySelector<HTMLInputElement>('#register-otp');
      expect(el).not.toBeNull();
      return el!;
    })) as HTMLInputElement;
    fireEvent.change(otpInput, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận/i }));

    await waitFor(() =>
      expect(auth.signUp).toHaveBeenCalledWith(
        '',
        'Matkhau@1',
        expect.objectContaining({ dob: '1990-07-05', otpCode: '123456' })
      )
    );
  });
});
