'use client';

export interface ThemeToggleProps {
  className?: string;
  variant?: 'compact' | 'pill';
}

/**
 * ThemeToggle Component
 * Note: Dark mode has been retired per user specification in favor of a clean, high-contrast white background.
 * This component safely renders null to prevent breaking existing layouts while removing dark mode options.
 */
export function ThemeToggle(_props?: ThemeToggleProps) {
  return null;
}
