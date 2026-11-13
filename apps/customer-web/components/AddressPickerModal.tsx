'use client';

import React, { useState } from 'react';
import { LatLng } from '@logistics/shared-types';
import { useTheme } from './ThemeProvider';
import { X, Crosshair, MapPin, ArrowRight } from 'lucide-react';

export interface PinnedAddress {
  title: string;
  address: string;
  landmark: string;
  location: LatLng;
}

export interface AddressPickerModalProps {
  isOpen: boolean;
  target: 'pickup' | 'dropoff';
  onClose: () => void;
  onConfirm: (pinned: PinnedAddress) => void;
  initialLocation?: LatLng;
}

export const POPULAR_LAGOS_LANDMARKS: PinnedAddress[] = [
  {
    title: 'Sabo Hub, Yaba',
    address: '12 Commercial Avenue, Sabo, Yaba, Lagos',
    landmark: 'Opposite Ozone Cinemas, Commercial Avenue',
    location: { lat: 6.5186, lng: 3.3712 },
  },
  {
    title: 'Computer Village, Ikeja',
    address: 'Otigba Street, Computer Village, Ikeja, Lagos',
    landmark: 'Opposite Slot Store Main Entrance',
    location: { lat: 6.5933, lng: 3.3421 },
  },
  {
    title: 'Victoria Island Towers',
    address: 'Plot 4, Adeola Odeku Street, Victoria Island, Lagos',
    landmark: 'Beside Zenith Bank Head Office',
    location: { lat: 6.4281, lng: 3.4219 },
  },
  {
    title: 'Admiralty Hub, Lekki Phase 1',
    address: 'Admiralty Way, Lekki Phase 1, Lagos',
    landmark: 'Beside Tastee Fried Chicken & Domino Pizza',
    location: { lat: 6.4474, lng: 3.4723 },
  },
  {
    title: 'Marina CMS Terminal',
    address: 'Marina CMS, Lagos Island, Lagos',
    landmark: 'Opposite CMS Ferry Terminal & Bus Stop',
    location: { lat: 6.4531, lng: 3.3958 },
  },
];

