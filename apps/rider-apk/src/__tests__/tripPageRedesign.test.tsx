// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { DeliveryHistoryScreen } from '../components/DeliveryHistoryScreen';
import { useRiderStore } from '../store/riderStore';

vi.mock('../utils/audioChimes', () => ({
  playKeypadChime: vi.fn(),
  playSuccessChime: vi.fn(),
  playAlertChime: vi.fn(),
}));

describe('Trip Page Redesign (Video-Matched Ride history -> Trip Detail -> Support)', () => {
  afterEach(() => {
    cleanup();
  });
  beforeEach(() => {
    act(() => {
      useRiderStore.setState({
        deliveryHistory: [],
        toastMessage: null,
      });
    });
  });

  it('renders Ride history header, Warri sample rides, finished prices, and omits fare for cancelled trips', () => {
    render(<DeliveryHistoryScreen />);

    expect(screen.getByText('Ride history')).toBeDefined();
    expect(screen.getByText('1 Airport Road, Warri 330102')).toBeDefined();
    expect(screen.getByText('₦600')).toBeDefined();
    expect(screen.getAllByText('Journey finished').length).toBeGreaterThan(0);

    const cancelledRow = screen.getByTestId('ride-row-TRIP-884911');
    expect(cancelledRow.textContent).toContain('Orhuwhorun Road, Ovwian 330103');
    expect(cancelledRow.textContent).toContain('Passenger cancelled');
    expect(cancelledRow.textContent).not.toContain('₦');
  });

  it('opens full-screen Trip Detail with pickup/dropoff times, map preview, cash breakdown, and metrics', () => {
    render(<DeliveryHistoryScreen />);

    fireEvent.click(screen.getByTestId('ride-row-TRIP-884920'));

    const modal = screen.getByTestId('trip-receipt-modal');
    expect(modal).toBeDefined();
    expect(within(modal).getByText('24 Oct, 19:12')).toBeDefined();
    expect(within(modal).getByText('1 Airport Road, Warri 330102')).toBeDefined();
    expect(within(modal).getByText('5 Westend Road')).toBeDefined();
    expect(within(modal).getByText('19:19')).toBeDefined();
    expect(within(modal).getByTestId('trip-detail-map')).toBeDefined();
    expect(within(modal).getByText('Cash payment')).toBeDefined();
    expect(within(modal).getByText('Customer paid')).toBeDefined();
    expect(within(modal).getByText('₦400')).toBeDefined();
    expect(within(modal).getByText('Compensated by Bayniks')).toBeDefined();
    expect(within(modal).getByText('₦200')).toBeDefined();
    expect(within(modal).getByText('2.9km')).toBeDefined();
    expect(within(modal).getByText('7 min')).toBeDefined();

    fireEvent.click(screen.getByTestId('trip-detail-back-btn'));
    expect(screen.queryByTestId('trip-receipt-modal')).toBeNull();
  });

  it('navigates Support -> Ride issues -> Get help with something else using Bayniks branding', () => {
    render(<DeliveryHistoryScreen />);

    fireEvent.click(screen.getByTestId('ride-row-TRIP-884920'));
    fireEvent.click(screen.getByTestId('get-help-with-ride-btn'));

    expect(screen.getByTestId('support-ride-issues')).toBeDefined();
    expect(screen.getByText('Passenger did not pay or paid less')).toBeDefined();
    expect(screen.getByText('Price lower than expected')).toBeDefined();
    expect(screen.getByText("I have a complaint about passenger's behaviour")).toBeDefined();
    expect(screen.getByText('Passenger left an item in a vehicle')).toBeDefined();
    expect(screen.getByText('I have issues with my balance')).toBeDefined();
    expect(screen.getByText('My Bayniks Driver app crashed')).toBeDefined();

    fireEvent.click(screen.getByTestId('support-issue-other'));
    expect(screen.getByTestId('support-other-help')).toBeDefined();
    expect(screen.getByText('Get help with something else')).toBeDefined();
    expect(screen.getByText('Account')).toBeDefined();
    expect(screen.getByText('Earnings and payments')).toBeDefined();
    expect(screen.getByText('Trip issues')).toBeDefined();
    expect(screen.getByText('Using Bayniks app')).toBeDefined();
    expect(screen.getByText('Driving with Bayniks')).toBeDefined();
    expect(screen.getByText('Driver and vehicle requirements')).toBeDefined();
    expect(screen.getByText('About Bayniks')).toBeDefined();
    expect(screen.queryByText(/Bolt/i)).toBeNull();

    // Navigate back to Ride issues and submit an issue
    fireEvent.click(screen.getByTestId('support-back-issues-btn'));
    expect(screen.getByTestId('support-ride-issues')).toBeDefined();

    fireEvent.click(screen.getByTestId('support-issue-underpaid'));
    expect(screen.getByTestId('support-submitted-view')).toBeDefined();
    expect(useRiderStore.getState().toastMessage).toContain('Passenger did not pay or paid less');
  });

  it('uses strict Black (#18181B) and Atomic Orange (#FF5722) palette with zero green/blue utility classes', () => {
    const historySrc = fs.readFileSync(
      path.resolve(__dirname, '../components/DeliveryHistoryScreen.tsx'),
      'utf8'
    );
    const receiptSrc = fs.readFileSync(
      path.resolve(__dirname, '../components/sheets/TripReceiptModal.tsx'),
      'utf8'
    );

    const forbiddenColorRegex = /\b(bg|text|border|ring)-(emerald|green|teal|blue|sky|cyan|indigo)-/i;
    expect(historySrc).not.toMatch(forbiddenColorRegex);
    expect(receiptSrc).not.toMatch(forbiddenColorRegex);
    expect(historySrc).toContain('#18181B');
    expect(historySrc).toContain('#FF5722');
    expect(receiptSrc).toContain('#18181B');
    expect(receiptSrc).toContain('#FF5722');
  });
});

