'use client';

import React from 'react';
import { LatLng } from '@logistics/shared-types';

export interface VendorDispatchedOrder {
  id: string;
  trackingCode: string;
  status: string;
  totalFareKobo: number;
  pickup: {
    address: string;
    landmark: string;
    location: LatLng;
    pickupPin: string;
  };
  stops: Array<{
    id?: string;
    sequenceNumber: number;
    recipientName: string;
    recipientPhone: string;
    dropoffAddress: string;
    dropoffLandmark: string;
    dropoffLocation: LatLng;
    deliveryPin: string;
    status: string;
  }>;
  rider?: {
    id: string;
    fullName: string;
    phone: string;
    plateNumber?: string;
    currentLocation?: { lat: number; lng: number; heading?: number; speedKph?: number } | null;
  } | null;
}

export interface VendorMultiBikeMapProps {
  warehouseLocation: { address: string; landmark: string; location: LatLng };
  orders: VendorDispatchedOrder[];
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function VendorMultiBikeMap({
  warehouseLocation,
  orders,
  onRefresh,
  isLoading = false,
}: VendorMultiBikeMapProps) {
  const activeOrders = orders.filter(
    (o) => !['delivered', 'cancelled', 'failed'].includes(o.status)
  );

  return (
    <div className="bg-bayniks-cardDark rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col h-[520px]">
      {/* Map Header */}
      <div className="p-4 border-b border-slate-800/80 bg-bayniks-cardDark/90 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-bayniks-orange/20 border border-bayniks-orange flex items-center justify-center text-bayniks-orange">
            📡
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Lagos Live Fleet Radar</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </h3>
            <p className="text-[11px] text-slate-400">
              Tracking {activeOrders.length} active motorcycle courier{activeOrders.length === 1 ? '' : 's'} across Lagos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 rounded-xl bg-bayniks-surfaceDark border border-slate-700 text-slate-300 hover:text-white hover:border-bayniks-orange transition-colors text-xs flex items-center gap-1.5"
            >
              <span className={isLoading ? 'animate-spin' : ''}>🔄</span>
              <span className="hidden sm:inline">Refresh Fleet</span>
            </button>
          )}
        </div>
      </div>

      {/* Radar Map Canvas / Visualization */}
      <div className="relative flex-1 bg-[#090b0e] overflow-hidden flex items-center justify-center select-none">
        {/* Radar Concentric Rings & Crosshair Grid */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(#FF6D1F_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full border border-bayniks-orange/40" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full border border-bayniks-orange/20" />
          <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-bayniks-orange/20" />
          <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-bayniks-orange/20" />
        </div>

        {/* Central Warehouse Pin */}
        <div className="absolute z-10 flex flex-col items-center">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-bayniks-orange border-2 border-white shadow-bolt-glow flex items-center justify-center text-lg text-white">
              🏬
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-bayniks-orange/30 animate-ping -z-10" />
          </div>
          <div className="mt-1 px-2.5 py-0.5 rounded-full bg-bayniks-black/90 border border-slate-700 text-[10px] font-mono text-white text-center whitespace-nowrap shadow-lg">
            {warehouseLocation.landmark || 'Warehouse Hub'}
          </div>
        </div>

        {/* Active Dispatched Couriers Orbiting / Radiating */}
        {activeOrders.map((order, idx) => {
          // Compute pseudo-polar distribution around warehouse for clean visualization
          const angle = (idx * (360 / Math.max(activeOrders.length, 1)) * Math.PI) / 180;
          const radius = 110 + (idx % 3) * 45;
          const offsetX = Math.cos(angle) * radius;
          const offsetY = Math.sin(angle) * radius;

          const isAssigned = !!order.rider;
          const riderName = order.rider?.fullName || 'Searching Rider';
          const plate = order.rider?.plateNumber || 'BIKE';

          return (
            <div
              key={order.id}
              style={{
                transform: `translate(${offsetX}px, ${offsetY}px)`,
              }}
              className="absolute z-20 flex flex-col items-center transition-all duration-700"
            >
              {/* Connecting vector line to warehouse */}
              <svg
                className="absolute pointer-events-none -z-10"
                style={{
                  width: Math.abs(offsetX) + 20,
                  height: Math.abs(offsetY) + 20,
                  left: offsetX >= 0 ? -offsetX : 0,
                  top: offsetY >= 0 ? -offsetY : 0,
                }}
              >
                <line
                  x1={offsetX >= 0 ? offsetX : 0}
                  y1={offsetY >= 0 ? offsetY : 0}
                  x2={offsetX >= 0 ? 0 : -offsetX}
                  y2={offsetY >= 0 ? 0 : -offsetY}
                  stroke={isAssigned ? '#FF6D1F' : '#64748B'}
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  className="animate-pulse"
                />
              </svg>

              {/* Courier Bike Marker */}
              <div className="relative group cursor-pointer">
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center text-sm shadow-xl transition-transform group-hover:scale-110 ${
                    isAssigned
                      ? 'bg-bayniks-orange text-white border-white shadow-bolt-glow'
                      : 'bg-bayniks-surfaceDark text-slate-400 border-slate-700'
                  }`}
                >
                  🏍️
                </div>
                {isAssigned && (
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-black" />
                )}

                {/* Tooltip on Hover */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block w-48 p-2.5 rounded-xl bg-bayniks-black border border-slate-700 text-[11px] text-white shadow-2xl z-30 pointer-events-none">
                  <div className="font-mono font-bold text-bayniks-orange">{order.trackingCode}</div>
                  <div className="text-slate-300 font-medium truncate">{riderName} ({plate})</div>
                  <div className="text-slate-400 text-[10px] mt-1">
                    Stops: {order.stops.length} • Status: {order.status}
                  </div>
                </div>
              </div>

              {/* Courier Mini Tag */}
              <div className="mt-1 px-2 py-0.5 rounded bg-black/85 border border-slate-800 text-[9px] font-mono text-slate-300 whitespace-nowrap">
                {order.trackingCode}
              </div>
            </div>
          );
        })}

        {/* Empty State Banner if no active orders */}
        {activeOrders.length === 0 && (
          <div className="absolute z-20 text-center max-w-xs p-4 rounded-2xl bg-bayniks-black/90 border border-slate-800 text-slate-400 text-xs">
            <span className="text-2xl mb-1 block">🏁</span>
            <div className="font-semibold text-white">No Active Bike Runs</div>
            <p className="text-[11px] mt-1">Upload a batch CSV or load the demo to dispatch express courier runs.</p>
          </div>
        )}
      </div>

      {/* Manifest Fleet Bar */}
      <div className="p-3 bg-bayniks-cardDark border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400 overflow-x-auto">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-white">
            <span className="w-2.5 h-2.5 rounded-full bg-bayniks-orange inline-block" /> Central Hub: {warehouseLocation.landmark || 'Lagos'}
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Active Couriers: {activeOrders.length}
          </span>
        </div>
        <span className="text-[11px]">Real-Time Telemetry: 5s Redis Sync</span>
      </div>
    </div>
  );
}

