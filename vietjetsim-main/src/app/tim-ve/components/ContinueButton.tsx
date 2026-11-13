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
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`vj-cta w-full lg:w-[127px] h-[39px] rounded-vj font-koho text-sm font-medium text-center uppercase tracking-normal transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {label}
    </button>
  );
}
