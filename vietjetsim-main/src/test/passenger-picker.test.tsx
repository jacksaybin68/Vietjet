import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PassengerPicker, { MAX_PASSENGERS } from '@/app/trang-chu/components/PassengerPicker';

const LABELS = { adult: 'Người lớn', child: 'Trẻ em', infant: 'Em bé' } as const;

function setup(counts: { adult: number; child: number; infant: number }) {
  const onChange = vi.fn();
  render(<PassengerPicker value={counts} onChange={onChange} />);
  fireEvent.click(screen.getByRole('button', { name: 'Số hành khách' }));
  return onChange;
}

describe('PassengerPicker', () => {
  it('summarises the three categories', () => {
    setup({ adult: 2, child: 1, infant: 1 });
    expect(screen.getByText('2 Người lớn, 1 Trẻ em, 1 Em bé')).toBeInTheDocument();
  });

  it('offers all three categories with an age hint', () => {
    setup({ adult: 1, child: 0, infant: 0 });
    expect(screen.getByText(LABELS.adult)).toBeInTheDocument();
    expect(screen.getByText(LABELS.child)).toBeInTheDocument();
    expect(screen.getByText(LABELS.infant)).toBeInTheDocument();
    expect(screen.getByText('Từ 2 đến dưới 12 tuổi')).toBeInTheDocument();
    expect(screen.getByText('Dưới 2 tuổi, đi kèm người lớn')).toBeInTheDocument();
  });

  it('adds a child and keeps adults in the roster', () => {
    const onChange = setup({ adult: 1, child: 0, infant: 0 });
    fireEvent.click(screen.getByRole('button', { name: `Tăng số ${LABELS.child}` }));
    expect(onChange).toHaveBeenCalledWith({ adult: 1, child: 1, infant: 0 });
  });

  it('removes a child', () => {
    const onChange = setup({ adult: 2, child: 1, infant: 0 });
    fireEvent.click(screen.getByRole('button', { name: `Giảm số ${LABELS.child}` }));
    expect(onChange).toHaveBeenCalledWith({ adult: 2, child: 0, infant: 0 });
  });

  it('never drops the last adult', () => {
    setup({ adult: 1, child: 0, infant: 0 });
    expect(screen.getByRole('button', { name: `Giảm số ${LABELS.adult}` })).toBeDisabled();
  });

  // One adult can supervise one child or one infant, not both at once.
  it('stops a child or infant from outnumbering the adults', () => {
    setup({ adult: 1, child: 0, infant: 0 });
    expect(screen.getByRole('button', { name: `Tăng số ${LABELS.child}` })).toBeEnabled();
    expect(screen.getByRole('button', { name: `Tăng số ${LABELS.infant}` })).toBeEnabled();
  });

  it('closes the panel on Escape', () => {
    setup({ adult: 1, child: 0, infant: 0 });
    expect(screen.getByRole('dialog', { name: 'Chọn số hành khách' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Chọn số hành khách' })).not.toBeInTheDocument();
  });

  it('labels the trigger for screen readers and reports the open state', () => {
    render(<PassengerPicker value={{ adult: 1, child: 0, infant: 0 }} onChange={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: 'Số hành khách' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('caps the party at 9', () => {
    setup({ adult: MAX_PASSENGERS, child: 0, infant: 0 });
    expect(screen.getByRole('button', { name: `Tăng số ${LABELS.adult}` })).toBeDisabled();
  });
});
