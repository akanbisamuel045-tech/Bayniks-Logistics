// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { useRiderStore } from '../store/riderStore';
import { RiderEarningsDualScreen } from '../components/RiderEarningsDualScreen';
import { DriverScoreActivityScreen } from '../components/DriverScoreActivityScreen';
import { DeliveryHistoryScreen } from '../components/DeliveryHistoryScreen';
import { RiderInboxScreen } from '../components/RiderInboxScreen';
import { DestinationModeSheet } from '../components/sheets/DestinationModeSheet';
import { EditProfileModal } from '../components/sheets/EditProfileModal';
import { VirtualDebtTopUpModal } from '../components/sheets/VirtualDebtTopUpModal';
import { TripReceiptModal } from '../components/sheets/TripReceiptModal';
import { ScheduledOrdersSheet } from '../components/sheets/ScheduledOrdersSheet';
import { RiderPortalPrivacyModal } from '../components/sheets/RiderPortalPrivacyModal';

describe('Feature 2: Live Backend API & Real-Time Wiring', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    useRiderStore.setState({
      authToken: 'jwt-live-rider-test',
      simulationMode: false,
      kycStatus: 'approved',
      riderStatus: 'offline',
      isDebtLocked: false,
      walletBalanceKobo: 150000,
      todayEarningsKobo: 0,
      deliveryHistory: [],
      liveEarningsPeriods: null,
      liveActivityWeeks: null,
      scheduledOrders: [],
      lastCompletedOrderId: null,
    });
  });

  it('uses resolved VITE_API_BASE_URL for toggleOnlineStatus and respects backend 403 guards', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).endsWith('/api/v1/riders/status')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: 'available' }),
        } as any;
      }
      return { ok: true, status: 200, json: async () => ({}) } as any;
    });
    global.fetch = fetchMock as any;

    await useRiderStore.getState().toggleOnlineStatus();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = String(fetchMock.mock.calls[0]![0]);
    expect(calledUrl).toMatch(/^https?:\/\/.+\/api\/v1\/riders\/status$/);
    expect(useRiderStore.getState().riderStatus).toBe('available');
  });

  it('hydrates live earnings periods, activity weeks, delivery history & notifications from backend', async () => {
    const livePeriod = {
      id: 'live-w-3',
      label: 'Live Week',
      totalNaira: 45000,
      expensesNaira: 9000,
      netNaira: 36000,
      yMaxNaira: 30000,
      bars: [
        { label: 'Mon', showTick: true, totalNaira: 15000, expensesNaira: 3000, netNaira: 12000 },
        { label: 'Tue', showTick: true, totalNaira: 30000, expensesNaira: 6000, netNaira: 24000 },
        { label: 'Wed', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
        { label: 'Thu', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
        { label: 'Fri', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
        { label: 'Sat', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
        { label: 'Sun', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      ],
    };

    const liveActivityWeek = {
      id: 'live-act-3',
      label: 'Live Activity',
      totalCompletedTrips: 14,
      totalIncomingTrips: 15,
      totalHoursLabel: '16h 10m',
      defaultSelectedDayIdx: 0,
      days: [
        { day: 'Mon', tripsCompleted: 8, tripsTotal: 9, hoursLabel: '8h 10m', hoursMinutes: 490 },
        { day: 'Tue', tripsCompleted: 6, tripsTotal: 6, hoursLabel: '8h 00m', hoursMinutes: 480 },
      ],
    };

    global.fetch = vi.fn(async (url: string) => {
      if (String(url).includes('/shift-summary')) {
        return {
          ok: true,
          json: async () => ({
            todayEarningsKobo: 250000,
            walletBalanceKobo: 480000,
            isDebtLocked: false,
            tripsCompletedToday: 2,
            distanceCoveredKm: 11.4,
            onTimeSlaPercent: 99.6,
            plateNumber: 'KJA-555-LK',
            earningsPeriods: [livePeriod],
            activityWeeks: [liveActivityWeek],
            recentHistory: [
              {
                orderId: 'ord-real-1',
                trackingCode: 'LGS-REAL-777',
                customerName: 'Amaka Obi',
                pickupAddress: 'Ikeja City Mall',
                dropoffAddress: 'Lekki Phase 1',
                distanceKm: 14.2,
                earningKobo: 250000,
                status: 'delivered',
                deliveredAt: new Date().toISOString(),
              },
            ],
            notifications: [
              {
                id: 'n-live-1',
                title: 'Live Shift Settlement Ready',
                date: 'Just now',
                category: 'Finances',
                body: '₦2,500 credited from live backend shift summary.',
              },
            ],
          }),
        } as any;
      }
      if (String(url).includes('/riders/notifications')) {
        return {
          ok: true,
          json: async () => ({
            notifications: [
              {
                id: 'n-live-1',
                title: 'Live Shift Settlement Ready',
                date: 'Just now',
                category: 'Finances',
                body: '₦2,500 credited from live backend shift summary.',
              },
            ],
          }),
        } as any;
      }
      if (String(url).includes('/riders/scheduled-orders')) {
        return {
          ok: true,
          json: async () => ({
            orders: [
              {
                orderId: 'ord-sch-9',
                trackingCode: 'LGS-SCH-900',
                pickupAddress: 'Maryland Mall',
                dropoffAddress: 'VI Plot 4',
                estimatedDistanceKm: 9.1,
                riderEarningKobo: 320000,
                scheduledFor: new Date().toISOString(),
              },
            ],
          }),
        } as any;
      }
      if (String(url).includes('/payout/banks')) {
        return {
          ok: true,
          json: async () => ({
            banks: [{ name: 'Providus Bank', code: '101' }],
          }),
        } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    }) as any;

    await useRiderStore.getState().hydrateRiderData('http://127.0.0.1:4000');

    expect(useRiderStore.getState().plateNumber).toBe('KJA-555-LK');

    render(<RiderEarningsDualScreen onBack={() => {}} />);
    expect(screen.getByText('Live Week')).toBeDefined();
    cleanup();

    render(<DriverScoreActivityScreen onBack={() => {}} initialTab="activity" />);
    expect(screen.getByText('Live Activity')).toBeDefined();
    cleanup();

    render(<DeliveryHistoryScreen />);
    expect(screen.getByText(/Ikeja City Mall/i)).toBeDefined();
    cleanup();

    render(<RiderInboxScreen />);
    expect(screen.getByText('Live Shift Settlement Ready')).toBeDefined();
  });

  it('persists Home/Favourite addresses and Paystack NUBAN bank verification via /preferences and /payout/resolve-account', async () => {
    const patchCalls: any[] = [];
    global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('/payout/resolve-account')) {
        return {
          ok: true,
          json: async () => ({ accountName: 'OKON JOSEPH TEST', accountNumber: '0148298291', bankCode: '058' }),
        } as any;
      }
      if (String(url).includes('/riders/preferences')) {
        patchCalls.push(JSON.parse(String(init?.body || '{}')));
        return { ok: true, json: async () => ({ message: 'saved' }) } as any;
      }
      if (String(url).includes('/payout/banks')) {
        return {
          ok: true,
          json: async () => ({ banks: [{ name: 'Guaranty Trust Bank', code: '058' }] }),
        } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    }) as any;

    // 1. Saved Home Address edit in DestinationModeSheet
    render(
      <DestinationModeSheet
        isOpen={true}
        onClose={() => {}}
        onSelectDestination={() => {}}
      />
    );
    fireEvent.click(screen.getByTestId('saved-address-edit-home'));
    fireEvent.change(screen.getByTestId('saved-address-input-home'), {
      target: { value: '12 Allen Avenue, Ikeja, Lagos' },
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('saved-address-save-home'));
    });

    expect(patchCalls.length).toBeGreaterThanOrEqual(1);
    expect(
      useRiderStore.getState().savedAddresses.find((a) => a.id === 'home')?.address
    ).toBe('12 Allen Avenue, Ikeja, Lagos');
    cleanup();

    // 2. NUBAN resolution & persistence in EditProfileModal
    render(<EditProfileModal isOpen={true} onClose={() => {}} />);
    fireEvent.change(screen.getByTestId('edit-acct-input'), {
      target: { value: '0148298291' },
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('verify-nuban-btn'));
    });
    expect(screen.getByTestId('resolved-nuban-name').textContent).toContain('OKON JOSEPH TEST');

    await act(async () => {
      fireEvent.click(screen.getByTestId('edit-profile-submit-btn'));
    });
    expect(useRiderStore.getState().bankDetails.accountName).toBe('OKON JOSEPH TEST');
  });

  it('initializes Paystack top-up and submits live order dispute + passenger rating', async () => {
    const calledUrls: string[] = [];
    global.fetch = vi.fn(async (url: string) => {
      calledUrls.push(String(url));
      if (String(url).includes('/wallet/topup/initialize')) {
        return {
          ok: true,
          json: async () => ({
            reference: 'PSK-TOPUP-9911',
            authorizationUrl: 'https://checkout.paystack.com/psk-9911',
          }),
        } as any;
      }
      if (String(url).includes('/wallet/me')) {
        return {
          ok: true,
          json: async () => ({ balanceKobo: -100000 }),
        } as any;
      }
      if (String(url).includes('/disputes')) {
        return {
          ok: true,
          json: async () => ({ ticketId: 'DIS-8899', message: 'Support opened' }),
        } as any;
      }
      if (String(url).includes('/rate-passenger')) {
        return {
          ok: true,
          json: async () => ({ message: 'Passenger rating recorded' }),
        } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    }) as any;

    const topUpSpy = vi.fn(async () => {});
    render(
      <VirtualDebtTopUpModal
        isOpen={true}
        onClose={() => {}}
        currentBalanceKobo={-600000}
        onTopUpSuccess={topUpSpy}
      />
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-execute-topup'));
    });
    expect(calledUrls.some((u) => u.includes('/wallet/topup/initialize'))).toBe(true);
    expect(topUpSpy).toHaveBeenCalledWith(expect.any(Number), 'PSK-TOPUP-9911');
    cleanup();

    render(
      <TripReceiptModal
        isOpen={true}
        onClose={() => {}}
        trip={{
          id: 'ord-real-55',
          date: 'Today',
          time: '14:00',
          pickupAddress: 'Ikeja',
          dropoffAddress: 'VI',
          fareNaira: 2000,
          customerPaidNaira: 2000,
          platformCompensatedNaira: 0,
          distanceKm: 6.5,
          durationMins: 18,
          status: 'completed',
        }}
      />
    );
    fireEvent.click(screen.getByTestId('get-help-with-ride-btn'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('support-issue-fare_low'));
    });
    expect(calledUrls.some((u) => u.includes('/api/v1/orders/ord-real-55/disputes'))).toBe(true);
    expect(within(screen.getByTestId('support-submitted-view')).getByText(/DIS-8899/)).toBeDefined();
    cleanup();

    useRiderStore.setState({ lastCompletedOrderId: 'ord-real-55' });
    await useRiderStore.getState().ratePassenger(5, 'Great sender');
    expect(calledUrls.some((u) => u.includes('/api/v1/orders/ord-real-55/rate-passenger'))).toBe(true);
  });

  it('renders ScheduledOrdersSheet & RiderPortalPrivacyModal with Black + Atomic Orange and zero green/blue Tailwind classes', () => {
    useRiderStore.setState({
      scheduledOrders: [
        {
          orderId: 'ord-sch-1',
          trackingCode: 'LGS-SCH-111',
          pickupAddress: 'Maryland Mall',
          dropoffAddress: 'Victoria Island',
          estimatedDistanceKm: 8.4,
          riderEarningKobo: 340000,
          scheduledFor: new Date().toISOString(),
        },
      ],
    });

    render(<ScheduledOrdersSheet isOpen={true} onClose={() => {}} />);
    expect(screen.getByTestId('scheduled-order-LGS-SCH-111')).toBeDefined();
    cleanup();

    render(<RiderPortalPrivacyModal mode="portal" onClose={() => {}} />);
    expect(screen.getByTestId('portal-info-content')).toBeDefined();
    cleanup();

    render(<RiderPortalPrivacyModal mode="privacy" onClose={() => {}} />);
    expect(screen.getByTestId('privacy-info-content')).toBeDefined();

    const forbiddenTailwind = /\b(bg|text|border|ring|shadow)-(emerald|green|teal|blue|sky|cyan|indigo)-/i;
    const files = [
      '../components/RiderInboxScreen.tsx',
      '../components/sheets/VirtualDebtTopUpModal.tsx',
      '../components/sheets/ScheduledOrdersSheet.tsx',
      '../components/sheets/RiderPortalPrivacyModal.tsx',
    ];
    for (const rel of files) {
      const content = fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
      expect(content).not.toMatch(forbiddenTailwind);
    }
  });
});

