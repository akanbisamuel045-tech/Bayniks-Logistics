import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CourierChatView } from '../components/CourierChatView';
import { ThemeProvider } from '../components/ThemeProvider';

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Stage 9: In-App Courier Real-Time Chat', () => {
  beforeEach(() => {
    mockPush.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1. renders courier header with vehicle details, rating, and voice call action', () => {
    render(
      <ThemeProvider>
        <CourierChatView
          courierName="Tariq Danladi"
          courierRating={4.95}
          courierPlate="LND-4912"
          courierVehicle="Bajaj Boxer 150cc"
          courierPhone="+2348031112233"
        />
      </ThemeProvider>
    );

    expect(screen.getByText('Tariq Danladi')).toBeDefined();
    expect(screen.getByText(/4\.95/i)).toBeDefined();
    expect(screen.getByText(/Bajaj Boxer 150cc/i)).toBeDefined();
    expect(screen.getByText('LND-4912')).toBeDefined();

    // Verify phone call action
    const callLink = screen.getByTitle('Voice Call Rider');
    expect(callLink).toBeDefined();
    expect(callLink.getAttribute('href')).toBe('tel:+2348031112233');
  });

  it('2. displays pinned waybill context bar with ID and 4-digit handover PIN', () => {
    render(
      <ThemeProvider>
        <CourierChatView waybillId="BYN-LGS-847291" handoverPin="4829" />
      </ThemeProvider>
    );

    expect(screen.getByText('#BYN-LGS-847291')).toBeDefined();
    expect(screen.getByText('PIN: 4829')).toBeDefined();
    expect(screen.getByText(/En Route to Victoria Island • ETA ~12 mins/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Live Radar/i })).toBeDefined();
  });

  it('3. renders default conversation thread between courier and customer', () => {
    render(
      <ThemeProvider>
        <CourierChatView />
      </ThemeProvider>
    );

    // Initial messages from DEFAULT_MESSAGES
    expect(
      screen.getByText(/Hello! I have picked up your package at Sabo Yaba Hub/i)
    ).toBeDefined();
    expect(
      screen.getByText(/Please be mindful that the parcel contains fragile prototype electronics/i)
    ).toBeDefined();
    expect(
      screen.getByText(/safely secured in the padded rear cargo trunk/i)
    ).toBeDefined();
  });

  it('4. allows customer to type and send a new message, updating thread', () => {
    render(
      <ThemeProvider>
        <CourierChatView courierName="Tariq Danladi" />
      </ThemeProvider>
    );

    const input = screen.getByPlaceholderText(/Message Tariq Danladi\.\.\./i);
    const sendButton = screen.getByRole('button', { name: /Send message/i });

    // Send button disabled initially with empty text
    expect(sendButton.hasAttribute('disabled')).toBe(true);

    // Type a message
    fireEvent.change(input, { target: { value: 'I have arrived at the reception lobby' } });
    expect(sendButton.hasAttribute('disabled')).toBe(false);

    // Send
    fireEvent.click(sendButton);

    // Message appears immediately in thread
    expect(screen.getByText('I have arrived at the reception lobby')).toBeDefined();
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('5. triggers simulated typing indicator and rider response after customer message', () => {
    render(
      <ThemeProvider>
        <CourierChatView courierName="Tariq Danladi" />
      </ThemeProvider>
    );

    const input = screen.getByPlaceholderText(/Message Tariq Danladi\.\.\./i);
    fireEvent.change(input, { target: { value: 'Is there heavy traffic on the bridge?' } });
    fireEvent.submit(input.closest('form')!);

    expect(screen.getByText('Is there heavy traffic on the bridge?')).toBeDefined();

    // Advance 600ms for typing indicator to start
    act(() => {
      vi.advanceTimersByTime(650);
    });
    expect(screen.getByText(/Tariq Danladi is typing\.\.\./i)).toBeDefined();

    // Advance 1400ms for rider reply to arrive
    act(() => {
      vi.advanceTimersByTime(1450);
    });
    expect(screen.queryByText(/Tariq Danladi is typing\.\.\./i)).toBeNull();
    expect(
      screen.getByText(/Understood! Arriving shortly\. Please have the 4-digit handover PIN ready\./i)
    ).toBeDefined();
  });

  it('6. handles quick reply chips to swiftly send canned responses', () => {
    render(
      <ThemeProvider>
        <CourierChatView />
      </ThemeProvider>
    );

    const gateBtn = screen.getByRole('button', { name: /At main gate/i });
    fireEvent.click(gateBtn);

    expect(screen.getByText('I am waiting at the main entrance gate')).toBeDefined();

    const securityBtn = screen.getByRole('button', { name: /Leave at security/i });
    fireEvent.click(securityBtn);

    expect(screen.getByText('You can leave parcel with building security desk')).toBeDefined();
  });

  it('7. shares GPS location destination pin inside conversation', () => {
    render(
      <ThemeProvider>
        <CourierChatView />
      </ThemeProvider>
    );

    const shareGpsBtn = screen.getByRole('button', { name: /Share GPS Pin/i });
    fireEvent.click(shareGpsBtn);

    // Toast notification appears
    expect(screen.getByText(/GPS coordinate pin shared with rider/i)).toBeDefined();

    // Shared GPS Card in thread
    expect(screen.getByText('Victoria Island Towers')).toBeDefined();
    expect(screen.getByText('Plot 4, Adeola Odeku Street, Victoria Island')).toBeDefined();
    expect(screen.getByText(/6\.4281° N, 3\.4219° E/i)).toBeDefined();
  });

  it('8. triggers back button and Live Radar map navigation', () => {
    const onBackMock = vi.fn();
    const onMapMock = vi.fn();

    const { rerender } = render(
      <ThemeProvider>
        <CourierChatView onBackClick={onBackMock} onOpenLiveMap={onMapMock} />
      </ThemeProvider>
    );

    // Back click
    const backBtn = screen.getByRole('button', { name: /Back to deliveries/i });
    fireEvent.click(backBtn);
    expect(onBackMock).toHaveBeenCalledTimes(1);

    // Radar click
    const radarBtn = screen.getByRole('button', { name: /Live Radar/i });
    fireEvent.click(radarBtn);
    expect(onMapMock).toHaveBeenCalledTimes(1);

    // Without custom props, router.push is called
    rerender(
      <ThemeProvider>
        <CourierChatView waybillId="BYN-LGS-847291" />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Back to deliveries/i }));
    expect(mockPush).toHaveBeenCalledWith('/deliveries');

    fireEvent.click(screen.getByRole('button', { name: /Live Radar/i }));
    expect(mockPush).toHaveBeenCalledWith('/track/BYN-LGS-847291');
  });
});
