'use client';

import React from 'react';
import { Icon } from '@/shared/components/ui';

/** Which half of a round trip is on screen. */
export type TripLeg = 'outbound' | 'return';

export interface TripLegInfo {
  /** "SGN → HAN" (outbound) / "HAN → SGN" (return). */
  trip: string;
  date: string;
  /** A flight has been picked for this leg. */
  selected: boolean;
  flightNo?: string;
}

interface TripLegTabsProps {
  active: TripLeg;
  outbound: TripLegInfo;
  inbound: TripLegInfo;
  onChange: (leg: TripLeg) => void;
}

function LegButton({
  leg,
  info,
  active,
  disabled,
  onClick,
}: {
  leg: TripLeg;
  info: TripLegInfo;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const label = leg === 'outbound' ? 'Chuyến đi' : 'Chuyến về';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-current={active ? 'step' : undefined}
      title={disabled ? 'Hãy chọn chuyến đi trước' : undefined}
      className={`flex-1 min-w-0 flex items-center gap-2 px-3 py-2 text-left transition-all ${
        active
          ? 'bg-vjred text-white shadow-sm'
          : disabled
            ? 'bg-white text-vjdark/40 cursor-not-allowed'
            : info.selected
              ? 'bg-white text-vjdark hover:bg-vjbgs'
              : 'bg-white text-vjdark/70 hover:bg-vjbgs'
      }`}
    >
      <span
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-black ${
          active
            ? 'bg-white text-vjred'
            : info.selected
              ? 'bg-vjred text-white'
              : 'bg-black/10 text-vjdark/60'
        }`}
      >
        {info.selected ? <Icon name="CheckIcon" size={12} /> : leg === 'outbound' ? '1' : '2'}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider opacity-80">{label}</span>
          {info.flightNo && (
            <span
              className={`text-xs font-black font-koho ${active ? 'text-white' : 'text-vjred'}`}
            >
              {info.flightNo}
            </span>
          )}
        </span>
        <span className="block truncate text-xs font-black">
          {info.trip} · {info.date}
        </span>
      </span>
    </button>
  );
}

/**
 * Chọn chặng cho vé khứ hồi: chuyến đi luôn mở trước, chuyến về chỉ mở khi đã
 * có chuyến đi — đúng thứ tự mà form tìm kiếm yêu cầu.
 */
export default function TripLegTabs({ active, outbound, inbound, onChange }: TripLegTabsProps) {
  const inboundLocked = !outbound.selected;
  const showNextCta = active === 'outbound' && outbound.selected && !inbound.selected;

  return (
    <div className="mt-3 px-1">
      <div
        className="flex items-stretch overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm"
        role="tablist"
        aria-label="Chặng bay"
      >
        <LegButton
          leg="outbound"
          info={outbound}
          active={active === 'outbound'}
          disabled={false}
          onClick={() => onChange('outbound')}
        />
        <span className="w-px bg-black/10" />
        <LegButton
          leg="return"
          info={inbound}
          active={active === 'return'}
          disabled={inboundLocked}
          onClick={() => onChange('return')}
        />
      </div>

      {showNextCta && (
        <button
          type="button"
          onClick={() => onChange('return')}
          className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-vjyellow px-4 py-2.5 text-xs font-black uppercase tracking-wider text-vjdark transition-all hover:brightness-95"
        >
          Tiếp tục chọn chuyến về
          <Icon name="ArrowRightIcon" size={14} />
        </button>
      )}

      {active === 'return' && (
        <button
          type="button"
          onClick={() => onChange('outbound')}
          className="mt-2 flex items-center gap-1.5 text-xs font-bold text-vjred hover:text-vjdark transition-colors"
        >
          <Icon name="ArrowLeftIcon" size={14} />
          Chỉnh sửa chuyến đi
        </button>
      )}
    </div>
  );
}
