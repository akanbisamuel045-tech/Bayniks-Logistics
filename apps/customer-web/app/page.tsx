'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { LatLng, FareEstimateResponse } from '@logistics/shared-types';
import { BookingForm } from '../components/BookingForm';

// Dynamically import BookingMap with ssr: false to guarantee clean client-only hydration
const BookingMap = dynamic(
  () => import('../components/BookingMap').then((mod) => mod.BookingMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-slate-950 flex items-center justify-center text-slate-500 text-xs font-mono">
        Loading Lagos Geospatial Radar...
      </div>
    ),
  }
);

export default function BookingPage() {
  const [pickup, setPickup] = useState<{ address: string; landmark?: string; location: LatLng }>({
    address: 'Computer Village, Ikeja',
    landmark: 'Otigba Street, opposite slot',
    location: { lat: 6.5933, lng: 3.3421 },
  });

  const [stops, setStops] = useState<
    Array<{ address: string; landmark?: string; location: LatLng; recipientName?: string }>
  >([
    {
      address: 'Admiralty Way, Lekki Phase 1',
      landmark: 'Beside Tastee Fried Chicken',
      location: { lat: 6.4474, lng: 3.4723 },
      recipientName: 'Amina Bello',
    },
  ]);

  const [fareEstimate, setFareEstimate] = useState<FareEstimateResponse | undefined>(undefined);

  const handleRouteUpdated = useCallback(
    (
      newPickup: { address: string; landmark?: string; location: LatLng },
      newStops: Array<{ address: string; landmark?: string; location: LatLng; recipientName?: string }>,
      estimate?: FareEstimateResponse
    ) => {
      setPickup(newPickup);
      setStops(newStops);
      if (estimate) {
        setFareEstimate(estimate);
      }
    },
    []
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950">
      {/* DESKTOP LAYOUT (>= 768px): Full-viewport Map with 440px Floating Left Sidebar */}
      <div className="hidden md:block w-full h-full relative">
        {/* Full Viewport Map Background */}
        <div className="absolute inset-0 z-0">
          <BookingMap
            pickup={pickup}
            stops={stops}
            encodedPolyline={fareEstimate?.encodedPolyline}
            estimatedDistanceKm={fareEstimate?.estimatedDistanceKm}
            estimatedDurationMinutes={fareEstimate?.estimatedDurationMinutes}
          />
        </div>

        {/* 440px Floating Left Booking Sidebar */}
        <div className="absolute top-0 left-0 bottom-0 w-[440px] z-10 shadow-2xl">
          <BookingForm onRouteUpdated={handleRouteUpdated} />
        </div>
      </div>

      {/* MOBILE LAYOUT (< 768px): Top 45% Map Viewport + Bottom 55% Scrollable Booking Sheet */}
      <div className="flex md:hidden flex-col w-full h-full">
        {/* Top 45% Map */}
        <div className="h-[42%] w-full relative border-b border-slate-800">
          <BookingMap
            pickup={pickup}
            stops={stops}
            encodedPolyline={fareEstimate?.encodedPolyline}
            estimatedDistanceKm={fareEstimate?.estimatedDistanceKm}
            estimatedDurationMinutes={fareEstimate?.estimatedDurationMinutes}
          />
        </div>

        {/* Bottom 58% Scrollable Sheet */}
        <div className="h-[58%] w-full flex-1 overflow-hidden">
          <BookingForm onRouteUpdated={handleRouteUpdated} />
        </div>
      </div>
    </div>
  );
}
