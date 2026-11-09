'use client';

import React, { useState } from 'react';
import { FleetBikeTelemetryItem } from '@logistics/shared-types';

export interface GodsEyeFleetMapProps {
  bikes: FleetBikeTelemetryItem[];
  onSelectBike?: (bike: FleetBikeTelemetryItem) => void;
  onReassignOrder?: (orderId: string, trackingCode: string, currentRiderId: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function GodsEyeFleetMap({
  bikes,
  onSelectBike,
  onReassignOrder,
  onRefresh,
  isLoading = false,
}: GodsEyeFleetMapProps) {
  const [filter, setFilter] = useState<'all' | 'available' | 'busy' | 'mock_flagged'>('all');
  const [selectedBike, setSelectedBike] = useState<FleetBikeTelemetryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBikes = bikes.filter((bike) => {
    if (filter === 'available' && bike.status !== 'available') return false;
    if (filter === 'busy' && bike.status !== 'busy') return false;
    if (filter === 'mock_flagged' && !bike.isMockLocation) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = bike.fullName.toLowerCase().includes(q);
      const matchPlate = bike.plateNumber.toLowerCase().includes(q);
      const matchTrack = bike.activeTrackingCode?.toLowerCase().includes(q);
      return matchName || matchPlate || matchTrack;
    }
    return true;
  });

  const handleBikeClick = (bike: FleetBikeTelemetryItem) => {
    setSelectedBike(bike);
    if (onSelectBike) {
      onSelectBike(bike);
    }
  };

  return (
    <div className="bg-bayniks-cardDark rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col h-[600px] relative">
      {/* Map Control Header */}
      <div className="p-4 border-b border-slate-800/80 bg-bayniks-cardDark/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-bayniks-orange/20 border border-bayniks-orange flex items-center justify-center text-bayniks-orange text-sm font-bold">
            📡
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>&ldquo;God&apos;s Eye&rdquo; Real-Time Fleet Radar</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Live Redis GPS Telemetry • {bikes.length} Total Registered Bike{bikes.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-xl text-xs font-mono font-medium transition-colors ${
              filter === 'all'
                ? 'bg-bayniks-orange text-white shadow-bolt-glow'
                : 'bg-bayniks-surfaceDark border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Bikes ({bikes.length})
          </button>

          <button
            type="button"
            onClick={() => setFilter('available')}
            className={`px-3 py-1 rounded-xl text-xs font-mono font-medium transition-colors ${
              filter === 'available'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-bayniks-surfaceDark border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Available ({bikes.filter((b) => b.status === 'available').length})
          </button>

          <button
            type="button"
            onClick={() => setFilter('busy')}
            className={`px-3 py-1 rounded-xl text-xs font-mono font-medium transition-colors ${
              filter === 'busy'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-bayniks-surfaceDark border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            In Transit ({bikes.filter((b) => b.status === 'busy').length})
          </button>

          <button
            type="button"
            onClick={() => setFilter('mock_flagged')}
            className={`px-3 py-1 rounded-xl text-xs font-mono font-medium transition-colors ${
              filter === 'mock_flagged'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-bayniks-surfaceDark border border-slate-800 text-rose-400 hover:text-rose-300'
            }`}
          >
            ⚠️ Mock GPS ({bikes.filter((b) => b.isMockLocation).length})
          </button>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh radar"
              className="p-1.5 rounded-xl bg-bayniks-surfaceDark border border-slate-700 text-slate-300 hover:text-white hover:border-bayniks-orange transition-colors text-xs"
            >
              <span className={isLoading ? 'animate-spin inline-block' : 'inline-block'}>🔄</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="px-4 py-2 bg-bayniks-cardDark/80 border-b border-slate-800 flex items-center justify-between text-xs font-mono z-20">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by plate (KJA-XXX), rider name, or tracking code..."
          className="bg-bayniks-surfaceDark border border-slate-700/80 rounded-xl px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-bayniks-orange w-80 text-xs"
        />
        <div className="text-slate-400 text-[11px] hidden sm:block">
          Displaying {filteredBikes.length} of {bikes.length} couriers
        </div>
      </div>

      {/* Vector Radar Canvas */}
      <div className="relative flex-1 bg-[#07090c] overflow-hidden flex items-center justify-center select-none">
        {/* Radar Concentric Rings & Crosshair Grid */}
        <div className="absolute inset-0 opacity-25 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(#FF6D1F_1px,transparent_1px)] [background-size:28px_28px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border border-bayniks-orange/40" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full border border-bayniks-orange/25" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[660px] h-[660px] rounded-full border border-bayniks-orange/15" />
          <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-bayniks-orange/20" />
          <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-bayniks-orange/20" />
        </div>

        {/* Lagos Hub Center Marker */}
        <div className="absolute z-10 flex flex-col items-center pointer-events-none">
          <div className="w-8 h-8 rounded-xl bg-bayniks-black border border-bayniks-orange/60 flex items-center justify-center text-xs text-bayniks-orange font-bold shadow-bolt-glow">
            🇳🇬
          </div>
          <span className="text-[9px] font-mono text-slate-400 mt-0.5">Lagos Fleet Hub</span>
        </div>

        {/* Fleet Bike Radar Markers */}
        {filteredBikes.map((bike, idx) => {
          // Normalize lat/lng relative to Lagos Central (6.5244, 3.3792) for high-fidelity radar positioning
          const deltaLat = (bike.lat - 6.5244) * 2600;
          const deltaLng = (bike.lng - 3.3792) * 2600;
          // Clamp inside viewport
          const clampedX = Math.max(-320, Math.min(320, deltaLng));
          const clampedY = Math.max(-200, Math.min(200, -deltaLat));

          const isSelected = selectedBike?.riderUserId === bike.riderUserId;

          // Color coded marker classes
          let markerColor = 'bg-slate-700 text-slate-300 border-slate-600'; // offline
          if (bike.isMockLocation) {
            markerColor = 'bg-rose-600 text-white border-white animate-bounce shadow-lg shadow-rose-950';
          } else if (bike.status === 'available') {
            markerColor = 'bg-emerald-500 text-white border-emerald-300 shadow-md shadow-emerald-950';
          } else if (bike.status === 'busy') {
            markerColor = 'bg-bayniks-orange text-white border-white shadow-bolt-glow';
          }

          return (
            <div
              key={bike.riderUserId}
              style={{
                transform: `translate(${clampedX}px, ${clampedY}px)`,
              }}
              onClick={() => handleBikeClick(bike)}
              className="absolute z-20 flex flex-col items-center cursor-pointer group transition-transform duration-300"
            >
              {/* Bike Icon Marker with Heading Vector */}
              <div className="relative">
                <div
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center text-xs transition-transform group-hover:scale-125 ${markerColor} ${
                    isSelected ? 'ring-2 ring-white scale-110' : ''
                  }`}
                >
                  <span
                    style={{ transform: `rotate(${bike.bearing}deg)` }}
                    className="inline-block transition-transform text-[11px]"
                  >
                    🏍️
                  </span>
                </div>

                {bike.isMockLocation && (
                  <span className="absolute -top-2 -right-2 text-[10px] bg-rose-600 text-white px-1 rounded-full font-bold animate-ping">
                    !
                  </span>
                )}
              </div>

              {/* Plate Number & Speed Pill */}
              <div className="mt-1 px-1.5 py-0.5 rounded bg-bayniks-black/90 border border-slate-800 text-[9px] font-mono text-slate-300 whitespace-nowrap shadow-md flex items-center gap-1">
                <span className="font-semibold text-white">{bike.plateNumber}</span>
                <span className="text-slate-400">({bike.speed}km/h)</span>
              </div>
            </div>
          );
        })}

        {filteredBikes.length === 0 && (
          <div className="absolute z-20 p-4 rounded-xl bg-bayniks-cardDark/90 border border-slate-800 text-center text-xs text-slate-400 font-mono">
            No bikes match the current filter criteria.
          </div>
        )}
      </div>

      {/* Selected Bike Quick Inspector Drawer */}
      {selectedBike && (
        <div className="p-4 bg-bayniks-cardDark border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 z-30">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold ${
                selectedBike.isMockLocation
                  ? 'bg-rose-600/20 border border-rose-500 text-rose-400'
                  : selectedBike.status === 'available'
                  ? 'bg-emerald-600/20 border border-emerald-500 text-emerald-400'
                  : 'bg-bayniks-orange/20 border border-bayniks-orange text-bayniks-orange'
              }`}
            >
              🏍️
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs">{selectedBike.fullName}</span>
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-bayniks-surfaceDark border border-slate-700 text-slate-300">
                  {selectedBike.plateNumber}
                </span>
                <span
                  className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                    selectedBike.status === 'available'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : selectedBike.status === 'busy'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {selectedBike.status.toUpperCase()}
                </span>
                {selectedBike.isMockLocation && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 animate-pulse">
                    ⚠️ SPOOF DETECTED
                  </span>
                )}
              </div>

              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-3">
                <span>Phone: {selectedBike.phone}</span>
                <span>• Speed: {selectedBike.speed} km/h</span>
                <span>• Coords: {selectedBike.lat.toFixed(4)}, {selectedBike.lng.toFixed(4)}</span>
                {selectedBike.activeTrackingCode && (
                  <span className="text-bayniks-orange font-bold">
                    • Order: {selectedBike.activeTrackingCode}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedBike.activeOrderId && onReassignOrder && (
              <button
                type="button"
                onClick={() =>
                  onReassignOrder(
                    selectedBike.activeOrderId!,
                    selectedBike.activeTrackingCode || 'LGS-ACTIVE',
                    selectedBike.riderUserId
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-bayniks-orange hover:bg-bayniks-orangeDark text-white text-xs font-semibold shadow-bolt-glow transition-all flex items-center gap-1.5"
              >
                <span>⚡</span> Mid-Trip Reassign
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedBike(null)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-bayniks-surfaceDark text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

