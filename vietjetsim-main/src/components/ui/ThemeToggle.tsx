'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { HiSun, HiMoon, HiComputerDesktop } from 'react-icons/hi2';
import { useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const options = [
    { value: 'light' as const, label: 'Sáng', icon: HiSun },
    { value: 'dark' as const, label: 'Tối', icon: HiMoon },
    { value: 'system' as const, label: 'Hệ thống', icon: HiComputerDesktop },
  ];

  const currentOption = options.find((opt) => opt.value === theme) || options[0];
  const IconComponent = currentOption.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-all
          bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200
          hover:bg-gray-200 dark:hover:bg-gray-700
          border border-gray-200 dark:border-gray-700"
        aria-label="Toggle theme"
      >
        <IconComponent className="w-4 h-4" />
        <span className="hidden sm:inline">{currentOption.label}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-40 py-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
            {options.map((option) => {
              const OptionIcon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    setTheme(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors
                    ${
                      theme === option.value
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                >
                  <OptionIcon className="w-4 h-4" />
                  <span>{option.label}</span>
                  {theme === option.value && (
                    <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
