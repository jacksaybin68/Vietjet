import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import HeroBookingWidget from '@/app/trang-chu/components/HeroBookingWidget';
import {
  FlightDatePickerPopover,
  formatDisplayDate,
  getMonthCells,
} from '@/app/trang-chu/components/DatePicker';

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe('FlightDatePickerPopover Component', () => {
  it('formats display date correctly (DD/MM/YYYY)', () => {
    expect(formatDisplayDate('2026-10-19')).toBe('19/10/2026');
    expect(formatDisplayDate('')).toBe('');
  });

  it('calculates month cells including leading and trailing days', () => {
    // October 2026 (month 9) starts on Thursday, has 31 days
    const cells = getMonthCells(2026, 9);
    expect(cells.length % 7).toBe(0);
    // 3 leading days from September (28, 29, 30)
    expect(cells[0].day).toBe(28);
    expect(cells[0].inMonth).toBe(false);
    // Day 1 of October
    expect(cells[3].day).toBe(1);
    expect(cells[3].inMonth).toBe(true);
  });

  it('renders two months, CN Sunday header in red, and trip type options', () => {
    const onSelectDepart = vi.fn();
    const onSelectReturn = vi.fn();
    const onTripTypeChange = vi.fn();
    const onClose = vi.fn();

    render(
      <FlightDatePickerPopover
        departDate="2026-10-19"
        returnDate="2026-10-26"
        roundTrip={true}
        activeStep="depart"
        onSelectDepart={onSelectDepart}
        onSelectReturn={onSelectReturn}
        onTripTypeChange={onTripTypeChange}
        onClose={onClose}
        minDate="2026-10-01"
      />
    );

    // Two months side-by-side
    expect(screen.getByText('Tháng 10 2026')).toBeInTheDocument();
    expect(screen.getByText('Tháng 11 2026')).toBeInTheDocument();

    // Weekdays
    const sundayHeaders = screen.getAllByText('CN');
    expect(sundayHeaders.length).toBeGreaterThanOrEqual(2);
    expect(sundayHeaders[0]).toHaveClass('text-red-500');

    // Selected date 19 in first month has red border styling
    const day19Buttons = screen.getAllByRole('button', { name: '19' });
    expect(day19Buttons[0]).toHaveClass('border-red-500');
  });

  it('handles selecting departure date and switching to return date', () => {
    const onSelectDepart = vi.fn();
    const onSelectReturn = vi.fn();
    const onStepChange = vi.fn();
    const onClose = vi.fn();

    render(
      <FlightDatePickerPopover
        departDate="2026-10-19"
        returnDate="2026-10-26"
        roundTrip={true}
        activeStep="depart"
        onStepChange={onStepChange}
        onSelectDepart={onSelectDepart}
        onSelectReturn={onSelectReturn}
        onTripTypeChange={vi.fn()}
        onClose={onClose}
        minDate="2026-10-01"
      />
    );

    // Click on date 22 of first month
    const day22 = screen.getAllByRole('button', { name: '22' })[0];
    fireEvent.click(day22);

    expect(onSelectDepart).toHaveBeenCalledWith('2026-10-22');
    expect(onStepChange).toHaveBeenCalledWith('return');
  });

  it('closes immediately upon picking departure date when one-way (Một chiều)', () => {
    const onSelectDepart = vi.fn();
    const onClose = vi.fn();

    render(
      <FlightDatePickerPopover
        departDate="2026-10-19"
        returnDate=""
        roundTrip={false}
        activeStep="depart"
        onSelectDepart={onSelectDepart}
        onSelectReturn={vi.fn()}
        onTripTypeChange={vi.fn()}
        onClose={onClose}
        minDate="2026-10-01"
      />
    );

    const day25 = screen.getAllByRole('button', { name: '25' })[0];
    fireEvent.click(day25);

    expect(onSelectDepart).toHaveBeenCalledWith('2026-10-25');
    expect(onClose).toHaveBeenCalled();
  });
});

describe('HeroBookingWidget Date Selection Flow', () => {
  it('opens date picker popover when clicking Ngày đi', () => {
    render(<HeroBookingWidget />);

    const departBtn = screen.getByRole('button', { name: /Ngày đi/i });
    expect(departBtn).toBeInTheDocument();

    // Popover is not open initially
    expect(screen.queryByLabelText('Tháng trước')).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(departBtn);
    expect(screen.getByLabelText('Tháng trước')).toBeInTheDocument();
    expect(screen.getByText('Tháng 10 2026')).toBeInTheDocument();
  });

  it('opens date picker popover when clicking Ngày về', () => {
    render(<HeroBookingWidget />);

    const returnBtn = screen.getByRole('button', { name: /Ngày về/i });
    expect(returnBtn).toBeInTheDocument();

    fireEvent.click(returnBtn);
    expect(screen.getByLabelText('Tháng sau')).toBeInTheDocument();
    expect(screen.getByText('Tháng 11 2026')).toBeInTheDocument();
  });

  it('swaps origin and destination when clicking swap button', () => {
    render(<HeroBookingWidget />);

    const swapBtn = screen.getByRole('button', { name: /Đổi điểm khởi hành và điểm đến/i });
    expect(swapBtn).toBeInTheDocument();

    // Initially HAN -> SGN
    expect(screen.getByRole('button', { name: 'Điểm khởi hành' })).toHaveTextContent(/HAN/);
    expect(screen.getByRole('button', { name: 'Điểm đến' })).toHaveTextContent(/SGN/);

    fireEvent.click(swapBtn);

    // After swap: SGN -> HAN
    expect(screen.getByRole('button', { name: 'Điểm khởi hành' })).toHaveTextContent(/SGN/);
    expect(screen.getByRole('button', { name: 'Điểm đến' })).toHaveTextContent(/HAN/);
  });

  it('hides return date when switching to Một chiều and shows when Khứ hồi', () => {
    render(<HeroBookingWidget />);

    expect(screen.getByRole('button', { name: /Ngày về/i })).toBeInTheDocument();

    const oneWayRadio = screen.getByLabelText('Một chiều');
    fireEvent.click(oneWayRadio);

    expect(screen.queryByRole('button', { name: /Ngày về/i })).not.toBeInTheDocument();

    const roundTripRadio = screen.getByLabelText('Khứ hồi');
    fireEvent.click(roundTripRadio);

    expect(screen.getByRole('button', { name: /Ngày về/i })).toBeInTheDocument();
  });
});
