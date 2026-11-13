import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShipmentHistoryView } from '../components/ShipmentHistoryView';
import { ThemeProvider } from '../components/ThemeProvider';

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Stage 14: Shipment History Archive & Search Suite', () => {
  beforeEach(() => {
    mockPush.mockClear();
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  describe('1. ShipmentHistoryView Component Rendering & Structure', () => {
    it('renders header, delivery counter, and shipment cards with verified Nigerian landmarks', () => {
      render(
        <ThemeProvider>
          <ShipmentHistoryView />
        </ThemeProvider>
      );

      expect(screen.getByRole('heading', { name: /Delivery Archive/i })).toBeDefined();
      expect(screen.getByText(/3 Completed • 6 Total/i)).toBeDefined();
      expect(screen.getByText(/#BYN-LGS-473215/i)).toBeDefined();
      expect(screen.getByText(/Business Legal Documents & Contracts/i)).toBeDefined();
      expect(screen.getAllByText(/Landmark: Opposite Ozone Cinemas, Yaba/i).length).toBe(2);
      expect(screen.getByText(/Landmark: Beside Zenith Bank Head Office/i)).toBeDefined();
      expect(screen.getByText(/^IN TRANSIT$/)).toBeDefined();
    });

    it('renders live fare in Integer Kobo formatted as Naira', () => {
      render(
        <ThemeProvider>
          <ShipmentHistoryView />
        </ThemeProvider>
      );

      // 450000 kobo => ₦4,500.00
      expect(screen.getByText(/₦4,500.00/i)).toBeDefined();
      // 850000 kobo => ₦8,500.00
      expect(screen.getByText(/₦8,500.00/i)).toBeDefined();
    });

    it('filters shipments by status tabs (Delivered, In Transit, Cancelled)', () => {
      render(
        <ThemeProvider>
          <ShipmentHistoryView />
        </ThemeProvider>
      );

      // Filter by Delivered
      const deliveredBtn = screen.getByRole('button', { name: /^Delivered/i });
      fireEvent.click(deliveredBtn);

      expect(screen.getByText(/#BYN-LGS-882410/i)).toBeDefined();
      expect(screen.getByText(/Apple MacBook Pro 16" & Charger/i)).toBeDefined();
      expect(screen.queryByText(/#BYN-LGS-473215/i)).toBeNull();

      // Filter by In Transit
      const transitBtn = screen.getByRole('button', { name: /^In Transit/i });
      fireEvent.click(transitBtn);

      expect(screen.getByText(/#BYN-LGS-473215/i)).toBeDefined();
      expect(screen.queryByText(/#BYN-LGS-882410/i)).toBeNull();

      // Filter by Cancelled
      const cancelledBtn = screen.getByRole('button', { name: /^Cancelled/i });
      fireEvent.click(cancelledBtn);

      expect(screen.getByText(/#BYN-LGS-501924/i)).toBeDefined();
      expect(screen.getByText(/Cold-Chain Pharmacy Supplies/i)).toBeDefined();
    });

    it('filters shipments by live search query matching waybill ID or corridor', () => {
      render(
        <ThemeProvider>
          <ShipmentHistoryView />
        </ThemeProvider>
      );

      const searchInput = screen.getByPlaceholderText(/Search waybill/i);
      fireEvent.change(searchInput, { target: { value: 'Otigba' } });

      expect(screen.getByText(/#BYN-LGS-928474/i)).toBeDefined();
      expect(screen.getByText(/Premium Tech Prototype & Hardware/i)).toBeDefined();
      expect(screen.queryByText(/#BYN-LGS-473215/i)).toBeNull();

      // Clear search
      const clearBtn = screen.getByRole('button', { name: /Clear Search/i });
      fireEvent.click(clearBtn);

      expect(screen.getByText(/#BYN-LGS-473215/i)).toBeDefined();
    });
  });

  describe('2. Invoice Modal & Digital Proof of Delivery', () => {
    it('opens invoice drawer with barcode graphic, 4-digit PIN, and itemized fare breakdown', () => {
      render(
        <ThemeProvider>
          <ShipmentHistoryView />
        </ThemeProvider>
      );

      const viewInvoiceBtns = screen.getAllByRole('button', { name: /View Invoice/i });
      expect(viewInvoiceBtns.length).toBeGreaterThan(0);
      fireEvent.click(viewInvoiceBtns[0]!);

      expect(screen.getByRole('heading', { name: /Waybill Invoice & Proof/i })).toBeDefined();
      expect(screen.getByText(/HANDOVER PIN/i)).toBeDefined();
      expect(screen.getByText(/4829/i)).toBeDefined();
      expect(screen.getByText(/Itemized Fare Breakdown/i)).toBeDefined();
      expect(screen.getByText(/Base Distance Fare/i)).toBeDefined();
      expect(screen.getByText(/Weight Surcharge/i)).toBeDefined();
      expect(screen.getByText(/VAT \(7.5%\)/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /Share Waybill Details/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Download Official Tax PDF/i })).toBeDefined();
    });

    it('triggers share and download PDF toasts from invoice modal', () => {
      render(
        <ThemeProvider>
          <ShipmentHistoryView />
        </ThemeProvider>
      );

      const viewInvoiceBtns = screen.getAllByRole('button', { name: /View Invoice/i });
      fireEvent.click(viewInvoiceBtns[0]!);

      const shareBtn = screen.getByRole('button', { name: /Share Waybill Details/i });
      fireEvent.click(shareBtn);
      expect(screen.getByText(/Copied waybill #BYN-LGS-473215 details to clipboard!/i)).toBeDefined();

      const downloadPdfBtn = screen.getByRole('button', { name: /Download Official Tax PDF/i });
      fireEvent.click(downloadPdfBtn);
      expect(screen.getByText(/Official Tax Invoice \(BYN-LGS-473215\.pdf\) downloaded!/i)).toBeDefined();
    });
  });

  describe('3. Dispatch Actions: Live Tracking & Repeat Order', () => {
    it('triggers Live Track on in-transit shipments and navigates to /deliveries', () => {
      render(
        <ThemeProvider>
          <ShipmentHistoryView />
        </ThemeProvider>
      );

      const liveTrackBtns = screen.getAllByRole('button', { name: /Live Track/i });
      expect(liveTrackBtns.length).toBeGreaterThan(0);
      fireEvent.click(liveTrackBtns[0]!);

      expect(mockPush).toHaveBeenCalledWith('/deliveries');
    });

    it('triggers Repeat Dispatch on delivered shipments and navigates to /repeat', () => {
      render(
        <ThemeProvider>
          <ShipmentHistoryView />
        </ThemeProvider>
      );

      const repeatBtns = screen.getAllByRole('button', { name: /Repeat Dispatch/i });
      expect(repeatBtns.length).toBeGreaterThan(0);
      fireEvent.click(repeatBtns[0]!);

      expect(mockPush).toHaveBeenCalledWith('/repeat');
      expect(screen.getByText(/Re-ordering waybill/i)).toBeDefined();
    });

    it('renders empty state when search finds no matching shipments', () => {
      render(
        <ThemeProvider>
          <ShipmentHistoryView />
        </ThemeProvider>
      );

      const searchInput = screen.getByPlaceholderText(/Search waybill/i);
      fireEvent.change(searchInput, { target: { value: 'Nonexistent Mystery Code' } });

      expect(screen.getByText(/No deliveries found/i)).toBeDefined();
      expect(screen.getByText(/Try adjusting your search query or switching the status filter tab\./i)).toBeDefined();
    });
  });
});
