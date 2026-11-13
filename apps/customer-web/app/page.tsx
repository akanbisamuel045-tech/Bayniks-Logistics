'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { LatLng, FareEstimateResponse } from '@logistics/shared-types';
import { DesktopSidebar } from '../components/DesktopSidebar';
import { MobileSidebarDrawer } from '../components/MobileSidebarDrawer';
import { DesktopHeader } from '../components/DesktopHeader';
import { BookingForm } from '../components/BookingForm';
import { QrHandoverModal } from '../components/QrHandoverModal';
import { SupportDrawer } from '../components/SupportDrawer';
import { ActiveDeliveriesDrawer } from '../components/ActiveDeliveriesDrawer';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { CustomerDashboard } from '../components/CustomerDashboard';
import { ScheduleDeliveryView } from '../components/ScheduleDeliveryView';
import { RepeatDeliveryView } from '../components/RepeatDeliveryView';
import { ActiveDeliveriesView } from '../components/ActiveDeliveriesView';
import { ShipmentHistoryView } from '../components/ShipmentHistoryView';
import { NotificationsCenterView } from '../components/NotificationsCenterView';
import { CourierChatView } from '../components/CourierChatView';
import { SupportDeskView } from '../components/SupportDeskView';
import { ProfileSettingsView } from '../components/ProfileSettingsView';
import { ArrowLeft } from 'lucide-react';

// Dynamically import BookingMap with ssr: false to guarantee clean client-only hydration
const BookingMap = dynamic(
  () => import('../components/BookingMap').then((mod) => mod.BookingMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-mono">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-6 h-6 border-2 border-[#FF6D1F] border-t-transparent rounded-full animate-spin" />
          <span>Initializing Bayniks Tactical Radar...</span>
        </div>
      </div>
    ),
  }
);

