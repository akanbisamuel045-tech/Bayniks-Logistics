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
  X,
  Sparkles,
} from 'lucide-react';
import { useRiderStore } from '../store/riderStore';
import { playKeypadChime, playMissionAcceptChime } from '../utils/audioChimes';
import { CenterMissionCard } from './CenterMissionCard';
import { DestinationModeSheet } from './sheets/DestinationModeSheet';
import { SurgePromptModal } from './sheets/SurgePromptModal';

export interface RiderCockpitMapHomeProps {
  onOpenDrawer: () => void;
  onOpenSafety: () => void;
  onOpenFullMap: () => void;
  onOpenEarnings: () => void;
  onOpenRewards: () => void;
  onOpenScheduledOrders: () => void;
  onOpenVerification?: (mode?: 'qr' | 'otp') => void;
  onOpenCampaigns?: () => void;
  onOpenDriverScore?: (subTab?: 'score' | 'activity') => void;
}

export const RiderCockpitMapHome: React.FC<RiderCockpitMapHomeProps> = ({
  onOpenDrawer,
  onOpenSafety,
  onOpenFullMap,
  onOpenEarnings,
  onOpenRewards,
  onOpenScheduledOrders,
  onOpenVerification,
  onOpenCampaigns,
  onOpenDriverScore,
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
  const [destinationModeAddress, setDestinationModeAddress] = useState<string | null>(null);
  const [isDestinationSheetOpen, setIsDestinationSheetOpen] = useState(false);
  const [isSurgePromptOpen, setIsSurgePromptOpen] = useState(false);

  const handleToggleOnline = () => {
    if (kycStatus === 'pending_review') {
      showToast('Documents Under Verification. Account activated soon!');
    }
    toggleOnlineStatus();
    if (!isOnline) {
      playMissionAcceptChime();
      showToast('You are now ONLINE. Searching for orders in Lagos...');
      // Occasionally trigger high rates surge prompt matching video Frame #6
      setTimeout(() => {
        setIsSurgePromptOpen(true);
      }, 1200);
    } else {
      playKeypadChime();
      setDestinationModeAddress(null);
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
    setIsDestinationSheetOpen(true);
  };

  return (
    <div
      className="relative w-full h-full flex flex-col bg-[#F4F5F7] select-none overflow-hidden"
      data-testid="rider-cockpit-map-home"
    >
      {/* =========================================================================
       * 1. TOP INTERACTIVE LIGHT MODE DAYTIME MAP CANVAS
       * ========================================================================= */}
      <div className="relative flex-1 w-full bg-[#EEF1F5] overflow-hidden min-h-[260px]">
        {/* SVG Light Mode Map Background (Detailed Lagos Road Network) */}
        <svg
          className="absolute inset-0 w-full h-full object-cover"
          viewBox="0 0 400 480"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Luminous headlight cone for the dispatch bike */}
            <radialGradient id="headlight-beam-light" cx="50%" cy="100%" r="90%">
              <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#FEF08A" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#FEF08A" stopOpacity="0" />
            </radialGradient>
            {/* GPS pulse glow */}
            <radialGradient id="bike-gps-glow-light" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FF5722" stopOpacity="0.28" />
              <stop offset="70%" stopColor="#FF5722" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#FF5722" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Clean Soft Land Base (Daytime) */}
          <rect width="100%" height="100%" fill="#EEF1F5" />

          {/* Natural Waterways & Lagoon curves (Daytime Blue) */}
          <path
            d="M-20 60 Q 80 40 180 85 T 420 50 L 420 -20 L -20 -20 Z"
            fill="#D4E6F6"
          />
          <path
            d="M320 180 Q 360 260 330 380 Q 310 460 380 500 L 420 500 L 420 180 Z"
            fill="#D4E6F6"
          />

          {/* Park / Greenery patches (Soft Mint Green) */}
          <path
            d="M20 220 Q 60 200 90 230 Q 80 270 30 265 Z"
            fill="#DCF2E5"
          />
          <path
            d="M260 80 Q 300 70 320 100 Q 295 130 265 110 Z"
            fill="#DCF2E5"
          />

          {/* Secondary & Residential Streets (Pure White with Light Borders) */}
          <g stroke="#CBD5E1" strokeWidth="4.5" strokeLinecap="round">
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

          <g stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round">
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

          {/* Primary Arterial Expressways (Higher contrast road) */}
          <g stroke="#94A3B8" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M-10 145 Q 120 160 200 240 T 410 320" />
            <path d="M190 -20 L 200 240 L 185 500" />
            <path d="M30 40 L 370 440" strokeWidth="6" />
          </g>
          <g stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M-10 145 Q 120 160 200 240 T 410 320" />
            <path d="M190 -20 L 200 240 L 185 500" />
            <path d="M30 40 L 370 440" strokeWidth="4.5" />
          </g>

          {/* Expressway Centerlines */}
          <g stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="5 5" strokeLinecap="round">
            <path d="M-10 145 Q 120 160 200 240 T 410 320" />
            <path d="M190 -20 L 200 240 L 185 500" />
          </g>

          {/* Point of Interest Icons & Labels */}
          <g transform="translate(65, 95)">
            <circle cx="0" cy="0" r="7.5" fill="#2563EB" />
            <path d="M-3 -1 L 3 -1 L 2 4 L -2 4 Z M-1.5 -1 C-1.5 -2.5 1.5 -2.5 1.5 -1" fill="none" stroke="#FFF" strokeWidth="1" />
            <text x="12" y="3.5" fill="#1E293B" fontSize="9" fontWeight="700" fontFamily="sans-serif">
              Ikeja City Mall
            </text>
          </g>

          <g transform="translate(200, 130)">
            <circle cx="0" cy="0" r="7.5" fill="#0284C7" />
            <circle cx="-1.5" cy="2.5" r="0.9" fill="#FFF" />
            <circle cx="2" cy="2.5" r="0.9" fill="#FFF" />
            <path d="M-4 -3 L -2.5 -3 L -1 1 L 3 1 L 4 -2" fill="none" stroke="#FFF" strokeWidth="1" />
            <text x="12" y="3.5" fill="#1E293B" fontSize="9" fontWeight="700" fontFamily="sans-serif">
              Smart Supermarket
            </text>
          </g>

          <g transform="translate(260, 195)">
            <circle cx="0" cy="0" r="7.5" fill="#10B981" />
            <path d="M0 -3 C-2 -1 -2 2 0 3 C2 2 2 -1 0 -3 Z" fill="#FFF" />
            <text x="12" y="2" fill="#334155" fontSize="8" fontWeight="600" fontFamily="sans-serif">
              Sant'Anton Park
            </text>
          </g>

          <g transform="translate(170, 245)">
            <text x="0" y="0" fill="#DC2626" fontSize="9.5" fontWeight="800" fontFamily="sans-serif" letterSpacing="0.5">
              Yaba Tech Hub
            </text>
          </g>

          <g transform="translate(260, 270)">
            <text x="0" y="0" fill="#64748B" fontSize="8" fontWeight="600" fontFamily="sans-serif">
              Homemate Co. Ltd
            </text>
          </g>

          <g transform="translate(185, 430)">
            <text x="0" y="0" fill="#0F172A" fontSize="10.5" fontWeight="800" fontFamily="sans-serif" letterSpacing="0.8">
              Victoria Island
            </text>
          </g>

          {/* Top-Down Dispatch Motorbike */}
          <g transform="translate(200, 240)">
            <circle cx="0" cy="0" r="28" fill="url(#bike-gps-glow-light)" />
            <circle cx="0" cy="0" r="16" fill="none" stroke="#FF5722" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />

            <polygon points="0,-10 -25,-90 25,-90" fill="url(#headlight-beam-light)" pointerEvents="none" />
            <ellipse cx="1" cy="5" rx="10" ry="19" fill="#000000" opacity="0.22" />

            {/* Rear Delivery Box */}
            <rect x="-6" y="5" width="12" height="12" rx="2.5" fill="#FF5722" stroke="#EA580C" strokeWidth="1" />
            <text x="0" y="13.5" fill="#FFFFFF" fontSize="6" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
              B
            </text>

            <rect x="-4" y="-7" width="8" height="13" rx="3" fill="#18181B" stroke="#27272A" strokeWidth="0.8" />
            <ellipse cx="0" cy="-7" rx="3.5" ry="5" fill="#27272A" />

            <path d="M-11 -12 L 11 -12" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="-11" cy="-12" r="1.5" fill="#18181B" />
            <circle cx="11" cy="-12" r="1.5" fill="#18181B" />
            <circle cx="-12" cy="-14" r="1.2" fill="#64748B" />
            <circle cx="12" cy="-14" r="1.2" fill="#64748B" />

            <rect x="-2" y="-21" width="4" height="10" rx="1.5" fill="#09090B" />
            <ellipse cx="0" cy="-14" rx="2.5" ry="1.5" fill="#FACC15" />
          </g>
        </svg>

        {/* Destination Mode Active Corridor Top Banner (Matching Frame #30) */}
        {destinationModeAddress && (
          <div className="absolute top-4 left-18 right-18 z-20 bg-amber-500 text-white px-3 py-1.5 rounded-full flex items-center justify-between shadow-md">
            <div className="flex items-center gap-1.5 text-xs font-black truncate">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="truncate">Matching trips towards... {destinationModeAddress}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                playKeypadChime();
                setDestinationModeAddress(null);
                showToast('Destination matching deactivated');
              }}
              className="p-1 hover:bg-amber-600 rounded-full cursor-pointer ml-1"
              aria-label="Cancel destination"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Google watermark */}
        <div className="absolute left-4 bottom-3 pointer-events-none select-none z-10">
          <span className="text-[11px] font-bold text-zinc-500/80 tracking-wider">Google</span>
        </div>

        {/* FLOATING ACTION BUTTONS */}
        {/* Top Left: Hamburger Menu */}
        <div className="absolute top-4 left-4 z-20">
          <button
            type="button"
            onClick={onOpenDrawer}
            title="Open navigation menu"
            aria-label="Open navigation menu"
            data-testid="home-drawer-toggle"
            className="w-12 h-12 rounded-full bg-white text-zinc-800 shadow-md border border-zinc-100 flex items-center justify-center active:scale-95 transition-all cursor-pointer hover:bg-zinc-50"
          >
            <Menu size={22} strokeWidth={2.4} />
          </button>
        </div>

        {/* Top Right: Safety & SCAN */}
        <div className="absolute top-4 right-4 z-20">
          <button
            type="button"
            onClick={onOpenSafety}
            title="Safety & SOS Toolkit"
            aria-label="Safety & SOS Toolkit"
            className="w-12 h-12 rounded-full bg-white text-zinc-800 shadow-md border border-zinc-100 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer hover:bg-zinc-50"
          >
            <Shield size={19} className="text-zinc-800" strokeWidth={2.2} />
            <span className="text-[8px] font-black tracking-wider text-zinc-600 uppercase leading-none mt-0.5">
              SCAN
            </span>
          </button>
        </div>

        {/* Bottom Left: Folded Map Layers */}
        <div className="absolute bottom-3 left-4 z-20">
          <button
            type="button"
            onClick={onOpenFullMap}
            title="Open full-screen Lagos map"
            aria-label="Open full-screen Lagos map"
            className="w-11 h-11 rounded-full bg-white text-zinc-800 shadow-md border border-zinc-100 flex items-center justify-center relative active:scale-95 transition-all cursor-pointer hover:bg-zinc-50"
          >
            <MapIcon size={19} className="text-zinc-800" strokeWidth={2.2} />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white" />
          </button>
        </div>

        {/* Bottom Right: Stacked GPS Center & Filter Buttons */}
        <div className="absolute bottom-3 right-4 z-20 flex flex-col items-center gap-2.5">
          <button
            type="button"
            onClick={handleRecenter}
            title="Center location"
            aria-label="Center location"
            className="w-11 h-11 rounded-full bg-white text-zinc-800 shadow-md border border-zinc-100 flex items-center justify-center active:scale-95 transition-all cursor-pointer hover:bg-zinc-50"
          >
            <Crosshair size={19} className="text-zinc-800" strokeWidth={2.2} />
          </button>

          {/* Sliders / Destination Filters Button */}
          <button
            type="button"
            onClick={handleFilterClick}
            title="Trips towards destination & filters"
            aria-label="Trips towards destination & filters"
            className="w-11 h-11 rounded-full bg-white text-zinc-800 shadow-md border border-zinc-100 flex items-center justify-center active:scale-95 transition-all cursor-pointer hover:bg-zinc-50"
          >
            <SlidersHorizontal size={19} className="text-zinc-800" strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* =========================================================================
       * 2. "GO ONLINE" ACTION BAR
       * Follows user rule: black with a touch of orange!
       * ========================================================================= */}
      <div className="relative z-30 shrink-0">
        <button
          type="button"
          onClick={handleToggleOnline}
          aria-label={isOnline ? 'Go offline' : 'Go online'}
          data-testid="bolt-online-toggle-bar"
          className={`w-full h-14 flex items-center justify-between px-6 transition-all cursor-pointer shadow-md active:scale-[0.99] ${
            destinationModeAddress
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : isOnline
              ? 'bg-[#18181B] border-y border-[#FF5722]/40 text-white'
              : 'bg-[#18181B] hover:bg-black border-y border-zinc-800 text-white'
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
              {destinationModeAddress ? 'Go offline' : isOnline ? "You're online" : 'Go online'}
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
       * 3. DASHBOARD BOTTOM LIGHT CONTAINER (Exact Replication of Video Frames #1 - #4)
       * ========================================================================= */}
      <div className="shrink-0 bg-white px-4 pt-3 pb-4 space-y-2.5 border-t border-zinc-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] max-h-[46vh] overflow-y-auto">
        {hasActiveDelivery ? (
          <div className="py-1">
            <CenterMissionCard
              onOpenVerification={onOpenVerification}
              onOpenFullMap={onOpenFullMap}
            />
          </div>
        ) : (
          <>
            {/* CARD 1: ACTIVE CAMPAIGN MILESTONE CARD (Frames #1 - #4) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                playKeypadChime();
                if (onOpenCampaigns) onOpenCampaigns();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (onOpenCampaigns) onOpenCampaigns();
                }
              }}
              className="w-full bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-zinc-200/80 rounded-2xl p-3.5 space-y-2 cursor-pointer shadow-2xs transition-all active:scale-[0.99]"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Rush
                </span>
                <span className="text-zinc-500 font-semibold">Today, 07:00-11:59</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-zinc-900 tracking-tight">
                    ₦1500 MORNING BONUS
                  </h4>
                  <div className="text-[11px] text-zinc-500 font-medium">
                    Base: Lagos • Trips: 0/6 • Hours: 0h/4h
                  </div>
                </div>
                <ChevronRight size={16} className="text-zinc-400 shrink-0" />
              </div>
              <div className="flex items-center justify-between text-[11px] font-bold text-purple-700 pt-1 border-t border-zinc-200/60">
                <span>View all conditions</span>
                <span className="text-zinc-400 font-normal">Min 85% accept</span>
              </div>
            </div>

            {/* Quick Navigation Links: View all campaigns & Destination Mode */}
            <div className="flex justify-between items-center px-1">
              <button
                type="button"
                onClick={() => {
                  playKeypadChime();
                  if (onOpenCampaigns) onOpenCampaigns();
                }}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 transition cursor-pointer"
              >
                View all campaigns &gt;
              </button>
              <button
                type="button"
                onClick={() => {
                  playKeypadChime();
                  setIsDestinationSheetOpen(true);
                }}
                className="text-xs font-bold text-zinc-600 hover:text-zinc-900 transition cursor-pointer"
              >
                Trips towards destination (2/2) &gt;
              </button>
            </div>

            {/* THREE-COLUMN ROW: Today's earnings | Driver score | Confirmation rate (Frames #1 - #4) */}
            <div className="grid grid-cols-3 gap-2">
              {/* Card A: Today's earnings */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  playKeypadChime();
                  onOpenEarnings();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenEarnings();
                  }
                }}
                className="bg-[#F4F6F9] hover:bg-[#EEF1F6] border border-zinc-200/70 rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer active:scale-[0.99] transition-all min-h-[76px]"
              >
                <span className="text-[10px] text-zinc-500 font-bold block truncate">
                  Today's earnings
                </span>
                <div className="mt-1">
                  <span className="text-sm font-black text-zinc-900 font-mono tracking-tight block truncate">
                    ₦ {Math.floor((todayEarningsKobo || 0) / 100).toLocaleString('en-NG')}
                  </span>
                </div>
                <span className="text-[9px] text-zinc-400 font-medium">0 trips</span>
              </div>

              {/* Card B: Driver score */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  playKeypadChime();
                  if (onOpenDriverScore) onOpenDriverScore('score');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (onOpenDriverScore) onOpenDriverScore('score');
                  }
                }}
                className="bg-[#F4F6F9] hover:bg-[#EEF1F6] border border-zinc-200/70 rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer active:scale-[0.99] transition-all min-h-[76px]"
              >
                <span className="text-[10px] text-zinc-500 font-bold block truncate">
                  Driver score
                </span>
                <div className="mt-1 flex items-center gap-1">
                  <span className="text-sm font-black text-emerald-600 font-mono tracking-tight block">
                    92%
                  </span>
                  <span className="text-[10px] text-zinc-500">★ 4.92</span>
                </div>
                <span className="text-[9px] text-emerald-700 font-bold">Great</span>
              </div>

              {/* Card C: Confirmation rate */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  playKeypadChime();
                  if (onOpenDriverScore) onOpenDriverScore('activity');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (onOpenDriverScore) onOpenDriverScore('activity');
                  }
                }}
                className="bg-[#F4F6F9] hover:bg-[#EEF1F6] border border-zinc-200/70 rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer active:scale-[0.99] transition-all min-h-[76px]"
              >
                <span className="text-[10px] text-zinc-500 font-bold block truncate">
                  Confirm rate
                </span>
                <div className="mt-1">
                  <span className="text-sm font-black text-zinc-900 font-mono tracking-tight block">
                    100%
                  </span>
                </div>
                <span className="text-[9px] text-zinc-400 font-medium">Past 50 jobs</span>
              </div>
            </div>

            {/* CARD 3: New Scheduled Deliveries requests */}
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
              className="w-full bg-[#F4F6F9] hover:bg-[#EEF1F6] border border-zinc-200/70 rounded-2xl p-3 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <CalendarClock size={17} strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-zinc-900 block truncate leading-tight">
                    New Scheduled Deliveries requests
                  </span>
                  <span className="text-[11px] text-zinc-500 font-normal block truncate mt-0.5">
                    There are 0 open requests
                  </span>
                </div>
              </div>
              <ChevronRight size={16} className="text-zinc-400 shrink-0 ml-2" />
            </div>
          </>
        )}
      </div>

      {/* Trips Towards Destination Sheet (Frames #28 - #31) */}
      <DestinationModeSheet
        isOpen={isDestinationSheetOpen}
        onClose={() => setIsDestinationSheetOpen(false)}
        onSelectDestination={(dest) => setDestinationModeAddress(dest)}
      />

      {/* Higher Rates Surge Prompt Modal (Frame #6) */}
      <SurgePromptModal
        isOpen={isSurgePromptOpen}
        onStayOnline={() => setIsSurgePromptOpen(false)}
        onGoOffline={() => {
          setIsSurgePromptOpen(false);
          toggleOnlineStatus();
          showToast('You are now OFFLINE');
        }}
      />
    </div>
  );
};

export default RiderCockpitMapHome;
