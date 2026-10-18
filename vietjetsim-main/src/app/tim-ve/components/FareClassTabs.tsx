'use client';

import React from 'react';

const FARE_CLASSES: readonly { id: string; label: string; color: string }[] = [
  { id: 'BUSINESS', label: 'BUSINESS', color: 'bg-vjbrown' }, // vàng nâu
  { id: 'SKYBOSS', label: 'skyBOSS', color: 'bg-vjred' }, // đỏ #EC2029
  { id: 'DELUXE', label: 'Deluxe', color: 'bg-vjorange' }, // cam #F4511E
  { id: 'ECO', label: 'Eco', color: 'bg-vjegreen' }, // xanh lá #7CB342
] as const;

interface FareClassTabsProps {
  activeClass: string;
  onSelect: (fareClass: string) => void;
}

export default function FareClassTabs({ activeClass, onSelect }: FareClassTabsProps) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-2 no-scrollbar">
      {FARE_CLASSES.map((cls) => {
        const active = activeClass === cls.id;
        return (
          <button
            key={cls.id}
            onClick={() => onSelect(cls.id)}
            className={`flex shrink-0 items-center justify-center rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
              active
                ? `${cls.color} text-white shadow-sm shadow-vjred/20`
                : 'bg-white border border-black/10 text-vjdark hover:bg-vjbgs/50'
            }`}
          >
            {cls.label}
          </button>
        );
      })}
    </div>
  );
}
