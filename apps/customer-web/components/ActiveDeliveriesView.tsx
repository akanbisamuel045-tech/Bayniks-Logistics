'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LatLng } from '@logistics/shared-types';
import {
  Zap,
  ArrowLeft,
  Plus,
  Crosshair,
  MapPin,
  Bike,
  Package,
  Star,
  Phone,
  MessageSquare,
} from 'lucide-react';

export interface ActiveCourierTelemetry {
  waybillId: string;
  orderNumber: string;
  trackingCode: string;
  title: string;
  category: string;
  status: 'in_transit' | 'awaiting_pickup' | 'delivered';
  currentStep: number; // 1 to 4
  courierName: string;
  courierRating: number;
  courierPlate: string;
  courierVehicle: string;
  courierPhone: string;
  pickupAddress: string;
  pickupTime?: string;
  pickupLandmark: string;
  senderName: string;
  pickupStatusBadge: string;
  dropoffAddress: string;
  dropoffLandmark: string;
  recipientName: string;
  distanceLeftLabel: string;
  handoverPin: string;
  etaMinutes: number;
  distanceKmRemaining: number;
  riderLocation: LatLng;
  courierAvatarUrl: string;
}

export const INITIAL_TELEMETRY_DATA: ActiveCourierTelemetry[] = [
  {
    waybillId: 'BYN-LGS-847291',
    orderNumber: '473215090',
    trackingCode: 'BYN-LGS-847291',
    title: 'Business documents',
    category: 'Express Bike',
    status: 'in_transit',
    currentStep: 3,
    courierName: 'Tariq Danladi',
    courierRating: 4.95,
    courierPlate: 'LND-4912',
    courierVehicle: 'Bajaj Boxer 150cc',
    courierPhone: '+2348031112233',
    pickupAddress: 'Jakarta, 10110',
    pickupTime: '10:42 AM',
    pickupLandmark: 'Opposite Ozone Cinemas, Yaba',
    senderName: 'Sarah Johnson',
    pickupStatusBadge: 'Picked Up ✓',
    dropoffAddress: 'Surabaya, 60111',
    dropoffLandmark: 'Beside Zenith Bank Head Office',
    recipientName: 'Michael Chen',
    distanceLeftLabel: '4.2 km left',
    handoverPin: '4829',
    etaMinutes: 12,
    distanceKmRemaining: 4.8,
    riderLocation: { lat: 6.4969, lng: 3.3855 }, // On Third Mainland Bridge corridor
    courierAvatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
  },
  {
    waybillId: 'BYN-LGS-482019',
    orderNumber: '928474948',
    trackingCode: 'BYN-LGS-482019',
    title: 'Birthday gift',
    category: 'Fragile Parcel',
    status: 'awaiting_pickup',
    currentStep: 1,
    courierName: 'Babatunde Adeleke',
    courierRating: 4.9,
    courierPlate: 'IKJ-8201',
    courierVehicle: 'TVS King Deluxe',
    courierPhone: '+2348029988776',
    pickupAddress: 'Otigba Street, Computer Village, Ikeja, Lagos',
    pickupLandmark: 'Opposite Slot Store Main Entrance',
    senderName: 'Albert Stevano',
    pickupStatusBadge: '6 mins away',
    dropoffAddress: 'Admiralty Way, Lekki Phase 1, Lagos',
    dropoffLandmark: 'Beside Tastee Fried Chicken',
    recipientName: 'Diego Fernando',
    distanceLeftLabel: '12.8 km',
    handoverPin: '9104',
    etaMinutes: 25,
    distanceKmRemaining: 18.2,
    riderLocation: { lat: 6.5933, lng: 3.3421 }, // At Ikeja Hub
    courierAvatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
  },
];

export const LAGOS_RADAR_LANDMARKS = [
  { name: 'Third Mainland Bridge', location: { lat: 6.4969, lng: 3.3855 } },
  { name: 'Marina CMS Terminal', location: { lat: 6.4531, lng: 3.3958 } },
  { name: 'Lekki-Ikoyi Link Bridge', location: { lat: 6.4474, lng: 3.4421 } },
  { name: 'Obalende Bus Stop', location: { lat: 6.4512, lng: 3.4112 } },
];

export interface ActiveDeliveriesViewProps {
  onBackClick?: () => void;
  onOpenChat?: (courierName: string, waybillId: string) => void;
  onSelectOrder?: (order: ActiveCourierTelemetry) => void;
}

