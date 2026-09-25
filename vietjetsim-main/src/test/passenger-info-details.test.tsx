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
  class: 'economy' as const,
  airline: 'Vietjet Air',
  flightNo: 'VJ301',
  available: 20,
  stops: 0,
};

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
    expect(screen.getByLabelText(/Nơi ở hiện tại/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mã hội viên SkyJoy/)).toHaveAttribute(
      'placeholder',
      'SJxxxxxxxxxx'
    );
    expect(screen.getByText(/Gửi thông tin khuyến mãi/)).toBeInTheDocument();
    expect(screen.getByText(/Thực hiện khảo sát/)).toBeInTheDocument();
    expect(screen.getByText(/Lưu thông tin hành khách/)).toBeInTheDocument();
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
