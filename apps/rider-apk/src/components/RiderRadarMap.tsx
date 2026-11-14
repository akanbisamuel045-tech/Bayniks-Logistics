import React, { useMemo } from 'react';
import { useRiderStore } from '../store/riderStore';

export const RiderRadarMap: React.FC = () => {
  const {
    currentLocation,
    currentBearing,
    currentSpeed,
    activeOrder,
    tripPhase,
    simulationMode,
    setCurrentLocation,
  } = useRiderStore();

  // Determine current active navigation destination
  const activeDestination = useMemo(() => {
    if (!activeOrder) return null;
    if (tripPhase === 'arriving_pickup' || tripPhase === 'at_pickup') {
      return {
        label: 'Pickup: ' + activeOrder.pickup.landmark,
        address: activeOrder.pickup.address,
        coords: activeOrder.pickup.location,
        type: 'pickup',
      };
    }
    const currentStop = activeOrder.stops[0];
    if (currentStop) {
      return {
        label: 'Dropoff: ' + currentStop.dropoffLandmark,
        address: currentStop.dropoffAddress,
        coords: currentStop.dropoffLocation,
        type: 'dropoff',
      };
    }
    return null;
  }, [activeOrder, tripPhase]);

  // Open native Android Google Maps navigation intent
  const launchGoogleMapsNavigation = () => {
    if (!activeDestination) return;
    const { lat, lng } = activeDestination.coords;
    // Android intent URL with fallback to standard web Google Maps
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=two-wheeler`;
    window.open(mapsUrl, '_system');
  };

  // Simulated GPS jogger for testing bearing/movement
  const simulateGpsMove = (deltaLat: number, deltaLng: number, newBearing: number) => {
    setCurrentLocation(
      {
        lat: Number((currentLocation.lat + deltaLat).toFixed(6)),
        lng: Number((currentLocation.lng + deltaLng).toFixed(6)),
      },
      newBearing,
      Math.floor(25 + Math.random() * 20),
      2.8
    );
  };

  return (
    <div className="relative flex-1 w-full bg-[#F1F4F8] overflow-hidden flex flex-col justify-between p-3 select-none">
      {/* Radar Background Visual Grid (Light Mode) */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.12" />
              <stop offset="70%" stopColor="#0284C7" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#radar-glow)" />
          {/* Concentric distance rings */}
          <circle cx="50%" cy="50%" r="20%" fill="none" stroke="#94A3B8" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="50%" cy="50%" r="38%" fill="none" stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 4" />
          <circle cx="50%" cy="50%" r="56%" fill="none" stroke="#10B981" strokeWidth="1" opacity="0.4" />
          {/* Crosshairs */}
          <line x1="50%" y1="0%" x2="50%" y2="100%" stroke="#94A3B8" strokeWidth="0.8" opacity="0.35" />
          <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="#94A3B8" strokeWidth="0.8" opacity="0.35" />
        </svg>
      </div>

      {/* Top Floating Overlay: Speedometer & Telemetry Status */}
      <div className="relative z-10 flex items-start justify-between">
        {/* Speedometer Gauge */}
        <div className="bg-white/95 border border-zinc-200 rounded-2xl px-4 py-2.5 backdrop-blur-md shadow-md flex items-baseline gap-1.5">
          <span className="text-3xl font-black text-zinc-900 font-mono tracking-tighter">
            {Math.round(currentSpeed)}
          </span>
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">KM/H</span>
        </div>

        {/* Live Redis Telemetry Status */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="bg-white/95 border border-emerald-200 rounded-xl px-2.5 py-1 backdrop-blur-md flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase">
              5s Redis RAM Stream
            </span>
          </div>

          {activeDestination && (
            <button
              onClick={launchGoogleMapsNavigation}
              className="px-3 py-1.5 rounded-xl bg-[#FF6D1F] hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-orange-500/20 flex items-center gap-1.5 transition-transform active:scale-95"
            >
              <span>Google Maps</span>
              <span className="text-sm">↗</span>
            </button>
          )}
        </div>
      </div>

      {/* Center Radar Display Area */}
      <div className="relative z-10 flex-1 flex items-center justify-center">
        {/* Center: Rider Vehicle Indicator */}
        <div className="relative flex flex-col items-center justify-center">
          {/* Pulse Ripple */}
          <div className="absolute w-28 h-28 rounded-full border-2 border-emerald-500/30 animate-pulse-ring" />

          {/* Directional Motorcycle Indicator */}
          <div
            className="w-14 h-14 rounded-full bg-white border-2 border-emerald-500 shadow-xl shadow-emerald-500/20 flex items-center justify-center transition-transform duration-300"
            style={{ transform: `rotate(${currentBearing}deg)` }}
          >
            <svg
              className="w-7 h-7 text-emerald-600"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              {/* Crisp Directional Arrow */}
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
            </svg>
          </div>

          <span className="mt-1.5 px-2 py-0.5 rounded-md bg-white/95 text-[10px] font-mono font-bold text-zinc-700 border border-zinc-200 shadow-sm">
            {currentBearing}° • {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
          </span>
        </div>

        {/* Target Destination Marker if active order present */}
        {activeDestination && (
          <div className="absolute top-24 right-3 sm:right-6 flex flex-col items-center animate-bounce z-20">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-xl font-black text-xs border-2 border-white ${
                activeDestination.type === 'pickup'
                  ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                  : 'bg-[#FF6D1F] text-white shadow-orange-500/30'
              }`}
            >
              {activeDestination.type === 'pickup' ? 'P' : 'D'}
            </div>
            <div className="mt-1 px-2.5 py-1 bg-white border border-zinc-200 rounded-xl text-[10px] font-mono font-bold text-zinc-900 max-w-[170px] sm:max-w-[210px] text-center leading-tight shadow-md">
              {activeDestination.label}
            </div>
          </div>
        )}
      </div>

      {/* Simulation GPS Control Pad (Useful for browser testing & field demo) */}
      {simulationMode && (
        <div className="relative z-10 bg-white/95 border border-zinc-200 shadow-md rounded-xl p-2 max-w-xs mx-auto mb-1">
          <div className="text-[10px] uppercase font-bold text-zinc-500 text-center mb-1">
            🎮 GPS Simulation Pad
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <button
              onClick={() => simulateGpsMove(0.0015, 0, 0)}
              className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-800 text-xs rounded font-bold transition-colors"
            >
              ↑ North
            </button>
            <button
              onClick={() => simulateGpsMove(0, 0.0015, 90)}
              className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-800 text-xs rounded font-bold transition-colors"
            >
              → East
            </button>
            <button
              onClick={() => simulateGpsMove(-0.0015, 0, 180)}
              className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-800 text-xs rounded font-bold transition-colors"
            >
              ↓ South
            </button>
            <button
              onClick={() => simulateGpsMove(0, -0.0015, 270)}
              className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-800 text-xs rounded font-bold transition-colors"
            >
              ← West
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

