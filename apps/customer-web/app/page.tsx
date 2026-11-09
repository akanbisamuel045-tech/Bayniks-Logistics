'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { LatLng, FareEstimateResponse } from '@logistics/shared-types';
import { DesktopSidebar } from '../components/DesktopSidebar';
import { DesktopHeader } from '../components/DesktopHeader';
import { EnterpriseKpiConsole } from '../components/EnterpriseKpiConsole';
import { BookingForm } from '../components/BookingForm';
import { QrHandoverModal } from '../components/QrHandoverModal';
import { SupportDrawer } from '../components/SupportDrawer';
import { ActiveDeliveriesDrawer } from '../components/ActiveDeliveriesDrawer';
import { MobileBottomNav } from '../components/MobileBottomNav';

// Dynamically import BookingMap with ssr: false to guarantee clean client-only hydration
const BookingMap = dynamic(
  () => import('../components/BookingMap').then((mod) => mod.BookingMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-bayniks-black flex items-center justify-center text-slate-500 text-xs font-mono">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-6 h-6 border-2 border-bayniks-orange border-t-transparent rounded-full animate-spin" />
          <span>Initializing Bayniks Tactical Radar...</span>
        </div>
      </div>
    ),
  }
);

export default function BookingPage() {
  // Navigation & Drawer states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isDeliveriesOpen, setIsDeliveriesOpen] = useState(false);
  const [qrActiveOrder, setQrActiveOrder] = useState<any | null>(null);

  // Map & Route telemetry state
  const [pickup, setPickup] = useState<{ address: string; landmark?: string; location: LatLng }>({
    address: 'Computer Village, Ikeja',
    landmark: 'Otigba Street, opposite Slot',
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

  const handleOpenQrForOrder = (order: any) => {
    setQrActiveOrder(order);
    setIsQrModalOpen(true);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bayniks-black text-slate-100 font-sans">
      {/* 1. Desktop Collapsible Sidebar (Screens >= 1024px) */}
      <DesktopSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activeDeliveriesCount={2}
        walletBalanceKobo={4520000}
        onOpenSupport={() => setIsSupportOpen(true)}
        onOpenDeliveries={() => setIsDeliveriesOpen(true)}
      />

      {/* 2. Main Workstation Viewport */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Desktop Sticky Header */}
        <DesktopHeader
          onOpenQrScanner={() => setIsQrModalOpen(true)}
          onBookDeliveryClick={() => setActiveTab('new_delivery')}
          onOpenDeliveries={() => setIsDeliveriesOpen(true)}
        />

        {/* Mobile Top Header (< 1024px) */}
        <div className="lg:hidden h-14 bg-bayniks-cardDark border-b border-slate-800 px-4 flex items-center justify-between z-20">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-bayniks-orange text-white font-mono font-bold flex items-center justify-center shadow-bolt-glow text-sm">
              ⚡
            </div>
            <div>
              <span className="font-mono font-bold text-sm tracking-wider text-white">BAYNIKS</span>
              <span className="text-[9px] font-mono text-bayniks-orange block leading-none">EXPRESS</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="p-1.5 rounded-lg bg-bayniks-surfaceDark border border-slate-800 text-xs"
            >
              📷
            </button>
            <button
              type="button"
              onClick={() => setIsSupportOpen(true)}
              className="p-1.5 rounded-lg bg-bayniks-surfaceDark border border-slate-800 text-xs"
            >
              🎧
            </button>
          </div>
        </div>

        {/* Workstation Content Area */}
        <main className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 pb-24 lg:pb-6">
          {/* Enterprise KPI Banner */}
          <EnterpriseKpiConsole
            activeDeliveriesCount={2}
            completedDeliveriesCount={1489}
            onTimeSlaPercent={99.4}
            walletBalanceKobo={4520000}
            onTopUpClick={() => alert('Paystack / Monnify Instant Deposit Modal')}
            onActiveDeliveriesClick={() => setIsDeliveriesOpen(true)}
          />

          {/* Dual-Column Layout on Desktop: Booking Form + Live GPS Radar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 flex-1 min-h-[640px]">
            {/* Left 60%: Booking Console */}
            <div className="lg:col-span-7 h-[700px] lg:h-full rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
              <BookingForm
                onRouteUpdated={handleRouteUpdated}
                onOpenQrPass={handleOpenQrForOrder}
              />
            </div>

            {/* Right 40%: Real-Time Tactical Radar Viewport */}
            <div className="lg:col-span-5 h-[420px] lg:h-full rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative min-h-[360px]">
              <BookingMap
                pickup={pickup}
                stops={stops}
                encodedPolyline={fareEstimate?.encodedPolyline}
                estimatedDistanceKm={fareEstimate?.estimatedDistanceKm}
                estimatedDurationMinutes={fareEstimate?.estimatedDurationMinutes}
              />
            </div>
          </div>
        </main>
      </div>

      {/* 3. Mobile Bottom Dock (< 1024px) */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenDeliveries={() => setIsDeliveriesOpen(true)}
        onOpenCreate={() => setActiveTab('new_delivery')}
      />

      {/* 4. Modal Drawers */}
      <QrHandoverModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        activeOrder={qrActiveOrder}
      />

      <SupportDrawer
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />

      <ActiveDeliveriesDrawer
        isOpen={isDeliveriesOpen}
        onClose={() => setIsDeliveriesOpen(false)}
        onSelectForQr={handleOpenQrForOrder}
      />
    </div>
  );
}
