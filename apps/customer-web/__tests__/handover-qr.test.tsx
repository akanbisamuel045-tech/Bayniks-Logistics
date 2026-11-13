import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HandoverQrView } from '../components/HandoverQrView';
import { QrHandoverModal } from '../components/QrHandoverModal';
import { ThemeProvider } from '../components/ThemeProvider';

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Stage 11: Contactless Handover Pass & QR Scanner Suite', () => {
  beforeEach(() => {
    mockPush.mockClear();
    vi.clearAllMocks();
  });

  describe('1. HandoverQrView Component — Scanner Mode', () => {
    it('renders camera viewfinder HUD with corner brackets, sweeping laser, and lookup controls', () => {
      render(
        <ThemeProvider>
          <HandoverQrView initialMode="scan" />
        </ThemeProvider>
      );

      expect(screen.getByText(/Scan Waybill/i)).toBeDefined();
      expect(screen.getByText(/My Pass/i)).toBeDefined();
      expect(screen.getByText(/Align Barcode/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /Simulate Scan/i })).toBeDefined();
      expect(screen.getByPlaceholderText(/Or enter waybill ID/i)).toBeDefined();
    });

    it('toggles flashlight / torch state and renders active banner', () => {
      render(
        <ThemeProvider>
          <HandoverQrView initialMode="scan" />
        </ThemeProvider>
      );

      const torchBtn = screen.getByRole('button', { name: /Toggle Flashlight/i });
      expect(screen.queryByText(/FLASHLIGHT ACTIVE/i)).toBeNull();

      fireEvent.click(torchBtn);
      expect(screen.getByText(/FLASHLIGHT ACTIVE/i)).toBeDefined();

      fireEvent.click(torchBtn);
      expect(screen.queryByText(/FLASHLIGHT ACTIVE/i)).toBeNull();
    });

    it('toggles camera facing mode with user feedback toast', () => {
      render(
        <ThemeProvider>
          <HandoverQrView initialMode="scan" />
        </ThemeProvider>
      );

      const flipBtn = screen.getByRole('button', { name: /Flip Camera/i });
      fireEvent.click(flipBtn);

      expect(screen.getByText(/Camera switched to Front/i)).toBeDefined();
    });

    it('simulates barcode detection and displays detected order bottom drawer', () => {
      const onScanMock = vi.fn();

      render(
        <ThemeProvider>
          <HandoverQrView
            initialMode="scan"
            waybillId="BYN-LGS-847291"
            courierName="Tariq Danladi"
            onScanSuccess={onScanMock}
          />
        </ThemeProvider>
      );

      const simBtn = screen.getByRole('button', { name: /Simulate Scan/i });
      fireEvent.click(simBtn);

      expect(onScanMock).toHaveBeenCalledWith('BYN-LGS-847291');
      expect(screen.getByText('#BYN-LGS-847291')).toBeDefined();
      expect(screen.getByText(/Tariq Danladi/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /View Live Tracking Map/i })).toBeDefined();

      // Click navigate to map
      fireEvent.click(screen.getByRole('button', { name: /View Live Tracking Map/i }));
      expect(mockPush).toHaveBeenCalledWith('/deliveries');
    });

    it('submits manual waybill lookup and opens detected order drawer', () => {
      const onScanMock = vi.fn();

      render(
        <ThemeProvider>
          <HandoverQrView initialMode="scan" onScanSuccess={onScanMock} />
        </ThemeProvider>
      );

      const input = screen.getByLabelText(/Manual Waybill Input/i);
      const submitBtn = screen.getByRole('button', { name: /Lookup/i });

      fireEvent.change(input, { target: { value: 'BYN-LGS-554433' } });
      fireEvent.click(submitBtn);

      expect(onScanMock).toHaveBeenCalledWith('#BYN-LGS-554433');
      expect(screen.getByText('#BYN-LGS-554433')).toBeDefined();
    });
  });

  describe('2. HandoverQrView Component — My Pass Mode', () => {
    it('renders Contactless Handover Pass with scannable QR SVG and 4-digit PIN', () => {
      render(
        <ThemeProvider>
          <HandoverQrView
            initialMode="pass"
            waybillId="BYN-LGS-847291"
            handoverPin="4829"
          />
        </ThemeProvider>
      );

      expect(screen.getByText(/Contactless Handover Pass/i)).toBeDefined();
      expect(screen.getByRole('img', { name: /QR Code for Waybill BYN-LGS-847291/i })).toBeDefined();
      expect(screen.getByText('#BYN-LGS-847291')).toBeDefined();
      expect(screen.getByText('4829')).toBeDefined();
    });

    it('copies handover PIN to clipboard with toast confirmation', () => {
      const writeTextMock = vi.fn();
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(
        <ThemeProvider>
          <HandoverQrView initialMode="pass" handoverPin="4829" />
        </ThemeProvider>
      );

      const copyBtn = screen.getByRole('button', { name: /Copy PIN/i });
      fireEvent.click(copyBtn);

      expect(writeTextMock).toHaveBeenCalledWith('4829');
      expect(screen.getByText(/Handover PIN 4829 copied to clipboard/i)).toBeDefined();
    });

    it('triggers 1-Tap WhatsApp share with encoded waybill and handover PIN', () => {
      const openMock = vi.fn();
      window.open = openMock;

      render(
        <ThemeProvider>
          <HandoverQrView
            initialMode="pass"
            waybillId="BYN-LGS-847291"
            handoverPin="4829"
          />
        </ThemeProvider>
      );

      const whatsappBtn = screen.getByRole('button', { name: /Send Pass to Rider via WhatsApp/i });
      fireEvent.click(whatsappBtn);

      expect(openMock).toHaveBeenCalledTimes(1);
      const url = openMock.mock.calls[0]![0] as string;
      expect(url).toContain('https://api.whatsapp.com/send?text=');
      expect(decodeURIComponent(url)).toContain('Waybill: #BYN-LGS-847291');
      expect(decodeURIComponent(url)).toContain('Handover Release PIN: *4829*');
    });
  });

  describe('3. QrHandoverModal Wrapper Component', () => {
    it('renders modal when isOpen is true and dismisses on close button', () => {
      const onCloseMock = vi.fn();

      const { rerender } = render(
        <ThemeProvider>
          <QrHandoverModal
            isOpen={true}
            onClose={onCloseMock}
            activeOrder={{ trackingCode: 'BYN-LGS-112233', deliveryPin: '9988' }}
          />
        </ThemeProvider>
      );

      expect(screen.getByText('#BYN-LGS-112233')).toBeDefined();
      expect(screen.getByText('9988')).toBeDefined();

      const backBtn = screen.getByRole('button', { name: /Back to dashboard/i });
      fireEvent.click(backBtn);
      expect(onCloseMock).toHaveBeenCalledTimes(1);

      // Closes when isOpen is false
      rerender(
        <ThemeProvider>
          <QrHandoverModal isOpen={false} onClose={onCloseMock} />
        </ThemeProvider>
      );
      expect(screen.queryByText('#BYN-LGS-112233')).toBeNull();
    });
  });
});

