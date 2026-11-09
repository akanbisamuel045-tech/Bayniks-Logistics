'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import {
  PublicTrackingResponse,
  OrderStatus,
  formatNaira,
  computeRemainingDistanceAndEta,
  decodeGooglePolyline,
  LatLng,
} from '@logistics/shared-types';
import { OrderStatusBadge } from '@logistics/ui';
import type { LiveTelemetryPoint } from '../../../components/LiveTrackingMap';

const LiveTrackingMap = dynamic(
  () => import('../../../components/LiveTrackingMap').then((mod) => mod.LiveTrackingMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[320px] bg-bayniks-black flex flex-col items-center justify-center text-slate-500 text-xs font-mono space-y-2">
        <div className="w-8 h-8 border-2 border-bayniks-orange border-t-transparent rounded-full animate-spin" />
        <span>Initializing Bayniks Tactical Cartography...</span>
      </div>
    ),
  }
);

export default function TrackingPage({
  params,
}: {
  params: { trackingCode: string };
}) {
  const { trackingCode } = params;
  const [trackingData, setTrackingData] = useState<PublicTrackingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live telemetry state
  const [liveTelemetry, setLiveTelemetry] = useState<LiveTelemetryPoint | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Simulation mode state
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial REST fetch for Order & Assigned Rider
  useEffect(() => {
    async function fetchTracking() {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/v1/orders/track/${trackingCode.toUpperCase()}`);
        if (!res.ok) {
          throw new Error('Tracking code not found or invalid');
        }
        const data: PublicTrackingResponse = await res.json();
        setTrackingData(data);
        if (data.liveTelemetry) {
          setLiveTelemetry({
            lat: data.liveTelemetry.lat,
            lng: data.liveTelemetry.lng,
            bearing: data.liveTelemetry.bearing,
            speed: data.liveTelemetry.speed,
            accuracy: data.liveTelemetry.accuracy,
            timestamp: data.liveTelemetry.updatedAt,
          });
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load tracking data');
      } finally {
        setIsLoading(false);
      }
    }

    if (trackingCode) {
      fetchTracking();
    }
  }, [trackingCode]);

  // 2. Real-Time Socket.io Connection
  useEffect(() => {
    if (!trackingCode) return;

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:5000` : 'http://localhost:5000');

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsSocketConnected(true);
      socket.emit('track:subscribe', { trackingCode: trackingCode.toUpperCase() });
    });

    socket.on('disconnect', () => {
      setIsSocketConnected(false);
    });

    socket.on('tracking:snapshot', (snapshot: any) => {
      if (snapshot.status) {
        setTrackingData((prev) => (prev ? { ...prev, status: snapshot.status } : prev));
      }
      if (snapshot.telemetry) {
        setLiveTelemetry({
          lat: snapshot.telemetry.lat,
          lng: snapshot.telemetry.lng,
          bearing: snapshot.telemetry.bearing,
          speed: snapshot.telemetry.speed,
          accuracy: snapshot.telemetry.accuracy,
          timestamp: snapshot.telemetry.timestamp,
        });
      }
    });

    socket.on('tracking:update', (update: any) => {
      if (update.trackingCode === trackingCode.toUpperCase()) {
        setLiveTelemetry({
          lat: update.lat,
          lng: update.lng,
          bearing: update.bearing || 0,
          speed: update.speed || 0,
          accuracy: update.accuracy || 10,
          timestamp: update.updatedAt || Date.now(),
        });
        if (update.status) {
          setTrackingData((prev) => (prev ? { ...prev, status: update.status } : prev));
        }
      }
    });

    return () => {
      socket.emit('track:unsubscribe', { trackingCode: trackingCode.toUpperCase() });
      socket.disconnect();
    };
  }, [trackingCode]);

  // Decode route coordinates
  const routeCoordinates = useMemo(() => {
    if (trackingData?.encodedRoutePolyline) {
      try {
        return decodeGooglePolyline(trackingData.encodedRoutePolyline);
      } catch {
        return [];
      }
    }
    return [];
  }, [trackingData?.encodedRoutePolyline]);

  // Compute live remaining ETA and distance
  const dynamicEta = useMemo(() => {
    if (!liveTelemetry || routeCoordinates.length === 0) {
      if (trackingData?.estimatedDistanceKm) {
        return {
          remainingDistanceKm: trackingData.estimatedDistanceKm,
          etaMinutes: Math.round(trackingData.estimatedDistanceKm * 2.5),
        };
      }
      return null;
    }

    const currentPos: LatLng = { lat: liveTelemetry.lat, lng: liveTelemetry.lng };
    const targetPos =
      routeCoordinates.length > 0
        ? routeCoordinates[routeCoordinates.length - 1]!
        : trackingData?.stops[trackingData.stops.length - 1]?.dropoffLocation || currentPos;
    return computeRemainingDistanceAndEta(currentPos, targetPos, liveTelemetry.speed || 25);
  }, [liveTelemetry, routeCoordinates, trackingData?.estimatedDistanceKm]);

  // Local Client Simulation Mode
  const toggleSimulation = () => {
    if (isSimulating) {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
      setIsSimulating(false);
      return;
    }

    if (routeCoordinates.length < 2) return;

    setIsSimulating(true);
    let stepIndex = 0;
    const totalSteps = routeCoordinates.length;

    simulationTimerRef.current = setInterval(() => {
      stepIndex = (stepIndex + 1) % totalSteps;
      const targetCoord = routeCoordinates[stepIndex]!;
      const nextCoord = routeCoordinates[(stepIndex + 1) % totalSteps]!;

      const dLat = nextCoord.lat - targetCoord.lat;
      const dLng = nextCoord.lng - targetCoord.lng;
      let calculatedBearing = (Math.atan2(dLng, dLat) * 180) / Math.PI;
      if (calculatedBearing < 0) calculatedBearing += 360;

      setLiveTelemetry({
        lat: targetCoord.lat,
        lng: targetCoord.lng,
        bearing: Math.round(calculatedBearing),
        speed: 38 + Math.sin(stepIndex) * 8,
        accuracy: 8,
        timestamp: Date.now(),
      });
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    };
  }, []);

  const currentShareUrl =
    typeof window !== 'undefined'
      ? window.location.href
      : `https://bayniks.com/track/${trackingCode}`;

  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(
    `Track my Bayniks express delivery live: ${currentShareUrl}`
  )}`;

  return (
    <div className="min-h-screen bg-bayniks-black text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="h-16 bg-bayniks-cardDark/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className="w-10 h-10 rounded-xl bg-bayniks-orange text-white flex items-center justify-center font-bold text-lg shadow-bolt-glow hover:scale-105 transition-transform"
          >
            ⚡
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-bold text-sm tracking-wider text-white">BAYNIKS</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-bayniks-orange/20 text-bayniks-orange border border-bayniks-orange/40">
                LIVE GPS RADAR
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Waybill: {trackingCode.toUpperCase()}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-3">
          {/* WhatsApp Share Link */}
          <a
            href={whatsappShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-800/80 hover:bg-emerald-900 text-emerald-400 text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm"
          >
            <span>💬</span>
            <span className="hidden sm:inline">Share on WhatsApp</span>
          </a>

          {/* Socket.io Live Status Pill */}
          <div
            className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-mono font-semibold border ${
              isSocketConnected
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                : 'bg-amber-950/80 text-amber-400 border-amber-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isSocketConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
              }`}
            />
            <span className="hidden sm:inline">
              {isSocketConnected ? 'TELEMETRY LIVE' : 'RECONNECTING'}
            </span>
          </div>

          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-bayniks-surfaceDark border border-slate-800 transition-colors"
          >
            New Waybill
          </Link>
        </div>
      </header>

      {/* Main Content Viewport */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-bayniks-orange border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-400">Loading Bayniks live telemetry...</span>
        </div>
      ) : error || !trackingData ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-400 text-3xl flex items-center justify-center">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-white">Waybill Not Found</h2>
          <p className="text-xs text-slate-400 max-w-sm">
            We could not locate shipment with tracking code <span className="font-mono text-white">{trackingCode}</span>. Please verify your waybill number.
          </p>
          <Link
            href="/"
            className="px-5 py-2.5 bg-bayniks-orange hover:bg-bayniks-orangeDark text-white font-semibold text-xs rounded-xl shadow-bolt-glow transition-all"
          >
            Return to Console Home
          </Link>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0">
          {/* Map Column (Left / Top) */}
          <div className="lg:col-span-7 h-[380px] lg:h-auto min-h-[380px] relative border-b lg:border-b-0 lg:border-r border-slate-800">
            <LiveTrackingMap
              pickup={trackingData.pickup}
              stops={trackingData.stops}
              encodedPolyline={trackingData.encodedRoutePolyline}
              riderTelemetry={liveTelemetry}
              status={trackingData.status}
              onSimulateClick={toggleSimulation}
              isSimulating={isSimulating}
              className="w-full h-full"
            />
          </div>

          {/* Details & Itinerary Drawer (Right / Bottom) */}
          <div className="lg:col-span-5 p-4 md:p-6 space-y-5 overflow-y-auto max-h-[calc(100vh-64px)]">
            {/* Status & Tracking Code Card */}
            <div className="clay-card rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                    Waybill Tracking ID
                  </span>
                  <div className="text-2xl font-black font-mono text-bayniks-orange tracking-wider mt-0.5">
                    {trackingData.trackingCode}
                  </div>
                </div>
                <OrderStatusBadge status={trackingData.status} />
              </div>

              {/* Live Distance & ETA Pills */}
              {dynamicEta && (
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                  <div className="bg-bayniks-surfaceDark border border-slate-800/80 p-3 rounded-2xl">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">
                      Estimated Arrival
                    </span>
                    <span className="text-lg font-bold text-bayniks-orange font-mono">
                      ~{dynamicEta.etaMinutes}{' '}
                      <span className="text-xs text-slate-400 font-normal">mins</span>
                    </span>
                  </div>
                  <div className="bg-bayniks-surfaceDark border border-slate-800/80 p-3 rounded-2xl">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">
                      Remaining Distance
                    </span>
                    <span className="text-lg font-bold text-sky-400 font-mono">
                      {dynamicEta.remainingDistanceKm}{' '}
                      <span className="text-xs text-slate-400 font-normal">km</span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Assigned Rider Card */}
            {trackingData.assignedRider ? (
              <div className="clay-card rounded-3xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Assigned Dispatch Rider
                  </span>
                  <span className="inline-flex items-center text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    ✓ Verified Fleet Partner
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-bayniks-orange flex items-center justify-center text-xl font-black text-white shadow-bolt-glow">
                      {trackingData.assignedRider.fullName.slice(0, 1)}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base leading-tight">
                        {trackingData.assignedRider.fullName}
                      </h3>
                      <div className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5">
                        <span className="capitalize">
                          {trackingData.assignedRider.vehicleType === 'bike' ? '🏍️ Motorcycle' : trackingData.assignedRider.vehicleType}
                        </span>
                        {trackingData.assignedRider.plateNumber && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-slate-300 font-semibold uppercase">
                              {trackingData.assignedRider.plateNumber}
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span className="text-amber-400 font-medium">
                          ★ {trackingData.assignedRider.rating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <a
                    href={`tel:${trackingData.assignedRider.phone}`}
                    className="p-3 bg-bayniks-orange hover:bg-bayniks-orangeDark text-white rounded-xl transition-all shadow-bolt-glow active:scale-95"
                    title="Direct call to rider"
                  >
                    📞
                  </a>
                </div>
              </div>
            ) : (
              <div className="clay-card rounded-3xl p-4 text-center space-y-1">
                <span className="text-xs font-semibold text-slate-300">Searching Dispatch Fleet</span>
                <p className="text-[11px] text-slate-400">
                  Broadcasting order to nearby qualified motorcycle couriers in Lagos...
                </p>
              </div>
            )}

            {/* Multi-Stop Itinerary Timeline */}
            <div className="clay-card rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Route Waypoints ({1 + trackingData.stops.length})
                </span>
                <span className="text-xs font-mono font-bold text-bayniks-orange">
                  {formatNaira(trackingData.totalFareKobo)}
                </span>
              </div>

              <div className="space-y-4 border-l-2 border-slate-800 ml-2.5 pl-4">
                {/* Pickup */}
                <div className="relative">
                  <div className="absolute -left-[22px] top-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-bayniks-cardDark" />
                  <div className="text-[11px] font-mono font-semibold text-emerald-400">PICKUP</div>
                  <div className="text-sm font-semibold text-slate-200 mt-0.5">
                    {trackingData.pickup.address}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Landmark: {trackingData.pickup.landmark}
                  </div>
                </div>

                {/* Dropoffs */}
                {trackingData.stops.map((stop) => {
                  const isDelivered = stop.status === 'delivered';
                  return (
                    <div key={stop.sequenceNumber} className="relative pt-2">
                      <div
                        className={`absolute -left-[22px] top-3 w-3 h-3 rounded-full ring-4 ring-bayniks-cardDark ${
                          isDelivered ? 'bg-emerald-500' : 'bg-sky-500'
                        }`}
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-semibold text-sky-400">
                          STOP {stop.sequenceNumber}: {stop.recipientName}
                        </span>
                        <span
                          className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded ${
                            isDelivered
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-bayniks-surfaceDark text-slate-300 border border-slate-800'
                          }`}
                        >
                          {stop.status}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-slate-200 mt-0.5">
                        {stop.dropoffAddress}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Landmark: {stop.dropoffLandmark}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Package: {stop.packageDescription}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Anti-Fraud Security Notice */}
            <div className="clay-card rounded-2xl p-4 text-xs text-slate-400 flex items-start space-x-3">
              <span className="text-bayniks-orange text-lg leading-none">🛡️</span>
              <div className="space-y-1">
                <span className="font-semibold text-slate-200 block">Anti-Fraud PIN Shield</span>
                <p className="text-[11px] leading-relaxed">
                  Verification PINs are strictly hidden from this public link. The 4-digit pickup
                  PIN is delivered only to the sender, and the delivery PIN to the recipient via Termii DND SMS and WhatsApp.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
