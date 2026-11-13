import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AddressPickerModal } from '../components/AddressPickerModal';
import { ThemeProvider } from '../components/ThemeProvider';

describe('Stage 6: Interactive Address Picker & GPS Map', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. returns null and renders nothing when isOpen is false', () => {
    const { container } = render(
      <ThemeProvider>
        <AddressPickerModal
          isOpen={false}
          target="pickup"
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      </ThemeProvider>
    );

    expect(container.firstChild).toBeNull();
  });

  it('2. displays target header label and live radar metadata when open', () => {
    render(
      <ThemeProvider>
        <AddressPickerModal
          isOpen={true}
          target="pickup"
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      </ThemeProvider>
    );

    expect(screen.getByText(/Select Pickup Location/i)).toBeDefined();
    expect(screen.getByText(/Pinpoint address on live Lagos radar/i)).toBeDefined();
    expect(screen.getByText(/LAGOS MAINLAND CORRIDOR/i)).toBeDefined();
    expect(screen.getByText(/RADAR ONLINE/i)).toBeDefined();
  });

  it('3. renders all Lagos Hub preset pills', () => {
    render(
      <ThemeProvider>
        <AddressPickerModal
          isOpen={true}
          target="dropoff"
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      </ThemeProvider>
    );

    expect(screen.getByText(/Select Drop-off Destination/i)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Sabo Hub, Yaba' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Computer Village, Ikeja' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Victoria Island Towers' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Admiralty Hub, Lekki Phase 1' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Marina CMS Terminal' })).toBeDefined();
  });

  it('4. updates pinned address, landmark, and coordinates when a preset is selected', () => {
    render(
      <ThemeProvider>
        <AddressPickerModal
          isOpen={true}
          target="pickup"
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      </ThemeProvider>
    );

    // Switch to Computer Village, Ikeja
    const ikejaBtn = screen.getByRole('button', { name: 'Computer Village, Ikeja' });
    fireEvent.click(ikejaBtn);

    expect(screen.getByText('Otigba Street, Computer Village, Ikeja, Lagos')).toBeDefined();
    expect(screen.getByText('Opposite Slot Store Main Entrance')).toBeDefined();
    expect(screen.getByText(/LAT: 6.5933° N/i)).toBeDefined();
    expect(screen.getByText(/LNG: 3.3421° E/i)).toBeDefined();
  });

  it('5. acquires device coordinates via Locate Me GPS button', async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn().mockImplementation((success) => {
        success({
          coords: {
            latitude: 6.4531,
            longitude: 3.3958,
          },
        });
      }),
    };

    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
      configurable: true,
    });

    render(
      <ThemeProvider>
        <AddressPickerModal
          isOpen={true}
          target="pickup"
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      </ThemeProvider>
    );

    const locateMeBtn = screen.getByTitle('Locate Me via GPS');
    fireEvent.click(locateMeBtn);

    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/GPS locked within 5m accuracy/i)).toBeDefined();
    expect(screen.getByText('Current GPS Pin')).toBeDefined();
  });

  it('6. invokes onConfirm with full Nigerian landmark and { lat, lng } coordinates order', () => {
    const onConfirmMock = vi.fn();
    const onCloseMock = vi.fn();

    render(
      <ThemeProvider>
        <AddressPickerModal
          isOpen={true}
          target="dropoff"
          onClose={onCloseMock}
          onConfirm={onConfirmMock}
        />
      </ThemeProvider>
    );

    // Select Victoria Island Towers
    const viBtn = screen.getByRole('button', { name: 'Victoria Island Towers' });
    fireEvent.click(viBtn);

    const confirmBtn = screen.getByRole('button', { name: /Confirm Pinned Address/i });
    fireEvent.click(confirmBtn);

    expect(onConfirmMock).toHaveBeenCalledWith({
      title: 'Victoria Island Towers',
      address: 'Plot 4, Adeola Odeku Street, Victoria Island, Lagos',
      landmark: 'Beside Zenith Bank Head Office',
      location: {
        lat: 6.4281,
        lng: 3.4219,
      },
    });

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('7. triggers onClose when close button is clicked', () => {
    const onCloseMock = vi.fn();

    render(
      <ThemeProvider>
        <AddressPickerModal
          isOpen={true}
          target="pickup"
          onClose={onCloseMock}
          onConfirm={vi.fn()}
        />
      </ThemeProvider>
    );

    const closeBtn = screen.getByRole('button', { name: /close address picker/i });
    fireEvent.click(closeBtn);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});

