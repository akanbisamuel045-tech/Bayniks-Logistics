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

  // 3. Compute Bounding Box (fitBounds) with padding
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

  // Project (lat, lng) to SVG viewBox (1000 x 800)
  const project = (coords: LatLng) => {
    const width = 1000;
    const height = 800;
    const padding = 80;

    const xFrac = (coords.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng);
    // Invert Y because latitude increases northward (upward)
    const yFrac = 1 - (coords.lat - bounds.minLat) / (bounds.maxLat - bounds.minLat);

    const x = padding + xFrac * (width - 2 * padding);
    const y = padding + yFrac * (height - 2 * padding);

    return { x, y };
  };

  const svgPolylinePoints = useMemo(() => {
    if (routePoints.length < 2) return '';
    return routePoints.map((pt) => {
      const { x, y } = project(pt);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [routePoints, bounds]);

  return (
    <div className={`relative w-full h-full bg-slate-950 overflow-hidden select-none ${className}`}>
      {/* Interactive Cartography SVG */}
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
          {/* Subtle grid pattern */}
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.8" opacity="0.4" />
          </pattern>
        </defs>

        {/* Background Grid */}
        <rect width="1000" height="800" fill="#090d16" />
        <rect width="1000" height="800" fill="url(#grid)" />

        {/* Lagos Stylized Lagoon & Ocean Shapes */}
        <path
          d="M 0 720 Q 250 680, 500 700 T 1000 680 L 1000 800 L 0 800 Z"
          fill="#0c192c"
          opacity="0.8"
        />
        <path
          d="M 120 400 Q 300 480, 550 430 T 900 490 L 950 560 Q 600 520, 250 560 Z"
          fill="#0c1e38"
          opacity="0.5"
        />

        {/* Stylized Key Arteries (Third Mainland Bridge & Expressway Lines) */}
        <line x1="280" y1="200" x2="620" y2="580" stroke="#1e293b" strokeWidth="4" opacity="0.6" strokeDasharray="6 4" />
        <line x1="150" y1="520" x2="880" y2="540" stroke="#1e293b" strokeWidth="3" opacity="0.6" />

        {/* Route Polyline (Shadow) */}
        {svgPolylinePoints && (
          <polyline
            points={svgPolylinePoints}
            fill="none"
            stroke="#064e3b"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.7"
          />
        )}

        {/* Route Polyline (Main Glowing Line) */}
        {svgPolylinePoints && (
          <polyline
            points={svgPolylinePoints}
            fill="none"
            stroke="#10b981"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#emeraldGlow)"
          />
        )}

        {/* Animated flow pulse dashes along polyline */}
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
              {/* Outer Pulse Ring for Pickup */}
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
              <ellipse cx={x} cy={y + 14} rx="12" ry="5" fill="#000000" opacity="0.5" />

              {/* Pin Circle */}
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
                y={y + 4.5}
                textAnchor="middle"
                fill="#ffffff"
                fontSize={isPickup ? '12' : '11'}
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                {isPickup ? 'P' : wp.index}
              </text>

              {/* Tooltip Card on Hover/Click */}
              {isHovered && (
                <g transform={`translate(${x}, ${y - 42})`}>
                  <rect
                    x="-100"
                    y="-30"
                    width="200"
                    height="32"
                    rx="6"
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth="1"
                    className="shadow-2xl"
                  />
                  <text
                    x="0"
                    y="-18"
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize="11"
                    fontWeight="600"
                  >
                    {isPickup ? 'Pickup' : `Stop ${wp.index}`}
                  </text>
                  <text
                    x="0"
                    y="-6"
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="9.5"
                  >
                    {wp.landmark || wp.name.slice(0, 28)}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating HUD: Distance & ETA Banner */}
      {estimatedDistanceKm !== undefined && estimatedDurationMinutes !== undefined && (
        <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-4 py-2.5 shadow-2xl flex items-center space-x-4 text-xs font-medium z-10">
          <div className="flex items-center space-x-1.5 text-slate-300">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span>{estimatedDistanceKm} km</span>
          </div>
          <div className="h-3 w-px bg-slate-700" />
          <div className="flex items-center space-x-1.5 text-slate-300">
            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>~{estimatedDurationMinutes} mins</span>
          </div>
          {stops.length > 1 && (
            <>
              <div className="h-3 w-px bg-slate-700" />
              <div className="text-emerald-400 font-semibold">
                {stops.length} Stops
              </div>
            </>
          )}
        </div>
      )}

      {/* Lagos Watermark Badge */}
      <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-lg px-3 py-1 text-[11px] font-mono text-slate-400 z-10 flex items-center space-x-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>Lagos Real-Time Fleet Radar</span>
      </div>
    </div>
  );
}

