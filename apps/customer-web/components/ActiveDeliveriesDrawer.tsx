'use client';

import React from 'react';
import Link from 'next/link';
import { formatNaira } from '@logistics/shared-types';

export interface ActiveDeliveryItem {
  trackingCode: string;
  status: string;
  riderName: string;
  riderBike: string;
  riderPhone: string;
  pickupAddress: string;
  dropoffAddress: string;
  fareKobo: number;
  etaMinutes: number;
}

export interface ActiveDeliveriesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectForQr?: (order: { trackingCode: string; pickupPin?: string; deliveryPin?: string }) => void;
}

const DEFAULT_ACTIVE_DELIVERIES: ActiveDeliveryItem[] = [
  {
    trackingCode: 'LGS-847291',
    status: 'in_transit',
    riderName: 'Tariq Danladi',
    riderBike: 'Bajaj Boxer (KJA-101-AA)',
    riderPhone: '+2348039988771',
    pickupAddress: 'Computer Village, Ikeja',
    dropoffAddress: 'Admiralty Way, Lekki Phase 1',
    fareKobo: 280000,
    etaMinutes: 18,
  },
  {
    trackingCode: 'LGS-192847',
    status: 'arrived_pickup',
    riderName: 'Kabiru Sanusi',
    riderBike: 'Haojue 150 (LAG-492-XX)',
    riderPhone: '+2348021122334',
    pickupAddress: 'Allen Avenue, Ikeja',
    dropoffAddress: 'Broad Street, Lagos Island',
    fareKobo: 340000,
    etaMinutes: 29,
  },
];

export function ActiveDeliveriesDrawer({
  isOpen,
  onClose,
  onSelectForQr,
}: ActiveDeliveriesDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md h-full bg-bayniks-cardDark border-l border-slate-800 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-bayniks-black/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-bayniks-orange text-white flex items-center justify-center font-bold text-lg shadow-bolt-glow">
              🏍️
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Active Fleet Dispatches
              </h3>
              <span className="text-[10px] font-mono text-bayniks-orange">
                {DEFAULT_ACTIVE_DELIVERIES.length} Parcels in Transit
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-bayniks-surfaceDark transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Deliveries List */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {DEFAULT_ACTIVE_DELIVERIES.map((delivery) => (
            <div
              key={delivery.trackingCode}
              className="clay-card p-4 rounded-2xl space-y-3 relative overflow-hidden"
            >
              {/* Top row */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-white">
                  {delivery.trackingCode}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-bayniks-orange/20 text-bayniks-orange border border-bayniks-orange/40">
                  ETA ~{delivery.etaMinutes} mins
                </span>
              </div>

              {/* Waypoints */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center space-x-2 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className="truncate">{delivery.pickupAddress}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-bayniks-orange flex-shrink-0" />
                  <span className="truncate">{delivery.dropoffAddress}</span>
                </div>
              </div>

              {/* Assigned Rider Card */}
              <div className="p-2.5 rounded-xl bg-bayniks-surfaceDark/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">
                    {delivery.riderName}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {delivery.riderBike}
                  </div>
                </div>
                <a
                  href={`tel:${delivery.riderPhone}`}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-bayniks-orange text-white text-xs font-mono transition-colors"
                >
                  📞 Call
                </a>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center space-x-2">
                <Link
                  href={`/track/${delivery.trackingCode}`}
                  className="flex-1 py-1.5 rounded-xl bg-bayniks-orange text-white font-semibold text-xs text-center shadow-bolt-glow hover:bg-bayniks-orangeDark transition-all"
                >
                  Live Radar View
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    onSelectForQr?.({
                      trackingCode: delivery.trackingCode,
                      deliveryPin: '4921',
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-bayniks-surfaceDark border border-slate-700 text-slate-200 hover:border-bayniks-orange text-xs font-mono transition-all"
                >
                  QR Pass
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