export function ActiveDeliveriesView({
  onBackClick,
  onOpenChat,
  onSelectOrder,
}: ActiveDeliveriesViewProps) {
  const router = useRouter();

  const [filter, setFilter] = useState<'all' | 'transit' | 'pickup'>('all');
  const [selectedOrder, setSelectedOrder] = useState<ActiveCourierTelemetry>(
    INITIAL_TELEMETRY_DATA[0]!
  );
  const [radarCenter, setRadarCenter] = useState<LatLng>(
    INITIAL_TELEMETRY_DATA[0]!.riderLocation
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredList = INITIAL_TELEMETRY_DATA.filter((item) => {
    if (filter === 'transit') return item.status === 'in_transit';
    if (filter === 'pickup') return item.status === 'awaiting_pickup';
    return true;
  });

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      router.push('/');
    }
  };

  const handleJumpToLandmark = (landmark: { name: string; location: LatLng }) => {
    setRadarCenter(landmark.location);
    showToast(`Focused radar on ${landmark.name}`);
  };

  const handleRecenterCourier = () => {
    setRadarCenter(selectedOrder.riderLocation);
    showToast(`Radar re-centered on Courier ${selectedOrder.courierName}`);
  };

  return (
    <div className="w-full min-h-screen flex flex-col justify-between bg-neutral-50 text-neutral-900 select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#FF6D1F] text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-bolt-glow flex items-center space-x-2 animate-bounce">
          <Zap className="w-4 h-4 stroke-[2.2]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header matching ca84fd7b.jpg */}
      <div className="px-5 py-3.5 flex items-center justify-between shrink-0 bg-white border-b border-neutral-100">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back to dashboard"
          className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-900 hover:bg-neutral-200 flex items-center justify-center transition active:scale-90"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="text-center">
          <div className="flex items-center justify-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FF6D1F] animate-pulse" />
            <h2 className="text-sm font-extrabold text-neutral-900 tracking-tight">Active Deliveries</h2>
          </div>
          <span className="text-[10px] text-neutral-400 font-bold block">2 Couriers Currently Dispatched</span>
        </div>

        <button
          type="button"
          onClick={() => router.push('/shipment/new')}
          className="w-10 h-10 rounded-full bg-[#FF6D1F] hover:bg-[#EA580C] text-white flex items-center justify-center shadow-sm font-extrabold text-lg transition active:scale-90"
          title="New Delivery"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Scrollable Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 pb-28 space-y-6 max-w-5xl mx-auto w-full hide-scrollbar">
        {/* 1. Live Telemetry Summary Banner (Matches ca84fd7b.jpg) */}
        <div className="bg-[#0B0F19] text-white rounded-[28px] sm:rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden flex items-center justify-between">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#FF6D1F]/20 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#FF6D1F] text-white flex items-center justify-center shadow-bolt-glow shrink-0">
              <Zap className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#FF6D1F] block">
                LIVE GPS TELEMETRY ACTIVE
              </span>
              <h3 className="text-sm sm:text-base font-extrabold text-white">
                Next Drop-off in {selectedOrder.etaMinutes} mins ({selectedOrder.distanceKmRemaining} km)
              </h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                All packages insured & on schedule • Waybill #{selectedOrder.waybillId}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleRecenterCourier}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-extrabold border border-white/10 shrink-0 transition active:scale-95"
            >
              Map ↗
            </button>
          </div>
        </div>

        {/* 2. Status Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto hide-scrollbar py-1">
          <h3 className="sr-only">Active Dispatches in Fleet ({filteredList.length})</h3>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-xs font-extrabold transition shrink-0 ${
              filter === 'all'
                ? 'bg-[#0B0F19] text-white shadow-sm'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-900'
            }`}
          >
            All Active (2)
          </button>
          <button
            type="button"
            onClick={() => setFilter('transit')}
            className={`px-4 py-2 rounded-full text-xs font-extrabold transition shrink-0 ${
              filter === 'transit'
                ? 'bg-[#0B0F19] text-white shadow-sm'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-900'
            }`}
          >
            In Transit (1)
          </button>
          <button
            type="button"
            aria-label="Pickup (1)"
            onClick={() => setFilter('pickup')}
            className={`px-4 py-2 rounded-full text-xs font-extrabold transition shrink-0 ${
              filter === 'pickup'
                ? 'bg-[#0B0F19] text-white shadow-sm'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-900'
            }`}
          >
            Awaiting Pickup (1)
          </button>
        </div>

        {/* 3. Active Delivery Cards Stack */}
        <div className="space-y-6">
          {filteredList.map((item) => {
            const isSelected = selectedOrder.waybillId === item.waybillId;

            return (
              <div
                key={item.waybillId}
                onClick={() => {
                  setSelectedOrder(item);
                  setRadarCenter(item.riderLocation);
                  onSelectOrder?.(item);
                }}
                className={`rounded-[28px] sm:rounded-3xl p-6 sm:p-7 md:p-8 space-y-6 transition cursor-pointer ${
                  isSelected
                    ? 'bg-white border-2 border-[#FF6D1F] shadow-card-soft'
                    : 'bg-white border border-neutral-200/90 shadow-card-soft hover:border-neutral-300'
                }`}
              >
                {/* Top Row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3.5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-orange-50/70 border border-[#FF6D1F]/30 text-neutral-900'
                          : 'bg-neutral-100 border border-neutral-200 text-neutral-900'
                      }`}
                    >
                      <Package className="w-5 h-5 text-neutral-900 stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h4 className="font-extrabold text-sm sm:text-base text-neutral-900 font-mono tracking-tight">
                          #{item.orderNumber}
                          <span className="sr-only"> #{item.waybillId}</span>
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 font-mono text-[10px] font-extrabold text-neutral-900">
                          OTP: {item.handoverPin}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 font-medium mt-1">
                        {item.title} • {item.category}
                      </p>
                    </div>
                  </div>
                  {item.status === 'in_transit' ? (
                    <span className="px-3.5 py-1.5 rounded-full text-[11px] font-extrabold bg-[#FF6D1F] text-white flex items-center space-x-1.5 shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span>In Transit</span>
                    </span>
                  ) : (
                    <span className="px-3.5 py-1.5 rounded-full text-[11px] font-extrabold bg-[#0B0F19] text-white flex items-center space-x-1.5 shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Awaiting Pickup</span>
                    </span>
                  )}
                </div>

                {/* 4-Step Visual Progress Bar */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-extrabold">
                    <span className="text-[#FF6D1F] uppercase tracking-wider">
                      Step {item.currentStep} of 4 • {item.status === 'in_transit' ? 'In Transit' : 'Awaiting Pickup'}
                    </span>
                    <span className="text-neutral-900 font-mono">
                      {item.status === 'in_transit' ? 'ETA: 18 mins' : 'Arriving in 6 mins'}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 sm:gap-3">
                    <div
                      className={`h-1.5 rounded-full ${
                        item.currentStep >= 1 ? 'bg-[#FF6D1F]' : 'bg-neutral-200'
                      }`}
                    />
                    <div
                      className={`h-1.5 rounded-full ${
                        item.status === 'in_transit'
                          ? 'bg-[#FF6D1F]'
                          : 'bg-[#FF6D1F] animate-pulse'
                      }`}
                    />
                    <div
                      className={`h-1.5 rounded-full ${
                        item.status === 'in_transit'
                          ? 'bg-[#FF6D1F] animate-pulse'
                          : 'bg-neutral-200'
                      }`}
                    />
                    <div className="h-1.5 rounded-full bg-neutral-200" />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400 pt-0.5">
                    <span className="text-neutral-900">{item.status === 'in_transit' ? '1. Booked' : 'Booked'}</span>
                    <span className="text-neutral-900">{item.status === 'in_transit' ? '2. Picked Up' : 'Pickup'}</span>
                    <span className="text-[#FF6D1F] font-extrabold">{item.status === 'in_transit' ? '3. In Transit' : 'In Transit'}</span>
                    <span className="text-neutral-400">{item.status === 'in_transit' ? '4. Handover' : 'Arriving'}</span>
                  </div>
                </div>

                {/* Route Timeline */}
                <div className="relative pl-5 space-y-5 before:content-[''] before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200">
                  <div className="relative flex items-start justify-between">
                    <span className="absolute -left-5 top-1.5 w-3 h-3 rounded-full bg-neutral-900 ring-4 ring-white" />
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                        Pickup {item.pickupTime ? `• ${item.pickupTime}` : 'Location'}
                      </span>
                      <p className="text-sm font-extrabold text-neutral-900">{item.pickupAddress}</p>
                      <p className="text-xs text-neutral-500">Sender: {item.senderName}</p>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-md ${
                        item.status === 'in_transit'
                          ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                          : 'text-neutral-900 bg-neutral-100 border border-neutral-200'
                      }`}
                    >
                      {item.pickupStatusBadge}
                    </span>
                  </div>

                  <div className="relative flex items-start justify-between">
                    <span className="absolute -left-5 top-1.5 w-3 h-3 rounded-full bg-[#FF6D1F] ring-4 ring-orange-100" />
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                        Drop-off Destination
                      </span>
                      <p className="text-sm font-extrabold text-neutral-900">{item.dropoffAddress}</p>
                      <p className="text-xs text-neutral-500">Recipient: {item.recipientName}</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-neutral-500">
                      {item.distanceLeftLabel}
                    </span>
                  </div>
                </div>

                {/* Assigned Courier Mini-Card */}
                <div className="bg-[#0B0F19] text-white rounded-2xl p-4 sm:p-4.5 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img
                      src={item.courierAvatarUrl}
                      alt={item.courierName}
                      className="w-10 h-10 rounded-full object-cover border-2 border-[#FF6D1F]"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-xs sm:text-sm font-extrabold text-white">{item.courierName}</h5>
                        <span className="text-[10px] text-[#FF6D1F] font-bold">★ {item.courierRating}</span>
                      </div>
                      <p className="text-[11px] text-neutral-400">
                        {item.courierVehicle} • {item.courierPlate}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <a
                      href={`tel:${item.courierPhone}`}
                      aria-label={item.status === 'in_transit' ? 'Call Rider' : 'Call Courier'}
                      title="Call Courier"
                      className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition active:scale-90"
                    >
                      <Phone className="w-4 h-4 stroke-[2.2]" />
                    </a>
                    <button
                      type="button"
                      aria-label={item.status === 'in_transit' ? 'In-App Chat' : 'Message Courier'}
                      onClick={() => onOpenChat?.(item.courierName, item.waybillId)}
                      title="Message Courier"
                      className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-[#FF6D1F] flex items-center justify-center transition active:scale-90"
                    >
                      <MessageSquare className="w-4 h-4 stroke-[2.2]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrder(item);
                        setRadarCenter(item.riderLocation);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#FF6D1F] hover:bg-[#EA580C] text-white text-xs font-extrabold transition active:scale-95 shadow-sm"
                    >
                      {item.status === 'in_transit' ? 'Live Map' : 'Track'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. Interactive Tactical Radar & Lagos Corridor Jump Bar */}
        <div className="bg-white rounded-3xl sm:rounded-[28px] p-5 border border-neutral-200/90 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
            <div>
              <span className="text-xs font-mono font-bold uppercase text-neutral-500 block">
                Lagos Landmark Radar Corridors:
              </span>
              <span className="text-[10px] text-neutral-400">
                Live telemetry locked to courier corridor
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-[11px] font-mono text-[#FF6D1F] font-bold">
                LAT: {radarCenter.lat.toFixed(4)}° N, LNG: {radarCenter.lng.toFixed(4)}° E
              </div>
              <button
                type="button"
                onClick={handleRecenterCourier}
                className="px-3 py-1.5 rounded-xl bg-[#FF6D1F] hover:bg-[#EA580C] text-white text-xs font-bold shadow-bolt-glow transition active:scale-95 flex items-center space-x-1.5"
              >
                <Crosshair className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Recenter Courier</span>
              </button>
            </div>
          </div>

          {/* Landmark Quick Jump Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto hide-scrollbar py-1">
            {LAGOS_RADAR_LANDMARKS.map((lm) => (
              <button
                key={lm.name}
                type="button"
                onClick={() => handleJumpToLandmark(lm)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition shrink-0 flex items-center gap-1.5 ${
                  radarCenter.lat === lm.location.lat
                    ? 'bg-[#FF6D1F] text-white font-bold shadow-sm'
                    : 'bg-white text-neutral-700 hover:text-neutral-900 border border-neutral-200'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-neutral-900 stroke-[2.2]" />
                <span>{lm.name}</span>
              </button>
            ))}
          </div>

          {/* Tactical Radar Canvas */}
          <div className="h-64 sm:h-72 w-full rounded-2xl bg-[#0B0F19] relative overflow-hidden select-none">
            {/* Tactical Grid */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `linear-gradient(#475569 1px, transparent 1px), linear-gradient(90deg, #475569 1px, transparent 1px)`,
                backgroundSize: '36px 36px',
              }}
            />
            {/* Pulse Rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-80 h-80 rounded-full border border-neutral-700 animate-ping opacity-25" />
              <div className="w-56 h-56 rounded-full border border-neutral-700" />
              <div className="w-28 h-28 rounded-full border border-neutral-700" />
            </div>
            {/* Moving Courier Marker */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="flex flex-col items-center">
                <div className="px-2.5 py-1 rounded-full bg-white/95 border border-neutral-200 text-[10px] font-mono text-[#FF6D1F] mb-1 shadow-sm font-bold flex items-center gap-1">
                  <Bike className="w-3 h-3 text-neutral-900 stroke-[2.2]" />
                  <span>
                    {selectedOrder.courierName} ({selectedOrder.courierPlate})
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#FF6D1F] text-white flex items-center justify-center shadow-bolt-glow animate-pulse">
                  <Bike className="w-5 h-5 text-white stroke-[2.2]" />
                </div>
                <div className="w-0.5 h-3 bg-[#FF6D1F]" />
              </div>
            </div>
            {/* Radar HUD telemetry bar */}
            <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none text-[10px] font-mono">
              <div className="bg-black/80 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-neutral-800 text-neutral-300">
                Speed: 42 km/h • Heading 185° S
              </div>
              <div className="bg-black/80 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-neutral-800 text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Sub-15ms Redis GPS Telemetry
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-3 text-center text-[11px] font-mono text-neutral-400 shrink-0 border-t border-neutral-200 bg-white">
        Live Dispatch Telemetry • Protected by Bayniks Anti-Fraud Verification
      </footer>
    </div>
  );
}
