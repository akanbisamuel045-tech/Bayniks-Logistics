'use client';

import React from 'react';
import Link from 'next/link';
import { formatNaira } from '@logistics/shared-types';
import { Bike, X, Phone, Compass, QrCode } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md h-full bg-white border-l border-slate-200 flex flex-col shadow-2xl text-slate-900">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-bayniks-orange text-white flex items-center justify-center shadow-bolt-glow">
              <Bike className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Active Fleet Dispatches
              </h3>
              <span className="text-[10px] font-mono font-bold text-bayniks-orange">
                {DEFAULT_ACTIVE_DELIVERIES.length} Parcels in Transit
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close active dispatches"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Deliveries List */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {DEFAULT_ACTIVE_DELIVERIES.map((delivery) => (
            <div
              key={delivery.trackingCode}
              className="clay-card p-4 rounded-2xl space-y-3 relative overflow-hidden bg-white border border-slate-200 shadow-sm"
            >
              {/* Top row */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-black text-slate-900">
                  {delivery.trackingCode}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-bayniks-orange/20 text-bayniks-orange border border-bayniks-orange/30">
                  ETA ~{delivery.etaMinutes} mins
                </span>
              </div>

              {/* Waypoints */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center space-x-2 text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                  <span className="truncate font-medium">{delivery.pickupAddress}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-bayniks-orange flex-shrink-0" />
                  <span className="truncate font-medium">{delivery.dropoffAddress}</span>
                </div>
              </div>

              {/* Assigned Rider Card */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {delivery.riderName}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {delivery.riderBike}
                  </div>
                </div>
                <a
                  href={`tel:${delivery.riderPhone}`}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-bold font-mono transition-colors flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call</span>
                </a>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center space-x-2">
                <Link
                  href={`/track/${delivery.trackingCode}`}
                  className="flex-1 py-1.5 rounded-xl bg-bayniks-orange text-white font-bold text-xs text-center shadow-bolt-glow hover:bg-bayniks-orangeDark transition-all flex items-center justify-center gap-1.5"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Live Radar View</span>
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    onSelectForQr?.({
                      trackingCode: delivery.trackingCode,
                      deliveryPin: '4921',
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 font-bold hover:border-bayniks-orange text-xs font-mono transition-all flex items-center gap-1"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QR Pass</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

