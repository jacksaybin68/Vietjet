'use client';
import React from 'react';

interface Props {
  /** Running booking total, rendered with vi-VN grouping and a "VND" suffix. */
  total: number;
  /** CTA caption — "Đi tiếp" on the picker steps, a payment label on the last one. */
  ctaLabel?: string;
  continueLabel?: string;
  /**
   * CTA action. Ignored when `formId` is set: the button then submits that
   * form (native constraint validation included) instead.
   */
  onCta?: () => void;
  onContinue?: () => void;
  /** Id of the form to submit when the CTA lives outside the `<form>`. */
  formId?: string;
  disabled?: boolean;
  canContinue?: boolean;
  /** Probe hook — lets Playwright find the bar per step. */
  testId?: string;
  /** Optional back button handler */
  onBack?: () => void;
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
  continueLabel,
  onCta,
  onContinue,
  formId,
  disabled = false,
  canContinue = true,
  testId,
  onBack,
}: Props) {
  const isSubmit = Boolean(formId);
  const action = onContinue ?? onCta;
  const label = ctaLabel ?? continueLabel ?? 'Đi tiếp';
  const isDisabled = disabled || !canContinue;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface)] shadow-[0_-2px_12px_rgba(0,0,0,0.08)]"
      data-testid={testId}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-3 py-2 sm:px-4 md:px-6">
        {/* Left: Optional Back button or spacer */}
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="rounded-[5px] border border-[var(--vj-border-back)] bg-white h-[39px] px-4 text-sm font-medium text-vj-text transition-colors hover:bg-gray-50"
          >
            Quay lại
          </button>
        ) : (
          <div />
        )}

        {/* Center: Total price */}
        <div className="flex flex-col items-center leading-tight">
          <span className="text-2xl3 font-semibold text-gray-800 font-koho">
            Tổng tiền
          </span>
          <span className="text-xl4 font-bold font-jambono text-primary">
            {total.toLocaleString('vi-VN')} VND
          </span>
        </div>

        {/* Right: primary CTA (.vj-cta gradient vàng) */}
        <button
          type={isSubmit ? 'submit' : 'button'}
          form={formId}
          onClick={isSubmit ? undefined : action}
          disabled={isDisabled}
          className="vj-cta h-[39px] px-6 rounded-vj font-koho text-sm font-medium uppercase tracking-normal transition-all shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {label}
        </button>
      </div>
    </div>
  );
}
