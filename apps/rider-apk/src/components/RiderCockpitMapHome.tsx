import React, { useState, useEffect } from 'react';
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
  Clock,
  Navigation,
  Phone,
  MessageSquare,
  Compass,
  Minus,
  Plus,
  Check,
  Share2,
  ExternalLink,
  Layers,
  MapPin,
  Flame,
} from 'lucide-react';
import { useRiderStore } from '../store/riderStore';
import { playKeypadChime, playMissionAcceptChime } from '../utils/audioChimes';
import { DestinationModeSheet } from './sheets/DestinationModeSheet';
import { SurgePromptModal } from './sheets/SurgePromptModal';
import { ContactOptionsSheet } from './sheets/ContactOptionsSheet';
import { ConfirmPriceModal } from './sheets/ConfirmPriceModal';
import { RatePassengerModal } from './sheets/RatePassengerModal';
import { NavigationOverlayModal } from './NavigationOverlayModal';

export interface RiderCockpitMapHomeProps {
  onOpenDrawer: () => void;
  onOpenSafety: () => void;
  onOpenFullMap: () => void;
  onOpenEarnings: () => void;
  onOpenScheduledOrders: () => void;
  onOpenVerification?: (mode?: 'qr' | 'otp') => void;
  onOpenDriverScore?: (subTab?: 'score' | 'activity') => void;
}

