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
      className={`w-full lg:w-[200px] py-3 rounded-xl bg-primary text-white font-black text-center uppercase tracking-wider transition-colors duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-dark`}
    >
      {label}
    </button>
  );
}
