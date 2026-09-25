import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DiscountsTab from '@/features/admin/components/DiscountsTab';

vi.mock('@/shared/services', () => ({
  apiRequest: vi.fn(async (url: string) => {
    if (url.includes('/dai-ly')) return { agencies: [] };
    return { discounts: [], pagination: { total: 0 } };
  }),
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));

async function openCreateModal() {
  render(<DiscountsTab />);
  fireEvent.click(await screen.findByRole('button', { name: /Tạo mã mới/i }));
  const title = screen.getByText('Thêm mã ưu đãi mới');
  // header (chứa tiêu đề) và form là hai khối anh em trong panel.
  const header = title.parentElement as HTMLElement;
  const panel = header.parentElement as HTMLElement;
  const form = panel.querySelector('form') as HTMLFormElement;
  return { header, panel, form };
}

describe('DiscountsTab modal', () => {
  // The create form is far taller than a 732px-tall viewport. Without a height
  // cap the dialog is centred vertically and both the title and the submit
  // button get clipped off-screen, so the panel must scroll internally.
  it('caps the create dialog to the viewport and keeps the header pinned', async () => {
    const { header, panel } = await openCreateModal();

    expect(panel).toHaveClass('flex', 'flex-col', 'max-h-[90vh]', 'overflow-hidden');
    expect(header).toHaveClass('shrink-0');
  });

  it('lets the form body scroll so the submit button stays reachable', async () => {
    const { form } = await openCreateModal();

    expect(form).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto');
    // `space-y-8` was the vertical rhythm that pushed the actions off-screen.
    expect(form).toHaveClass('space-y-6');
    expect(form).not.toHaveClass('space-y-8');
    expect(form.contains(screen.getByRole('button', { name: /Khởi tạo mã/i }))).toBe(true);
  });

  // Full-width fields span two columns only from `sm` up: a bare `col-span-2`
  // inside `grid-cols-1` would create a phantom implicit column on narrow screens.
  it('keeps the wide fields full width without an implicit column', async () => {
    const { form } = await openCreateModal();
    const grid = form.querySelector('[class*="grid-cols-1"]') as HTMLElement;

    expect(grid).toHaveClass('sm:grid-cols-2');
    expect(form.querySelectorAll('[class*="sm:col-span-2"]')).toHaveLength(2);
    expect(form.querySelectorAll('[class*="col-span-2"]')).toHaveLength(2);
  });
});
