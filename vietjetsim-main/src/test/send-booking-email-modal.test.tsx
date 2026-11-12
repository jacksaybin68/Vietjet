import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SendBookingEmailModal from '@/features/admin/components/SendBookingEmailModal';

vi.mock('@/features/admin/services', () => ({
  sendBookingEmail: vi.fn().mockResolvedValue({
    success: true,
    message: 'Đã gửi Gmail thành công!',
    status: 'confirmed',
  }),
}));

describe('SendBookingEmailModal Component UI', () => {
  const mockBooking = {
    id: 'bk-123456',
    bookingCode: 'VJ9988',
    userName: 'Nguyễn Văn Test',
    userEmail: 'test.passenger@gmail.com',
    amount: 1750000,
    flightNo: 'VJ150',
    route: 'HAN → SGN',
    date: '25/11/2026',
    status: 'pending',
  };

  it('renders modal with correct header and initial booking details', () => {
    render(
      <SendBookingEmailModal
        isOpen={true}
        onClose={vi.fn()}
        booking={mockBooking}
        defaultType="payment_instruction"
      />
    );

    expect(screen.getByText(/Gửi Gmail Thông Báo & Xuất Vé/i)).toBeDefined();
    expect(screen.getByText(/PNR: VJ9988/i)).toBeDefined();
    expect(screen.getByDisplayValue('test.passenger@gmail.com')).toBeDefined();
    expect(screen.getByDisplayValue('Nguyễn Văn Test')).toBeDefined();
    expect(screen.getByDisplayValue('1750000')).toBeDefined();
  });

  it('switches between Payment Instruction and Ticket Issuance tabs', () => {
    render(
      <SendBookingEmailModal
        isOpen={true}
        onClose={vi.fn()}
        booking={mockBooking}
        defaultType="payment_instruction"
      />
    );

    expect(screen.getByText(/1\. Hướng dẫn thanh toán/i)).toBeDefined();
    expect(screen.getByText(/2\. Xuất vé điện tử/i)).toBeDefined();

    // Click tab 2
    fireEvent.click(screen.getByText(/2\. Xuất vé điện tử/i));
    expect(screen.getByText(/Thông tin vé xuất trong email/i)).toBeDefined();
  });

  it('switches to Live Preview mode to see email layout', () => {
    render(
      <SendBookingEmailModal
        isOpen={true}
        onClose={vi.fn()}
        booking={mockBooking}
        defaultType="payment_instruction"
      />
    );

    const previewBtn = screen.getByText(/Xem trước/i);
    fireEvent.click(previewBtn);

    expect(screen.getByText(/Tiêu đề Gmail \(Subject\)/i)).toBeDefined();
    expect(screen.getByText(/Thông báo thanh toán đặt chỗ VJ9988 — Vietjet Air/i)).toBeDefined();
  });
});
