import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, renderHook } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../components/ThemeProvider';
import { ThemeToggle } from '../components/ThemeToggle';

describe('White Theme Policy & Dark Mode Removal Suite', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined' && localStorage.clear) {
      localStorage.clear();
    }
    if (typeof document !== 'undefined') {
      document.documentElement.className = '';
      document.documentElement.style.colorScheme = '';
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. provides light theme and isDark=false by default', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    expect(result.current.theme).toBe('light');
    expect(result.current.isDark).toBe(false);
  });

  it('2. sets documentElement to theme-light and colorScheme to light', () => {
    render(
      <ThemeProvider>
        <div>Content</div>
      </ThemeProvider>
    );

    expect(document.documentElement.classList.contains('theme-light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('3. returns safe light fallback when useTheme is invoked outside ThemeProvider', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');
    expect(result.current.isDark).toBe(false);
  });

  it('4. ThemeToggle renders null to completely remove dark mode option from UI', () => {
    const { container } = render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    expect(container.firstChild).toBeNull();
  });

  it('5. ThemeToggle in pill variant also renders null', () => {
    const { container } = render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    expect(container.firstChild).toBeNull();
  });
});
