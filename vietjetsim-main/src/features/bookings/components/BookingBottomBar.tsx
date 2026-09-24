'use client';
import React from 'react';

interface Props {
  /** Running booking total, rendered with vi-VN grouping and a "VND" suffix. */
  total: number;
  /** CTA caption — "Đi tiếp" on the picker steps, a payment label on the last one. */
  ctaLabel: string;
  /**
   * CTA action. Ignored when `formId` is set: the button then submits that
   * form (native constraint validation included) instead.
   */
  onCta?: () => void;
  /** Id of the form to submit when the CTA lives outside the `<form>`. */
  formId?: string;
  disabled?: boolean;
  /** Probe hook — lets Playwright find the bar per step. */
  testId?: string;
}

/**
 * Sticky "Tổng tiền" bar pinned to the bottom of the viewport — vietjetair.com
 * keeps this bar on every step of the booking wizard (running total on the
 * left, accent CTA on the right), so every step shares this one component
 * instead of re-implementing the markup. Amount always comes from
 * `getBookingTotals` so the bar can never disagree with the step's sidebar.
 */
export default function BookingBottomBar({
  total,
  ctaLabel,
  onCta,
  formId,
  disabled,
  testId,
}: Props) {
  const isSubmit = Boolean(formId);
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface)] shadow-[0_-2px_12px_rgba(0,0,0,0.08)]"
      data-testid={testId}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-3 py-2 sm:px-4 md:px-6">
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] uppercase tracking-wide text-[var(--foreground-muted)]">
            Tổng tiền
          </span>
          <span className="text-sm font-black font-koho text-[var(--foreground)] sm:text-base">
            {total.toLocaleString('vi-VN')} VND
          </span>
        </div>
        <button
          type={isSubmit ? 'submit' : 'button'}
          form={formId}
          onClick={isSubmit ? undefined : onCta}
          disabled={disabled}
          className="rounded-lg bg-[var(--accent)] px-5 py-2 font-koho text-xs font-black text-[var(--vj-navy)] transition-all hover:bg-[var(--accent-dark)] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}
