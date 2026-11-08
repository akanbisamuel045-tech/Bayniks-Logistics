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
    <div className="relative flex-1 w-full bg-zinc-950 overflow-hidden flex flex-col justify-between p-3 select-none">
      {/* Radar Background Visual Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00E676" stopOpacity="0.15" />
              <stop offset="70%" stopColor="#00E676" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#radar-glow)" />
          {/* Concentric distance rings */}
          <circle cx="50%" cy="50%" r="20%" fill="none" stroke="#00E676" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="50%" cy="50%" r="38%" fill="none" stroke="#00E676" strokeWidth="1" strokeDasharray="4 4" />
          <circle cx="50%" cy="50%" r="56%" fill="none" stroke="#00E676" strokeWidth="1" opacity="0.5" />
          {/* Crosshairs */}
          <line x1="50%" y1="0%" x2="50%" y2="100%" stroke="#00E676" strokeWidth="0.8" opacity="0.3" />
          <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="#00E676" strokeWidth="0.8" opacity="0.3" />
        </svg>
      </div>

      {/* Top Floating Overlay: Speedometer & Telemetry Status */}
      <div className="relative z-10 flex items-start justify-between">
        {/* Speedometer Gauge */}
        <div className="bg-black/85 border border-zinc-800 rounded-2xl px-4 py-2.5 backdrop-blur-md shadow-2xl flex items-baseline gap-1.5">
          <span className="text-3xl font-black text-amber-400 font-mono tracking-tighter">
            {Math.round(currentSpeed)}
          </span>
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">KM/H</span>
        </div>

        {/* Live Redis Telemetry Status */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="bg-black/85 border border-zinc-800 rounded-xl px-2.5 py-1 backdrop-blur-md flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">
              5s Redis RAM Stream
            </span>
          </div>

          {activeDestination && (
            <button
              onClick={launchGoogleMapsNavigation}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/30 flex items-center gap-1.5 transition-transform active:scale-95"
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
          <div className="absolute w-28 h-28 rounded-full border border-emerald-500/40 animate-pulse-ring" />

          {/* Directional Motorcycle Indicator */}
          <div
            className="w-14 h-14 rounded-full bg-zinc-900 border-2 border-emerald-400 shadow-xl shadow-emerald-500/40 flex items-center justify-center transition-transform duration-300"
            style={{ transform: `rotate(${currentBearing}deg)` }}
          >
            <svg
              className="w-7 h-7 text-emerald-400"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              {/* Crisp Directional Arrow */}
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
            </svg>
          </div>

          <span className="mt-1.5 px-2 py-0.5 rounded-md bg-black/80 text-[10px] font-mono font-bold text-zinc-300 border border-zinc-800">
            {currentBearing}° • {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
          </span>
        </div>

        {/* Target Destination Marker if active order present */}
        {activeDestination && (
          <div className="absolute top-1/4 right-8 flex flex-col items-center animate-bounce">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg font-black text-xs ${
                activeDestination.type === 'pickup'
                  ? 'bg-emerald-500 text-black shadow-emerald-500/50'
                  : 'bg-red-500 text-white shadow-red-500/50'
              }`}
            >
              {activeDestination.type === 'pickup' ? 'P' : 'D'}
            </div>
            <div className="mt-1 px-2 py-0.5 bg-black/90 border border-zinc-800 rounded text-[10px] font-bold text-zinc-200 max-w-[130px] truncate text-center">
              {activeDestination.label}
            </div>
          </div>
        )}
      </div>

      {/* Simulation GPS Control Pad (Useful for browser testing & field demo) */}
      {simulationMode && (
        <div className="relative z-10 bg-black/75 border border-zinc-800/80 rounded-xl p-2 max-w-xs mx-auto mb-1">
          <div className="text-[10px] uppercase font-bold text-zinc-400 text-center mb-1">
            🎮 GPS Simulation Pad
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <button
              onClick={() => simulateGpsMove(0.0015, 0, 0)}
              className="px-2 py-1 bg-zinc-800 active:bg-zinc-700 text-xs rounded font-bold"
            >
              ↑ North
            </button>
            <button
              onClick={() => simulateGpsMove(0, 0.0015, 90)}
              className="px-2 py-1 bg-zinc-800 active:bg-zinc-700 text-xs rounded font-bold"
            >
              → East
            </button>
            <button
              onClick={() => simulateGpsMove(-0.0015, 0, 180)}
              className="px-2 py-1 bg-zinc-800 active:bg-zinc-700 text-xs rounded font-bold"
            >
              ↓ South
            </button>
            <button
              onClick={() => simulateGpsMove(0, -0.0015, 270)}
              className="px-2 py-1 bg-zinc-800 active:bg-zinc-700 text-xs rounded font-bold"
            >
              ← West
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

