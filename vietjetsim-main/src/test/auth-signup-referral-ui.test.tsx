import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Trường "Mã giới thiệu SkyJoy" trên form đăng ký.
 *
 * Server bỏ qua mã sai định dạng *im lặng* (`isValidReferralCode` → `null`), nên
 * khách điền sai vẫn thấy "đăng ký thành công" mà không có điểm thưởng nào. Hai
 * test dưới đây khoá phần UI đã bù vào: chặn ngay tại form và chuẩn hoá trước
 * khi gửi, để hành vi đó không âm thầm quay lại.
 */

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

function openRegisterTab() {
  render(<SignUpLoginPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Đăng ký' }));

  const q = <T extends Element>(selector: string) => document.querySelector(selector) as T;
  return {
    surname: q<HTMLInputElement>('#surname'),
    givenName: q<HTMLInputElement>('#given_name'),
    phone: q<HTMLInputElement>('#phone'),
    password: q<HTMLInputElement>('input[type="password"]'),
    referral: q<HTMLInputElement>('#referral_code'),
  };
}

/** Điền bước 1 (trừ mã giới thiệu) và trả lời CAPTCHA bắt buộc. */
async function fillRequiredFields(f: ReturnType<typeof openRegisterTab>) {
  fireEvent.change(f.surname, { target: { value: 'Nguyễn' } });
  fireEvent.change(f.givenName, { target: { value: 'Văn A' } });
  fireEvent.change(f.phone, { target: { value: '912345678' } });
  fireEvent.change(f.password, { target: { value: 'Matkhau@1' } });
  fireEvent.change(screen.getByLabelText('Ngày sinh: ngày'), { target: { value: '5' } });
  fireEvent.change(screen.getByLabelText('Ngày sinh: tháng'), { target: { value: '7' } });
  fireEvent.change(screen.getByLabelText('Ngày sinh: năm'), { target: { value: '1990' } });
  fireEvent.click(screen.getByRole('checkbox'));

  await screen.findByText('3 + 4 = ?');
  fireEvent.change(screen.getByLabelText('Câu trả lời CAPTCHA'), { target: { value: '7' } });
}

describe('Sign-up — mã giới thiệu SkyJoy', () => {
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

  it('chặn gửi form khi mã giới thiệu sai định dạng', async () => {
    const fields = openRegisterTab();
    await fillRequiredFields(fields);
    fireEvent.change(fields.referral, { target: { value: 'not-a-code' } });

    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục/i }));

    // Lỗi hiện ở cả banner và ngay dưới ô, giống cách Ngày sinh báo lỗi.
    await waitFor(() =>
      expect(screen.getAllByText(/Mã giới thiệu phải là mã hội viên SkyJoy/)).toHaveLength(2)
    );
    expect(auth.requestOtp).not.toHaveBeenCalled();
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it('chuẩn hoá mã giới thiệu (bỏ khoảng trắng, in hoa) trước khi gửi', async () => {
    const fields = openRegisterTab();
    await fillRequiredFields(fields);
    fireEvent.change(fields.referral, { target: { value: 'sj 12345678' } });
    expect(fields.referral.value).toBe('SJ12345678');

    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục/i }));

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
        expect.objectContaining({ referralCode: 'SJ12345678', otpCode: '123456' })
      )
    );
  });
});
