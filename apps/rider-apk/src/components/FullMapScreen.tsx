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
    toggleOnlineStatus,
    advanceTripPhase,
    triggerDemoOffer,
    showToast,
  } = useRiderStore();

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

      if (!silent) {
        showToast('GPS centered on Joseph Okon (BLT-4912)');
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

        <span className="full-map-gps-badge" data-testid="full-map-gps-badge">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
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

      {/* Interactive Drag-to-Pan & Zoom Canvas */}
      <div
        ref={viewportRef}
        id="fullMapViewport"
        className="full-map-viewport"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          id="fullMapTransformLayer"
          className="full-map-layer"
          style={{
            transform: `translate3d(${panX}px, ${panY}px, 0) scale(${zoom})`,
          }}
        >
          {/* Edge-to-Edge Lagos Geography SVG (Mainland, Lagoon, 3rd Mainland Bridge, VI, Lekki, Ikeja) */}
          <svg width="820" height="960" viewBox="0 0 820 960" fill="none" style={{ display: 'block' }}>
            {/* Land Base */}
            <rect x="0" y="0" width="820" height="960" fill="var(--map-land)" />

            {/* Park / Green Belt Accents (University of Lagos & Ikoyi Golf) */}
            <path d="M350 310 Q 410 300 420 385 Q 375 415 340 375 Z" fill="var(--map-park)" />
            <path d="M450 565 Q 525 555 535 615 Q 470 635 445 600 Z" fill="var(--map-park)" />

            {/* Lagos Lagoon & Five Cowrie Creek Water Bodies */}
            <path
              d="M415 0 L 820 0 L 820 620 L 580 615 Q 505 535 425 540 Q 375 460 415 360 Q 430 200 415 0 Z"
              fill="var(--map-water)"
            />
            <path
              d="M295 625 Q 465 620 645 645 L 820 665 L 820 715 L 635 685 Q 460 660 285 670 Z"
              fill="var(--map-water)"
            />
            <path d="M0 785 Q 360 805 820 845 L 820 960 L 0 960 Z" fill="var(--map-water)" />

            {/* Secondary Street Grid (Mainland: Ikeja, Yaba, Surulere) */}
            <g stroke="var(--map-road-minor)" strokeWidth="6" strokeLinecap="round">
              <path d="M60 150 L 380 175" />
              <path d="M40 230 L 395 255" />
              <path d="M70 330 L 390 355" />
              <path d="M55 430 L 385 450" />
              <path d="M80 530 L 380 545" />
              <path d="M140 60 L 165 590" />
              <path d="M235 50 L 255 600" />
              <path d="M325 70 L 340 595" />
              {/* Island Street Grid (Ikoyi, VI, Lekki Phase 1) */}
              <path d="M415 585 L 575 595" />
              <path d="M365 705 L 775 735" />
              <path d="M385 755 L 765 785" />
              <path d="M465 665 L 485 795" />
              <path d="M565 675 L 585 805" />
              <path d="M675 680 L 695 815" />
            </g>

            {/* Major Highways & Expressways */}
            <g
              stroke="var(--map-road-major)"
              strokeWidth="11"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Ikorodu Road / Western Ave Corridor */}
              <path d="M275 20 L 295 340 L 265 615" />
              {/* Herbert Macaulay / Yaba Commercial Ave */}
              <path d="M335 190 L 350 475 L 315 620" />
              {/* Ozumba Mbadiwe / Lekki-Epe Expressway */}
              <path d="M350 695 L 535 710 L 805 745" />
            </g>

            {/* Third Mainland Bridge & Carter/Eko Bridges */}
            <g stroke="var(--map-bridge)" strokeWidth="10" strokeLinecap="round">
              <path d="M355 340 Q 455 435 465 565" />
              <path d="M285 575 Q 355 610 415 600" />
              {/* Lekki-Ikoyi Link Bridge */}
              <path d="M565 605 L 625 695" />
            </g>

            {/* Active Delivery Route Polyline */}
            {hasActiveDelivery && (
              <g id="fullMapRouteGroup" data-testid="full-map-route-group">
                <path
                  d="M322 355 L 355 340 Q 455 435 465 565 L 478 655 L 495 698"
                  stroke="rgba(255, 109, 31, 0.28)"
                  strokeWidth="13"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <path
                  d="M322 355 L 355 340 Q 455 435 465 565 L 478 655 L 495 698"
                  stroke="#FF6D1F"
                  strokeWidth="5"
                  strokeDasharray="9 6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  className="route-dash-anim"
                />
              </g>
            )}

            {/* Geographic District Labels */}
            <g
              fill="var(--map-label)"
              fontFamily="Plus Jakarta Sans, sans-serif"
              fontWeight="800"
              fontSize="11"
              letterSpacing="1.4"
            >
              <text x="175" y="135">IKEJA HUB</text>
              <text x="205" y="315">YABA CENTRAL HUB</text>
              <text x="145" y="485">SURULERE</text>
              <text x="530" y="295" opacity="0.72">LAGOS LAGOON</text>
              <text x="415" y="455" transform="rotate(42 415 455)" fontSize="9.5">
                THIRD MAINLAND BRIDGE
              </text>
              <text x="468" y="578">IKOYI</text>
              <text x="435" y="742">VICTORIA ISLAND TOWERS</text>
              <text x="645" y="725">LEKKI PHASE 1</text>
            </g>
          </svg>

          {/* Active Delivery Pickup & Drop-off Pin Markers */}
          {hasActiveDelivery && (
            <div id="fullMapRoutePins" data-testid="full-map-route-pins">
              <div className="full-map-route-pin" style={{ left: '322px', top: '355px' }}>
                <span className="route-pin-pill">Pickup: Kuchi Empire, Yaba</span>
                <span className="route-pin-dot">P</span>
              </div>
              <div className="full-map-route-pin" style={{ left: '495px', top: '698px' }}>
                <span className="route-pin-pill">Drop-off: Victoria Island Towers</span>
                <span className="route-pin-dot" style={{ background: '#11151E', borderColor: '#FF6D1F' }}>
                  D
                </span>
              </div>
            </div>
          )}

          {/* Interactive Surge Hotspot Markers */}
          {showSurge && (
            <div id="fullMapSurgeLayer" data-testid="full-map-surge-layer">
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

          {/* Pulsing Atomic Orange (#FF6D1F) Rider Location Puck */}
          <div
            id="fullMapRiderPuck"
            className="full-map-rider-puck"
            style={{ left: puckLeft, top: puckTop }}
            data-testid="full-map-rider-puck"
          >
            <div className="rider-puck-beacon">
              <Navigation size={17} className="fill-current text-white -rotate-45" />
            </div>
            <div className="rider-puck-tag">Joseph Okon • BLT-4912</div>
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
                      } else {
                        triggerDemoOffer();
                      }
                    }}
                    data-testid="full-map-standby-cta"
                  >
                    <span>{isOnline ? 'Simulate Dispatch ⚡' : 'Go Online & Find Deliveries'}</span>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-orange-xl"
                    style={{ height: '46px', fontSize: '12px' }}
                    onClick={handleMissionCta}
                    data-testid="full-map-mission-cta"
                  >
                    <span id="fmMissionCtaText">{ctaText}</span>
                  </button>
                  <button
                    type="button"
                    className="btn-neutral-xl"
                    style={{ height: '46px', fontSize: '12px' }}
                    onClick={handleCallParty}
                    data-testid="full-map-call-btn"
                  >
                    <Phone size={14} className="inline mr-1" />
                    <span>Call Contact</span>
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
