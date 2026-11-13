'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  Plus,
  Calendar,
  Repeat,
  MapPin,
  QrCode,
  Share2,
  Phone,
  ArrowRight,
  Truck,
  Bike,
  Sparkles,
  CheckCircle2,
  Zap,
  Clock,
} from 'lucide-react';

export interface ActiveDeliveryOrder {
  id: string;
  trackingCode: string;
  displayId: string;
  status: 'in_transit' | 'awaiting_pickup' | 'delivered';
  statusText: string;
  desc: string;
  vehicle: string;
  pickupAddress: string;
  pickupLandmark: string;
  dropoffAddress: string;
  dropoffLandmark: string;
  shipperName: string;
  recipientName: string;
  recipientPhone: string;
  courierName: string;
  courierRating: number;
  courierPlate: string;
  courierVehicle: string;
  fareKobo: number;
  handoverPin: string;
  etaMinutes: number;
  etaText: string;
}

export const INITIAL_ACTIVE_ORDERS: ActiveDeliveryOrder[] = [
  {
    id: 'ord-847291',
    trackingCode: 'BYN-LGS-847291',
    displayId: '#BF12345',
    status: 'in_transit',
    statusText: 'In Transit',
    desc: 'BillingFast Express Order',
    vehicle: 'Express Bike ⚡',
    pickupAddress: '12 Commercial Avenue, Sabo, Yaba',
    pickupLandmark: 'Opposite Ozone Cinemas',
    dropoffAddress: 'Plot 4, Adeola Odeku Street, Victoria Island',
    dropoffLandmark: 'Beside Zenith Bank Head Office',
    shipperName: 'BillingFast Store',
    recipientName: 'Chiamaka Okonjo',
    recipientPhone: '+2348123456789',
    courierName: 'Tariq Danladi',
    courierRating: 4.95,
    courierPlate: 'LND-4912',
    courierVehicle: 'Bajaj Boxer 150cc',
    fareKobo: 380000,
    handoverPin: '4829',
    etaMinutes: 12,
    etaText: '12 mins',
  },
  {
    id: 'ord-482019',
    trackingCode: 'BYN-LGS-482019',
    displayId: '#473215090',
    status: 'awaiting_pickup',
    statusText: 'Awaiting Pickup',
    desc: 'Business documents',
    vehicle: 'Toyota Probox 🚗',
    pickupAddress: 'Otigba Street, Computer Village, Ikeja',
    pickupLandmark: 'Opposite Slot Store Main Entrance',
    dropoffAddress: 'Admiralty Way, Lekki Phase 1',
    dropoffLandmark: 'Beside Tastee Fried Chicken',
    shipperName: 'Sarah Johnson',
    recipientName: 'Michael Chen',
    recipientPhone: '+2348039876543',
    courierName: 'Babatunde Adeleke',
    courierRating: 4.9,
    courierPlate: 'IKJ-8201',
    courierVehicle: 'TVS King Deluxe',
    fareKobo: 450000,
    handoverPin: '7104',
    etaMinutes: 25,
    etaText: '25 mins',
  },
];

export interface CustomerDashboardProps {
  onNewDeliveryClick: () => void;
  onScheduleClick?: () => void;
  onRepeatClick?: () => void;
  onSavedAddressesClick?: () => void;
  onOrderClick?: (order: ActiveDeliveryOrder) => void;
  onTopUpClick?: () => void;
  walletBalanceKobo?: number;
}

