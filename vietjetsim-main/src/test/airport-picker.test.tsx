import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AirportPicker, { type Airport } from '@/app/trang-chu/components/AirportPicker';

const AIRPORTS: Airport[] = [
  { code: 'HAN', city: 'Hà Nội', airport: 'Nội Bài' },
  { code: 'SGN', city: 'Hồ Chí Minh', airport: 'Tân Sơn Nhất' },
  { code: 'PQC', city: 'Phú Quốc', airport: 'Phú Quốc' },
];

function setup(value = 'HAN') {
  const onChange = vi.fn();
  const { container } = render(
    <AirportPicker
      label="Điểm khởi hành"
      icon="takeoff"
      value={value}
      airports={AIRPORTS}
      onChange={onChange}
    />
  );
  return { onChange, container };
}

describe('AirportPicker', () => {
  it('shows the selected city and code', () => {
    setup('SGN');
    expect(screen.getByRole('button', { name: 'Điểm khởi hành' })).toHaveTextContent('Hồ Chí Minh');
    expect(screen.getByRole('button', { name: 'Điểm khởi hành' })).toHaveTextContent('SGN');
  });

  it('paints the list on the page surface, not the OS dropdown', () => {
    // A native <select> popup is drawn by the OS and ignores the stylesheet,
    // which is why the old dark-mode list could not be made white.
    const { container } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Điểm khởi hành' }));
    const list = screen.getByRole('listbox', { name: 'Điểm khởi hành' });
    expect(list).toHaveClass('bg-white');
    expect(container.querySelector('select')).toBeNull();
  });

  it('lists every airport with its name', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Điểm khởi hành' }));
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByText('Nội Bài')).toBeInTheDocument();
  });

  it('filters by city, code and airport name', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Điểm khởi hành' }));
    const search = screen.getByRole('textbox', { name: 'Tìm điểm khởi hành' });

    fireEvent.change(search, { target: { value: 'phu' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);

    // Matching the IATA code works too, and it is not case sensitive.
    fireEvent.change(search, { target: { value: 'sgn' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);

    fireEvent.change(search, { target: { value: 'tan son' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
  });

  it('reports when nothing matches', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Điểm khởi hành' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Tìm điểm khởi hành' }), {
      target: { value: 'zzzz' },
    });
    expect(screen.getByText('Không tìm thấy sân bay')).toBeInTheDocument();
  });

  it('selects an airport and closes', () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Điểm khởi hành' }));
    fireEvent.click(screen.getByRole('option', { name: /Phú Quốc/ }));
    expect(onChange).toHaveBeenCalledWith('PQC');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('marks the current selection for screen readers', () => {
    setup('PQC');
    fireEvent.click(screen.getByRole('button', { name: 'Điểm khởi hành' }));
    expect(screen.getByRole('option', { name: /Phú Quốc/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('option', { name: /Hà Nội/ })).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });

  it('closes on Escape and resets the search', () => {
    setup();
    const trigger = screen.getByRole('button', { name: 'Điểm khởi hành' });
    fireEvent.click(trigger);
    fireEvent.change(screen.getByRole('textbox', { name: 'Tìm điểm khởi hành' }), {
      target: { value: 'phu' },
    });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('drops its own border in the flush variant so the group box stays single', () => {
    const onChange = vi.fn();
    const { container } = render(
      <AirportPicker
        label="Điểm đến"
        icon="land"
        value="SGN"
        airports={AIRPORTS}
        onChange={onChange}
        variant="flush"
        className="sm:col-span-2"
      />
    );
    const label = container.querySelector('label')!;
    expect(label.className).not.toContain('rounded');
    expect(label.className).not.toContain('border-[#e4e4e4]');
    expect(container.firstElementChild).toHaveClass('sm:col-span-2');
  });
});
