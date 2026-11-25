// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { RiderEarningsDualScreen } from '../components/RiderEarningsDualScreen';
import { useRiderStore } from '../store/riderStore';

describe('RiderEarningsDualScreen (Video-Exact Layout + Black & Atomic Orange Theme)', () => {
  beforeEach(() => {
    useRiderStore.setState({
      walletBalanceKobo: 37900, // ₦379
      todayEarningsKobo: 450000, // ₦4,500
      toastMessage: null,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders top header, horizontal period carousel, stacked black+orange chart, summary rows, and bottom Earnings|Balances tabs', () => {
    render(
      <RiderEarningsDualScreen
        onBack={vi.fn()}
        onOpenCashout={vi.fn()}
        onOpenHistory={vi.fn()}
      />
    );

    expect(screen.getByTestId('rider-earnings-dual-screen')).toBeDefined();
    expect(screen.getByTestId('earnings-back-btn')).toBeDefined();
    expect(screen.getByTestId('earnings-calendar-btn')).toBeDefined();
    expect(screen.getByTestId('period-selector-strip')).toBeDefined();
    expect(screen.getByTestId('earnings-bottom-tabs')).toBeDefined();
    expect(screen.getByTestId('tab-btn-earnings')).toBeDefined();
    expect(screen.getByTestId('tab-btn-balances')).toBeDefined();

    // Weekly default shows Last week (₦15,300)
    expect(screen.getByTestId('earnings-hero-total').textContent).toBe('₦15,300');
    expect(screen.getByText(/Expenses: ₦2,921/i)).toBeDefined();
    expect(screen.getByText(/NET: ₦12,379/i)).toBeDefined();
    expect(screen.getByText(/^Net earnings$/i)).toBeDefined();
  });

  it('switches weekly date ranges and expands Earnings & Expenses breakdown rows', () => {
    render(<RiderEarningsDualScreen onBack={vi.fn()} />);

    fireEvent.click(screen.getByText('10-03 - 10-09'));
    expect(screen.getByTestId('earnings-hero-total').textContent).toBe('₦64,600');
    expect(screen.getByText(/Expenses: ₦11,822/i)).toBeDefined();
    expect(screen.getByText(/NET: ₦52,778/i)).toBeDefined();

    // Expand Earnings accordion row
    fireEvent.click(screen.getByRole('button', { name: /Earnings.*₦64,600/i }));
    expect(screen.getByText(/Trip fares/i)).toBeDefined();
    expect(screen.getByText(/Tips & surge adjustments/i)).toBeDefined();

    // Expand Expenses accordion row
    fireEvent.click(screen.getByRole('button', { name: /Expenses.*₦11,822/i }));
    expect(screen.getByText(/Bayniks platform fee/i)).toBeDefined();
  });

  it('opens Time range modal via Calendar button and switches between Daily, Weekly, and Monthly', () => {
    render(<RiderEarningsDualScreen onBack={vi.fn()} />);

    // Open Time range sheet
    fireEvent.click(screen.getByTestId('earnings-calendar-btn'));
    expect(screen.getByTestId('time-range-modal')).toBeDefined();
    expect(screen.getByText('Time range')).toBeDefined();

    // Switch to Monthly
    fireEvent.click(screen.getByTestId('time-range-option-monthly'));
    expect(screen.queryByTestId('time-range-modal')).toBeNull();
    expect(screen.getByTestId('earnings-hero-total').textContent).toBe('₦111,200');

    // Select May month period (₦346,850 matching video frame)
    fireEvent.click(screen.getByText('05-01 - 05-31'));
    expect(screen.getByTestId('earnings-hero-total').textContent).toBe('₦346,850');
    expect(screen.getByText(/Expenses: ₦72,740/i)).toBeDefined();
    expect(screen.getByText(/NET: ₦274,110/i)).toBeDefined();

    // Switch to Daily -> Today reflects live store todayEarningsKobo (₦4,500)
    fireEvent.click(screen.getByTestId('earnings-calendar-btn'));
    fireEvent.click(screen.getByTestId('time-range-option-daily'));
    expect(screen.getByTestId('earnings-hero-total').textContent).toBe('₦4,500');
  });

  it('switches to Balances tab, renders balance movement ledger, and enforces cashout minimum threshold', () => {
    const handleCashout = vi.fn();
    const handleHistory = vi.fn();

    render(
      <RiderEarningsDualScreen
        onBack={vi.fn()}
        onOpenCashout={handleCashout}
        onOpenHistory={handleHistory}
      />
    );

    // Click Balances bottom tab
    fireEvent.click(screen.getByTestId('tab-btn-balances'));
    expect(screen.getByTestId('balances-tab-view')).toBeDefined();
    expect(screen.getByTestId('balances-hero-amount').textContent).toBe('₦379');
    expect(screen.getByText(/Next weekly payout: 7 November/i)).toBeDefined();
    expect(screen.getByText(/Minimum balance to request Cashout is ₦1,015/i)).toBeDefined();
    expect(screen.getByText(/^Balance movement$/i)).toBeDefined();
    expect(screen.getByText(/^Starting balance$/i)).toBeDefined();
    expect(screen.getByText(/^Change in balance$/i)).toBeDefined();
    expect(screen.getByText(/^Ending balance$/i)).toBeDefined();
    expect(screen.getByText(/^Bayniks owes you$/i)).toBeDefined();

    // Clicking Early cashout when ₦379 < ₦1,015 shows toast and does not trigger cashout
    const cashoutBtn = screen.getByTestId('early-cashout-btn');
    expect(cashoutBtn.className).toContain('bg-[#18181B]');
    fireEvent.click(cashoutBtn);
    expect(handleCashout).not.toHaveBeenCalled();
    expect(useRiderStore.getState().toastMessage).toContain('₦1,015');

    // View transaction history link
    fireEvent.click(screen.getByText(/View transaction history/i));
    expect(handleHistory).toHaveBeenCalledTimes(1);

    // Increase balance above ₦1,015 and verify cashout proceeds
    act(() => {
      useRiderStore.setState({ walletBalanceKobo: 250000 }); // ₦2,500
    });
    fireEvent.click(screen.getByTestId('early-cashout-btn'));
    expect(handleCashout).toHaveBeenCalledTimes(1);
  });

  it('uses black and atomic orange palette without blue or emerald chart/button classes', () => {
    const { container } = render(<RiderEarningsDualScreen onBack={vi.fn()} />);
    const html = container.innerHTML;

    expect(html).toContain('#18181B');
    expect(html).toContain('#FF5722');
    expect(html).not.toContain('emerald-');
    expect(html).not.toContain('bg-blue-');
    expect(html).not.toContain('#2563EB');
    expect(html).not.toContain('#93C5FD');
  });
});
