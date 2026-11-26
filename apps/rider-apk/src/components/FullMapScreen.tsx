import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Navigation,
  Phone,
} from 'lucide-react';
import { useRiderStore } from '../store/riderStore';
import { openGoogleMapsNavigation } from '../utils/navigationDeepLink';
import { BayniksLiveMap } from './map/BayniksLiveMap';

export interface FullMapScreenProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenVerification?: (mode?: 'qr' | 'otp') => void;
}

export const FullMapScreen: React.FC<FullMapScreenProps> = ({
  isOpen,
  onClose,
  onOpenVerification,
}) => {
  const {
    riderStatus,
    tripPhase,
    activeOrder,
    riderName,
    plateNumber,
    toggleOnlineStatus,
    advanceTripPhase,
    triggerDemoOffer,
    showToast,
    riderUser,
    simulationMode,
    currentLocation,
    currentBearing,
    preferredMapEngine,
    setPreferredMapEngine,
    dispatchRadiusKm,
  } = useRiderStore();
  const [recenterNonce, setRecenterNonce] = useState(0);

  const displayName = riderName || riderUser?.fullName || (simulationMode ? 'Joseph Okon' : 'Active Rider');
  const displayPlate = plateNumber || riderUser?.plateNumber || (simulationMode ? 'BLT-4912' : '');

  const hasActiveDelivery = Boolean(activeOrder && tripPhase !== 'idle');
  const isOnline = riderStatus === 'available' || riderStatus === 'busy';

  // Map Transformation State
  const [zoom, setZoom] = useState(hasActiveDelivery ? 0.86 : 0.96);
  const [panX, setPanX] = useState(hasActiveDelivery ? -140 : -80);
  const [panY, setPanY] = useState(hasActiveDelivery ? -130 : -40);
  const [showSurge, setShowSurge] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  // Dragging State
  const viewportRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, startPanX: 0, startPanY: 0 });

  const recenter = useCallback(
    (silent = false) => {
      const vp = viewportRef.current;
      const vw = vp ? vp.clientWidth : 390;
      const vh = vp ? vp.clientHeight : 780;

      const focusX = hasActiveDelivery ? 410 : 336;
      const focusY = hasActiveDelivery ? 510 : 378;
      const nextZoom = hasActiveDelivery ? 0.86 : 0.96;

      setZoom(nextZoom);
      setPanX(Math.round(vw / 2 - focusX * nextZoom));
      setPanY(Math.round(vh / 2 - focusY * nextZoom));
      setRecenterNonce((n) => n + 1);

      if (!silent) {
        showToast(`GPS centered on ${displayName}${displayPlate ? ` (${displayPlate})` : ''}`);
      }
    },
    [hasActiveDelivery, showToast]
  );

  useEffect(() => {
    if (isOpen) {
      recenter(true);
    }
  }, [isOpen, recenter]);

  const handleZoom = (delta: number) => {
    const nextZoom = Math.min(1.65, Math.max(0.55, +(zoom + delta).toFixed(2)));
    if (nextZoom === zoom) return;

    const vp = viewportRef.current;
    if (vp) {
      const cx = vp.clientWidth / 2;
      const cy = vp.clientHeight / 2;
      const ratio = nextZoom / zoom;
      setPanX(cx - (cx - panX) * ratio);
      setPanY(cy - (cy - panY) * ratio);
    }
    setZoom(nextZoom);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPanX: panX,
      startPanY: panY,
    };
    if (viewportRef.current) {
      viewportRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const nextX = Math.min(120, Math.max(-520, dragStartRef.current.startPanX + dx));
    const nextY = Math.min(120, Math.max(-560, dragStartRef.current.startPanY + dy));
    setPanX(nextX);
    setPanY(nextY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      if (viewportRef.current) {
        viewportRef.current.releasePointerCapture(e.pointerId);
      }
    } catch {}
  };

  const handleMissionCta = () => {
    if (!hasActiveDelivery) return;
    if (tripPhase === 'arriving_pickup') {
      advanceTripPhase();
      showToast('Arrived at Pickup Location');
    } else if (tripPhase === 'at_pickup') {
      advanceTripPhase();
      showToast('Cargo secured in 60L courier box');
    } else if (tripPhase === 'in_transit') {
      advanceTripPhase();
      showToast('Arrived at Victoria Island Towers');
    } else if (tripPhase === 'at_dropoff') {
      if (onOpenVerification) {
        onOpenVerification('qr');
      } else {
        showToast('Scan QR / OTP Handover verification active');
      }
    }
  };

  const handleExternalNavigation = () => {
    const isPickupPhase = tripPhase === 'arriving_pickup' || tripPhase === 'at_pickup';
    const target = isPickupPhase
      ? {
          lat: activeOrder?.pickup?.location?.lat || 6.5158,
          lng: activeOrder?.pickup?.location?.lng || 3.3718,
          address: activeOrder?.pickup?.address || '14 Commercial Ave, Yaba',
        }
      : {
          lat: activeOrder?.stops?.[0]?.dropoffLocation?.lat || 6.4281,
          lng: activeOrder?.stops?.[0]?.dropoffLocation?.lng || 3.4219,
          address: activeOrder?.stops?.[0]?.dropoffAddress || 'Victoria Island Towers, Plot 4',
        };
    openGoogleMapsNavigation(target.lat, target.lng, target.address);
    showToast('Handing off turn-by-turn navigation to Google Maps...');
  };

  const handleCallParty = () => {
    const phone =
      tripPhase === 'in_transit' || tripPhase === 'at_dropoff'
        ? activeOrder?.stops[0]?.recipientPhone || '+2348034445566'
        : activeOrder?.pickup.contactPhone || '+2348021112233';
    showToast(`Calling ${phone}...`);
    if (typeof window !== 'undefined') {
      window.location.href = `tel:${phone}`;
    }
  };

  if (!isOpen) return null;

  // Compute active puck coordinate on map based on mission step
  let puckLeft = '336px';
  let puckTop = '378px';
  let stepLabel = 'STEP 1 OF 4 • EN ROUTE TO PICKUP';
  let etaText = '1.1 km • 6 min';
  let ctaText = 'Arrived at Pickup →';

  if (hasActiveDelivery) {
    if (tripPhase === 'arriving_pickup') {
      puckLeft = '336px';
      puckTop = '378px';
      stepLabel = 'STEP 1 OF 4 • EN ROUTE TO PICKUP';
      etaText = '1.1 km • 6 min';
      ctaText = 'Arrived at Pickup →';
    } else if (tripPhase === 'at_pickup') {
      puckLeft = '322px';
      puckTop = '355px';
      stepLabel = 'STEP 2 OF 4 • AT KUCHI EMPIRE PICKUP';
      etaText = 'At Pickup';
      ctaText = 'Confirm Collected →';
    } else if (tripPhase === 'in_transit') {
      puckLeft = '432px';
      puckTop = '485px';
      stepLabel = 'STEP 3 OF 4 • IN TRANSIT (3RD MAINLAND)';
      etaText = '3.2 km • 12 min';
      ctaText = 'Arrived at VI Towers →';
    } else if (tripPhase === 'at_dropoff') {
      puckLeft = '495px';
      puckTop = '698px';
      stepLabel = 'STEP 4 OF 4 • HANDOVER VERIFICATION';
      etaText = 'At Drop-off';
      ctaText = 'Verify QR / OTP →';
    }
  }

  return (
    <div
      id="fullMapScreen"
      className="full-map-screen"
      role="dialog"
      aria-modal="true"
      aria-label="Full View Lagos Radar Map"
      data-testid="full-map-screen"
    >
      {/* Floating Translucent Top Bar */}
      <div className="full-map-topbar">
        <button
          type="button"
          className="full-map-back-btn"
          onClick={onClose}
          data-testid="full-map-back-btn"
          aria-label="Back to cockpit"
        >
          <ChevronLeft size={15} strokeWidth={2.5} />
          <span>Back</span>
        </button>

        <div style={{ textAlign: 'center', minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 800,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Yaba • Lagos Mainland
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>
            4.0 km Corridor Radar
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            const nextEngine = preferredMapEngine === 'google' ? 'maplibre' : 'google';
            setPreferredMapEngine(nextEngine);
            showToast(
              nextEngine === 'google'
                ? 'Map Engine #1: Google Maps (with MapLibre auto-fallback)'
                : 'Map Engine #2: MapLibre Vector'
            );
          }}
          data-testid="full-map-engine-toggle"
          className="px-2.5 py-1 rounded-full bg-[#18181B] text-white text-[10px] font-bold flex items-center gap-1.5 mr-1 cursor-pointer"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF5722]" />
          <span>{preferredMapEngine === 'google' ? 'Google #1' : 'MapLibre #2'}</span>
        </button>

        <span className="full-map-gps-badge" data-testid="full-map-gps-badge">
          <span className="w-2 h-2 rounded-full bg-[#FF5722] animate-ping inline-block" />
          <span>LIVE GPS</span>
        </span>
      </div>

      {/* Floating Right-Side Interactive Map Controls */}
      <div className="full-map-controls" aria-label="Map Controls">
        <button
          type="button"
          className="full-map-fab"
          onClick={() => handleZoom(0.22)}
          title="Zoom In"
          aria-label="Zoom In"
          data-testid="full-map-zoom-in"
        >
          +
        </button>
        <button
          type="button"
          className="full-map-fab"
          onClick={() => handleZoom(-0.22)}
          title="Zoom Out"
          aria-label="Zoom Out"
          data-testid="full-map-zoom-out"
        >
          −
        </button>
        <button
          type="button"
          className="full-map-fab"
          onClick={() => recenter(false)}
          title="Recenter GPS on Rider"
          aria-label="Recenter GPS"
          data-testid="full-map-recenter-btn"
        >
          <Crosshair size={18} strokeWidth={2.3} />
        </button>
        <button
          type="button"
          id="fabToggleSurge"
          className={`full-map-fab ${showSurge ? 'active-surge' : ''}`}
          onClick={() => {
            setShowSurge(!showSurge);
            showToast(!showSurge ? 'Surge hotspots visible' : 'Surge hotspots hidden');
          }}
          title="Toggle Surge Hotspots"
          aria-label="Toggle Surge Hotspots"
          data-testid="full-map-surge-toggle"
        >
          🔥
        </button>
      </div>

      {/* Interactive Real Dual-Engine Map + Stage Overlay Markers */}
      <div
        ref={viewportRef}
        id="fullMapViewport"
        className="full-map-viewport"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <BayniksLiveMap
          riderLocation={currentLocation}
          riderBearing={currentBearing}
          riderLabel={`${displayName}${displayPlate ? ` • ${displayPlate}` : ''}`}
          pickupLocation={hasActiveDelivery ? activeOrder?.pickup?.location || { lat: 6.5165, lng: 3.3855 } : undefined}
          pickupLabel={hasActiveDelivery ? 'Pickup: Kuchi Empire, Yaba' : undefined}
          dropoffLocation={hasActiveDelivery ? activeOrder?.stops?.[0]?.dropoffLocation || { lat: 6.4281, lng: 3.4219 } : undefined}
          dropoffLabel={hasActiveDelivery ? 'Drop-off: Victoria Island Towers' : undefined}
          routeOrigin={hasActiveDelivery ? activeOrder?.pickup?.location || { lat: 6.5165, lng: 3.3855 } : undefined}
          routeTarget={hasActiveDelivery ? activeOrder?.stops?.[0]?.dropoffLocation || { lat: 6.4281, lng: 3.4219 } : undefined}
          showRadar={isOnline && !hasActiveDelivery}
          radarRadiusKm={dispatchRadiusKm || 4}
          showSurgeZones={showSurge}
          zoom={Math.max(10, Math.min(18, Math.round((13.5 + (zoom - 0.96) * 5) * 10) / 10))}
          recenterNonce={recenterNonce}
          testId="full-map-live-canvas"
          className="absolute inset-0"
        />

        {/* Semantic Overlay Markers Preserved for Accessibility & Interactive Dispatch */}
        <div
          id="fullMapTransformLayer"
          className="full-map-layer pointer-events-none"
          style={{
            transform: `translate3d(${panX}px, ${panY}px, 0) scale(${zoom})`,
          }}
        >
          {hasActiveDelivery && (
            <>
              <div id="fullMapRouteGroup" data-testid="full-map-route-group" className="hidden" />
              <div id="fullMapRoutePins" data-testid="full-map-route-pins" className="hidden" />
            </>
          )}

          {/* Interactive Surge Hotspot Quick-Triggers */}
          {showSurge && (
            <div id="fullMapSurgeLayer" data-testid="full-map-surge-layer" className="pointer-events-auto">
              <button
                type="button"
                className="full-map-surge-pin hot"
                style={{ left: '295px', top: '270px' }}
                onClick={() => {
                  showToast('Yaba Tech Hub (1.4x Surge • +₦1,250 per drop)');
                  if (!hasActiveDelivery && isOnline) triggerDemoOffer();
                }}
              >
                <span>🔥 Yaba Tech Hub 1.4x • +₦1,250</span>
              </button>
              <button
                type="button"
                className="full-map-surge-pin hot"
                style={{ left: '535px', top: '665px' }}
                onClick={() => {
                  showToast('VI Towers (1.5x Surge • +₦1,500 per drop)');
                  if (!hasActiveDelivery && isOnline) triggerDemoOffer();
                }}
              >
                <span>⚡ VI Towers 1.5x • +₦1,500</span>
              </button>
              <button
                type="button"
                className="full-map-surge-pin"
                style={{ left: '205px', top: '165px' }}
                onClick={() => {
                  showToast('Ikeja Hub (1.2x Surge • +₦850 per drop)');
                  if (!hasActiveDelivery && isOnline) triggerDemoOffer();
                }}
              >
                <span>🔥 Ikeja Hub 1.2x • +₦850</span>
              </button>
            </div>
          )}

          {/* Screen-reader / DOM status badge for active rider */}
          <div
            id="fullMapRiderPuck"
            className="full-map-rider-puck opacity-0 pointer-events-none"
            style={{ left: puckLeft, top: puckTop }}
            data-testid="full-map-rider-puck"
          >
            <div className="rider-puck-tag">
              {displayName}{displayPlate ? ` • ${displayPlate}` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Bottom Floating Status Card / Pill */}
      <div
        id="fullMapBottomCard"
        className={`full-map-bottom-card ${isMinimized ? 'minimized' : ''}`}
        data-testid="full-map-bottom-card"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            {hasActiveDelivery ? (
              <span id="fmStatusChip" className="live-chip">
                <span className="live-chip-dot" /> {activeOrder?.trackingCode || '#BF-48291'} Live
              </span>
            ) : (
              <span id="fmStatusChip" className="live-chip">
                <span className="live-chip-dot" /> 1.4x Surge Active
              </span>
            )}
            <span
              id="fmSummaryHeadline"
              style={{
                fontSize: '12px',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {hasActiveDelivery ? '4.8 km • 18 min • ₦3,200' : 'Yaba Tech Hub • +₦1,250/drop'}
            </span>
          </div>

          <button
            type="button"
            id="fmCollapseBtn"
            className="chevron-pill-btn"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand card' : 'Minimize card'}
            aria-label="Toggle Bottom Card"
            data-testid="full-map-collapse-btn"
          >
            {isMinimized ? <ChevronUp size={15} strokeWidth={2.5} /> : <ChevronDown size={15} strokeWidth={2.5} />}
          </button>
        </div>

        {/* Expandable Card Details & Quick Actions */}
        {!isMinimized && (
          <div id="fmCardExpandedBody" style={{ marginTop: '10px' }}>
            {!hasActiveDelivery ? (
              /* Standby / Surge Info View */
              <div id="fmStandbyBody">
                <p
                  id="fmStandbyDesc"
                  style={{
                    fontSize: '11.5px',
                    color: 'var(--text-secondary)',
                    marginBottom: '10px',
                  }}
                >
                  High courier demand across Yaba Central &amp; Third Mainland corridor. Go online or
                  trigger a dispatch to start earning.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    id="fmPrimaryStandbyBtn"
                    className="btn-orange-xl"
                    style={{ height: '46px', fontSize: '12px' }}
                    onClick={() => {
                      if (!isOnline) {
                        toggleOnlineStatus();
                        showToast('You are now ONLINE');
                      } else if (simulationMode) {
                        triggerDemoOffer();
                      } else {
                        toggleOnlineStatus();
                        showToast('You are now OFFLINE');
                      }
                    }}
                    data-testid="full-map-standby-cta"
                  >
                    <span>
                      {!isOnline
                        ? 'Go Online & Find Deliveries'
                        : simulationMode
                        ? 'Simulate Dispatch ⚡'
                        : 'Go Offline'}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="btn-neutral-xl"
                    style={{ height: '46px', fontSize: '12px' }}
                    onClick={() => recenter(false)}
                  >
                    <span>◎ Recenter</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Active Delivery Telemetry View */
              <div id="fmActiveMissionBody">
                <div
                  className="sub-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '9px 11px',
                    marginBottom: '10px',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <span className="micro-label" id="fmMissionStepLabel">
                      {stepLabel}
                    </span>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      id="fmMissionRouteLabel"
                    >
                      Kuchi Empire → Victoria Island Towers
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span
                      className="tabular-num"
                      style={{ fontSize: '13px', color: 'var(--accent-orange)' }}
                      id="fmMissionEta"
                    >
                      {etaText}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn-orange-xl"
                    style={{ height: '46px', fontSize: '11px', padding: '0 6px' }}
                    onClick={handleMissionCta}
                    data-testid="full-map-mission-cta"
                  >
                    <span id="fmMissionCtaText">{ctaText}</span>
                  </button>
                  <button
                    type="button"
                    className="btn-neutral-xl"
                    style={{ height: '46px', fontSize: '11px', padding: '0 6px' }}
                    onClick={handleExternalNavigation}
                    data-testid="full-map-external-nav-btn"
                  >
                    <Navigation size={13} className="inline mr-1" />
                    <span>Navigate</span>
                  </button>
                  <button
                    type="button"
                    className="btn-neutral-xl"
                    style={{ height: '46px', fontSize: '11px', padding: '0 6px' }}
                    onClick={handleCallParty}
                    data-testid="full-map-call-btn"
                  >
                    <Phone size={13} className="inline mr-1" />
                    <span>Call</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
