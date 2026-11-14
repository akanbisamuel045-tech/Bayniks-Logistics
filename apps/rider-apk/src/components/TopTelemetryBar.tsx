import React from 'react';
import { useRiderStore } from '../store/riderStore';
import { koboToNaira } from '@logistics/shared-types';
import { Menu, Navigation, Zap, Radio } from 'lucide-react';

interface TopTelemetryBarProps {
  onOpenDrawer?: () => void;
  onOpenEarnings?: () => void;
}

export const TopTelemetryBar: React.FC<TopTelemetryBarProps> = ({
  onOpenDrawer,
  onOpenEarnings,
}) => {
  const {
    riderStatus,
    toggleOnlineStatus,
    currentAccuracy,
    batteryLevel,
    todayEarningsKobo,
    plateNumber,
    isSubmitting,
    pendingOfflinePingsCount,
    isNetworkConnected,
    syncOfflinePings,
  } = useRiderStore();

  const formattedEarnings = `₦${koboToNaira(todayEarningsKobo).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const isGpsAccurate = currentAccuracy <= 5.0;
  const isOfflineOrQueued = !isNetworkConnected || pendingOfflinePingsCount > 0;

  return (
    <header className="safe-top px-3 py-2 bg-[#0E1013]/95 backdrop-blur-md border-b border-zinc-800/90 z-30 select-none">
      <div className="flex items-center justify-between gap-2 max-w-lg mx-auto">
        {/* Left: Menu Drawer Toggle & Online/Offline/Busy Button */}
        <div className="flex items-center gap-1.5">
          {onOpenDrawer && (
            <button
              onClick={onOpenDrawer}
              aria-label="Open Rider Navigation Menu"
              className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors active:scale-95 shrink-0"
            >
              <Menu className="w-5 h-5 text-white" />
            </button>
          )}

          <button
            onClick={() => toggleOnlineStatus()}
            disabled={riderStatus === 'busy' || isSubmitting}
            className={`px-3 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md touch-target-large ${
              riderStatus === 'busy'
                ? 'bg-amber-500 text-black shadow-amber-500/20'
                : riderStatus === 'available'
                ? 'bg-emerald-400 text-black shadow-emerald-500/30 ring-2 ring-emerald-300'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                riderStatus === 'busy'
                  ? 'bg-black animate-pulse'
                  : riderStatus === 'available'
                  ? 'bg-black animate-ping'
                  : 'bg-zinc-600'
              }`}
            />
            {riderStatus === 'busy' ? 'ON TRIP' : riderStatus === 'available' ? 'ONLINE' : 'OFFLINE'}
          </button>
        </div>

        {/* Center: GPS, Battery & Offline Sync Diagnostics */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {riderStatus === 'offline' ? (
            <div className="px-2 py-1 rounded-md text-[10px] font-mono font-bold bg-zinc-900 text-zinc-400 border border-zinc-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
              <span>STANDBY • Offline</span>
            </div>
          ) : isOfflineOrQueued ? (
            <button
              onClick={() => syncOfflinePings()}
              className="px-2 py-1 rounded-md text-[11px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-500/80 flex items-center gap-1 shadow-lg shadow-amber-500/20 active:scale-95 transition-transform"
              title="Click to retry syncing queued pings"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>⚡ NET LAG • {pendingOfflinePingsCount} Queued</span>
            </button>
          ) : (
            <div className="px-2 py-1 rounded-md text-[10px] font-mono font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>DISPATCH • Synced</span>
            </div>
          )}

          <div
            className={`px-1.5 sm:px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-mono font-bold flex items-center gap-1 border ${
              isGpsAccurate
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
                : 'bg-amber-950/60 text-amber-400 border-amber-800/80'
            }`}
          >
            <Navigation className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>±{currentAccuracy.toFixed(1)}m</span>
          </div>

          <div className="px-1.5 sm:px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-mono font-bold bg-zinc-900 text-zinc-300 border border-zinc-800 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400 shrink-0" />
            <span>{batteryLevel}%</span>
          </div>
        </div>

        {/* Right: Today's Earnings & Plate (Clickable to open Earnings) */}
        <button
          onClick={onOpenEarnings}
          className="text-right hover:opacity-85 active:scale-95 transition-all"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 truncate max-w-[80px]">
            {plateNumber}
          </div>
          <div className="text-xs sm:text-sm font-black text-emerald-400 font-mono tracking-tight">
            {formattedEarnings}
          </div>
        </button>
      </div>
    </header>
  );
};