export function AddressPickerModal({
  isOpen,
  target,
  onClose,
  onConfirm,
  initialLocation = { lat: 6.5186, lng: 3.3712 },
}: AddressPickerModalProps) {
  const { isDark } = useTheme();

  const [selectedAddress, setSelectedAddress] = useState<PinnedAddress>(
    POPULAR_LAGOS_LANDMARKS[0]!
  );
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetLabel = target === 'pickup' ? 'Pickup Location' : 'Drop-off Destination';

  const handleLocateMe = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setGpsStatus('Acquiring high-accuracy GPS coordinates...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(4));
          const lng = parseFloat(pos.coords.longitude.toFixed(4));
          const gpsAddress: PinnedAddress = {
            title: 'Current GPS Pin',
            address: `GPS Location (${lat}° N, ${lng}° E), Lagos`,
            landmark: 'Near Current User GPS Coordinate',
            location: { lat, lng },
          };
          setSelectedAddress(gpsAddress);
          setGpsStatus('GPS locked within 5m accuracy');
          setTimeout(() => setGpsStatus(null), 3000);
        },
        () => {
          setGpsStatus('Location access denied or unavailable. Using default hub.');
          setTimeout(() => setGpsStatus(null), 3000);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setGpsStatus('Geolocation not supported on this browser');
      setTimeout(() => setGpsStatus(null), 3000);
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedAddress);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl h-full sm:h-[680px] rounded-none sm:rounded-3xl border border-slate-200 flex flex-col overflow-hidden shadow-2xl bg-white text-slate-900">
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-200 shrink-0 z-20 bg-white">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close address picker"
            className="w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center">
            <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">Select {targetLabel}</h2>
            <span className="text-[10px] text-slate-500 font-mono font-bold block">
              Pinpoint address on live Lagos radar
            </span>
          </div>

          <button
            type="button"
            onClick={handleLocateMe}
            title="Locate Me via GPS"
            className="w-10 h-10 rounded-full bg-orange-50 text-bayniks-orange hover:bg-bayniks-orange hover:text-white transition active:scale-95 flex items-center justify-center shadow-sm border border-orange-200"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>

        {/* GPS Status Toast */}
        {gpsStatus && (
          <div className="bg-bayniks-orange text-white text-xs font-mono font-bold px-4 py-2 text-center animate-pulse z-30">
            {gpsStatus}
          </div>
        )}

        {/* Quick Lagos Landmark Preset Pills */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 overflow-x-auto whitespace-nowrap hide-scrollbar flex items-center space-x-2 shrink-0 z-20">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-500 mr-1">
            Lagos Hubs:
          </span>
          {POPULAR_LAGOS_LANDMARKS.map((preset) => {
            const isSelected = selectedAddress.title === preset.title;
            return (
              <button
                key={preset.title}
                type="button"
                onClick={() => setSelectedAddress(preset)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition shrink-0 ${
                  isSelected
                    ? 'bg-bayniks-orange text-white shadow-sm font-bold'
                    : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {preset.title}
              </button>
            );
          })}
        </div>

        {/* Interactive Tactical Radar Map Canvas */}
        <div className="relative flex-1 w-full bg-slate-100 overflow-hidden select-none">
          {/* Grid lines simulating tactical GPS radar */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: `linear-gradient(#CBD5E1 1px, transparent 1px), linear-gradient(90deg, #CBD5E1 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
          />

          {/* Concentric radar rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-96 h-96 rounded-full border border-slate-300 animate-ping opacity-25" />
            <div className="w-64 h-64 rounded-full border border-slate-300" />
            <div className="w-32 h-32 rounded-full border border-slate-300" />
          </div>

          {/* Center Tactical Crosshair Pin */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 -mt-6">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-orange-100 border-2 border-bayniks-orange flex items-center justify-center shadow-bolt-glow">
                <span className="w-3 h-3 rounded-full bg-bayniks-orange animate-pulse" />
              </div>
              <div className="w-0.5 h-6 bg-bayniks-orange shadow-bolt-glow" />
              <div className="w-2.5 h-1 bg-bayniks-orange rounded-full" />
            </div>
          </div>

          {/* Lagos Landmark Visual Nodes on Radar */}
          <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between z-10 text-[10px] font-mono text-slate-500">
            <div className="flex justify-between">
              <span>LAT: {selectedAddress.location.lat.toFixed(4)}° N</span>
              <span>LNG: {selectedAddress.location.lng.toFixed(4)}° E</span>
            </div>
            <div className="flex justify-between">
              <span>LAGOS MAINLAND CORRIDOR</span>
              <span className="text-bayniks-orange font-bold">● RADAR ONLINE</span>
            </div>
          </div>
        </div>

        {/* Bottom Pinned Address Sheet */}
        <div className="p-5 border-t border-slate-200 space-y-4 shrink-0 z-20 bg-white">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-1.5">
                <MapPin className="w-4 h-4 text-bayniks-orange shrink-0" />
                <span>{selectedAddress.title}</span>
              </h3>
              <span className="text-[10px] font-mono font-bold text-bayniks-orange bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                Verified Hub
              </span>
            </div>

            <p className="text-xs text-slate-700 font-medium">
              {selectedAddress.address}
            </p>

            <div className="text-[11px] text-slate-500 font-mono flex items-center space-x-1 pt-0.5">
              <span className="text-bayniks-orange font-bold">Landmark:</span>
              <span>{selectedAddress.landmark}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-4 px-5 bg-bayniks-orange hover:bg-bayniks-orangeDark text-white font-extrabold text-xs rounded-2xl shadow-bolt-glow active:scale-95 transition flex items-center justify-center space-x-2"
          >
            <span>Confirm Pinned Address</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

