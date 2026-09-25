'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({ children, storageKey = 'vietjetsim-theme' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('light');

  // VietjetSim uses one deliberate light presentation. Clear any preference
  // left by the old theme switch so a previous dark selection cannot persist.
  useEffect(() => {
    localStorage.removeItem(storageKey);
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  }, [storageKey]);

  const setTheme = useCallback(() => {
    setThemeState('light');
    localStorage.removeItem(storageKey);
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  }, [storageKey]);

  const value = {
    theme,
    resolvedTheme: 'light' as const,
    setTheme,
    toggleTheme: setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
