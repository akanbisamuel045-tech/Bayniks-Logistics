import React, { useState } from 'react';
import {
  Menu,
  Shield,
  Map as MapIcon,
  Crosshair,
  SlidersHorizontal,
  CalendarClock,
  ChevronRight,
  ChevronsRight,
  Pause,
  AlertCircle,
  Package,
} from 'lucide-react';
import { useRiderStore } from '../store/riderStore';
import { playKeypadChime, playMissionAcceptChime } from '../utils/audioChimes';
import { CenterMissionCard } from './CenterMissionCard';

export interface RiderCockpitMapHomeProps {
  onOpenDrawer: () => void;
  onOpenSafety: () => void;
  onOpenFullMap: () => void;
  onOpenEarnings: () => void;
  onOpenRewards: () => void;
  onOpenScheduledOrders: () => void;
  onOpenVerification?: (mode?: 'qr' | 'otp') => void;
}

export const RiderCockpitMapHome: React.FC<RiderCockpitMapHomeProps> = ({
  onOpenDrawer,
  onOpenSafety,
  onOpenFullMap,
  onOpenEarnings,
  onOpenRewards,
  onOpenScheduledOrders,
  onOpenVerification,
}) => {
  const {
    riderStatus,
    tripPhase,
    activeOrder,
    todayEarningsKobo,
    toggleOnlineStatus,
    showToast,
    kycStatus,
  } = useRiderStore();

  const isOnline = riderStatus === 'available' || riderStatus === 'busy';
  const hasActiveDelivery = Boolean(activeOrder && tripPhase !== 'idle');

  const [mapCentered, setMapCentered] = useState(true);

  const handleToggleOnline = () => {
    if (kycStatus === 'pending_review') {
      showToast('Documents Under Verification. Account activated soon!');
    }
    toggleOnlineStatus();
    if (!isOnline) {
      playMissionAcceptChime();
      showToast('You are now ONLINE. Searching for orders in Lagos...');
    } else {
      playKeypadChime();
      showToast('Shift paused. You are now OFFLINE');
    }
  };

  const handleRecenter = () => {
    playKeypadChime();
    setMapCentered(true);
    showToast('GPS centered on dispatch bike');
  };

  const handleFilterClick = () => {
    playKeypadChime();
    showToast('Delivery radius: 10km • Auto-accept available');
  };

  return (
    <div
      className="relative w-full h-full flex flex-col bg-[#0B1220] select-none overflow-hidden"
      data-testid="rider-cockpit-map-home"
    >
      {/* =========================================================================
       * 1. TOP INTERACTIVE NIGHT MAP CANVAS (MATCHES REFERENCE IMAGE)
       * ========================================================================= */}
      <div className="relative flex-1 w-full bg-[#0B1220] overflow-hidden min-h-[300px]">
        {/* SVG Night Map Background (Detailed Lagos Road Network) */}
        <svg
          className="absolute inset-0 w-full h-full object-cover"
          viewBox="0 0 400 480"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Soft luminous headlight cone for the dispatch bike */}
            <radialGradient id="headlight-beam" cx="50%" cy="100%" r="90%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#FFD166" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#FFD166" stopOpacity="0" />
            </radialGradient>
            {/* GPS pulse glow */}
            <radialGradient id="bike-gps-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FF5722" stopOpacity="0.35" />
              <stop offset="70%" stopColor="#FF5722" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#FF5722" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Deep Navy/Black Base Land */}
          <rect width="100%" height="100%" fill="#0B1220" />

          {/* Natural Waterways & Lagoon curves */}
          <path
            d="M-20 60 Q 80 40 180 85 T 420 50 L 420 -20 L -20 -20 Z"
            fill="#060C17"
          />
          <path
            d="M320 180 Q 360 260 330 380 Q 310 460 380 500 L 420 500 L 420 180 Z"
            fill="#070E1A"
          />

          {/* Park / Greenery patches */}
          <path
            d="M20 220 Q 60 200 90 230 Q 80 270 30 265 Z"
            fill="#0E1B18"
            opacity="0.8"
          />
          <path
            d="M260 80 Q 300 70 320 100 Q 295 130 265 110 Z"
            fill="#0E1B18"
            opacity="0.8"
          />

          {/* Secondary & Residential Streets (Dark Slate/Steel) */}
          <g stroke="#141D2D" strokeWidth="2.5" strokeLinecap="round" opacity="0.85">
            <path d="M-10 110 L 410 135" />
            <path d="M-20 180 L 420 195" />
            <path d="M-10 260 L 410 270" />
            <path d="M-15 340 L 420 355" />
            <path d="M-10 420 L 410 430" />

            <path d="M60 -10 L 75 490" />
            <path d="M140 -20 L 155 500" />
            <path d="M225 -10 L 235 490" />
            <path d="M305 -15 L 315 500" />

            <path d="M30 300 L 120 400" />
            <path d="M120 140 L 220 230" />
            <path d="M240 280 L 330 370" />
          </g>

          {/* Primary Arterial Expressways (Higher contrast steel) */}
          <g stroke="#1F2B40" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M-10 145 Q 120 160 200 240 T 410 320" />
            <path d="M190 -20 L 200 240 L 185 500" />
            <path d="M30 40 L 370 440" strokeWidth="4.5" />
          </g>

          {/* Expressway Centerlines */}
          <g stroke="#2C3B56" strokeWidth="1.5" strokeDasharray="6 6" strokeLinecap="round">
            <path d="M-10 145 Q 120 160 200 240 T 410 320" />
            <path d="M190 -20 L 200 240 L 185 500" />
          </g>

          {/* Point of Interest Icons & Labels matching the Reference Photo */}
          {/* 1. Mall (like PAM Shopping Mall) */}
          <g transform="translate(65, 95)">
            <circle cx="0" cy="0" r="7" fill="#2563EB" />
            <path d="M-3 -1 L 3 -1 L 2 4 L -2 4 Z M-1.5 -1 C-1.5 -2.5 1.5 -2.5 1.5 -1" fill="none" stroke="#FFF" strokeWidth="1" />
            <text x="12" y="3" fill="#E2E8F0" fontSize="9" fontWeight="700" fontFamily="sans-serif">
              Ikeja City Mall
            </text>
          </g>

          {/* 2. Supermarket (like Smart Supermarket) */}
          <g transform="translate(200, 130)">
            <circle cx="0" cy="0" r="7" fill="#2563EB" />
            <circle cx="-1.5" cy="2.5" r="0.9" fill="#FFF" />
            <circle cx="2" cy="2.5" r="0.9" fill="#FFF" />
            <path d="M-4 -3 L -2.5 -3 L -1 1 L 3 1 L 4 -2" fill="none" stroke="#FFF" strokeWidth="1" />
            <text x="12" y="3" fill="#E2E8F0" fontSize="9" fontWeight="700" fontFamily="sans-serif">
              Smart Supermarket
            </text>
          </g>

          {/* 3. Park / Garden (like Il-Ġnien ta' Sant'Anton) */}
          <g transform="translate(260, 195)">
            <circle cx="0" cy="0" r="7" fill="#10B981" />
            <path d="M0 -3 C-2 -1 -2 2 0 3 C2 2 2 -1 0 -3 Z" fill="#FFF" />
            <text x="12" y="1" fill="#CBD5E1" fontSize="8" fontWeight="600" fontFamily="sans-serif">
              Sant'Anton Park
            </text>
          </g>

          {/* 4. Commercial hub (like Attard) */}
          <g transform="translate(170, 245)">
            <text x="0" y="0" fill="#F87171" fontSize="9" fontWeight="800" fontFamily="sans-serif" letterSpacing="0.5">
              Yaba Tech Hub
            </text>
          </g>

          {/* 5. Store (like Homemate Co. Ltd) */}
          <g transform="translate(260, 270)">
            <text x="0" y="0" fill="#94A3B8" fontSize="8" fontWeight="600" fontFamily="sans-serif">
              Homemate Co. Ltd
            </text>
          </g>

          {/* 6. District (like Zebbuġ) */}
          <g transform="translate(185, 430)">
            <text x="0" y="0" fill="#CBD5E1" fontSize="10" fontWeight="800" fontFamily="sans-serif" letterSpacing="0.8">
              Victoria Island
            </text>
          </g>

          {/* Road Name Street Badges */}
          <text x="140" y="325" fill="#475569" fontSize="6.5" fontWeight="600" transform="rotate(35 140 325)">
            Commercial Ave
          </text>
          <text x="215" y="375" fill="#475569" fontSize="6.5" fontWeight="600" transform="rotate(-60 215 375)">
            Herbert Macaulay Way
          </text>

          {/* Top-Down Dispatch Motorbike (Centered right in the middle, facing forward) */}
          <g transform="translate(200, 240)">
            {/* GPS Pulse Ring */}
            <circle cx="0" cy="0" r="28" fill="url(#bike-gps-glow)" />
            <circle cx="0" cy="0" r="16" fill="none" stroke="#FF5722" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />

            {/* Headlight beam shining onto road */}
            <polygon points="0,-10 -25,-90 25,-90" fill="url(#headlight-beam)" pointerEvents="none" />

            {/* Bike Shadow */}
            <ellipse cx="1" cy="4" rx="9" ry="18" fill="#000000" opacity="0.5" />

            {/* Rear Delivery Box (Signature Bayniks Orange) */}
            <rect x="-6" y="5" width="12" height="12" rx="2.5" fill="#FF5722" stroke="#EA580C" strokeWidth="1" />
            <text x="0" y="13.5" fill="#FFFFFF" fontSize="6" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
              B
            </text>

            {/* Seat & Chassis */}
            <rect x="-4" y="-7" width="8" height="13" rx="3" fill="#18181B" stroke="#27272A" strokeWidth="0.8" />

            {/* Fuel Tank */}
            <ellipse cx="0" cy="-7" rx="3.5" ry="5" fill="#27272A" />

            {/* Handlebars with Grips & Mirrors */}
            <path d="M-11 -12 L 11 -12" stroke="#D4D4D8" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="-11" cy="-12" r="1.5" fill="#18181B" />
            <circle cx="11" cy="-12" r="1.5" fill="#18181B" />
            {/* Mirrors */}
            <circle cx="-12" cy="-14" r="1.2" fill="#94A3B8" />
            <circle cx="12" cy="-14" r="1.2" fill="#94A3B8" />

            {/* Front Fender & Tire */}
            <rect x="-2" y="-21" width="4" height="10" rx="1.5" fill="#09090B" />
            {/* Front Headlight glass */}
            <ellipse cx="0" cy="-14" rx="2.5" ry="1.5" fill="#FEF08A" />
          </g>
        </svg>

        {/* Google watermark in bottom-left */}
        <div className="absolute left-4 bottom-3 pointer-events-none select-none z-10">
          <span className="text-[11px] font-bold text-white/50 tracking-wider">Google</span>
        </div>

        {/* =====================================================================
         * FLOATING MAP ACTION BUTTONS (EXACT POSITIONS FROM REFERENCE IMAGE)
         * ===================================================================== */}

        {/* 1. Top Left: Hamburger Menu Button (Circled in green by user) */}
        <div className="absolute top-4 left-4 z-20">
          <button
            type="button"
            onClick={onOpenDrawer}
            title="Open navigation menu"
            aria-label="Open navigation menu"
            data-testid="home-drawer-toggle"
            className="w-12 h-12 rounded-full bg-[#181F2C]/90 backdrop-blur-md border border-white/10 text-white shadow-xl flex items-center justify-center active:scale-95 transition-all cursor-pointer hover:bg-[#20293A]"
          >
            <Menu size={22} strokeWidth={2.4} />
          </button>
        </div>

        {/* 2. Top Right: Safety & SCAN Button */}
        <div className="absolute top-4 right-4 z-20">
          <button
            type="button"
            onClick={onOpenSafety}
            title="Safety & SOS Toolkit"
            aria-label="Safety & SOS Toolkit"
            className="w-12 h-12 rounded-full bg-[#181F2C]/90 backdrop-blur-md border border-white/10 text-white shadow-xl flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer hover:bg-[#20293A]"
          >
            <Shield size={19} className="text-zinc-200" strokeWidth={2.2} />
            <span className="text-[8px] font-black tracking-wider text-zinc-300 uppercase leading-none mt-0.5">
              SCAN
            </span>
          </button>
        </div>

        {/* 3. Bottom Left: Folded Map Layers Button with Red Notification Dot */}
        <div className="absolute bottom-3 left-4 z-20">
          <button
            type="button"
            onClick={onOpenFullMap}
            title="Open full-screen Lagos map"
            aria-label="Open full-screen Lagos map"
            className="w-11 h-11 rounded-full bg-[#181F2C]/95 backdrop-blur-md border border-white/10 text-white shadow-xl flex items-center justify-center relative active:scale-95 transition-all cursor-pointer hover:bg-[#20293A]"
          >
            <MapIcon size={19} className="text-zinc-200" strokeWidth={2.2} />
            {/* Red Notification Badge */}
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-[#181F2C]" />
          </button>
        </div>

        {/* 4. Bottom Right: Stacked GPS Center & Filter Buttons */}
        <div className="absolute bottom-3 right-4 z-20 flex flex-col items-center gap-2.5">
          {/* Target / Recenter Button */}
          <button
            type="button"
            onClick={handleRecenter}
            title="Center location"
            aria-label="Center location"
            className="w-11 h-11 rounded-full bg-[#181F2C]/95 backdrop-blur-md border border-white/10 text-white shadow-xl flex items-center justify-center active:scale-95 transition-all cursor-pointer hover:bg-[#20293A]"
          >
            <Crosshair size={19} className="text-zinc-200" strokeWidth={2.2} />
          </button>

          {/* Sliders / Filters Button */}
          <button
            type="button"
            onClick={handleFilterClick}
            title="Delivery preferences & filters"
            aria-label="Delivery preferences & filters"
            className="w-11 h-11 rounded-full bg-[#181F2C]/95 backdrop-blur-md border border-white/10 text-white shadow-xl flex items-center justify-center active:scale-95 transition-all cursor-pointer hover:bg-[#20293A]"
          >
            <SlidersHorizontal size={19} className="text-zinc-200" strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* =========================================================================
       * 2. "GO ONLINE" ACTION BAR (FULL-WIDTH SLIDER/TAP BAR)
       * In Bolt it's green. Here we use the user's rule: black with a touch of orange!
       * ========================================================================= */}
      <div className="relative z-30 shrink-0">
        <button
          type="button"
          onClick={handleToggleOnline}
          aria-label={isOnline ? 'Go offline' : 'Go online'}
          data-testid="bolt-online-toggle-bar"
          className={`w-full h-14 flex items-center justify-between px-6 transition-all cursor-pointer shadow-lg active:scale-[0.99] ${
            isOnline
              ? 'bg-[#18181B] border-y border-[#FF5722]/40 text-white'
              : 'bg-[#18181B] hover:bg-black border-y border-white/10 text-white'
          }`}
        >
          {/* Left indicator: Orange chevrons or active pulse */}
          <div className="flex items-center gap-1 text-[#FF5722]">
            {isOnline ? (
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-ping" />
            ) : (
              <ChevronsRight size={26} className="animate-pulse" strokeWidth={2.8} />
            )}
          </div>

          {/* Center Title */}
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold tracking-wide text-white">
              {isOnline ? "You're online" : 'Go online'}
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-[#10B981]' : 'bg-[#FF5722]'
              }`}
            />
          </div>

          {/* Right helper */}
          <div className="text-xs font-semibold text-zinc-400">
            {isOnline ? 'Tap to pause' : ''}
          </div>
        </button>
      </div>

      {/* =========================================================================
       * 3. DASHBOARD BOTTOM SLATE CONTAINER (CARDS SECTION)
       * ========================================================================= */}
      <div className="shrink-0 bg-[#151C28] px-4 pt-3 pb-4 space-y-2.5 border-t border-white/5">
        {/* If there is an active mission in progress, show mission card prominently */}
        {hasActiveDelivery ? (
          <div className="py-1">
            <CenterMissionCard
              onOpenVerification={onOpenVerification}
              onOpenFullMap={onOpenFullMap}
            />
          </div>
        ) : (
          <>
            {/* CARD 1: New Scheduled Deliveries requests (matches Bolt UI) */}
            <div
              role="button"
              tabIndex={0}
              onClick={onOpenScheduledOrders}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenScheduledOrders();
                }
              }}
              className="w-full bg-[#1E2638] hover:bg-[#253046] border border-white/5 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#2A364E] text-[#60A5FA] flex items-center justify-center shrink-0">
                  <CalendarClock size={20} strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <span className="text-[13px] font-bold text-white block truncate leading-tight">
                    New Scheduled Deliveries requests
                  </span>
                  <span className="text-xs text-zinc-400 font-normal block truncate mt-0.5">
                    There are 0 open requests
                  </span>
                </div>
              </div>
              <ChevronRight size={18} className="text-zinc-400 shrink-0 ml-2" />
            </div>

            {/* TWO-COLUMN ROW: Today's earnings & Bayniks Rewards */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Card 2: Today's earnings */}
              <div
                role="button"
                tabIndex={0}
                onClick={onOpenEarnings}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenEarnings();
                  }
                }}
                className="bg-[#1E2638] hover:bg-[#253046] border border-white/5 rounded-2xl p-3.5 flex flex-col justify-between cursor-pointer active:scale-[0.99] transition-all min-h-[88px]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-medium">
                    Today's earnings
                  </span>
                  <ChevronRight size={16} className="text-zinc-400" />
                </div>
                <div className="mt-2">
                  <span className="text-lg font-black text-white font-mono tracking-tight block">
                    ₦ {Math.floor((todayEarningsKobo || 0) / 100).toLocaleString('en-NG', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              {/* Card 3: Bayniks Rewards (Bronze tier) */}
              <div
                role="button"
                tabIndex={0}
                onClick={onOpenRewards}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenRewards();
                  }
                }}
                className="bg-[#1E2638] hover:bg-[#253046] border border-white/5 rounded-2xl p-3.5 flex flex-col justify-between cursor-pointer active:scale-[0.99] transition-all min-h-[88px]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-medium">
                    Bayniks Rewards
                  </span>
                  <ChevronRight size={16} className="text-zinc-400" />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {/* Bronze badge: Orange circle with white center dot */}
                  <span className="w-4 h-4 rounded-full bg-[#EA580C] ring-2 ring-[#EA580C]/40 flex items-center justify-center shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  </span>
                  <span className="text-sm font-bold text-white tracking-wide">
                    Bronze
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RiderCockpitMapHome;
