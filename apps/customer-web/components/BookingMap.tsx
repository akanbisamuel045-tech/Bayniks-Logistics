'use client';

import React, { useMemo, useState } from 'react';
import { LatLng, decodeGooglePolyline } from '@logistics/shared-types';

export interface BookingMapProps {
  pickup: {
    address: string;
    landmark?: string;
    location: LatLng;
  } | null;
  stops: Array<{
    address: string;
    landmark?: string;
    location: LatLng;
    recipientName?: string;
  }>;
  encodedPolyline?: string;
  estimatedDistanceKm?: number;
  estimatedDurationMinutes?: number;
  className?: string;
}

export function BookingMap({
  pickup,
  stops,
  encodedPolyline,
  estimatedDistanceKm,
  estimatedDurationMinutes,
  className = '',
}: BookingMapProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // 1. Gather all waypoints
  const waypoints = useMemo(() => {
    const list: Array<{ type: 'pickup' | 'stop'; index?: number; name: string; landmark?: string; location: LatLng }> = [];
    if (pickup) {
      list.push({
        type: 'pickup',
        name: pickup.address,
        landmark: pickup.landmark,
        location: pickup.location,
      });
    }
    stops.forEach((s, idx) => {
      list.push({
        type: 'stop',
        index: idx + 1,
        name: s.recipientName ? `${s.recipientName} (${s.address})` : s.address,
        landmark: s.landmark,
        location: s.location,
      });
    });
    return list;
  }, [pickup, stops]);

  // 2. Decode polyline if provided, or fallback to connecting waypoints
  const routePoints = useMemo(() => {
    if (encodedPolyline && encodedPolyline.trim().length > 0) {
      try {
        const decoded = decodeGooglePolyline(encodedPolyline);
        if (decoded.length > 0) return decoded;
      } catch {
        // Fallback to waypoint points
      }
    }
    return waypoints.map((w) => w.location);
  }, [encodedPolyline, waypoints]);

  // 3. Compute Bounding Box with margin
  const bounds = useMemo(() => {
    const allCoords = routePoints.length > 0 ? routePoints : waypoints.map((w) => w.location);
    if (allCoords.length === 0) {
      // Default to central Lagos (Ikeja to Victoria Island)
      return { minLat: 6.42, maxLat: 6.62, minLng: 3.32, maxLng: 3.52 };
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

    // Add 20% margin
    const latSpan = Math.max(0.04, (maxLat - minLat) * 1.35);
    const lngSpan = Math.max(0.04, (maxLng - minLng) * 1.35);
    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;

    return {
      minLat: midLat - latSpan / 2,
      maxLat: midLat + latSpan / 2,
      minLng: midLng - lngSpan / 2,
      maxLng: midLng + lngSpan / 2,
    };
  }, [routePoints, waypoints]);

  // 4. Projection helper: converts { lat, lng } to SVG (x, y) coordinates
  const project = (coord: LatLng) => {
    const x = ((coord.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 1000;
    // Invert Y because SVG coordinates increase downwards
    const y = ((bounds.maxLat - coord.lat) / (bounds.maxLat - bounds.minLat)) * 800;
    return { x, y };
  };

  const svgPolylinePoints = useMemo(() => {
    if (routePoints.length < 2) return '';
    return routePoints.map((c) => {
      const { x, y } = project(c);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [routePoints, bounds]);

  // First waypoint or mid-point for simulated bike marker
  const bikePoint = useMemo(() => {
    if (routePoints.length >= 2) {
      const midIdx = Math.floor(routePoints.length / 2);
      return project(routePoints[midIdx]!);
    }
    if (waypoints.length > 0) {
      return project(waypoints[0]!.location);
    }
    return { x: 500, y: 400 };
  }, [routePoints, waypoints, bounds]);

  return (
    <div className={`relative w-full h-full bg-slate-100 overflow-hidden select-none ${className}`}>
      {/* Interactive Cartography SVG */}
      <svg
        viewBox="0 0 1000 800"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Glowing Atomic Orange filter for route */}
          <filter id="orangeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Subtle grid pattern */}
          <pattern id="bayniksGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E2E8F0" strokeWidth="0.8" opacity="0.6" />
          </pattern>
        </defs>

        {/* Background Grid */}
        <rect width="1000" height="800" fill="#F8FAFC" />
        <rect width="1000" height="800" fill="url(#bayniksGrid)" />

        {/* Lagos Stylized Lagoon & Ocean Shapes */}
        <path
          d="M 0 720 Q 250 680, 500 700 T 1000 680 L 1000 800 L 0 800 Z"
          fill="#E0F2FE"
          opacity="0.85"
        />
        <path
          d="M 120 400 Q 300 480, 550 430 T 900 490 L 950 560 Q 600 520, 250 560 Z"
          fill="#BAE6FD"
          opacity="0.75"
        />

        {/* Key Express Arteries */}
        <line x1="280" y1="200" x2="620" y2="580" stroke="#CBD5E1" strokeWidth="4" opacity="0.9" strokeDasharray="6 4" />
        <line x1="150" y1="520" x2="880" y2="540" stroke="#CBD5E1" strokeWidth="3" opacity="0.9" />

        {/* Route Polyline (Shadow) */}
        {svgPolylinePoints && (
          <polyline
            points={svgPolylinePoints}
            fill="none"
            stroke="#EA580C"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.25"
          />
        )}

        {/* Route Polyline (Main Glowing Line: Atomic Orange) */}
        {svgPolylinePoints && (
          <polyline
            points={svgPolylinePoints}
            fill="none"
            stroke="#FF6D1F"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#orangeGlow)"
          />
        )}

        {/* Animated flow pulse dashes along polyline */}
        {svgPolylinePoints && (
          <polyline
            points={svgPolylinePoints}
            fill="none"
            stroke="#FB923C"
            strokeWidth="2"
            strokeDasharray="8 16"
            strokeLinecap="round"
            className="animate-pulse"
          />
        )}

        {/* Moving Motorcycle Marker on Route */}
        {routePoints.length >= 2 && (
          <g transform={`translate(${bikePoint.x}, ${bikePoint.y})`}>
            {/* Pulse aura */}
            <circle cx="0" cy="0" r="22" fill="#FF6D1F" opacity="0.25" className="animate-ping" />
            <circle cx="0" cy="0" r="14" fill="#FF6D1F" stroke="#FFFFFF" strokeWidth="2" className="shadow-lg" />
            <g transform="translate(-8, -8) scale(0.68)" stroke="#FFFFFF" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18.5" cy="17.5" r="3.5" />
              <circle cx="5.5" cy="17.5" r="3.5" />
              <circle cx="15" cy="5" r="1" />
              <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
            </g>
          </g>
        )}

        {/* Waypoint Markers */}
        {waypoints.map((wp, i) => {
          const { x, y } = project(wp.location);
          const isPickup = wp.type === 'pickup';
          const isHovered = activeTooltip === `wp-${i}`;

          return (
            <g
              key={`wp-${i}`}
              className="cursor-pointer transition-transform duration-200"
              onMouseEnter={() => setActiveTooltip(`wp-${i}`)}
              onMouseLeave={() => setActiveTooltip(null)}
              onClick={() => setActiveTooltip(isHovered ? null : `wp-${i}`)}
            >
              {/* Outer Pulse Ring for Pickup (Emerald) */}
              {isPickup && (
                <circle
                  cx={x}
                  cy={y}
                  r="24"
                  fill="#10b981"
                  opacity="0.2"
                  className="animate-ping origin-center"
                />
              )}

              {/* Marker Pin Base Shadow */}
              <ellipse cx={x} cy={y + 14} rx="12" ry="5" fill="#000000" opacity="0.6" />

              {/* Pin Circle: Emerald for Pickup, Sky Blue for Dropoffs */}
              <circle
                cx={x}
                cy={y}
                r={isPickup ? 16 : 14}
                fill={isPickup ? '#10b981' : '#0284c7'}
                stroke="#ffffff"
                strokeWidth="2.5"
                className="shadow-xl"
              />

              {/* Pin Label */}
              <text
                x={x}
                y={y + (isPickup ? 4 : 4)}
                textAnchor="middle"
                fill="#ffffff"
                fontSize={isPickup ? '10' : '11'}
                fontWeight="bold"
                fontFamily="monospace"
              >
                {isPickup ? 'P' : wp.index}
              </text>

              {/* Waypoint Tooltip Popup */}
              {(isHovered || waypoints.length <= 2) && (
                <g transform={`translate(${x}, ${y - 48})`}>
                  <rect
                    x="-90"
                    y="0"
                    width="180"
                    height="38"
                    rx="8"
                    fill="#FFFFFF"
                    stroke="#FF6D1F"
                    strokeWidth="1.5"
                    className="shadow-md"
                  />
                  <text
                    x="0"
                    y="15"
                    textAnchor="middle"
                    fill={isPickup ? '#059669' : '#0284c7'}
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {isPickup ? 'PICKUP LOCATION' : `STOP #${wp.index}`}
                  </text>
                  <text
                    x="0"
                    y="28"
                    textAnchor="middle"
                    fill="#0F172A"
                    fontSize="10"
                    fontWeight="600"
                  >
                    {wp.name.length > 22 ? `${wp.name.substring(0, 20)}...` : wp.name}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating HUD: Route Statistics */}
      <div className="absolute top-4 left-4 z-10 clay-card rounded-2xl p-3 bg-white/95 backdrop-blur-md border border-slate-200 shadow-md space-y-1.5 max-w-xs text-slate-900">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-bayniks-orange animate-ping" />
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-600">
            Bayniks Radar Viewport
          </span>
        </div>

        {estimatedDistanceKm !== undefined && estimatedDurationMinutes !== undefined ? (
          <div className="flex items-baseline space-x-3 pt-1 border-t border-slate-100">
            <div>
              <span className="text-[9px] uppercase font-mono text-slate-500 font-bold block">Distance</span>
              <span className="text-sm font-bold text-slate-900 font-mono">{estimatedDistanceKm} km</span>
            </div>
            <div>
              <span className="text-[9px] uppercase font-mono text-slate-500 font-bold block">Motorcycle ETA</span>
              <span className="text-sm font-bold text-bayniks-orange font-mono">~{estimatedDurationMinutes} mins</span>
            </div>
            <div>
              <span className="text-[9px] uppercase font-mono text-slate-500 font-bold block">Waypoints</span>
              <span className="text-sm font-bold text-slate-700 font-mono">{waypoints.length}</span>
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-slate-500 font-mono font-medium">
            Routing express motorcycle itinerary...
          </div>
        )}
      </div>

      {/* Legend Card */}
      <div className="absolute bottom-4 right-4 z-10 clay-card rounded-2xl p-2.5 bg-white/95 backdrop-blur-md border border-slate-200 text-[10px] font-mono text-slate-700 space-y-1 hidden sm:block shadow-md">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="font-medium">Pickup Point</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
          <span className="font-medium">Drop-off Stops</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-1 rounded bg-bayniks-orange" />
          <span className="font-bold text-bayniks-orange">Bayniks Active Route</span>
        </div>
      </div>
    </div>
  );
}