export default function BookingPage() {
  // Navigation & Drawer states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
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

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard';
      case 'schedule':
        return 'Schedule Delivery';
      case 'repeat':
        return 'Repeat Delivery';
      case 'new_delivery':
        return 'New Delivery';
      case 'active_deliveries':
        return 'Active Deliveries';
      case 'archive':
        return 'Delivery Archive';
      case 'notifications':
        return 'Notifications';
      case 'rider_chat':
        return 'Courier Chat';
      case 'support':
        return '24/7 Support Hub';
      case 'profile':
        return 'Account & Profile';
      case 'settings':
        return 'App Settings';
      default:
        return 'Dashboard';
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* 1. Desktop Collapsible Sidebar (Screens >= 1024px) */}
      <DesktopSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activeDeliveriesCount={2}
        walletBalanceKobo={3425000}
        onOpenSupport={() => setActiveTab('support')}
        onOpenDeliveries={() => setActiveTab('active_deliveries')}
      />

      {/* 2. Mobile Responsive Sidebar Drawer (Screens < 1024px) */}
      <MobileSidebarDrawer
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activeDeliveriesCount={2}
        walletBalanceKobo={3425000}
        onOpenSupport={() => setActiveTab('support')}
        onOpenDeliveries={() => setActiveTab('active_deliveries')}
      />

      {/* 3. Main Workstation Viewport */}
      {activeTab === 'active_deliveries' ? (
        <div className="flex-1 flex flex-col h-full w-full min-w-0 overflow-y-auto pb-28 relative bg-neutral-50 p-4 md:p-8">
          <ActiveDeliveriesView
            onBackClick={() => setActiveTab('dashboard')}
            onOpenChat={() => setActiveTab('rider_chat')}
          />
        </div>
      ) : activeTab === 'schedule' ? (
        <div className="flex-1 flex flex-col h-full w-full min-w-0 overflow-y-auto pb-28 relative bg-neutral-50 p-4 md:p-8">
          <ScheduleDeliveryView
            onBackClick={() => setActiveTab('dashboard')}
            onConfirmSchedule={() => setActiveTab('dashboard')}
          />
        </div>
      ) : activeTab === 'repeat' ? (
        <div className="flex-1 flex flex-col h-full w-full min-w-0 overflow-y-auto pb-28 relative bg-neutral-50 p-4 md:p-8">
          <RepeatDeliveryView
            onBackClick={() => setActiveTab('dashboard')}
            onConfirmReOrder={() => setActiveTab('dashboard')}
          />
        </div>
      ) : activeTab === 'archive' ? (
        <div className="flex-1 flex flex-col h-full w-full min-w-0 overflow-y-auto pb-28 relative bg-neutral-50 p-4 md:p-8">
          <ShipmentHistoryView
            onBackClick={() => setActiveTab('dashboard')}
            onTrackShipment={() => setActiveTab('active_deliveries')}
            onRepeatShipment={() => setActiveTab('repeat')}
          />
        </div>
      ) : activeTab === 'notifications' ? (
        <div className="flex-1 flex flex-col h-full w-full min-w-0 overflow-y-auto pb-28 relative bg-neutral-50 p-4 md:p-8">
          <NotificationsCenterView
            onBackClick={() => setActiveTab('dashboard')}
            onTrackWaybill={() => setActiveTab('active_deliveries')}
          />
        </div>
      ) : activeTab === 'rider_chat' ? (
        <div className="flex-1 flex flex-col h-full w-full min-w-0 overflow-y-auto pb-28 relative bg-neutral-50 p-4 md:p-8">
          <CourierChatView
            onBackClick={() => setActiveTab('dashboard')}
            onOpenLiveMap={() => setActiveTab('active_deliveries')}
          />
        </div>
      ) : activeTab === 'support' ? (
        <div className="flex-1 flex flex-col h-full w-full min-w-0 overflow-y-auto pb-28 relative bg-neutral-50 p-4 md:p-8">
          <SupportDeskView
            onBackClick={() => setActiveTab('dashboard')}
          />
        </div>
      ) : activeTab === 'profile' || activeTab === 'settings' ? (
        <div className="flex-1 flex flex-col h-full w-full min-w-0 overflow-y-auto pb-28 relative bg-neutral-50 p-4 md:p-8">
          <ProfileSettingsView
            initialTab={activeTab === 'settings' ? 'settings' : 'profile'}
            onBackClick={() => setActiveTab('dashboard')}
          />
        </div>
      ) : activeTab === 'dashboard' ? (
        <div className="flex-1 flex flex-col h-full w-full min-w-0 overflow-hidden relative">
          {/* Top Navigation Bar Matching bayniks_edition.html */}
          <DesktopHeader
            onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            onBookDelivery={() => setActiveTab('new_delivery')}
            onOpenQrScan={() => setIsQrModalOpen(true)}
            onOpenNotifications={() => setActiveTab('notifications')}
            activeTabTitle="Dashboard"
          />

          {/* Workstation Content Area */}
          <main className="flex-1 w-full flex flex-col overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 pb-32">
            <CustomerDashboard
              onNewDeliveryClick={() => setActiveTab('new_delivery')}
              onScheduleClick={() => setActiveTab('schedule')}
              onRepeatClick={() => setActiveTab('repeat')}
              onSavedAddressesClick={() => setActiveTab('saved_addresses')}
              onOrderClick={(order) => handleOpenQrForOrder(order)}
              onTopUpClick={() => alert('Paystack / Monnify Instant Deposit Modal')}
              walletBalanceKobo={3425000}
            />
          </main>
        </div>
      ) : (
        <div className="flex-1 flex flex-col h-full w-full min-w-0 overflow-hidden relative">
          {/* Top Navigation Bar Matching bayniks_edition.html */}
          <DesktopHeader
            onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            onBookDelivery={() => setActiveTab('new_delivery')}
            onOpenQrScan={() => setIsQrModalOpen(true)}
            onOpenNotifications={() => setActiveTab('notifications')}
            activeTabTitle="New Delivery"
          />

          {/* Workstation Content Area */}
          <main className="flex-1 w-full flex flex-col overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 pb-32">
            {/* Top Action Bar when in New Delivery / Booking view */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-slate-700 hover:text-slate-900 hover:border-[#FF6D1F] shadow-sm flex items-center space-x-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Dashboard</span>
              </button>
              <div className="text-xs font-mono text-[#FF6D1F] font-bold">
                Express Dispatch Booking
              </div>
            </div>

            {/* Dual-Column Layout on Desktop: Booking Form + Live GPS Radar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 flex-1 min-h-[640px]">
              {/* Left 60%: Booking Console */}
              <div className="lg:col-span-7 h-[700px] lg:h-full rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-white">
                <BookingForm
                  onRouteUpdated={handleRouteUpdated}
                  onOpenQrPass={handleOpenQrForOrder}
                />
              </div>

              {/* Right 40%: Real-Time Tactical Radar Viewport */}
              <div className="lg:col-span-5 h-[420px] lg:h-full rounded-3xl overflow-hidden border border-slate-200 shadow-sm relative min-h-[360px] bg-white">
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
      )}

      {/* 4. Mobile Bottom Dock (< 1024px) */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenDeliveries={() => setActiveTab('active_deliveries')}
        onOpenCreate={() => setActiveTab('new_delivery')}
      />

      {/* 5. Modal Drawers */}
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
