'use client';

import React, { createContext, useContext, useEffect, useMemo } from 'react';

export type Theme = 'light';

interface ThemeContextValue {
  theme: 'light';
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.classList.remove('dark');
    root.classList.remove('theme-dark');
    root.classList.add('theme-light');
    root.style.colorScheme = 'light';

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('bayniks-theme');
      }
    } catch {
      // Safe fallback
    }
  }, []);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme: 'light',
      isDark: false,
      toggleTheme: () => {},
      setTheme: () => {},
    }),
    []
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'light',
      isDark: false,
      toggleTheme: () => {},
      setTheme: () => {},
    };
  }
  return context;
}
