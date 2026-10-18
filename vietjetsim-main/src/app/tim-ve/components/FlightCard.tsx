'use client';

import React from 'react';
import { Icon } from '@/shared/components/ui';

export interface FlightPrice {
  business: number;
  skyboss: number;
  deluxe: number;
  eco: number;
}

export interface FlightCardProps {
  flight: {
    no: string;
    depart: string;
    arrive: string;
    aircraft: string;
    prices: FlightPrice;
  };
  onSelect: (flightNo: string, fareClass: string, fare: number) => void;
}

const FARE_COLUMNS: readonly {
  id: string;
  label: string;
  color: string;
  priceKey: keyof FlightPrice;
}[] = [
  { id: 'BUSINESS', label: 'BUSINESS', color: 'text-vjbrown', priceKey: 'business' },
  { id: 'SKYBOSS', label: 'skyBOSS', color: 'text-vjred', priceKey: 'skyboss' },
  { id: 'DELUXE', label: 'Deluxe', color: 'text-vjorange', priceKey: 'deluxe' },
  { id: 'ECO', label: 'Eco', color: 'text-vjegreen', priceKey: 'eco' },
] as const;

export default function FlightCard({ flight, onSelect }: FlightCardProps) {
  const [depTime, depMin] = flight.depart.split(':');
  const [arrTime, arrMin] = flight.arrive.split(':');

  return (
    <article className="flex items-center gap-4 rounded-xl border border-black/10 bg-white p-3 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
      {/* Cột 1: Giờ bay */}
      <div className="shrink-0 flex flex-col items-center gap-0.5">
        <span className="text-3xl font-black text-vjdark leading-none">
          {depTime}:{depMin}
        </span>
        <span className="text-[11px] font-semibold text-vjdark">→</span>
        <span className="text-3xl font-black text-vjdark leading-none">
          {arrTime}:{arrMin}
        </span>
        <span className="text-[10px] font-bold text-vjred uppercase tracking-wider mt-1">
          Bay thẳng
        </span>
      </div>

      {/* Cột 2: Mã chuyến bay + máy bay */}
      <div className="shrink-0 flex flex-col items-center gap-1">
        <span className="text-sm font-black text-vjdark">{flight.no}</span>
        <span className="text-[10px] text-vjdark">{flight.aircraft}</span>
        <div className="mt-2 flex size-6 items-center justify-center rounded-full bg-vjbgs text-vjred font-bold text-[10px]">
          <Icon name="PaperAirplaneIcon" size={10} aria-hidden="true" />
        </div>
      </div>

      {/* Cột 3: 4 cột hạng ghế */}
      <div className="flex-1 grid grid-cols-4 gap-2 min-w-0">
        {FARE_COLUMNS.map((col) => (
          <button
            key={col.id}
            onClick={() => onSelect(flight.no, col.id, flight.prices[col.priceKey])}
            className={`flex flex-col items-center gap-1 rounded-lg border border-black/10 bg-white p-2 transition-all hover:bg-vjbgs/50 ${
              col.color
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider">{col.label}</span>
            <span className="text-xl font-black text-vjdark leading-none">
              {(flight.prices[col.priceKey] / 1000).toFixed(0)}
            </span>
            <span className="text-[10px] text-vjdark">000đ</span>
          </button>
        ))}
      </div>
    </article>
  );
}
