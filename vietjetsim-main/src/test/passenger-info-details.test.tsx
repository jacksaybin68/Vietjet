import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PassengerInfoStep from '@/features/bookings/components/PassengerInfoStep';

const flight = {
  id: 'flight-1',
  from: 'HAN',
  to: 'SGN',
  fromCity: 'Hà Nội',
  toCity: 'TP.HCM',
  departTime: '06:00',
  arriveTime: '08:25',
  duration: '2h 25m',
  price: 899000,
  economyPrice: 899000,
  businessPrice: 2490000,
  class: 'economy' as const,
  airline: 'Vietjet Air',
  flightNo: 'VJ301',
  available: 20,
  stops: 0,
};

/** An untouched passenger, spread and then given a type per test case. */
const blankPassenger = {
  name: '',
  gender: 'male',
  dob: '',
  countryCode: 'VN',
  phone: '',
  email: '',
  idNumber: '',
  residence: '',
  skyJoyMemberId: '',
} as const;

describe('PassengerInfoStep extended contact and consent fields', () => {
  it('renders the requested contact, identity and privacy fields', () => {
    render(
      <PassengerInfoStep flight={flight} passengerCount={1} onSubmit={vi.fn()} onBack={vi.fn()} />
    );

    expect(screen.getByLabelText(/Quốc gia/)).toHaveValue('VN');
    expect(screen.getByText('+84')).toBeInTheDocument();
    expect(screen.getByLabelText(/Số điện thoại/)).toBeRequired();
    expect(screen.getByLabelText(/Email/)).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText(/CCCD \/ Hộ chiếu/)).toBeRequired();
    expect(screen.getByLabelText(/Địa chỉ/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mã hội viên SkyJoy/)).toHaveAttribute(
      'placeholder',
      'SJxxxxxxxxxx'
    );
    expect(screen.getByText(/Gửi thông tin khuyến mãi/)).toBeInTheDocument();
    expect(screen.getByText(/Thực hiện khảo sát/)).toBeInTheDocument();
    expect(screen.getByText(/Lưu thông tin hành khách/)).toBeInTheDocument();
  });

  // A carrier needs enough to identify a minor on the ticket, so a child or an
  // infant is not asked to repeat the adult's contact details, country of issue
  // or loyalty id. Name, birth date, address and the travel document stay — the
  // API rejects a booking whose child carries no ID, so that field has to sit on
  // a minor's card as well.

  it('asks a child and an infant for name, birth date, address and ID only', () => {
    render(
      <PassengerInfoStep
        flight={flight}
        passengerCount={3}
        initialPassengers={[
          { ...blankPassenger, type: 'adult' },
          { ...blankPassenger, type: 'child' },
          { ...blankPassenger, type: 'infant' },
        ]}
        onSubmit={vi.fn()}
        onBack={vi.fn()}
      />
    );

    // Contact, country of issue and the loyalty id are the adult's alone.
    [/Số điện thoại/, /Email/, /Quốc gia/, /Mã hội viên SkyJoy/].forEach((label) =>
      expect(screen.getAllByLabelText(label)).toHaveLength(1)
    );
    // Everyone is identified by name, birth date, address and travel document.
    expect(screen.getAllByLabelText(/Họ và tên/)).toHaveLength(3);
    expect(screen.getAllByLabelText(/Ngày sinh/)).toHaveLength(3);
    expect(screen.getAllByLabelText(/Địa chỉ/)).toHaveLength(3);
    expect(screen.getAllByLabelText(/CCCD \/ Hộ chiếu/)).toHaveLength(3);
  });

  // Every field label used to be a copy-pasted class string that drifted into
  // three different orders, and "Giới tính" alone got a larger bottom margin
  // than the other seven — so the label baselines did not line up across the
  // grid. One shared constant now owns the typography.
  it('gives every field label the same typography', () => {
    render(
      <PassengerInfoStep flight={flight} passengerCount={1} onSubmit={vi.fn()} onBack={vi.fn()} />
    );

    const labels = [
      'Giới tính',
      /Họ và tên/,
      /Quốc gia/,
      /Ngày sinh/,
      /Số điện thoại/,
      /Email/,
      /CCCD \/ Hộ chiếu/,
      /Địa chỉ/,
      /Mã hội viên SkyJoy/,
    ].map((name) =>
      typeof name === 'string'
        ? screen.getByText(name)
        : screen.getByText((_, el) => el?.tagName === 'LABEL' && name.test(el.textContent ?? ''))
    );

    // More than one distinct className means the labels have drifted apart again.
    expect(new Set(labels.map((l) => l.className)).size).toBe(1);
    // The uppercase tracked field-label treatment, and the KoHo face, are part of it.
    expect(labels[0].className).toContain('uppercase');
    expect(labels[0].className).toContain('tracking-wider');
    expect(labels[0].className).toContain('font-koho');
  });

  it('shows validation messages and submits complete passenger plus policy consent', async () => {
    const onSubmit = vi.fn();
    render(
      <PassengerInfoStep flight={flight} passengerCount={1} onSubmit={onSubmit} onBack={vi.fn()} />
    );

    const phone = screen.getByLabelText(/Số điện thoại/);
    const email = screen.getByLabelText(/Email/);
    fireEvent.change(phone, { target: { value: '123' } });
    fireEvent.blur(phone);
    fireEvent.change(email, { target: { value: 'email-invalid' } });
    fireEvent.blur(email);
    expect(screen.getByText('Vui lòng nhập số điện thoại.')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập địa chỉ email của bạn.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Họ và tên/), { target: { value: 'NGUYEN VAN A' } });
    fireEvent.change(screen.getByLabelText(/Ngày sinh/), { target: { value: '1990-01-01' } });
    fireEvent.change(screen.getByLabelText(/CCCD \/ Hộ chiếu/), {
      target: { value: '012345678' },
    });
    fireEvent.change(phone, { target: { value: '0123456789' } });
    fireEvent.change(email, { target: { value: 'nguyen@example.com' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Tôi đã đọc, hiểu và đồng ý/ }));
    fireEvent.click(screen.getAllByRole('button', { name: /Hoàn tất & thanh toán/ })[0]);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            name: 'NGUYEN VAN A',
            phone: '0123456789',
            email: 'nguyen@example.com',
            countryCode: 'VN',
          }),
        ],
        {
          marketing: false,
          survey: false,
          retainForFutureBooking: false,
          policyAccepted: true,
        }
      );
    });
  });
});
