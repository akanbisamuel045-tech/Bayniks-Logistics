'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  LatLng,
  decodeGooglePolyline,
  lerpLatLng,
  lerpBearingShortestArc,
  OrderStatus,
} from '@logistics/shared-types';

export interface LiveTelemetryPoint {
  lat: number;
  lng: number;
  bearing: number;
  speed: number;
  accuracy?: number;
  timestamp?: number;
}

export interface LiveTrackingMapProps {
  pickup: {
    address: string;
    landmark?: string;
    location: LatLng;
  };
  stops: Array<{
    sequenceNumber: number;
    dropoffAddress: string;
    dropoffLandmark?: string;
    dropoffLocation: LatLng;
    recipientName?: string;
    status: string;
  }>;
  encodedPolyline?: string;
  riderTelemetry?: LiveTelemetryPoint | null;
  status: OrderStatus;
  className?: string;
  onSimulateClick?: () => void;
  isSimulating?: boolean;
}

export function LiveTrackingMap({
  pickup,
  stops,
  encodedPolyline,
  riderTelemetry,
  status,
  className = '',
  onSimulateClick,
  isSimulating = false,
}: LiveTrackingMapProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [followRider, setFollowRider] = useState(false);

  // 1. Decode polyline
  const routePoints = useMemo(() => {
    if (encodedPolyline && encodedPolyline.trim().length > 0) {
      try {
        const pts = decodeGooglePolyline(encodedPolyline);
        if (pts.length > 0) return pts;
      } catch {
        // Fallback below
      }
    }
    return [pickup.location, ...stops.map((s) => s.dropoffLocation)];
  }, [encodedPolyline, pickup.location, stops]);

  // 2. Animation state refs for 60fps requestAnimationFrame interpolation
  const currentRenderPosRef = useRef<LatLng>(
    riderTelemetry ? { lat: riderTelemetry.lat, lng: riderTelemetry.lng } : pickup.location
  );
  const currentRenderBearingRef = useRef<number>(riderTelemetry?.bearing ?? 0);
  const currentSpeedRef = useRef<number>(riderTelemetry?.speed ?? 0);

  const prevTelemetryRef = useRef<{
    pos: LatLng;
    bearing: number;
    timestamp: number;
  }>({
    pos: currentRenderPosRef.current,
    bearing: currentRenderBearingRef.current,
    timestamp: Date.now(),
  });

  const nextTelemetryRef = useRef<{
    pos: LatLng;
    bearing: number;
    speed: number;
    timestamp: number;
  }>({
    pos: currentRenderPosRef.current,
    bearing: currentRenderBearingRef.current,
    speed: currentSpeedRef.current,
    timestamp: Date.now(),
  });

  // Target transition duration (default 5000ms matching ping interval)
  const animDurationRef = useRef<number>(5000);
  const animStartTimeRef = useRef<number>(performance.now());

  // Force React render state on RAF tick
  const [, setFrameTick] = useState(0);

  // When new telemetry arrives from props, update target and reset lerp window
  useEffect(() => {
    if (!riderTelemetry) return;

    // Shift previous target to start
    prevTelemetryRef.current = {
      pos: currentRenderPosRef.current,
      bearing: currentRenderBearingRef.current,
      timestamp: Date.now(),
    };

    nextTelemetryRef.current = {
      pos: { lat: riderTelemetry.lat, lng: riderTelemetry.lng },
      bearing: riderTelemetry.bearing,
      speed: riderTelemetry.speed,
      timestamp: Date.now(),
    };

    animStartTimeRef.current = performance.now();
    animDurationRef.current = 5000; // 5s interval
  }, [riderTelemetry?.lat, riderTelemetry?.lng, riderTelemetry?.bearing, riderTelemetry?.speed]);

  // 3. 60fps requestAnimationFrame render loop
  useEffect(() => {
    let animId: number;

    const frame = (now: number) => {
      const elapsed = now - animStartTimeRef.current;
      const progress = Math.min(1, elapsed / animDurationRef.current);

      // Smooth lerp
      currentRenderPosRef.current = lerpLatLng(
        prevTelemetryRef.current.pos,
        nextTelemetryRef.current.pos,
        progress
      );

      currentRenderBearingRef.current = lerpBearingShortestArc(
        prevTelemetryRef.current.bearing,
        nextTelemetryRef.current.bearing,
        progress
      );

      currentSpeedRef.current = nextTelemetryRef.current.speed;

      // Trigger re-render of SVG marker
      setFrameTick((prev) => (prev + 1) % 1000000);

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, []);

  // 4. Dynamic Bounding Box calculation
  const bounds = useMemo(() => {
    const allCoords: LatLng[] = [...routePoints, currentRenderPosRef.current];

    if (followRider && currentRenderPosRef.current) {
      // Tighter bounds around the rider
      const r = currentRenderPosRef.current;
      const span = 0.035;
      return {
        minLat: r.lat - span / 2,
        maxLat: r.lat + span / 2,
        minLng: r.lng - span / 2,
        maxLng: r.lng + span / 2,
      };
    }

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    for (const c of allCoords) {
      if (c.lat < minLat) minLat = c.lat;
      if (c.lat > maxLat) maxLat = c.lat;
      if (c.lng < minLng) minLng = c.lng;
      if (c.lng > maxLng) maxLng = c.lng;
    }

    const latSpan = Math.max(0.03, (maxLat - minLat) * 1.35);
    const lngSpan = Math.max(0.03, (maxLng - minLng) * 1.35);
    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;

    return {
      minLat: midLat - latSpan / 2,
      maxLat: midLat + latSpan / 2,
      minLng: midLng - lngSpan / 2,
      maxLng: midLng + lngSpan / 2,
    };
  }, [routePoints, followRider]);

  // Project (lat, lng) to SVG viewBox (1000 x 800)
  const project = (coords: LatLng) => {
    const width = 1000;
    const height = 800;
    const padding = 70;

    const xFrac = (coords.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng);
    const yFrac = 1 - (coords.lat - bounds.minLat) / (bounds.maxLat - bounds.minLat);

    const x = padding + xFrac * (width - 2 * padding);
    const y = padding + yFrac * (height - 2 * padding);

    return { x, y };
  };

  const svgPolylinePoints = useMemo(() => {
    if (routePoints.length < 2) return '';
    return routePoints
      .map((pt) => {
        const { x, y } = project(pt);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [routePoints, bounds]);

  const currentRiderSvg = project(currentRenderPosRef.current);
  const currentBearing = currentRenderBearingRef.current;
  const currentSpeed = currentSpeedRef.current;

  // Active status color
  const isTripActive = ['rider_assigned', 'arrived_pickup', 'in_transit', 'arrived_dropoff'].includes(
    status
  );

  return (
    <div className={`relative w-full h-full bg-slate-950 overflow-hidden select-none ${className}`}>
      {/* Map Control Buttons */}
      <div className="absolute top-4 right-4 z-20 flex flex-col space-y-2">
        <button
          onClick={() => setFollowRider(!followRider)}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium shadow-lg backdrop-blur-md border transition-all flex items-center space-x-1.5 ${
            followRider
              ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
              : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
          }`}
          title="Toggle lock camera onto moving rider"
        >
          <span>🎯</span>
          <span>{followRider ? 'Locked on Rider' : 'Recenter Rider'}</span>
        </button>

        {onSimulateClick && (
          <button
            onClick={onSimulateClick}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium shadow-lg backdrop-blur-md border transition-all flex items-center space-x-1.5 ${
              isSimulating
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold animate-pulse'
                : 'bg-slate-900/80 text-amber-400 border-amber-500/30 hover:bg-slate-800'
            }`}
            title="Demonstrate 60fps road interpolation"
          >
            <span>{isSimulating ? '⏸ Pause Sim' : '▶ Simulate Movement'}</span>
          </button>
        )}
      </div>

      {/* Speedometer Overlay Badge */}
      {isTripActive && (
        <div className="absolute bottom-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3.5 py-2 rounded-xl shadow-xl flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <div>
            <div className="text-[10px] uppercase font-mono text-slate-400">Live Telemetry</div>
            <div className="text-sm font-bold text-emerald-400 font-mono">
              {Math.round(currentSpeed)} <span className="text-xs text-slate-400">km/h</span> •{' '}
              {Math.round(currentBearing)}°
            </div>
          </div>
        </div>
      )}

      {/* Tactical Cartography SVG */}
      <svg
        viewBox="0 0 1000 800"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Glowing emerald filter for route */}
          <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Cyan glow for moving motorcycle */}
          <filter id="riderGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Dark Tactical Grid */}
          <pattern id="tacticalGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.8" opacity="0.3" />
          </pattern>
        </defs>

        {/* Background Grid */}
        <rect width="1000" height="800" fill="#080c14" />
        <rect width="1000" height="800" fill="url(#tacticalGrid)" />

        {/* Lagos Stylized Coastal Contours */}
        <path
          d="M 0 740 Q 250 700, 500 720 T 1000 700 L 1000 800 L 0 800 Z"
          fill="#0c192c"
          opacity="0.9"
        />
        <path
          d="M 80 440 Q 300 500, 550 460 T 920 520 L 980 600 Q 600 560, 200 600 Z"
          fill="#0d213f"
          opacity="0.4"
        />

        {/* Key Expressways / Arteries */}
        <line x1="280" y1="180" x2="620" y2="600" stroke="#1e293b" strokeWidth="3" opacity="0.5" strokeDasharray="6 4" />
        <line x1="120" y1="540" x2="890" y2="560" stroke="#1e293b" strokeWidth="2.5" opacity="0.5" />

        {/* Full Route Polyline (Shadow) */}
        {svgPolylinePoints && (
          <polyline
            points={svgPolylinePoints}
            fill="none"
            stroke="#064e3b"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.6"
          />
        )}

        {/* Main Glowing Route Polyline */}
        {svgPolylinePoints && (
          <polyline
            points={svgPolylinePoints}
            fill="none"
            stroke="#10b981"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#emeraldGlow)"
          />
        )}

        {/* Animated Dashed Pulse along Polyline */}
        {svgPolylinePoints && (
          <polyline
            points={svgPolylinePoints}
            fill="none"
            stroke="#6ee7b7"
            strokeWidth="2"
            strokeDasharray="8 16"
            strokeLinecap="round"
            className="animate-pulse"
          />
        )}

        {/* Pickup Pin */}
        {(() => {
          const pt = project(pickup.location);
          const isHovered = activeTooltip === 'pickup';
          return (
            <g
              className="cursor-pointer transition-transform duration-200"
              onMouseEnter={() => setActiveTooltip('pickup')}
              onMouseLeave={() => setActiveTooltip(null)}
              onClick={() => setActiveTooltip(isHovered ? null : 'pickup')}
            >
              {/* Ping Ring */}
              <circle cx={pt.x} cy={pt.y} r="22" fill="#10b981" opacity="0.2" className="animate-ping" />
              {/* Base Shadow */}
              <ellipse cx={pt.x} cy={pt.y + 14} rx="12" ry="5" fill="#000000" opacity="0.5" />
              {/* Circle */}
              <circle cx={pt.x} cy={pt.y} r="15" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" />
              <text
                x={pt.x}
                y={pt.y + 5}
                textAnchor="middle"
                fill="#ffffff"
                fontSize="12"
                fontWeight="900"
                fontFamily="system-ui"
              >
                P
              </text>

              {/* Tooltip */}
              {isHovered && (
                <g>
                  <rect
                    x={pt.x - 90}
                    y={pt.y - 50}
                    width="180"
                    height="36"
                    rx="6"
                    fill="#0f172a"
                    stroke="#10b981"
                    strokeWidth="1.5"
                  />
                  <text x={pt.x} y={pt.y - 34} textAnchor="middle" fill="#10b981" fontSize="10" fontWeight="bold">
                    PICKUP LOCATION
                  </text>
                  <text x={pt.x} y={pt.y - 20} textAnchor="middle" fill="#cbd5e1" fontSize="9">
                    {pickup.address.slice(0, 24)}...
                  </text>
                </g>
              )}
            </g>
          );
        })()}

        {/* Drop-off Stop Pins */}
        {stops.map((stop, i) => {
          const pt = project(stop.dropoffLocation);
          const isHovered = activeTooltip === `stop-${i}`;
          const isCompleted = stop.status === 'delivered';
          const pinColor = isCompleted ? '#10b981' : '#0284c7';

          return (
            <g
              key={`stop-${stop.sequenceNumber}`}
              className="cursor-pointer transition-transform duration-200"
              onMouseEnter={() => setActiveTooltip(`stop-${i}`)}
              onMouseLeave={() => setActiveTooltip(null)}
              onClick={() => setActiveTooltip(isHovered ? null : `stop-${i}`)}
            >
              <ellipse cx={pt.x} cy={pt.y + 14} rx="12" ry="5" fill="#000000" opacity="0.5" />
              <circle cx={pt.x} cy={pt.y} r="14" fill={pinColor} stroke="#ffffff" strokeWidth="2.5" />
              <text
                x={pt.x}
                y={pt.y + 5}
                textAnchor="middle"
                fill="#ffffff"
                fontSize="11"
                fontWeight="900"
                fontFamily="system-ui"
              >
                {stop.sequenceNumber}
              </text>

              {isHovered && (
                <g>
                  <rect
                    x={pt.x - 100}
                    y={pt.y - 50}
                    width="200"
                    height="36"
                    rx="6"
                    fill="#0f172a"
                    stroke={pinColor}
                    strokeWidth="1.5"
                  />
                  <text x={pt.x} y={pt.y - 34} textAnchor="middle" fill={pinColor} fontSize="10" fontWeight="bold">
                    STOP {stop.sequenceNumber}: {stop.recipientName || 'Recipient'}
                  </text>
                  <text x={pt.x} y={pt.y - 20} textAnchor="middle" fill="#cbd5e1" fontSize="9">
                    {stop.dropoffAddress.slice(0, 28)}...
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* LIVE MOVING MOTORCYCLE / RIDER MARKER (Stage 14 Smooth RAF Interpolation) */}
        {isTripActive && (
          <g transform={`translate(${currentRiderSvg.x}, ${currentRiderSvg.y})`}>
            {/* Accuracy / Radar Aura */}
            <circle
              cx="0"
              cy="0"
              r="34"
              fill="#06b6d4"
              opacity="0.15"
              className="animate-ping origin-center"
            />
            <circle cx="0" cy="0" r="24" fill="#06b6d4" opacity="0.25" />

            {/* Rotated Motorcycle Icon according to road bearing */}
            <g transform={`rotate(${currentBearing})`} filter="url(#riderGlow)">
              {/* Outer Vehicle Halo */}
              <circle cx="0" cy="0" r="18" fill="#0284c7" stroke="#38bdf8" strokeWidth="2.5" />

              {/* Forward Navigation Arrow / Motorcycle Silhouette */}
              <path
                d="M 0 -13 L 9 9 L 0 5 L -9 9 Z"
                fill="#ffffff"
              />
              {/* Center Cockpit Core */}
              <circle cx="0" cy="1" r="3" fill="#0369a1" />
            </g>

            {/* Mini Floating Speed Badge */}
            <g transform="translate(0, -28)">
              <rect
                x="-26"
                y="-10"
                width="52"
                height="18"
                rx="9"
                fill="#0f172a"
                stroke="#38bdf8"
                strokeWidth="1.2"
              />
              <text
                x="0"
                y="3"
                textAnchor="middle"
                fill="#38bdf8"
                fontSize="9"
                fontWeight="bold"
                fontFamily="system-ui"
              >
                {Math.round(currentSpeed)} km/h
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}