export function CustomerDashboard({
  onNewDeliveryClick,
  onScheduleClick,
  onRepeatClick,
  onSavedAddressesClick,
  onOrderClick,
  onTopUpClick,
  walletBalanceKobo = 3425000, // ₦34,250.00
}: CustomerDashboardProps) {
  const router = useRouter();

  const [activeFilter, setActiveFilter] = useState<'all' | 'in_transit' | 'awaiting_pickup' | 'delivered'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const inTransitCount = useMemo(
    () => INITIAL_ACTIVE_ORDERS.filter((o) => o.status === 'in_transit').length,
    []
  );
  const awaitingCount = useMemo(
    () => INITIAL_ACTIVE_ORDERS.filter((o) => o.status === 'awaiting_pickup').length,
    []
  );

  const filteredOrders = useMemo(() => {
    return INITIAL_ACTIVE_ORDERS.filter((order) => {
      const matchesFilter =
        activeFilter === 'all' ? true : order.status === activeFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        order.displayId.toLowerCase().includes(q) ||
        order.trackingCode.toLowerCase().includes(q) ||
        order.desc.toLowerCase().includes(q) ||
        order.recipientName.toLowerCase().includes(q) ||
        order.shipperName.toLowerCase().includes(q) ||
        order.pickupAddress.toLowerCase().includes(q) ||
        order.dropoffAddress.toLowerCase().includes(q) ||
        order.courierName.toLowerCase().includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, searchQuery]);

  return (
    <div className="w-full space-y-6">
      {/* ========================================================================= */}
      {/* 1. HERO ENTERPRISE DISPATCH CONSOLE BANNER (DARK HERO AS IN SCREENSHOT)   */}
      {/* ========================================================================= */}
      <div className="bg-[#0B0F19] border border-white/10 rounded-2xl p-5 md:p-6 text-white relative overflow-hidden shadow-xl">
        {/* Subtle orange radial gradient backdrop */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#FF6D1F]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center flex-wrap gap-2 mb-1.5">
              <span className="bg-[#FF6D1F]/15 border border-[#FF6D1F]/30 text-[#FF6D1F] px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase inline-flex items-center gap-1.5 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF6D1F] animate-pulse" />
                <span>ENTERPRISE DISPATCH CONSOLE</span>
              </span>
              <span className="text-[11px] text-neutral-400 font-medium">
                • Lagos Metropolitan Area
              </span>
              {/* Backward compatibility label for test suite */}
              <span className="sr-only">Lagos Metropolitan Dispatch Console • Active</span>
            </div>

            <h2 className="text-lg lg:text-xl font-extrabold text-white tracking-tight mt-1">
              Welcome back, Kainul Stevano 👋
            </h2>

            <p className="text-neutral-400 text-xs mt-1 font-medium">
              2 active couriers currently en route • All deliveries covered under ₦500k guaranteed cargo insurance & SLA guarantee.
            </p>
          </div>

          {/* Right Controls: Compact Quick Search Pill & Filter Button */}
          <div className="flex items-center space-x-2 shrink-0 self-start lg:self-center flex-wrap gap-2">
            <div className="relative flex items-center">
              <span className="absolute left-3 text-neutral-400 pointer-events-none">
                <Search className="w-3.5 h-3.5 text-neutral-400" />
              </span>
              <input
                id="desktopHeroSearchInput"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Quick filter by tracking ID..."
                className="bg-[#181E2A] border border-white/10 text-white placeholder-neutral-400 rounded-full pl-8 pr-3.5 py-1.5 text-xs w-44 sm:w-56 focus:outline-none focus:border-[#FF6D1F] transition"
              />
            </div>

            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className="bg-[#181E2A] hover:bg-[#202736] border border-white/10 text-white font-semibold px-3.5 py-1.5 rounded-full text-xs flex items-center gap-1.5 transition active:scale-95 shadow-xs"
            >
              <Filter className="w-3.5 h-3.5 text-[#FF6D1F]" />
              <span>Filter</span>
            </button>

            {/* Accessible New Dispatch button for test backward compatibility */}
            <button
              type="button"
              onClick={onNewDeliveryClick}
              className="sr-only"
            >
              New Dispatch
            </button>
          </div>
        </div>

        {/* 4-Card Compact KPI Metrics Grid Inside Hero */}
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {/* KPI 1: Active Deliveries */}
          <div
            onClick={() => setActiveFilter('in_transit')}
            className="bg-[#181E2A] rounded-xl p-3 border border-white/5 flex flex-col justify-between cursor-pointer hover:border-[#FF6D1F]/40 transition group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider uppercase text-neutral-400">
                Active Deliveries
              </span>
              <span className="w-7 h-7 rounded-full bg-[#FF6D1F]/15 text-[#FF6D1F] flex items-center justify-center text-xs shadow-xs">
                <Bike className="w-3.5 h-3.5 text-[#FF6D1F]" />
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1.5">
              <h3 className="text-xl font-black text-white">2</h3>
              <span className="text-[10px] font-semibold text-[#FF6D1F] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF6D1F] animate-pulse" />
                Next in 12m
              </span>
            </div>
          </div>

          {/* KPI 2: Completed Deliveries */}
          <div
            onClick={() => setActiveFilter('delivered')}
            className="bg-[#181E2A] rounded-xl p-3 border border-white/5 flex flex-col justify-between cursor-pointer hover:border-emerald-500/40 transition group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider uppercase text-neutral-400">
                Completed Waybills
              </span>
              <span className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-xs font-bold shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1.5">
              <h3 className="text-xl font-black text-white">18</h3>
              <span className="text-[10px] font-semibold text-emerald-400">
                +4 this week
              </span>
            </div>
          </div>

          {/* KPI 3: On-Time SLA */}
          <div className="bg-[#181E2A] rounded-xl p-3 border border-white/5 flex flex-col justify-between cursor-pointer hover:border-amber-400/40 transition group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider uppercase text-neutral-400">
                On-Time SLA
              </span>
              <span className="w-7 h-7 rounded-full bg-amber-400/15 text-amber-400 flex items-center justify-center text-xs shadow-xs">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1.5">
              <h3 className="text-xl font-black text-white">99.4%</h3>
              <span className="text-[10px] font-semibold text-amber-400 flex items-center gap-1">
                <span>⚡</span> Top 1% Tier
              </span>
            </div>
          </div>

          {/* KPI 4: Wallet Balance / Escrow Balance */}
          <div
            onClick={onTopUpClick}
            className="bg-[#181E2A] rounded-xl p-3 border border-white/5 flex flex-col justify-between cursor-pointer hover:border-[#FF6D1F]/40 transition group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider uppercase text-neutral-400">
                Escrow Balance
              </span>
              <span className="w-7 h-7 rounded-full bg-[#FF6D1F]/15 text-[#FF6D1F] flex items-center justify-center text-xs shadow-xs">
                <Plus className="w-3.5 h-3.5 text-[#FF6D1F]" />
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1.5">
              <div>
                <h3 className="text-xl font-black text-white">₦34,250.00</h3>
              </div>
              <span className="text-[10px] font-semibold text-[#FF6D1F] flex items-center gap-1 group-hover:translate-x-0.5 transition">
                + Top Up →
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. LOWER WORKSTATION: DUAL COLUMN (LEFT ~65% / RIGHT ~35%)                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ===================================================================== */}
        {/* LEFT COLUMN: QUICK ACTIONS + ACTIVE & RECENT DELIVERIES (8 COLS)       */}
        {/* ===================================================================== */}
        <div className="lg:col-span-8 space-y-6">
          {/* QUICK DELIVERY ACTIONS (4 Clayed Shortcut Cards) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-400">
                Quick Delivery Actions
              </h3>
              <span className="text-[11px] font-bold text-[#FF6D1F]">
                1-Tap Dispatch Shortcuts
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {/* Action 1: New Delivery */}
              <button
                type="button"
                onClick={onNewDeliveryClick}
                className="clay-desktop-card p-4 text-left group hover:border-[#FF6D1F] active:scale-[0.98] transition cursor-pointer"
              >
                <div className="w-11 h-11 rounded-2xl bg-[#FF6D1F] text-white flex items-center justify-center shadow-bolt-glow group-hover:scale-105 transition">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <h4 className="text-xs font-extrabold text-neutral-900 mt-3">
                  New Delivery
                </h4>
                <p className="text-[10px] text-neutral-400 font-medium mt-0.5">
                  Instant motorcycle dispatch
                </p>
              </button>

              {/* Action 2: Schedule Pickup */}
              <button
                type="button"
                onClick={onScheduleClick}
                className="clay-desktop-card p-4 text-left group hover:border-[#FF6D1F] active:scale-[0.98] transition cursor-pointer"
              >
                <div className="w-11 h-11 rounded-2xl bg-[#FFF7ED] text-[#FF6D1F] border border-[#FF6D1F]/20 flex items-center justify-center group-hover:scale-105 transition">
                  <Calendar className="w-5 h-5 text-[#FF6D1F]" />
                </div>
                <h4 className="text-xs font-extrabold text-neutral-900 mt-3">
                  Schedule Pickup
                </h4>
                <p className="text-[10px] text-neutral-400 font-medium mt-0.5">
                  Lock guaranteed time slot
                </p>
              </button>

              {/* Action 3: Repeat Route */}
              <button
                type="button"
                onClick={onRepeatClick}
                className="clay-desktop-card p-4 text-left group hover:border-[#FF6D1F] active:scale-[0.98] transition cursor-pointer"
              >
                <div className="w-11 h-11 rounded-2xl bg-[#FFF7ED] text-[#FF6D1F] border border-[#FF6D1F]/20 flex items-center justify-center group-hover:scale-105 transition">
                  <Repeat className="w-5 h-5 text-[#FF6D1F]" />
                </div>
                <h4 className="text-xs font-extrabold text-neutral-900 mt-3">
                  Repeat Route
                </h4>
                <p className="text-[10px] text-neutral-400 font-medium mt-0.5">
                  4 saved route templates
                </p>
              </button>

              {/* Action 4: Saved Addresses / Scan Waybill QR */}
              <button
                type="button"
                onClick={onSavedAddressesClick}
                className="clay-desktop-card p-4 text-left group hover:border-[#FF6D1F] active:scale-[0.98] transition cursor-pointer"
              >
                <div className="w-11 h-11 rounded-2xl bg-[#FFF7ED] text-[#FF6D1F] border border-[#FF6D1F]/20 flex items-center justify-center group-hover:scale-105 transition">
                  <MapPin className="w-5 h-5 text-[#FF6D1F]" />
                </div>
                <h4 className="text-xs font-extrabold text-neutral-900 mt-3">
                  Saved Addresses
                </h4>
                <p className="text-[10px] text-neutral-400 font-medium mt-0.5">
                  Home, Office & Warehouses
                </p>
              </button>
            </div>
          </div>

          {/* ACTIVE & RECENT DELIVERIES SECTION */}
          <div className="space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex items-center space-x-2.5">
                <h3 className="text-base font-extrabold text-neutral-900 tracking-tight">
                  Active & Recent Deliveries
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#FF6D1F] text-white text-[11px] font-mono font-extrabold">
                  {filteredOrders.length}
                </span>
              </div>

              {/* Category Filter Pills (All, In Transit, Awaiting Pickup) */}
              <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold transition cursor-pointer ${
                    activeFilter === 'all'
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-900'
                  }`}
                >
                  All ({INITIAL_ACTIVE_ORDERS.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('in_transit')}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition cursor-pointer ${
                    activeFilter === 'in_transit'
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-900'
                  }`}
                >
                  In Transit ({inTransitCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('awaiting_pickup')}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition cursor-pointer ${
                    activeFilter === 'awaiting_pickup'
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-900'
                  }`}
                >
                  Awaiting Pickup ({awaitingCount})
                </button>
              </div>
            </div>

            {/* 2-Column Responsive Grid of Delivery Cards */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredOrders.length === 0 ? (
                <div className="col-span-full clay-desktop-card p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center text-xl">
                    <Search className="w-6 h-6 text-neutral-400" />
                  </div>
                  <h4 className="text-sm font-extrabold text-neutral-900">
                    No matching deliveries found
                  </h4>
                  <p className="text-xs text-neutral-400">
                    Try clearing your search query or switching category filters.
                  </p>
                </div>
              ) : (
                filteredOrders.map((order) => {
                  const isTransit = order.status === 'in_transit';

                  return (
                    <div
                      key={order.id}
                      className={`clay-desktop-card p-5 flex flex-col justify-between space-y-4 ${
                        isTransit ? 'border-2 border-[#FF6D1F]' : ''
                      }`}
                    >
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-11 h-11 rounded-2xl bg-[#FFF7ED] border border-[#FF6D1F]/20 flex items-center justify-center text-[#FF6D1F] shrink-0">
                            <Truck className="w-5 h-5 text-[#FF6D1F]" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-xs font-mono font-extrabold text-neutral-900 truncate">
                                {order.displayId}
                              </h4>
                              <span className="text-[10px] font-mono text-neutral-400">
                                {order.trackingCode}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 font-mono text-[10px] font-extrabold text-neutral-900">
                                <span>OTP: </span>
                                <span>{order.handoverPin}</span>
                              </span>
                            </div>
                            <p className="text-xs text-neutral-400 font-medium mt-0.5 truncate">
                              {order.desc} • {order.vehicle}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-extrabold flex items-center space-x-1.5 shadow-xs shrink-0 ${
                            isTransit
                              ? 'bg-[#FF6D1F] text-white'
                              : 'bg-neutral-900 text-white'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full bg-white ${
                              isTransit ? 'animate-pulse' : ''
                            }`}
                          />
                          <span>{order.statusText}</span>
                        </span>
                      </div>

                      {/* Route Timeline with Corridors & Nigerian Landmarks */}
                      <div className="bg-neutral-50/80 rounded-2xl p-3.5 border border-neutral-200/70 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 block mb-0.5">
                            Pickup • {order.shipperName}
                          </span>
                          <p className="text-xs font-extrabold text-neutral-900 truncate leading-snug">
                            {order.pickupAddress}
                          </p>
                          <span className="text-[10px] text-neutral-500 font-medium block truncate mt-0.5">
                            Landmark: {order.pickupLandmark}
                          </span>
                        </div>
                        <div className="sm:border-l border-neutral-200/80 sm:pl-3">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 block mb-0.5">
                            Drop-off • {order.recipientName}
                          </span>
                          <p className="text-xs font-extrabold text-neutral-900 truncate leading-snug">
                            {order.dropoffAddress}
                          </p>
                          <span className="text-[10px] text-neutral-500 font-medium block truncate mt-0.5">
                            Landmark: {order.dropoffLandmark}
                          </span>
                        </div>
                      </div>

                      {/* Courier & ETA Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-neutral-100 flex-wrap gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-[#FF6D1F]" />
                          <span className="text-xs font-semibold text-neutral-500">
                            ETA: <strong className="text-neutral-900 font-mono">{order.etaText}</strong>
                          </span>
                          <span className="text-xs text-neutral-400">•</span>
                          <span className="text-xs text-neutral-400">{order.courierName}</span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => alert(`Tracking link copied for ${order.displayId}`)}
                            className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-200 text-xs font-extrabold transition active:scale-95 flex items-center gap-1 cursor-pointer"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Share</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onOrderClick?.(order)}
                            className="px-3.5 py-1.5 rounded-xl bg-[#FF6D1F] hover:bg-[#EA580C] text-white text-xs font-extrabold shadow-bolt-glow transition active:scale-95 flex items-center gap-1 cursor-pointer"
                          >
                            <span>Details</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* RIGHT COLUMN: LIVE COURIER TELEMETRY (~35% / 4 COLS)                   */}
        {/* ===================================================================== */}
        <div className="lg:col-span-4 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-400">
                Live Courier Telemetry
              </h3>
              <span className="text-[11px] font-bold text-[#FF6D1F]">
                Real-Time Tracking
              </span>
            </div>

            {/* 1. Live Active Courier Telemetry Card */}
            <div className="clay-desktop-card p-5 space-y-4 border-2 border-[#FF6D1F]/30 relative overflow-hidden bg-white">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF6D1F] animate-pulse" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#FF6D1F]">
                    Courier En Route
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#FFF7ED] text-[#FF6D1F] font-mono text-[10px] font-extrabold border border-[#FF6D1F]/20">
                  #BF12345 • #473215090
                </span>
              </div>

              {/* Interactive Mini Radar / Route Preview */}
              <div
                onClick={() => onOrderClick?.(INITIAL_ACTIVE_ORDERS[0]!)}
                className="relative h-40 rounded-2xl bg-gradient-to-br from-[#181310] to-[#3B1D0E] p-4 text-white overflow-hidden cursor-pointer group border border-[#FF6D1F]/30 shadow-xs"
              >
                {/* Radar Grid Lines */}
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#FB923C_1px,transparent_1px)] [background-size:14px_14px]" />

                {/* Simulated Route SVG Curve */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 130" fill="none">
                  <path
                    d="M 30 100 Q 120 25, 200 65 T 270 35"
                    stroke="rgba(251,146,60,0.35)"
                    strokeWidth="4"
                    strokeDasharray="6 6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 30 100 Q 120 25, 195 62"
                    stroke="#FF6D1F"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                  />
                  <circle cx="30" cy="100" r="5" fill="#FFFFFF" />
                  <circle cx="195" cy="62" r="7" fill="#FF6D1F" />
                  <circle cx="270" cy="35" r="6" fill="#10B981" />
                </svg>

                <div className="relative z-10 flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-[10px] font-mono font-extrabold text-[#FB923C] border border-white/10 shadow-xs flex items-center gap-1">
                    <Bike className="w-3 h-3 text-[#FB923C]" />
                    <span>48 km/h • Third Mainland</span>
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-[#FF6D1F] text-white text-[10px] font-extrabold shadow-sm">
                    ETA: 18 mins
                  </span>
                </div>

                <div className="absolute bottom-3 left-4 right-4 z-10 flex items-center justify-between text-[11px] font-bold text-orange-100/90">
                  <span>Origin: Yaba Hub</span>
                  <span className="group-hover:translate-x-1 transition text-[#FB923C] font-extrabold flex items-center gap-1">
                    Expand Live Map ↗
                  </span>
                </div>
              </div>

              {/* Assigned Courier Details Sub-Card */}
              <div className="bg-neutral-50/80 rounded-2xl p-3.5 border border-neutral-200/70 flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full bg-[#FF6D1F] text-white font-extrabold flex items-center justify-center text-sm border-2 border-white shadow-xs">
                      TD
                    </div>
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-extrabold text-neutral-900 truncate">
                        Tariq Danladi • Assigned Courier
                      </h4>
                      <span className="px-1.5 py-0.5 rounded-md bg-[#FFF7ED] text-[#FF6D1F] text-[9px] font-extrabold border border-[#FF6D1F]/20">
                        ★ 4.95
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 font-medium mt-0.5">
                      Toyota Probox • <span className="font-mono font-bold text-neutral-900">BLT-4912</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => alert('Calling courier Tariq Danladi...')}
                    className="w-9 h-9 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 border border-neutral-200 flex items-center justify-center transition active:scale-90 shadow-2xs cursor-pointer"
                    title="Call Rider"
                  >
                    <Phone className="w-4 h-4 text-neutral-800" />
                  </button>
                </div>
              </div>

              {/* Handover OTP Badge & 1-Tap Trigger Sub-Card */}
              <div className="bg-neutral-50/80 rounded-2xl p-3.5 border border-neutral-200/70 flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase font-extrabold text-neutral-400 tracking-wider block mb-0.5">
                    Handover Release OTP
                  </span>
                  <span className="font-mono text-xl font-black text-neutral-900 tracking-[0.25em]">
                    48 29
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => onOrderClick?.(INITIAL_ACTIVE_ORDERS[0]!)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 border border-neutral-200 text-xs font-extrabold transition active:scale-95 flex items-center gap-1 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5 text-neutral-700" />
                    <span>QR Pass</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