export const RiderCockpitMapHome: React.FC<RiderCockpitMapHomeProps> = ({
  onOpenDrawer,
  onOpenSafety,
  onOpenFullMap,
  onOpenEarnings,
  onOpenScheduledOrders,
  onOpenVerification,
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
    incomingOffer,
    acceptOffer,
    declineOffer,
    advanceTripPhase,
    completeCurrentTrip,
    autoConfirm,
    dispatchRadiusKm,
    setDispatchRadiusKm,
    waitingSecondsLeft,
    tickWaitingTimer,
    isDestinationUpdated,
    triggerMidTripReroute,
    tripPriceConfirmation,
    setTripPriceConfirmation,
    ratePassenger,
  } = useRiderStore();

  const isOnline = riderStatus === 'available' || riderStatus === 'busy';
  const hasActiveDelivery = Boolean(activeOrder && tripPhase !== 'idle');

  // Modals & Sheets State
  const [mapCentered, setMapCentered] = useState(true);
  const [destinationModeAddress, setDestinationModeAddress] = useState<string | null>(null);
  const [isDestinationSheetOpen, setIsDestinationSheetOpen] = useState(false);
  const [isSurgePromptOpen, setIsSurgePromptOpen] = useState(false);
  const [isContactOptionsOpen, setIsContactOptionsOpen] = useState(false);
  const [isNavOverlayOpen, setIsNavOverlayOpen] = useState(false);
  const [isRatePassengerOpen, setIsRatePassengerOpen] = useState(false);
  const [isRouteDetailsOpen, setIsRouteDetailsOpen] = useState(false);
  const [autoConfirmProgress, setAutoConfirmProgress] = useState(100);

  // Active Mission Telemetry Values matching Video 2 (Warri, Delta State)
  const pickupAddress = activeOrder?.pickup?.address || '78 Airport Road, Warri 330102';
  const pickupLandmark = activeOrder?.pickup?.landmark || 'Opposite Delta Mall, Effurun Roundabout, Warri, Nigeria';
  const passengerName = activeOrder?.stops[0]?.recipientName || 'Ebi';
  const passengerPhone = activeOrder?.stops[0]?.recipientPhone || '+234 803 444 5566';
  const dropoffAddress = isDestinationUpdated
    ? 'NNPC Junior Staff Club, Warri, Nigeria'
    : (activeOrder?.stops[0]?.dropoffAddress || 'Shoprite Delta Mall, Effurun Roundabout, Warri, Nigeria');

  // Live Auto-Confirm countdown timer for incoming dispatch offer
  useEffect(() => {
    if (!incomingOffer || !autoConfirm) {
      setAutoConfirmProgress(100);
      return;
    }

    const interval = setInterval(() => {
      setAutoConfirmProgress((prev) => {
        if (prev <= 10) {
          clearInterval(interval);
          acceptOffer(incomingOffer.orderId);
          showToast('⚡ Request was auto-confirmed - Passenger is waiting for you to arrive.');
          return 0;
        }
        return prev - 20; // 5-second countdown
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [incomingOffer, autoConfirm, acceptOffer, showToast]);

  // Live Waiting at Pickup 5-Minute Timer (Video 2 Frames #48 - #60)
  useEffect(() => {
    if (tripPhase !== 'at_pickup') return;

    const interval = setInterval(() => {
      tickWaitingTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [tripPhase, tickWaitingTimer]);

  const formatWaitingClock = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleOnline = () => {
    if (kycStatus === 'pending_review') {
      showToast('Documents Under Verification. Account activated soon!');
    }
    toggleOnlineStatus();
    if (!isOnline) {
      playMissionAcceptChime();
      showToast('You are now ONLINE. Scanning Warri dispatch corridor...');
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

  const cycleRadius = () => {
    playKeypadChime();
    const next = dispatchRadiusKm === 2 ? 5 : dispatchRadiusKm === 5 ? 10 : 2;
    setDispatchRadiusKm(next);
    showToast(`Dispatch catchment radius adjusted to ${next}KM`);
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
        {/* SVG Map Background with City Corridors */}
        <svg
          className="absolute inset-0 w-full h-full object-cover"
          viewBox="0 0 400 480"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="headlight-beam-light" cx="50%" cy="100%" r="90%">
              <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#FEF08A" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#FEF08A" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="bike-gps-glow-light" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FF5722" stopOpacity="0.28" />
              <stop offset="70%" stopColor="#FF5722" stopOpacity="0.08" />
            </radialGradient>
            {/* Green Geofenced Radar Wave Gradient (Video 2 Frame #30) */}
            <radialGradient id="radar-wave-green" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00A859" stopOpacity="0.25" />
              <stop offset="75%" stopColor="#00A859" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#00A859" stopOpacity="0.02" />
            </radialGradient>
          </defs>

          {/* Road Network Grid */}
          <rect width="400" height="480" fill="#F1F4F8" />
          <path d="M 0 110 L 400 110" stroke="#E2E8F0" strokeWidth="16" />
          <path d="M 0 240 L 400 240" stroke="#CBD5E1" strokeWidth="24" />
          <path d="M 0 370 L 400 370" stroke="#E2E8F0" strokeWidth="18" />
          <path d="M 120 0 L 120 480" stroke="#E2E8F0" strokeWidth="18" />
          <path d="M 230 0 L 230 480" stroke="#CBD5E1" strokeWidth="26" />
          <path d="M 340 0 L 340 480" stroke="#E2E8F0" strokeWidth="14" />

          {/* Diagonal Arterial Corridors (Airport Road / Effurun Roundabout) */}
          <path d="M 10 30 L 390 420" stroke="#FFFFFF" strokeWidth="14" />
          <path d="M 10 30 L 390 420" stroke="#FDBA74" strokeWidth="7" strokeDasharray="9 5" />
          <path d="M 30 450 L 370 20" stroke="#FFFFFF" strokeWidth="12" />
          <path d="M 30 450 L 370 20" stroke="#93C5FD" strokeWidth="5" />

          {/* Active Navigation Polyline if trip active */}
          {hasActiveDelivery && (
            <path
              d="M 200 240 Q 230 180 270 140"
              stroke="#3B82F6"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
              strokeDasharray="1 0"
            />
          )}

          {/* Concentric Green Radar Catchment Wave when Online (Video 2 Frames #29 - #30) */}
          {isOnline && !hasActiveDelivery && (
            <g transform="translate(200, 240)">
              <circle cx="0" cy="0" r={dispatchRadiusKm * 32} fill="url(#radar-wave-green)" className="animate-pulse" />
              <circle cx="0" cy="0" r={dispatchRadiusKm * 32} fill="none" stroke="#00A859" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />
              <circle cx="0" cy="0" r={dispatchRadiusKm * 18} fill="none" stroke="#00A859" strokeWidth="1" opacity="0.4" />
            </g>
          )}

          {/* Point of Interest Icons & Labels (Warri / Delta Corridor) */}
          <g transform="translate(70, 95)">
            <circle cx="0" cy="0" r="7.5" fill="#2563EB" />
            <text x="12" y="3.5" fill="#1E293B" fontSize="9" fontWeight="700" fontFamily="sans-serif">
              Shoprite Delta Mall
            </text>
          </g>

          <g transform="translate(260, 130)">
            <circle cx="0" cy="0" r="7.5" fill="#0284C7" />
            <text x="12" y="3.5" fill="#1E293B" fontSize="9" fontWeight="700" fontFamily="sans-serif">
              78 Airport Road
            </text>
          </g>

          <g transform="translate(260, 270)">
            <circle cx="0" cy="0" r="7.5" fill="#10B981" />
            <text x="12" y="2" fill="#334155" fontSize="8" fontWeight="600" fontFamily="sans-serif">
              NNPC Junior Staff Club
            </text>
          </g>

          {/* Top-Down Dispatch Motorbike */}
          <g transform="translate(200, 240)">
            <circle cx="0" cy="0" r="28" fill="url(#bike-gps-glow-light)" />
            <polygon points="0,-10 -25,-90 25,-90" fill="url(#headlight-beam-light)" pointerEvents="none" />
            <ellipse cx="1" cy="5" rx="10" ry="19" fill="#000000" opacity="0.22" />

            {/* Rear Delivery Box */}
            <rect x="-6" y="5" width="12" height="12" rx="2.5" fill="#00A859" stroke="#059669" strokeWidth="1" />
            <text x="0" y="13.5" fill="#FFFFFF" fontSize="6" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
              B
            </text>

            <rect x="-4" y="-7" width="8" height="13" rx="3" fill="#18181B" stroke="#27272A" strokeWidth="0.8" />
            <ellipse cx="0" cy="-7" rx="3.5" ry="5" fill="#27272A" />

            <path d="M-11 -12 L 11 -12" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="-11" cy="-12" r="1.5" fill="#18181B" />
            <circle cx="11" cy="-12" r="1.5" fill="#18181B" />

            <rect x="-2" y="-21" width="4" height="10" rx="1.5" fill="#09090B" />
            <ellipse cx="0" cy="-14" rx="2.5" ry="1.5" fill="#FACC15" />
          </g>
        </svg>

        {/* Dynamic Catchment Radar Chip with + / - (Video 2 Frame #30) */}
        {isOnline && !hasActiveDelivery && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 flex items-center bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-emerald-500/30 gap-2">
            <button
              type="button"
              onClick={() => {
                playKeypadChime();
                setDispatchRadiusKm(Math.max(1, dispatchRadiusKm - 1));
              }}
              className="w-6 h-6 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-700 cursor-pointer"
            >
              <Minus size={12} />
            </button>
            <div
              onClick={cycleRadius}
              className="text-xs font-black text-emerald-800 tracking-wider uppercase cursor-pointer"
            >
              {dispatchRadiusKm} KM RADAR
            </div>
            <button
              type="button"
              onClick={() => {
                playKeypadChime();
                setDispatchRadiusKm(Math.min(15, dispatchRadiusKm + 1));
              }}
              className="w-6 h-6 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-700 cursor-pointer"
            >
              <Plus size={12} />
            </button>
          </div>
        )}

        {/* State 1: Request Auto-Confirmed Top Banner (Frame #32) */}
        {hasActiveDelivery && tripPhase === 'arriving_pickup' && (
          <div className="absolute top-4 left-16 right-16 z-30 bg-[#2563EB] text-white px-3.5 py-2 rounded-2xl shadow-lg border border-blue-400 flex items-center gap-2.5 animate-slideDown">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping shrink-0" />
            <div className="text-[11px] font-bold leading-tight">
              <div>Request was auto-confirmed</div>
              <div className="text-[10px] text-blue-100 font-normal">Passenger is waiting for you to arrive</div>
            </div>
          </div>
        )}

        {/* State 4: Mid-Trip Destination Updated Banner (Frames #69 - #70) */}
        {hasActiveDelivery && isDestinationUpdated && (
          <div className="absolute top-4 left-16 right-16 z-30 bg-[#2563EB] text-white px-3.5 py-2 rounded-2xl shadow-lg border border-blue-400 flex items-center gap-2.5 animate-slideDown">
            <MapPin size={16} className="text-white shrink-0 animate-bounce" />
            <div className="text-[11px] font-bold leading-tight">
              <div>Route updated</div>
              <div className="text-[10px] text-blue-100 font-normal">Destination has been changed</div>
            </div>
          </div>
        )}

        {/* Google watermark */}
        <div className="absolute left-[68px] bottom-5 pointer-events-none select-none z-10">
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

        {/* Top Right: Safety & External Google Maps Quick Launch */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {hasActiveDelivery && (
            <button
              type="button"
              onClick={() => setIsNavOverlayOpen(true)}
              title="Launch Turn-by-Turn Navigation"
              className="w-12 h-12 rounded-full bg-white text-emerald-600 shadow-md border border-zinc-100 flex items-center justify-center active:scale-95 transition-all cursor-pointer hover:bg-emerald-50"
            >
              <Navigation size={20} strokeWidth={2.4} />
            </button>
          )}

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
            title="Open full-screen map"
            aria-label="Open full-screen map"
            className="w-11 h-11 rounded-full bg-white text-zinc-800 shadow-md border border-zinc-100 flex items-center justify-center relative active:scale-95 transition-all cursor-pointer hover:bg-zinc-50"
          >
            <MapIcon size={19} className="text-zinc-800" strokeWidth={2.2} />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white" />
          </button>
        </div>

        {/* Bottom Right: Recenter & Filters */}
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

          {!hasActiveDelivery && (
            <button
              type="button"
              onClick={handleFilterClick}
              title="Trips towards destination & filters"
              aria-label="Trips towards destination & filters"
              className="w-11 h-11 rounded-full bg-white text-zinc-800 shadow-md border border-zinc-100 flex items-center justify-center active:scale-95 transition-all cursor-pointer hover:bg-zinc-50"
            >
              <SlidersHorizontal size={19} className="text-zinc-800" strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
       * 2. LIVE AUTO-CONFIRM INCOMING DISPATCH OFFER SHEET (Frames #31, #34 - #36)
       * ========================================================================= */}
      {incomingOffer && (
        <div className="absolute inset-x-0 bottom-0 z-40 bg-[#00A859] text-white p-5 rounded-t-3xl shadow-2xl border-t-2 border-emerald-400 animate-slideUp space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-400/40">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black">{incomingOffer.estimatedDistanceKm || 3.5} km • 6 min</span>
            </div>
            <button
              type="button"
              onClick={() => declineOffer(incomingOffer.orderId)}
              className="px-3 py-1 rounded-full bg-black/30 hover:bg-black/50 text-white text-xs font-bold border border-white/20 cursor-pointer"
            >
              ✕ Decline
            </button>
          </div>

          <div className="space-y-1">
            <div className="text-base font-black truncate">{incomingOffer.pickupAddress || pickupAddress}</div>
            <div className="text-xs text-emerald-100 font-medium truncate">{incomingOffer.pickupLandmark || pickupLandmark}</div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-white/20 px-2.5 py-0.5 rounded-full">Base • {passengerName} 5.0 ★</span>
              <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">💵 Cash</span>
            </div>
          </div>

          {/* Auto-Confirm Progress Bar */}
          <div className="w-full bg-emerald-950/40 rounded-full h-3 overflow-hidden">
            <div
              className="bg-white h-full transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${autoConfirmProgress}%` }}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              acceptOffer(incomingOffer.orderId);
              showToast('⚡ Request confirmed');
            }}
            className="w-full py-3.5 rounded-2xl bg-white text-[#00A859] font-black text-sm uppercase tracking-wider shadow-lg cursor-pointer hover:bg-emerald-50 transition-colors"
          >
            Auto-Confirm
          </button>
        </div>
      )}

      {/* =========================================================================
       * 3. "GO ONLINE" ACTION BAR (Idle Cockpit State)
       * ========================================================================= */}
      {!hasActiveDelivery && !incomingOffer && (
        <div className="relative z-30 shrink-0">
          <button
            type="button"
            onClick={handleToggleOnline}
            aria-label={isOnline ? 'Go offline' : 'Go online'}
            data-testid="bolt-online-toggle-bar"
            className={`w-full h-14 flex items-center justify-between px-6 transition-all cursor-pointer shadow-md active:scale-[0.99] ${
              isOnline
                ? 'bg-[#18181B] border-y border-[#00A859]/40 text-white'
                : 'bg-[#18181B] hover:bg-black border-y border-zinc-800 text-white'
            }`}
          >
            <div className="flex items-center gap-1 text-[#00A859]">
              {isOnline ? (
                <span className="w-2.5 h-2.5 rounded-full bg-[#00A859] animate-ping" />
              ) : (
                <ChevronsRight size={26} className="animate-pulse" strokeWidth={2.8} />
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-wide text-white">
                {isOnline ? "You're online" : 'Go online'}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-[#00A859]' : 'bg-[#FF5722]'
                }`}
              />
            </div>

            <div className="text-xs font-semibold text-zinc-400">
              {isOnline ? 'Tap to pause' : ''}
            </div>
          </button>
        </div>
      )}

      {/* =========================================================================
       * 4. ACTIVE MISSION DOCK & DASHBOARD BOTTOM CONTAINER
       * Complete 5-State Sequential Flow Replication (Video 2)
       * ========================================================================= */}
      <div className="shrink-0 bg-white px-4 pt-3 pb-4 space-y-2.5 border-t border-zinc-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] max-h-[46vh] overflow-y-auto">
        {hasActiveDelivery ? (
          <div className="space-y-3" data-testid="active-trip-mission-card">
            {/* Header: Passenger & Contact Options */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                  {passengerName.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-black text-zinc-900">{passengerName}</div>
                  <div className="text-[10px] text-zinc-500 font-semibold">5.0 ★ • Base Delivery</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsContactOptionsOpen(true)}
                  className="px-2.5 py-1 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  aria-label="Contact passenger"
                >
                  <MessageSquare size={13} className="text-zinc-600" />
                  <span>Contact {passengerName}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsRouteDetailsOpen(!isRouteDetailsOpen)}
                  className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-700 cursor-pointer"
                  aria-label="Route details"
                >
                  <Menu size={14} />
                </button>
              </div>
            </div>

            {/* Expanded Route Details Drawer (Frame #40) */}
            {isRouteDetailsOpen && (
              <div className="bg-zinc-50 rounded-2xl p-3 border border-zinc-200 space-y-2 animate-fadeIn text-xs">
                <div className="flex justify-between font-bold text-zinc-800">
                  <span>Dropoff Destination</span>
                  <span className="text-emerald-600">{dropoffAddress}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-zinc-200 text-[11px]">
                  <button
                    type="button"
                    onClick={triggerMidTripReroute}
                    className="text-blue-600 font-bold hover:underline"
                  >
                    Simulate Passenger Destination Change
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      completeCurrentTrip();
                      showToast('Trip cancelled');
                    }}
                    className="text-red-500 font-bold hover:underline"
                  >
                    Cancel trip
                  </button>
                </div>
              </div>
            )}

            {/* Trip Step Card Content */}
            {/* STATE 1: Arriving at Pickup (Frames #33, #37 - #39) */}
            {tripPhase === 'arriving_pickup' && (
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      3 min ETA
                    </span>
                    <h3 className="text-sm font-black text-zinc-900 tracking-tight mt-1">
                      {pickupAddress}
                    </h3>
                    <p className="text-[11px] text-zinc-500">{pickupLandmark}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    playMissionAcceptChime();
                    await advanceTripPhase();
                    showToast('Arrived at pickup location. Waiting for passenger.');
                  }}
                  className="w-full py-4 rounded-2xl bg-[#00A859] hover:bg-[#00924C] active:scale-[0.98] text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  <ChevronsRight size={22} strokeWidth={2.8} />
                  <span>Arriving Now</span>
                </button>
              </div>
            )}

            {/* STATE 2: Waiting at Pickup with 5-Minute Countdown (Frames #48 - #60) */}
            {tripPhase === 'at_pickup' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-emerald-50 px-3.5 py-2.5 rounded-2xl border border-emerald-200">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-emerald-700 animate-spin" />
                    <span className="text-sm font-black text-emerald-800 font-mono">
                      {formatWaitingClock(waitingSecondsLeft)} Waiting
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                    Free wait time
                  </span>
                </div>

                <div className="space-y-0.5">
                  <h3 className="text-sm font-black text-zinc-900 tracking-tight">
                    {pickupAddress}
                  </h3>
                  <p className="text-[11px] text-zinc-500">Passenger notified. Ready to embark.</p>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    playMissionAcceptChime();
                    await advanceTripPhase();
                    showToast('Trip started! Proceeding to destination.');
                  }}
                  className="w-full py-4 rounded-2xl bg-[#00A859] hover:bg-[#00924C] active:scale-[0.98] text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  <ChevronsRight size={22} strokeWidth={2.8} />
                  <span>Start Trip</span>
                </button>
              </div>
            )}

            {/* STATE 3 & 4: In-Transit with SAFETY RED SLIDER (Frames #61 - #86) */}
            {(tripPhase === 'in_transit' || tripPhase === 'at_dropoff') && (
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {isDestinationUpdated ? '3 min' : '18 min'} ETA
                    </span>
                    <h3 className="text-sm font-black text-zinc-900 tracking-tight mt-1">
                      {dropoffAddress}
                    </h3>
                    <p className="text-[11px] text-zinc-500">
                      {isDestinationUpdated ? 'Updated destination coordinates' : 'Warri Central Corridor'}
                    </p>
                  </div>
                </div>

                {/* SAFETY INVERTED RED / CORAL END TRIP SLIDER (Frames #61 - #86) */}
                <button
                  type="button"
                  onClick={() => {
                    completeCurrentTrip();
                  }}
                  className="w-full py-4 rounded-2xl bg-[#EF4444] hover:bg-[#DC2626] active:scale-[0.98] text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-500/30 transition-all cursor-pointer"
                >
                  <ChevronsRight size={22} strokeWidth={2.8} />
                  <span>End Trip</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Quick Navigation Link: Destination Mode */}
            <div className="flex justify-end items-center px-1">
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

            {/* THREE-COLUMN ROW: Today's earnings | Driver score | Confirmation rate */}
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

      {/* 3-Tier Passenger Contact Options Sheet (Frames #77 - #79) */}
      <ContactOptionsSheet
        isOpen={isContactOptionsOpen}
        onClose={() => setIsContactOptionsOpen(false)}
        passengerName={passengerName}
        passengerPhone={passengerPhone}
        onSendMessage={() => {
          showToast(`In-app chat opened with ${passengerName}`);
        }}
        onCallInApp={() => {
          showToast(`Initiating encrypted VoIP data call to ${passengerName}...`);
        }}
        onCallPhone={() => {
          showToast(`Dialing cellular phone: ${passengerPhone}`);
        }}
      />

      {/* External Google Maps Turn-by-Turn Navigation Overlay with Floating Bolt Orb (Frames #41 - #46) */}
      <NavigationOverlayModal
        isOpen={isNavOverlayOpen}
        onClose={() => setIsNavOverlayOpen(false)}
        destinationAddress={
          tripPhase === 'in_transit' || tripPhase === 'at_dropoff'
            ? dropoffAddress
            : pickupAddress
        }
        distanceText={
          tripPhase === 'in_transit'
            ? isDestinationUpdated
              ? '1.2 km'
              : '5.4 km'
            : '170 m'
        }
        etaMins={
          tripPhase === 'in_transit'
            ? isDestinationUpdated
              ? 3
              : 18
            : 3
        }
      />

      {/* Confirm Price Modal: Cash collection & Platform Compensation (Frames #87 - #89) */}
      <ConfirmPriceModal
        isOpen={Boolean(tripPriceConfirmation)}
        cashNaira={tripPriceConfirmation ? Math.floor(tripPriceConfirmation.cashKobo / 100) : 400}
        subsidyNaira={tripPriceConfirmation ? Math.floor(tripPriceConfirmation.subsidyKobo / 100) : 100}
        totalNaira={tripPriceConfirmation ? Math.floor(tripPriceConfirmation.totalKobo / 100) : 500}
        passengerName={tripPriceConfirmation?.customerName || passengerName}
        onConfirm={() => {
          setTripPriceConfirmation(null);
          setIsRatePassengerOpen(true);
        }}
      />

      {/* Rate Passenger Modal: 5-Star Rating & Optional Feedback (Frames #90 - #94) */}
      <RatePassengerModal
        isOpen={isRatePassengerOpen}
        passengerName={passengerName}
        onConfirmRating={async (rating, comment) => {
          await ratePassenger(rating, comment);
          setIsRatePassengerOpen(false);
        }}
      />
    </div>
  );
};

export default RiderCockpitMapHome;
