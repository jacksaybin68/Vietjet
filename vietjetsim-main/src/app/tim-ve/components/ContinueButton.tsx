'use client';

import React from 'react';

interface ContinueButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}

export default function ContinueButton({
  onClick,
  disabled,
  label = 'Đi tiếp',
}: ContinueButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full lg:w-[200px] py-3 rounded-xl bg-vjyellow text-vjdark font-black text-center uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:!bg-[#fdd811] hover:scale-[1.02] active:scale-95`}
    >
      {label}
    </button>
  );
}
