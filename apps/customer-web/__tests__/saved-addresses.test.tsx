import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SavedAddressesView } from '../components/SavedAddressesView';
import { ThemeProvider } from '../components/ThemeProvider';

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Stage 13: Saved Addresses Directory Suite', () => {
  beforeEach(() => {
    mockPush.mockClear();
    vi.clearAllMocks();
  });

  describe('1. SavedAddressesView Component Rendering & Structure', () => {
    it('renders header, location count, and default addresses with verified Nigerian landmarks', () => {
      render(
        <ThemeProvider>
          <SavedAddressesView />
        </ThemeProvider>
      );

      expect(screen.getByRole('heading', { name: /Saved Addresses/i })).toBeDefined();
      expect(screen.getByText(/4 Saved Locations/i)).toBeDefined();
      expect(screen.getByText(/Home Residence/i)).toBeDefined();
      expect(screen.getByText(/Design Studio & Office/i)).toBeDefined();
      expect(screen.getByText(/^DEFAULT$/)).toBeDefined();
      expect(screen.getByText(/Landmark: Opposite Ozone Cinemas, Yaba/i)).toBeDefined();
      expect(screen.getByText(/Landmark: Beside Zenith Bank Head Office/i)).toBeDefined();
    });

    it('filters addresses by category pills (Home, Work, Depot, Others)', () => {
      render(
        <ThemeProvider>
          <SavedAddressesView />
        </ThemeProvider>
      );

      // Filter by Work
      const workBtn = screen.getByRole('button', { name: /Work/i });
      fireEvent.click(workBtn);

      expect(screen.getByText(/Design Studio & Office/i)).toBeDefined();
      expect(screen.queryByText(/Home Residence/i)).toBeNull();
      expect(screen.queryByText(/Ikeja Distribution Depot/i)).toBeNull();

      // Filter by Depot
      const depotBtn = screen.getByRole('button', { name: /Depot/i });
      fireEvent.click(depotBtn);

      expect(screen.getByText(/Ikeja Distribution Depot/i)).toBeDefined();
      expect(screen.queryByText(/Design Studio & Office/i)).toBeNull();

      // Filter back to All
      const allBtn = screen.getByRole('button', { name: /^All/i });
      fireEvent.click(allBtn);

      expect(screen.getByText(/Home Residence/i)).toBeDefined();
      expect(screen.getByText(/Design Studio & Office/i)).toBeDefined();
    });

    it('filters addresses by live search query matching landmark or corridor', () => {
      render(
        <ThemeProvider>
          <SavedAddressesView />
        </ThemeProvider>
      );

      const searchInput = screen.getByPlaceholderText(/Search address, landmark, or contact name/i);
      fireEvent.change(searchInput, { target: { value: 'Zenith Bank' } });

      expect(screen.getByText(/Design Studio & Office/i)).toBeDefined();
      expect(screen.queryByText(/Home Residence/i)).toBeNull();

      // Clear search
      const clearBtn = screen.getByRole('button', { name: /Clear Search/i });
      fireEvent.click(clearBtn);

      expect(screen.getByText(/Home Residence/i)).toBeDefined();
    });
  });

  describe('2. Address Management & CRUD Actions', () => {
    it('opens Add Address modal and enforces mandatory Nigerian landmark', () => {
      render(
        <ThemeProvider>
          <SavedAddressesView />
        </ThemeProvider>
      );

      const addBtn = screen.getByRole('button', { name: /Add New Address/i });
      fireEvent.click(addBtn);

      expect(screen.getByText(/Nigerian Landmark \(Mandatory\)/i)).toBeDefined();

      const titleInput = screen.getByLabelText(/Location Nickname/i);
      fireEvent.change(titleInput, { target: { value: 'Surulere Studio' } });

      const streetInput = screen.getByLabelText(/Street Address & Lagos Corridor/i);
      fireEvent.change(streetInput, { target: { value: 'Bode Thomas Street, Surulere, Lagos' } });

      // Trigger submit without landmark to test mandatory validation
      const saveBtn = screen.getByRole('button', { name: /Save Address to Book/i });
      const form = saveBtn.closest('form')!;
      fireEvent.submit(form);

      expect(screen.getByText(/Mandatory landmark required/i)).toBeDefined();

      // Fill in landmark and save
      const landmarkInput = screen.getByLabelText(/Nigerian Landmark/i);
      fireEvent.change(landmarkInput, { target: { value: 'Near Adeniran Ogunsanya Mall' } });
      fireEvent.submit(form);

      expect(screen.getByText(/Saved "Surulere Studio" to address book!/i)).toBeDefined();
      expect(screen.getByRole('heading', { name: 'Surulere Studio' })).toBeDefined();
    });

    it('opens Edit Address modal, updates details, and saves successfully', () => {
      render(
        <ThemeProvider>
          <SavedAddressesView />
        </ThemeProvider>
      );

      const editBtn = screen.getByLabelText(/Edit Home Residence/i);
      fireEvent.click(editBtn);

      expect(screen.getByRole('heading', { name: /Edit Address/i })).toBeDefined();

      const titleInput = screen.getByLabelText(/Location Nickname/i);
      fireEvent.change(titleInput, { target: { value: 'Yaba Family Home' } });

      const saveChangesBtn = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveChangesBtn);

      expect(screen.getByText(/Updated "Yaba Family Home" successfully!/i)).toBeDefined();
      expect(screen.getByRole('heading', { name: 'Yaba Family Home' })).toBeDefined();
    });

    it('allows updating default address with 1-click trigger', () => {
      render(
        <ThemeProvider>
          <SavedAddressesView />
        </ThemeProvider>
      );

      const makeDefaultBtns = screen.getAllByRole('button', { name: /Make Default/i });
      expect(makeDefaultBtns.length).toBeGreaterThan(0);
      fireEvent.click(makeDefaultBtns[0]!);

      expect(screen.getByText(/Default address updated/i)).toBeDefined();
    });

    it('opens delete confirmation dialog and deletes address upon confirmation', () => {
      render(
        <ThemeProvider>
          <SavedAddressesView />
        </ThemeProvider>
      );

      const deleteBtn = screen.getByLabelText(/Delete Lekki Showroom & Store/i);
      fireEvent.click(deleteBtn);

      expect(screen.getByRole('heading', { name: /Delete Saved Address\?/i })).toBeDefined();
      expect(screen.getByText(/Are you sure you want to remove/i)).toBeDefined();

      const confirmDeleteBtn = screen.getByRole('button', { name: /Yes, Delete/i });
      fireEvent.click(confirmDeleteBtn);

      expect(screen.getByText(/Removed "Lekki Showroom & Store" from saved addresses/i)).toBeDefined();
      expect(screen.queryByRole('heading', { name: 'Lekki Showroom & Store' })).toBeNull();
    });
  });

  describe('3. Quick 1-Tap Dispatch Triggers', () => {
    it('triggers Send from here (Pickup) and routes to /shipment/new', () => {
      render(
        <ThemeProvider>
          <SavedAddressesView />
        </ThemeProvider>
      );

      const sendFromHereBtns = screen.getAllByRole('button', { name: /Send from here/i });
      fireEvent.click(sendFromHereBtns[0]!);

      expect(mockPush).toHaveBeenCalledWith('/shipment/new');
      expect(screen.getByText(/Pickup set to Home Residence/i)).toBeDefined();
    });

    it('triggers Deliver here (Dropoff) and routes to /shipment/new', () => {
      render(
        <ThemeProvider>
          <SavedAddressesView />
        </ThemeProvider>
      );

      const deliverHereBtns = screen.getAllByRole('button', { name: /Deliver here/i });
      fireEvent.click(deliverHereBtns[1]!);

      expect(mockPush).toHaveBeenCalledWith('/shipment/new');
      expect(screen.getByText(/Delivery set to Design Studio & Office/i)).toBeDefined();
    });

    it('displays empty state when search finds no match', () => {
      render(
        <ThemeProvider>
          <SavedAddressesView />
        </ThemeProvider>
      );

      const searchInput = screen.getByPlaceholderText(/Search address, landmark, or contact name/i);
      fireEvent.change(searchInput, { target: { value: 'Nonexistent Unknown Corridor' } });

      expect(screen.getByText(/No saved addresses found/i)).toBeDefined();
      expect(screen.getByText(/Tap \+ to add your home, studio, or warehouse address\./i)).toBeDefined();
    });
  });
});
