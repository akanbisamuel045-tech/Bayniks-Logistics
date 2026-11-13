import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NewShipmentForm } from '../components/NewShipmentForm';
import { ThemeProvider } from '../components/ThemeProvider';

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Stage 5: New Shipment Booking & Nigerian Landmark Form', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('1. renders Sender, Recipient, and Package details sections with accessible labels', () => {
    render(
      <ThemeProvider>
        <NewShipmentForm />
      </ThemeProvider>
    );

    expect(screen.getByText('1. Sender Information')).toBeDefined();
    expect(screen.getByText('2. Recipient Information')).toBeDefined();
    expect(screen.getByText('3. Package Specifications & Weight Tier')).toBeDefined();

    expect(screen.getByLabelText(/Full Name \/ Company/i)).toBeDefined();
    expect(screen.getByLabelText(/Pickup Street Address/i)).toBeDefined();
    expect(screen.getByLabelText(/Recipient Name/i)).toBeDefined();
    expect(screen.getByLabelText(/Delivery Destination Address/i)).toBeDefined();
    expect(screen.getByLabelText(/What are you sending\?/i)).toBeDefined();
  });

  it('2. dynamically updates Kobo fare breakdown when package size changes', () => {
    render(
      <ThemeProvider>
        <NewShipmentForm />
      </ThemeProvider>
    );

    // Default: Medium (+₦700) + Base (₦3,500) + Insurance (₦200) = ₦4,400.00
    expect(screen.getByText('₦4,400.00')).toBeDefined();

    // Click Small (+₦0)
    const smallBtn = screen.getByRole('button', { name: /Small Pouch • up to 3kg \+₦0/i });
    fireEvent.click(smallBtn);
    expect(screen.getByText('₦3,700.00')).toBeDefined();

    // Click Large (+₦1,500)
    const largeBtn = screen.getByRole('button', { name: /Large Bulky carton • up to 25kg \+₦1,500/i });
    fireEvent.click(largeBtn);
    expect(screen.getByText('₦5,200.00')).toBeDefined();

    // Click Freight (+₦3,500)
    const freightBtn = screen.getByRole('button', { name: /Freight Van \/ Cargo dispatch \+₦3,500/i });
    fireEvent.click(freightBtn);
    expect(screen.getByText('₦7,200.00')).toBeDefined();
  });

  it('3. dynamically adds Fragile and Priority surcharge addons', () => {
    render(
      <ThemeProvider>
        <NewShipmentForm />
      </ThemeProvider>
    );

    // Initial Medium total: ₦4,400.00
    expect(screen.getByText('₦4,400.00')).toBeDefined();

    // Toggle Fragile (+₦300)
    const fragileCheckbox = screen.getByLabelText(/Fragile Handling/i);
    fireEvent.click(fragileCheckbox);
    expect(screen.getByText('₦4,700.00')).toBeDefined();

    // Toggle Express Priority (+₦500)
    const priorityCheckbox = screen.getByLabelText(/Express Priority/i);
    fireEvent.click(priorityCheckbox);
    expect(screen.getByText('₦5,200.00')).toBeDefined();
  });

  it('4. enforces mandatory Nigerian landmark validation on pickup location', () => {
    render(
      <ThemeProvider>
        <NewShipmentForm />
      </ThemeProvider>
    );

    const pickupLandmarkInput = screen.getByLabelText(/Nearest Landmark \/ Bus Stop/i);
    fireEvent.change(pickupLandmarkInput, { target: { value: '' } });

    const submitBtn = screen.getByRole('button', { name: /Review & Confirm Booking/i });
    fireEvent.submit(submitBtn.closest('form')!);

    expect(
      screen.getByText(/Mandatory Nigerian Landmark required for Pickup location/i)
    ).toBeDefined();
  });

  it('5. enforces mandatory Nigerian landmark validation on dropoff location', () => {
    render(
      <ThemeProvider>
        <NewShipmentForm />
      </ThemeProvider>
    );

    const dropoffLandmarkInput = screen.getByLabelText(/Nearest Landmark \/ Gate Code/i);
    fireEvent.change(dropoffLandmarkInput, { target: { value: '' } });

    const submitBtn = screen.getByRole('button', { name: /Review & Confirm Booking/i });
    fireEvent.submit(submitBtn.closest('form')!);

    expect(
      screen.getByText(/Mandatory Nigerian Landmark required for Drop-off location/i)
    ).toBeDefined();
  });

  it('6. invokes onProceedToConfirmation with full payload and integer Kobo fare upon valid submit', () => {
    const onProceedMock = vi.fn();

    render(
      <ThemeProvider>
        <NewShipmentForm onProceedToConfirmation={onProceedMock} />
      </ThemeProvider>
    );

    const submitBtn = screen.getByRole('button', { name: /Review & Confirm Booking/i });
    fireEvent.click(submitBtn);

    expect(onProceedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        senderName: 'Kainul Designs',
        pickupAddress: expect.stringContaining('Yaba'),
        pickupLandmark: expect.stringContaining('Ozone Cinemas'),
        recipientName: 'Michael Chen',
        dropoffAddress: expect.stringContaining('Adeola Odeku'),
        dropoffLandmark: expect.stringContaining('Zenith Bank'),
        packageSize: 'medium',
        totalFareKobo: 440000, // ₦4,400.00
      })
    );
  });

  it('7. triggers onOpenMapPicker when map buttons are clicked', () => {
    const onMapPickerMock = vi.fn();

    render(
      <ThemeProvider>
        <NewShipmentForm onOpenMapPicker={onMapPickerMock} />
      </ThemeProvider>
    );

    const mapBtns = screen.getAllByRole('button', { name: /Map/i });
    expect(mapBtns.length).toBe(2);

    fireEvent.click(mapBtns[0]!);
    expect(onMapPickerMock).toHaveBeenCalledWith('pickup');

    fireEvent.click(mapBtns[1]!);
    expect(onMapPickerMock).toHaveBeenCalledWith('dropoff');
  });
});
