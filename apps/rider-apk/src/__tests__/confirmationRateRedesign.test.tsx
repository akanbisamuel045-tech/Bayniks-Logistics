// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DriverScoreActivityScreen } from '../components/DriverScoreActivityScreen';

describe('DriverScoreActivityScreen (Video-Exact Activity & Confirmation Rate + Black & Atomic Orange Theme)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders Activity header, horizontal week carousel, TRIPS default chart with 25/30 badge, and bottom HOURS|TRIPS|CANCELS tabs', () => {
    render(<DriverScoreActivityScreen onBack={vi.fn()} initialTab="activity" />);

    expect(screen.getByTestId('driver-score-activity-screen')).toBeDefined();
    expect(screen.getByTestId('activity-back-btn')).toBeDefined();
    expect(screen.getByRole('heading', { name: /^Activity$/i })).toBeDefined();
    expect(screen.getByTestId('activity-week-strip')).toBeDefined();
    expect(screen.getByTestId('activity-bottom-tabs')).toBeDefined();

    // TRIPS default renders 10.10-16.10 summary 25 / 30 and explanation line
    expect(screen.getByTestId('activity-summary-badge').textContent).toBe('25 / 30');
    expect(screen.getByTestId('day-selected-callout').textContent).toBe('9 / 12');
    expect(screen.getByText(/Number of finished trips from all incoming requests/i)).toBeDefined();
  });

  it('switches weekly periods (24.10-30.10 -> 9/12, Current week -> 0/0) and syncs across HOURS and TRIPS tabs', () => {
    render(<DriverScoreActivityScreen onBack={vi.fn()} initialTab="activity" />);

    // Switch to 24.10-30.10
    fireEvent.click(screen.getByText('24.10-30.10'));
    expect(screen.getByTestId('activity-summary-badge').textContent).toBe('9 / 12');
    expect(screen.getByTestId('day-selected-callout').textContent).toBe('9 / 12');

    // Switch to Current week -> 0 / 0
    fireEvent.click(screen.getByText('Current week'));
    expect(screen.getByTestId('activity-summary-badge').textContent).toBe('0 / 0');

    // Switch back to 10.10-16.10 and tap HOURS tab -> preserves week 30h 31m
    fireEvent.click(screen.getByText('10.10-16.10'));
    fireEvent.click(screen.getByTestId('activity-tab-hours'));
    expect(screen.getByTestId('activity-summary-badge').textContent).toBe('30h 31m');
    expect(screen.getByTestId('day-selected-callout').textContent).toBe('9h 44m');
    expect(screen.getByText(/Waiting and driving hours in Bayniks app/i)).toBeDefined();
  });

  it('renders CANCELS tab with unified bottom segmented bar and swipeable/clickable 3-slide Pro Tips carousel', () => {
    render(<DriverScoreActivityScreen onBack={vi.fn()} initialTab="activity" />);

    fireEvent.click(screen.getByTestId('activity-tab-cancels'));
    expect(screen.getByTestId('activity-cancels-view')).toBeDefined();
    expect(screen.getByText(/Reasons for past 50 cancelled trips/i)).toBeDefined();
    expect(screen.getByText(/You cancelled/i)).toBeDefined();
    expect(screen.getByText(/^16%$/i)).toBeDefined();
    expect(screen.getByText(/You did not confirm/i)).toBeDefined();
    expect(screen.getByText(/^4%$/i)).toBeDefined();
    expect(screen.getByText(/Passenger cancelled/i)).toBeDefined();
    expect(screen.getByText(/^80%$/i)).toBeDefined();
    expect(screen.getByText(/Passenger did not show/i)).toBeDefined();
    expect(screen.getByText(/^0%$/i)).toBeDefined();
    expect(screen.getByTestId('cancels-segmented-bar')).toBeDefined();

    // Pro Tips carousel (3 tips)
    expect(screen.getByText('Pro tips')).toBeDefined();
    expect(screen.getByText('Call before you cancel')).toBeDefined();

    fireEvent.click(screen.getByTestId('pro-tip-dot-1'));
    expect(screen.getByText('Drive straight to pickup')).toBeDefined();

    fireEvent.click(screen.getByTestId('pro-tip-dot-2'));
    expect(screen.getByText('Be ready to accept bookings')).toBeDefined();
  });

  it('uses black (#18181B) and atomic orange (#FF5722) theme with zero blue or green styling', () => {
    const { container } = render(<DriverScoreActivityScreen onBack={vi.fn()} initialTab="activity" />);
    const html = container.innerHTML;

    expect(html).toContain('#18181B');
    expect(html).toContain('#FF5722');
    expect(html).not.toContain('emerald-');
    expect(html).not.toContain('bg-blue-');
    expect(html).not.toContain('cyan-');
    expect(html).not.toContain('purple-');
    expect(html).not.toContain('#10B981');
  });
});
