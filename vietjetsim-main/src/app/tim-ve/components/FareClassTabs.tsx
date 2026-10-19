'use client';

import React from 'react';
import { RiInformationLine } from 'react-icons/ri';

// One palette only: the active fare is marked with a brand-red tint and border,
// not a different colour per cabin — the four green/orange/brown chips read as
// noise next to the red CTAs (see the design brief in AGENTS.md).
const FARE_CLASSES: readonly { id: string; label: string }[] = [
  { id: 'BUSINESS', label: 'BUSINESS' },
  { id: 'SKYBOSS', label: 'skyBOSS' },
  { id: 'DELUXE', label: 'Deluxe' },
  { id: 'ECO', label: 'Eco' },
] as const;

interface FareClassTabsProps {
  activeClass: string;
  onSelect: (fareClass: string) => void;
  /**
   * Bấm vào tên hạng vé → mở bảng so sánh quyền lợi của 4 hạng. Separate from
   * `onSelect` because tapping the name must never change the price being shown.
   */
  onCompare?: (fareClass: string) => void;
}

export default function FareClassTabs({ activeClass, onSelect, onCompare }: FareClassTabsProps) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-2 no-scrollbar">
      {FARE_CLASSES.map((cls) => {
        const active = activeClass === cls.id;
        return (
          <div
            key={cls.id}
            className={`flex shrink-0 items-stretch overflow-hidden rounded-xl border transition-colors duration-200 ${
              active
                ? 'border-primary bg-[rgb(var(--vj-red-rgb))]/10'
                : 'border-[var(--border)] bg-white hover:border-primary/40'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(cls.id)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                active ? 'text-primary' : 'text-vjdark hover:bg-[var(--surface-2)]'
              }`}
            >
              {cls.label}
            </button>
            {onCompare && (
              <>
                <span className={`w-px self-stretch ${active ? 'bg-primary/30' : 'bg-black/10'}`} />
                <button
                  type="button"
                  onClick={() => onCompare(cls.id)}
                  aria-label={`So sánh quyền lợi hạng ${cls.label}`}
                  title="So sánh quyền lợi các hạng vé"
                  className={`px-1.5 transition-colors ${
                    active
                      ? 'text-primary hover:bg-primary/10'
                      : 'text-vjdark/50 hover:text-primary hover:bg-[var(--surface-2)]'
                  }`}
                >
                  <RiInformationLine size={14} />
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
