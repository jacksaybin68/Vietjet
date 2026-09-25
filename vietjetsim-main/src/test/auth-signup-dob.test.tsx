import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { auth } = vi.hoisted(() => ({
  auth: { signIn: vi.fn(), signUp: vi.fn() },
}));

vi.mock('@/contexts/AuthContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/contexts/AuthContext')>()),
  useAuth: () => auth,
}));

import SignUpLoginPage from '@/app/dang-nhap/page';

const DEMO_OTP = '123456';

type Fields = ReturnType<typeof queryRegisterFields>;

function queryRegisterFields() {
  const q = <T extends Element>(selector: string) => document.querySelector(selector) as T | null;

  return {
    surname: q<HTMLInputElement>('#surname')!,
    givenName: q<HTMLInputElement>('#given_name')!,
    phone: q<HTMLInputElement>('#phone')!,
    // Ô mật khẩu của tab đăng ký chưa có id, nên lấy theo type.
    password: q<HTMLInputElement>('input[type="password"]')!,
    otp: q<HTMLInputElement>('#otp'),
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

function fillRequiredFields(f: Fields) {
  fireEvent.change(f.surname, { target: { value: 'Nguyễn' } });
  fireEvent.change(f.givenName, { target: { value: 'Văn A' } });
  fireEvent.change(f.phone, { target: { value: '912345678' } });
  fireEvent.change(f.password, { target: { value: 'Matkhau@1' } });
  fireEvent.click(screen.getByRole('checkbox'));
}

describe('Sign-up — trường Ngày / Tháng / Năm sinh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.signUp.mockResolvedValue({ user: { id: 'u1', role: 'user' } });
  });

  it('renders the three-part date of birth field', () => {
    const { day, month, year } = openRegisterTab();
    expect(day).toBeInTheDocument();
    expect(month).toBeInTheDocument();
    expect(year).toBeInTheDocument();
    expect(screen.getByText('Ngày sinh')).toBeInTheDocument();
  });

  it('blocks registration when the date of birth is missing', () => {
    const fields = openRegisterTab();
    fillRequiredFields(fields);
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục/i }));

    // Báo lỗi ở cả banner đầu trang và ngay dưới khung Ngày sinh.
    expect(screen.getAllByText('Vui lòng nhập Ngày / Tháng / Năm sinh.')).toHaveLength(2);
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

  it('sends the ISO date to signUp once the form is complete', async () => {
    const fields = openRegisterTab();
    fillRequiredFields(fields);
    fireEvent.change(fields.day, { target: { value: '5' } });
    fireEvent.change(fields.month, { target: { value: '7' } });
    fireEvent.change(fields.year, { target: { value: '1990' } });

    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục/i }));
    // Bước OTP demo chờ 800ms trước khi chuyển màn hình.
    await waitFor(() => expect(screen.getByText(/Mã OTP đã được gửi/)).toBeInTheDocument(), {
      timeout: 5000,
    });

    const otp = document.querySelector('#otp') as HTMLInputElement;
    fireEvent.change(otp, { target: { value: DEMO_OTP } });
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận đăng ký/i }));

    await waitFor(() =>
      expect(auth.signUp).toHaveBeenCalledWith(
        '',
        'Matkhau@1',
        expect.objectContaining({ dob: '1990-07-05' })
      )
    );
  });
});
