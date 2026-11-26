import React, { useEffect, useState } from 'react';
import {
  Banknote,
  CalendarClock,
  ChevronRight,
  ChevronsRight,
  Clock,
  Crosshair,
  List,
  Map as MapIcon,
  MapPin,
  Menu,
  MessageSquare,
  Minus,
  Navigation,
  Plus,
  Search,
  Share2,
  SlidersHorizontal,
  User,
  X,
  Zap,
} from 'lucide-react';
import { useRiderStore } from '../store/riderStore';
import { playKeypadChime, playMissionAcceptChime } from '../utils/audioChimes';
import { DestinationModeSheet } from './sheets/DestinationModeSheet';
import { SurgePromptModal } from './sheets/SurgePromptModal';
import { ContactOptionsSheet } from './sheets/ContactOptionsSheet';
import { ConfirmPriceModal } from './sheets/ConfirmPriceModal';
import { RatePassengerModal } from './sheets/RatePassengerModal';
import { MapLocationSearchSheet } from './sheets/MapLocationSearchSheet';
import { NavigationOverlayModal } from './NavigationOverlayModal';
import { RiderChatSheet } from './RiderChatSheet';
import { BayniksLiveMap } from './map/BayniksLiveMap';
import {
  CURATED_NIGERIA_PLACES,
  MapSearchPlace,
  requestRealDeviceLocation,
  watchRealDeviceLocation,
} from '../utils/locationSearch';

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
    preferredMapEngine,
    setPreferredMapEngine,
    currentLocation,
    currentBearing,
    setCurrentLocation,
    dispatchRadiusKm,
    setDispatchRadiusKm,
    waitingSecondsLeft,
    tickWaitingTimer,
    isDestinationUpdated,
    triggerMidTripReroute,
    tripPriceConfirmation,
    setTripPriceConfirmation,
    ratePassenger,
    tripsCompletedToday,
  } = useRiderStore();

  const isOnline = riderStatus === 'available' || riderStatus === 'busy';
  const hasActiveDelivery = Boolean(activeOrder && tripPhase !== 'idle');

  // Modals & Sheets State
  const [destinationModeAddress, setDestinationModeAddress] = useState<string | null>(null);
  const [isDestinationSheetOpen, setIsDestinationSheetOpen] = useState(false);
  const [isSurgePromptOpen, setIsSurgePromptOpen] = useState(false);
  const [isContactOptionsOpen, setIsContactOptionsOpen] = useState(false);
  const [isChatSheetOpen, setIsChatSheetOpen] = useState(false);
  const [isNavOverlayOpen, setIsNavOverlayOpen] = useState(false);
  const [isRatePassengerOpen, setIsRatePassengerOpen] = useState(false);
  const [isRouteDetailsOpen, setIsRouteDetailsOpen] = useState(false);
  const [isSearchSheetOpen, setIsSearchSheetOpen] = useState(false);
  const [searchedPlace, setSearchedPlace] = useState<MapSearchPlace | null>(null);
  const [stopNewRequests, setStopNewRequests] = useState(false);
  const [autoConfirmProgress, setAutoConfirmProgress] = useState(100);
  const [recenterNonce, setRecenterNonce] = useState(0);

  // Sync currentLocation with the rider's real device GPS location on mount and live movement
  useEffect(() => {
    let active = true;
    requestRealDeviceLocation().then((fix) => {
      if (active && fix) {
        setCurrentLocation({ lat: fix.lat, lng: fix.lng }, fix.heading, fix.speed, fix.accuracy);
      }
    });
    const stopWatch = watchRealDeviceLocation((fix) => {
      if (active) {
        setCurrentLocation({ lat: fix.lat, lng: fix.lng }, fix.heading, fix.speed, fix.accuracy);
      }
    });
    return () => {
      active = false;
      stopWatch();
    };
  }, [setCurrentLocation]);

  const handleSyncRealGps = async () => {
    setSearchedPlace(null);
    const fix = await requestRealDeviceLocation();
    if (fix) {
      setCurrentLocation({ lat: fix.lat, lng: fix.lng }, fix.heading, fix.speed, fix.accuracy);
      setRecenterNonce((n) => n + 1);
      showToast('Centered on your real current GPS location');
    } else {
      setRecenterNonce((n) => n + 1);
      showToast('GPS centered on dispatch bike');
    }
  };

  const googleKeyConfigured = Boolean(
    ((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '').trim()
  );

  const pickupCoord = activeOrder?.pickup?.location || { lat: 6.5882, lng: 3.3489 };
  const dropoffCoord = isDestinationUpdated
    ? { lat: 6.578, lng: 3.356 }
    : activeOrder?.stops?.[0]?.dropoffLocation || { lat: 6.5655, lng: 3.368 };
  const showActiveRoute = hasActiveDelivery || Boolean(incomingOffer);
  const routeOriginCoord =
    tripPhase === 'in_transit' || tripPhase === 'at_dropoff'
      ? pickupCoord
      : currentLocation;
  const routeTargetCoord =
    tripPhase === 'in_transit' || tripPhase === 'at_dropoff'
      ? dropoffCoord
      : pickupCoord;

  const pickupAddress = activeOrder?.pickup?.address || '78 Airport Road, Warri 330102';
  const pickupLandmark =
    activeOrder?.pickup?.landmark || 'Beside Delta Mall, Effurun Roundabout, Warri, Nigeria';
  const passengerName = activeOrder?.stops[0]?.recipientName || 'Ebi';
  const passengerPhone = activeOrder?.stops[0]?.recipientPhone || '+234 803 444 5566';
  const dropoffAddress = isDestinationUpdated
    ? 'NNPC Junior Staff Club, Warri, Nigeria'
    : activeOrder?.stops[0]?.dropoffAddress ||
      'Shoprite Delta Mall, Effurun Roundabout, Warri, Nigeria';

  // Live Auto-Confirm countdown timer for incoming offer (state tick only)
  useEffect(() => {
    if (!incomingOffer || !autoConfirm) {
      setAutoConfirmProgress(100);
      return;
    }

    const interval = setInterval(() => {
      setAutoConfirmProgress((prev) => (prev <= 20 ? 0 : prev - 20));
    }, 1000);

    return () => clearInterval(interval);
  }, [incomingOffer, autoConfirm]);

  // Accept incoming offer cleanly after render once auto-confirm countdown hits 0
  useEffect(() => {
    if (!incomingOffer || !autoConfirm || autoConfirmProgress > 0) return;
    acceptOffer(incomingOffer.orderId);
    showToast('Request was auto-confirmed • Passenger is waiting for you to arrive.');
  }, [autoConfirmProgress, incomingOffer, autoConfirm, acceptOffer, showToast]);

  // Live 5-minute waiting countdown while at pickup
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

  const cycleRadius = () => {
    playKeypadChime();
    const next = dispatchRadiusKm === 2 ? 5 : dispatchRadiusKm === 5 ? 10 : 2;
    setDispatchRadiusKm(next);
    showToast(`Dispatch catchment radius adjusted to ${next}KM`);
  };

  const activeEtaMins =
    tripPhase === 'in_transit' || tripPhase === 'at_dropoff'
      ? isDestinationUpdated
        ? 3
        : 18
      : 5;

  return (
    <div
      className="relative w-full h-full flex flex-col bg-[#F4F4F5] select-none overflow-hidden text-[#18181B]"
      data-testid="rider-cockpit-map-home"
    >
      {/* =====================================================================
       * TOP FLOATING ONLINE PILL HEADER (Video Frame #3 when Online & Idle)
       * ===================================================================== */}
      {isOnline && !hasActiveDelivery && !incomingOffer && (
        <div className="shrink-0 bg-white px-4 py-2.5 border-b border-zinc-100 flex items-center justify-between gap-3 z-30">
          <button
            type="button"
            onClick={onOpenDrawer}
            title="Open navigation menu"
            aria-label="Open navigation menu"
            data-testid="home-drawer-toggle"
            className="w-10 h-10 rounded-full bg-zinc-100 text-[#18181B] flex items-center justify-center active:scale-95 transition-all cursor-pointer hover:bg-zinc-200"
          >
            <Menu size={20} strokeWidth={2.4} />
          </button>

          <button
            type="button"
            onClick={handleToggleOnline}
            aria-label="Go offline"
            data-testid="bolt-online-toggle-bar"
            className="flex-1 max-w-[230px] h-11 rounded-full bg-[#FF5722] hover:bg-[#EA580C] text-white px-5 flex items-center justify-center gap-2.5 shadow-md active:scale-[0.98] transition-all cursor-pointer"
          >
            <ChevronsRight size={20} className="text-[#18181B]" strokeWidth={2.8} />
            <span className="text-[14.5px] font-bold tracking-tight">Go offline</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playKeypadChime();
              setIsSearchSheetOpen(true);
            }}
            title="Search locations on map"
            aria-label="Search locations on map"
            data-testid="home-map-search-btn"
            className="w-10 h-10 rounded-full bg-zinc-100 text-[#18181B] flex items-center justify-center active:scale-95 transition-all cursor-pointer hover:bg-zinc-200"
          >
            <Search size={19} strokeWidth={2.3} />
          </button>
        </div>
      )}

      {/* =====================================================================
       * 1. REAL INTERACTIVE MAP CANVAS (#1 Google Maps + #2 MapLibre GL JS)
       * ===================================================================== */}
      <div className="relative flex-1 w-full bg-[#F4F4F5] overflow-hidden min-h-[250px]">
        <BayniksLiveMap
          riderLocation={currentLocation}
          focusLocation={!showActiveRoute && searchedPlace ? searchedPlace.coords : undefined}
          riderBearing={currentBearing}
          pickupLocation={showActiveRoute ? pickupCoord : undefined}
          pickupLabel={showActiveRoute ? pickupAddress.split(',')[0] : undefined}
          dropoffLocation={
            showActiveRoute
              ? dropoffCoord
              : searchedPlace
              ? searchedPlace.coords
              : undefined
          }
          dropoffLabel={
            showActiveRoute
              ? dropoffAddress.split(',')[0]
              : searchedPlace
              ? searchedPlace.label
              : undefined
          }
          routeOrigin={
            showActiveRoute
              ? routeOriginCoord
              : searchedPlace
              ? currentLocation
              : undefined
          }
          routeTarget={
            showActiveRoute
              ? routeTargetCoord
              : searchedPlace
              ? searchedPlace.coords
              : undefined
          }
          showRadar={isOnline && !hasActiveDelivery && !incomingOffer}
          radarRadiusKm={dispatchRadiusKm}
          recenterNonce={recenterNonce}
          fitRouteBounds={Boolean(!showActiveRoute && searchedPlace)}
          zoom={showActiveRoute || searchedPlace ? 14 : 13.5}
          testId="cockpit-live-map"
        />

        {/* Searched Map Pin Banner Chip */}
        {!showActiveRoute && searchedPlace && (
          <div
            className="absolute top-3.5 left-16 right-16 z-20 bg-[#18181B] text-white px-3.5 py-2 rounded-full shadow-lg flex items-center justify-between gap-2 animate-fadeIn"
            data-testid="searched-location-pill"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#FF5722] shrink-0" />
              <span className="text-[12px] font-semibold truncate">{searchedPlace.address}</span>
            </div>
            <button
              type="button"
              onClick={() => setSearchedPlace(null)}
              aria-label="Clear searched location"
              className="text-zinc-400 hover:text-white shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Catchment Radar Radius Control (- 2KM +) */}
        {isOnline && !hasActiveDelivery && !incomingOffer && (
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20 flex items-center bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-zinc-200 gap-2.5">
            <button
              type="button"
              onClick={() => {
                playKeypadChime();
                setDispatchRadiusKm(Math.max(1, dispatchRadiusKm - 1));
              }}
              aria-label="Decrease radar radius"
              className="w-6 h-6 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-[#18181B] cursor-pointer"
            >
              <Minus size={12} />
            </button>
            <div
              onClick={cycleRadius}
              className="text-xs font-black text-[#18181B] tracking-wider uppercase cursor-pointer flex items-center gap-1"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5722]" />
              <span>{dispatchRadiusKm} KM</span>
            </div>
            <button
              type="button"
              onClick={() => {
                playKeypadChime();
                setDispatchRadiusKm(Math.min(15, dispatchRadiusKm + 1));
              }}
              aria-label="Increase radar radius"
              className="w-6 h-6 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-[#18181B] cursor-pointer"
            >
              <Plus size={12} />
            </button>
          </div>
        )}

        {/* Banner 1: Request Auto-Confirmed (Video Frame #9 - Black + Atomic Orange) */}
        {hasActiveDelivery && tripPhase === 'arriving_pickup' && (
          <div
            className="absolute top-3.5 left-4 right-4 z-30 bg-[#18181B] text-white px-3.5 py-2.5 rounded-xl shadow-lg border border-zinc-800 flex items-center gap-3 animate-slideDown"
            data-testid="banner-auto-confirmed"
          >
            <span className="w-7 h-7 rounded-full bg-[#FF5722] text-white flex items-center justify-center shrink-0">
              <Zap size={14} fill="currentColor" />
            </span>
            <div className="text-[12px] leading-tight">
              <div className="font-bold text-white">Request was auto-confirmed</div>
              <div className="text-[11px] text-zinc-300 mt-0.5">
                Passenger is waiting for you to arrive.
              </div>
            </div>
          </div>
        )}

        {/* Banner 2: Mid-Trip Route Updated (Video Sheet #6 - Black + Atomic Orange) */}
        {hasActiveDelivery && isDestinationUpdated && (
          <div
            className="absolute top-3.5 left-4 right-4 z-30 bg-[#18181B] text-white px-3.5 py-2.5 rounded-xl shadow-lg border border-[#FF5722]/40 flex items-center gap-3 animate-slideDown"
            data-testid="banner-route-updated"
          >
            <span className="w-7 h-7 rounded-full bg-[#FF5722] text-white flex items-center justify-center shrink-0">
              <MapPin size={14} />
            </span>
            <div className="text-[12px] leading-tight">
              <div className="font-bold text-white">Route updated</div>
              <div className="text-[11px] text-zinc-300 mt-0.5">
                Destination has been changed
              </div>
            </div>
          </div>
        )}

        {/* Map Engine Quick-Switch Badge (#1 Google Maps <-> #2 MapLibre Vector) */}
        <button
          type="button"
          onClick={() => {
            playKeypadChime();
            const nextEngine = preferredMapEngine === 'google' ? 'maplibre' : 'google';
            setPreferredMapEngine(nextEngine);
            showToast(
              nextEngine === 'google'
                ? googleKeyConfigured
                  ? 'Switched to Google Maps (#1)'
                  : 'Google Maps (#1) selected • using MapLibre (#2) until API key is set'
                : 'Switched to MapLibre GL Vector (#2)'
            );
          }}
          data-testid="cockpit-map-engine-pill"
          className="absolute left-16 bottom-3 z-20 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-xs border border-zinc-200 shadow-xs flex items-center gap-1.5 text-[10.5px] font-bold text-[#18181B] hover:bg-white cursor-pointer"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF5722]" />
          <span>
            {preferredMapEngine === 'google' && googleKeyConfigured
              ? 'Google Maps'
              : 'Bayniks • MapLibre'}
          </span>
        </button>

        {/* FLOATING TOP BUTTONS (when Offline OR during Active Delivery) */}
        {(!isOnline || hasActiveDelivery) && (
          <>
            {!incomingOffer && (
              <div className="absolute top-4 left-4 z-20">
                <button
                  type="button"
                  onClick={onOpenDrawer}
                  title="Open navigation menu"
                  aria-label="Open navigation menu"
                  data-testid="home-drawer-toggle"
                  className="w-11 h-11 rounded-full bg-white text-[#18181B] shadow-md border border-zinc-100 flex items-center justify-center active:scale-95 transition-all cursor-pointer hover:bg-zinc-50"
                >
                  <Menu size={20} strokeWidth={2.4} />
                </button>
              </div>
            )}

            {/* Right Stack: Navigation & Chat during Active Delivery OR Safety Shield when Offline */}
            <div
              className={`absolute ${
                hasActiveDelivery ? 'top-20' : 'top-4'
              } right-4 z-20 flex flex-col items-center gap-2.5`}
            >
              {!hasActiveDelivery ? (
                <button
                  type="button"
                  onClick={() => {
                    playKeypadChime();
                    setIsSearchSheetOpen(true);
                  }}
                  title="Search locations on map"
                  aria-label="Search locations on map"
                  data-testid="home-map-search-btn"
                  className="w-11 h-11 rounded-full bg-white text-[#18181B] shadow-md border border-zinc-100 flex items-center justify-center active:scale-95 transition-all cursor-pointer hover:bg-zinc-50"
                >
                  <Search size={19} strokeWidth={2.3} />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setIsNavOverlayOpen(true)}
                    title="Launch Turn-by-Turn Navigation"
                    aria-label="Launch Turn-by-Turn Navigation"
                    data-testid="active-launch-nav-btn"
                    className="w-11 h-11 rounded-full bg-white text-[#18181B] shadow-md border border-zinc-200 flex items-center justify-center active:scale-95 transition-all cursor-pointer hover:bg-zinc-50"
                  >
                    <Navigation size={19} strokeWidth={2.3} className="text-[#18181B]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playKeypadChime();
                      setIsChatSheetOpen(true);
                    }}
                    title="Chat with passenger"
                    aria-label="Open passenger chat"
                    data-testid="active-chat-fab"
                    className="w-11 h-11 rounded-full bg-[#FF5722] text-white shadow-lg flex items-center justify-center active:scale-95 transition-all cursor-pointer hover:bg-[#EA580C]"
                  >
                    <MessageSquare size={18} />
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {/* Bottom Map Corner Controls when Not in Incoming Offer */}
        {!incomingOffer && (
          <>
            <div className="absolute bottom-3 left-4 z-20">
              <button
                type="button"
                onClick={onOpenFullMap}
                title="Open full-screen map"
                aria-label="Open full-screen map"
                className="w-10 h-10 rounded-full bg-white text-[#18181B] shadow-md border border-zinc-100 flex items-center justify-center relative active:scale-95 transition-all cursor-pointer hover:bg-zinc-50"
              >
                <MapIcon size={18} strokeWidth={2.2} />
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#FF5722] border-2 border-white" />
              </button>
            </div>

            <div className="absolute bottom-3 right-4 z-20 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  playKeypadChime();
                  handleSyncRealGps();
                }}
                title="Center location"
                aria-label="Center location"
                className="w-10 h-10 rounded-full bg-white text-[#18181B] shadow-md border border-zinc-100 flex items-center justify-center active:scale-95 transition-all cursor-pointer hover:bg-zinc-50"
              >
                <Crosshair size={18} strokeWidth={2.2} />
              </button>

              {!hasActiveDelivery && (
                <button
                  type="button"
                  onClick={() => {
                    playKeypadChime();
                    setIsDestinationSheetOpen(true);
                  }}
                  title="Trips towards destination & filters"
                  aria-label="Trips towards destination & filters"
                  className="w-10 h-10 rounded-full bg-white text-[#18181B] shadow-md border border-zinc-100 flex items-center justify-center active:scale-95 transition-all cursor-pointer hover:bg-zinc-50"
                >
                  <SlidersHorizontal size={18} strokeWidth={2.2} />
                </button>
              )}
            </div>
          </>
        )}

        {/* Top-Right Decline Pill for Incoming Offer (Video Frame #7) */}
        {incomingOffer && (
          <button
            type="button"
            onClick={() => declineOffer(incomingOffer.orderId)}
            data-testid="offer-decline-pill"
            className="absolute top-4 right-4 z-40 px-4 py-2 rounded-full bg-[#18181B] hover:bg-black text-white text-[13px] font-bold flex items-center gap-1.5 shadow-lg cursor-pointer"
          >
            <X size={15} />
            <span>Decline</span>
          </button>
        )}
      </div>

      {/* =====================================================================
       * 2. INCOMING DISPATCH OFFER CARD (Video Frame #7 - Black & Atomic Orange)
       * ===================================================================== */}
      {incomingOffer && (
        <div
          className="relative z-40 bg-[#18181B] text-white p-5 space-y-3.5 overflow-hidden shrink-0 animate-slideUp"
          data-testid="incoming-offer-card"
        >
          {/* Animated Atomic Orange Fill Track Behind Offer Card */}
          <div
            className="absolute inset-y-0 left-0 bg-[#FF5722] transition-all duration-1000 ease-linear pointer-events-none"
            style={{ width: `${autoConfirm ? autoConfirmProgress : 100}%`, opacity: 0.92 }}
          />

          <div className="relative z-10 space-y-3">
            <div className="text-[22px] font-black tracking-tight leading-none">
              6 min · {incomingOffer.estimatedDistanceKm || 0.2} km
            </div>

            {/* Pickup & Dropoff Endpoints */}
            <div className="space-y-1.5 text-[13.5px]">
              <div className="flex items-start gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-white mt-1.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold text-white leading-snug truncate">
                    {incomingOffer.pickupAddress || pickupAddress}
                  </p>
                  <p className="text-[12px] text-white/85 truncate">
                    {incomingOffer.pickupLandmark || pickupLandmark}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#18181B] border border-white shrink-0" />
                <p className="font-semibold text-white/95 truncate">{dropoffAddress}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-[12.5px] font-semibold text-white">
                Base • {passengerName} 5.0 ★
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#18181B] text-white text-[12px] font-bold">
                <Banknote size={13} className="text-[#FF5722]" />
                <span>Cash</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                playMissionAcceptChime();
                acceptOffer(incomingOffer.orderId);
                showToast('Request confirmed');
              }}
              data-testid="offer-accept-btn"
              className="w-full py-3.5 rounded-xl bg-white text-[#18181B] font-bold text-[15px] shadow-md hover:bg-zinc-100 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{autoConfirm ? 'Auto-Confirm' : 'Accept Request'}</span>
              <span className="w-2 h-2 rounded-full bg-[#FF5722]" />
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
       * 3. OFFLINE "GO ONLINE" ACTION BAR (Black + Atomic Orange Chevrons)
       * ===================================================================== */}
      {!hasActiveDelivery && !incomingOffer && !isOnline && (
        <div className="relative z-30 shrink-0">
          <button
            type="button"
            onClick={handleToggleOnline}
            aria-label="Go online"
            data-testid="bolt-online-toggle-bar"
            className="w-full h-14 bg-[#18181B] hover:bg-black text-white px-6 flex items-center justify-between transition-all cursor-pointer shadow-md active:scale-[0.99]"
          >
            <ChevronsRight size={24} className="text-[#FF5722] animate-pulse" strokeWidth={2.8} />
            <span className="text-[16px] font-bold tracking-tight">Go online</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5722]" />
          </button>
        </div>
      )}

      {/* =====================================================================
       * 4. BOTTOM DOCK: ACTIVE DELIVERY STATES OR IDLE DASHBOARD
       * ===================================================================== */}
      {!incomingOffer && (
        <div className="shrink-0 bg-white px-4 pt-3 pb-4 border-t border-zinc-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] max-h-[46vh] overflow-y-auto">
          {hasActiveDelivery ? (
            <div className="space-y-3" data-testid="active-trip-mission-card">
              {/* Video-Exact Header Row (ETA / Waiting Clock Left + Cash + Menu Right) */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {tripPhase === 'at_pickup' ? (
                    <span
                      className="text-[18px] font-bold text-[#18181B] font-mono inline-flex items-center gap-2"
                      data-testid="waiting-timer-badge"
                    >
                      <Clock size={16} className="text-[#FF5722]" />
                      <span>{formatWaitingClock(waitingSecondsLeft)} Waiting</span>
                    </span>
                  ) : (
                    <span className="text-[18px] font-bold text-[#18181B]">
                      {activeEtaMins} min
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {(tripPhase === 'in_transit' || tripPhase === 'at_dropoff') && (
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#18181B] text-white text-[11.5px] font-bold"
                      data-testid="active-cash-badge"
                    >
                      <Banknote size={13} className="text-[#FF5722]" />
                      <span>Cash</span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsRouteDetailsOpen(true)}
                    aria-label="Route details"
                    data-testid="route-details-toggle-btn"
                    className="w-9 h-9 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-[#18181B] cursor-pointer"
                  >
                    <List size={18} />
                  </button>
                </div>
              </div>

              {/* Address & Passenger Info Block */}
              <div className="space-y-0.5">
                {tripPhase === 'in_transit' || tripPhase === 'at_dropoff' ? (
                  <>
                    <h3 className="text-[15.5px] font-bold text-[#18181B] leading-snug">
                      {dropoffAddress.split(',')[0]}
                    </h3>
                    <p className="text-[13px] text-zinc-500">{dropoffAddress}</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-[15.5px] font-bold text-[#18181B] leading-snug">
                      {pickupAddress.split(',')[0]}
                    </h3>
                    <p className="text-[13px] text-zinc-500">
                      {pickupAddress} • {passengerName}
                    </p>
                  </>
                )}
              </div>

              {/* Phase Action Slider CTA */}
              {tripPhase === 'arriving_pickup' && (
                <button
                  type="button"
                  onClick={async () => {
                    playMissionAcceptChime();
                    await advanceTripPhase();
                    showToast('Arrived at pickup location. Waiting timer started.');
                  }}
                  data-testid="arriving-now-btn"
                  className="w-full py-3.5 px-5 rounded-xl bg-[#18181B] hover:bg-zinc-800 active:scale-[0.98] text-white font-bold text-[15px] flex items-center justify-between shadow-md transition-all cursor-pointer"
                >
                  <ChevronsRight size={22} className="text-[#FF5722]" strokeWidth={2.8} />
                  <span>Arriving Now</span>
                  <span className="w-5" />
                </button>
              )}

              {tripPhase === 'at_pickup' && (
                <button
                  type="button"
                  onClick={async () => {
                    playMissionAcceptChime();
                    await advanceTripPhase();
                    showToast('Trip started. Proceeding to dropoff destination.');
                  }}
                  data-testid="start-trip-btn"
                  className="w-full py-3.5 px-5 rounded-xl bg-[#18181B] hover:bg-zinc-800 active:scale-[0.98] text-white font-bold text-[15px] flex items-center justify-between shadow-md transition-all cursor-pointer"
                >
                  <ChevronsRight size={22} className="text-[#FF5722]" strokeWidth={2.8} />
                  <span>Start Trip</span>
                  <span className="w-5" />
                </button>
              )}

              {(tripPhase === 'in_transit' || tripPhase === 'at_dropoff') && (
                <button
                  type="button"
                  onClick={() => {
                    completeCurrentTrip();
                  }}
                  data-testid="end-trip-btn"
                  className="w-full py-3.5 px-5 rounded-xl bg-[#FF5722] hover:bg-[#EA580C] active:scale-[0.98] text-white font-bold text-[15px] flex items-center justify-between shadow-md transition-all cursor-pointer"
                >
                  <ChevronsRight size={22} className="text-[#18181B]" strokeWidth={2.8} />
                  <span>End Trip</span>
                  <span className="w-5" />
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Destination Mode Link */}
              <div className="flex justify-end items-center px-1">
                <button
                  type="button"
                  onClick={() => {
                    playKeypadChime();
                    setIsDestinationSheetOpen(true);
                  }}
                  className="text-xs font-bold text-zinc-600 hover:text-[#18181B] transition cursor-pointer"
                >
                  {destinationModeAddress
                    ? `Towards: ${destinationModeAddress} ›`
                    : 'Trips towards destination (2/2) >'}
                </button>
              </div>

              {/* Three-Column Metrics Row (Black + Atomic Orange) */}
              <div className="grid grid-cols-3 gap-2">
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
                  className="bg-[#F4F4F5] hover:bg-zinc-200/70 border border-zinc-200/80 rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer active:scale-[0.99] transition-all min-h-[74px]"
                >
                  <span className="text-[10px] text-zinc-500 font-bold block truncate">
                    Today's earnings
                  </span>
                  <span className="text-sm font-black text-[#18181B] font-mono tracking-tight block truncate mt-1">
                    ₦ {Math.floor((todayEarningsKobo || 0) / 100).toLocaleString('en-NG')}
                  </span>
                  <span className="text-[9px] text-zinc-400 font-medium">
                    {tripsCompletedToday || 0} trips
                  </span>
                </div>

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
                  className="bg-[#F4F4F5] hover:bg-zinc-200/70 border border-zinc-200/80 rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer active:scale-[0.99] transition-all min-h-[74px]"
                >
                  <span className="text-[10px] text-zinc-500 font-bold block truncate">
                    Driver score
                  </span>
                  <div className="mt-1 flex items-center gap-1">
                    <span className="text-sm font-black text-[#18181B] font-mono tracking-tight">
                      92%
                    </span>
                    <span className="text-[10px] text-[#FF5722] font-bold">★ 4.92</span>
                  </div>
                  <span className="text-[9px] text-[#FF5722] font-bold">Great</span>
                </div>

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
                  className="bg-[#F4F4F5] hover:bg-zinc-200/70 border border-zinc-200/80 rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer active:scale-[0.99] transition-all min-h-[74px]"
                >
                  <span className="text-[10px] text-zinc-500 font-bold block truncate">
                    Confirm rate
                  </span>
                  <span className="text-sm font-black text-[#18181B] font-mono tracking-tight block mt-1">
                    100%
                  </span>
                  <span className="text-[9px] text-zinc-400 font-medium">Past 50 jobs</span>
                </div>
              </div>

              {/* Scheduled Deliveries Card (Black + Atomic Orange) */}
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
                className="w-full bg-[#F4F4F5] hover:bg-zinc-200/70 border border-zinc-200/80 rounded-2xl p-3 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#18181B] text-[#FF5722] flex items-center justify-center shrink-0">
                    <CalendarClock size={16} strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-[#18181B] block truncate leading-tight">
                      New Scheduled Deliveries requests
                    </span>
                    <span className="text-[11px] text-zinc-500 block truncate mt-0.5">
                      There are 0 open requests
                    </span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-zinc-400 shrink-0 ml-2" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
       * 5. ROUTE DETAILS BOTTOM SHEET (Video Frames #37 & #152)
       * ===================================================================== */}
      {isRouteDetailsOpen && hasActiveDelivery && (
        <div
          className="absolute inset-0 z-50 bg-black/45 flex flex-col justify-end animate-fadeIn"
          data-testid="route-details-sheet"
          onClick={() => setIsRouteDetailsOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl p-5 space-y-1 shadow-2xl animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-[18px] font-bold text-[#18181B]">Route details</h3>
              <button
                type="button"
                onClick={() => setIsRouteDetailsOpen(false)}
                aria-label="Close route details"
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-[#18181B]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="divide-y divide-zinc-100">
              {(tripPhase === 'in_transit' || tripPhase === 'at_dropoff') && (
                <div className="py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <MapPin size={18} className="text-[#FF5722] shrink-0" />
                    <span className="text-[14px] font-medium text-[#18181B] truncate">
                      {dropoffAddress}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      triggerMidTripReroute();
                      setIsRouteDetailsOpen(false);
                    }}
                    data-testid="route-change-dest-btn"
                    className="text-[13px] font-bold text-[#FF5722] hover:underline shrink-0"
                  >
                    Change
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsRouteDetailsOpen(false);
                  setIsContactOptionsOpen(true);
                }}
                data-testid="route-contact-passenger-btn"
                className="w-full py-3.5 flex items-center gap-3.5 text-left hover:bg-zinc-50"
              >
                <User size={18} className="text-[#18181B]" />
                <span className="text-[14.5px] font-medium text-[#18181B]">
                  Contact {passengerName}
                </span>
              </button>

              <div className="py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <Navigation size={18} className="text-[#18181B]" />
                  <span className="text-[14.5px] font-medium text-[#18181B]">
                    Google maps
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsRouteDetailsOpen(false);
                    setIsNavOverlayOpen(true);
                  }}
                  className="text-[13px] font-semibold text-zinc-500 hover:text-[#18181B]"
                >
                  Open
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  showToast('Live trip tracking link copied for safety contact');
                  setIsRouteDetailsOpen(false);
                }}
                className="w-full py-3.5 flex items-center gap-3.5 text-left hover:bg-zinc-50"
              >
                <Share2 size={18} className="text-[#18181B]" />
                <span className="text-[14.5px] font-medium text-[#18181B]">
                  Share ride details
                </span>
              </button>

              {(tripPhase === 'arriving_pickup' || tripPhase === 'at_pickup') && (
                <button
                  type="button"
                  onClick={() => {
                    setIsRouteDetailsOpen(false);
                    completeCurrentTrip();
                    showToast('Trip cancelled');
                  }}
                  className="w-full py-3.5 flex items-center gap-3.5 text-left hover:bg-zinc-50"
                >
                  <X size={18} className="text-[#FF5722]" />
                  <span className="text-[14.5px] font-semibold text-[#FF5722]">
                    Cancel trip
                  </span>
                </button>
              )}
            </div>

            <div className="pt-3 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setStopNewRequests((prev) => !prev);
                  showToast(
                    !stopNewRequests
                      ? 'New trip requests paused for this ride'
                      : 'Incoming trip requests resumed'
                  );
                }}
                className="px-5 py-2.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-[#18181B] text-[13.5px] font-semibold transition-colors"
              >
                {stopNewRequests ? 'Resume new requests' : 'Stop new requests'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Destination Mode Sheet */}
      <DestinationModeSheet
        isOpen={isDestinationSheetOpen}
        onClose={() => setIsDestinationSheetOpen(false)}
        onSelectDestination={(dest) => {
          setDestinationModeAddress(dest);
          const matched = CURATED_NIGERIA_PLACES.find(
            (p) => p.address.toLowerCase() === dest.toLowerCase()
          );
          if (matched) {
            setSearchedPlace(matched);
          }
        }}
        onOpenSearch={() => setIsSearchSheetOpen(true)}
      />

      {/* Interactive Map Location Search Sheet */}
      <MapLocationSearchSheet
        isOpen={isSearchSheetOpen}
        onClose={() => setIsSearchSheetOpen(false)}
        onSelectPlace={(place) => {
          setSearchedPlace(place);
          showToast(`Showing ${place.address} on map`);
        }}
        onUseRealLocation={handleSyncRealGps}
      />

      {/* Higher Rates Prompt Modal */}
      <SurgePromptModal
        isOpen={isSurgePromptOpen}
        onStayOnline={() => setIsSurgePromptOpen(false)}
        onGoOffline={() => {
          setIsSurgePromptOpen(false);
          toggleOnlineStatus();
          showToast('You are now OFFLINE');
        }}
      />

      {/* Dark Contact Options Sheet */}
      <ContactOptionsSheet
        isOpen={isContactOptionsOpen}
        onClose={() => setIsContactOptionsOpen(false)}
        passengerName={passengerName}
        passengerPhone={passengerPhone}
        onSendMessage={() => setIsChatSheetOpen(true)}
        onCallInApp={() => {
          showToast(`Initiating encrypted VoIP data call to ${passengerName}...`);
        }}
        onCallPhone={() => {
          showToast(`Dialing cellular phone: ${passengerPhone}`);
        }}
      />

      {/* In-App Chat Sheet */}
      <RiderChatSheet
        isOpen={isChatSheetOpen}
        onClose={() => setIsChatSheetOpen(false)}
      />

      {/* Turn-by-Turn Navigation Overlay */}
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
        etaMins={activeEtaMins}
      />

      {/* Confirm Price Full-Screen Modal */}
      <ConfirmPriceModal
        isOpen={Boolean(tripPriceConfirmation)}
        cashNaira={
          tripPriceConfirmation ? Math.floor(tripPriceConfirmation.cashKobo / 100) : 400
        }
        subsidyNaira={
          tripPriceConfirmation ? Math.floor(tripPriceConfirmation.subsidyKobo / 100) : 100
        }
        totalNaira={
          tripPriceConfirmation ? Math.floor(tripPriceConfirmation.totalKobo / 100) : 500
        }
        passengerName={tripPriceConfirmation?.customerName || passengerName}
        onConfirm={() => {
          setTripPriceConfirmation(null);
          setIsRatePassengerOpen(true);
        }}
      />

      {/* Rate Passenger Full-Screen Modal */}
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
