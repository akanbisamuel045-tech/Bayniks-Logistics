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
      <div className="w-full h-full min-h-[320px] bg-slate-950 flex flex-col items-center justify-center text-slate-500 text-xs font-mono space-y-2">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span>Initializing Tactical Cartography...</span>
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
      if (update.status) {
        setTrackingData((prev) => (prev ? { ...prev, status: update.status } : prev));
      }
      if (update.lat !== undefined && update.lng !== undefined) {
        setLiveTelemetry({
          lat: update.lat,
          lng: update.lng,
          bearing: update.bearing ?? 0,
          speed: update.speed ?? 0,
          accuracy: update.accuracy,
          timestamp: update.timestamp ?? Date.now(),
        });
      }
    });

    return () => {
      socket.emit('track:unsubscribe', { trackingCode: trackingCode.toUpperCase() });
      socket.disconnect();
    };
  }, [trackingCode]);

  // 3. Compute Dynamic ETA and Distance to Next Destination
  const dynamicEta = useMemo(() => {
    if (!trackingData) return null;

    // Determine target location (first undelivered stop or pickup)
    const targetLoc: LatLng =
      trackingData.status === 'rider_assigned' || trackingData.status === 'arrived_pickup'
        ? trackingData.pickup.location
        : (trackingData.stops.find((s) => s.status !== 'delivered')?.dropoffLocation ??
          trackingData.stops[trackingData.stops.length - 1]!.dropoffLocation);

    const riderPos: LatLng = liveTelemetry
      ? { lat: liveTelemetry.lat, lng: liveTelemetry.lng }
      : trackingData.pickup.location;

    const speed = liveTelemetry?.speed ?? 0;
    return computeRemainingDistanceAndEta(riderPos, targetLoc, speed);
  }, [trackingData, liveTelemetry]);

  // 4. Interactive Simulation Mode Handler (Demonstrates 60fps Interpolation)
  const toggleSimulation = () => {
    if (isSimulating) {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
      setIsSimulating(false);
      return;
    }

    if (!trackingData) return;

    let points: LatLng[] = [];
    if (trackingData.encodedRoutePolyline) {
      try {
        points = decodeGooglePolyline(trackingData.encodedRoutePolyline);
      } catch {
        // Fallback
      }
    }
    if (points.length < 2) {
      points = [trackingData.pickup.location, ...trackingData.stops.map((s) => s.dropoffLocation)];
    }

    setIsSimulating(true);
    let stepIndex = 0;

    const runStep = () => {
      if (stepIndex >= points.length - 1) {
        stepIndex = 0; // Loop simulation
      }
      const current = points[stepIndex]!;
      const next = points[stepIndex + 1]!;

      // Calculate bearing from current to next point
      const y = Math.sin((next.lng - current.lng) * (Math.PI / 180)) * Math.cos(next.lat * (Math.PI / 180));
      const x =
        Math.cos(current.lat * (Math.PI / 180)) * Math.sin(next.lat * (Math.PI / 180)) -
        Math.sin(current.lat * (Math.PI / 180)) *
          Math.cos(next.lat * (Math.PI / 180)) *
          Math.cos((next.lng - current.lng) * (Math.PI / 180));
      const bearing = (((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);

      setLiveTelemetry({
        lat: current.lat,
        lng: current.lng,
        bearing: Math.round(bearing),
        speed: 35 + Math.floor(Math.random() * 15),
        accuracy: 4,
        timestamp: Date.now(),
      });

      stepIndex++;
    };

    runStep();
    simulationTimerRef.current = setInterval(runStep, 4500);
  };

  useEffect(() => {
    return () => {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    };
  }, []);

  // WhatsApp Share URL generator
  const whatsappShareUrl = useMemo(() => {
    if (!trackingData) return '';
    const shareText = `Track my LagosExpress package in real-time!\nTracking Code: ${trackingData.trackingCode}\nStatus: ${trackingData.status.toUpperCase()}\nTrack here: ${typeof window !== 'undefined' ? window.location.href : ''}`;
    return `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  }, [trackingData]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 py-3 sticky top-0 z-30 flex items-center justify-between">
        <Link
          href="/"
          className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1.5 transition-colors"
        >
          <span>← Book Dispatch</span>
        </Link>

        <div className="flex items-center space-x-3">
          {/* Connection status indicator */}
          <div className="flex items-center space-x-1.5 bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded-full text-[11px] font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                isSocketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-slate-400">
              {isSocketConnected ? 'Live 5s GPS' : 'Connecting Gateway...'}
            </span>
          </div>

          {whatsappShareUrl && (
            <a
              href={whatsappShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-full text-[11px] font-medium flex items-center space-x-1 transition-all"
              title="Share tracking link via WhatsApp"
            >
              <span>💬</span>
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
          )}
        </div>
      </header>

      {/* Main Body */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-12 h-12 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-slate-400">
            Triangulating telemetry for {trackingCode}...
          </p>
        </div>
      ) : error || !trackingData ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl">
            <div className="text-5xl">📦</div>
            <h2 className="text-xl font-bold text-white">Shipment Not Found</h2>
            <p className="text-xs text-slate-400">
              Could not find active telemetry matching code{' '}
              <span className="font-mono text-emerald-400 font-semibold">{trackingCode}</span>.
            </p>
            <Link
              href="/"
              className="inline-block w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all"
            >
              Return to Booking
            </Link>
          </div>
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
          <div className="lg:col-span-5 p-4 md:p-6 space-y-5 overflow-y-auto max-h-[calc(100vh-60px)]">
            {/* Status & Tracking Code Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                    Tracking ID
                  </span>
                  <div className="text-2xl font-black font-mono text-emerald-400">
                    {trackingData.trackingCode}
                  </div>
                </div>
                <OrderStatusBadge status={trackingData.status} />
              </div>

              {/* Live Distance & ETA Pills */}
              {dynamicEta && (
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                  <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">
                      Estimated Arrival
                    </span>
                    <span className="text-lg font-bold text-emerald-400 font-mono">
                      ~{dynamicEta.etaMinutes}{' '}
                      <span className="text-xs text-slate-400 font-normal">mins</span>
                    </span>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl">
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
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
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
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-sky-600 flex items-center justify-center text-xl font-black text-white shadow-lg">
                      {trackingData.assignedRider.fullName.slice(0, 1)}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base leading-tight">
                        {trackingData.assignedRider.fullName}
                      </h3>
                      <div className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5">
                        <span className="capitalize">{trackingData.assignedRider.vehicleType}</span>
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
                    className="p-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95"
                    title="Direct call to rider"
                  >
                    📞
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-center space-y-1">
                <span className="text-xs font-semibold text-slate-300">Searching Dispatch Fleet</span>
                <p className="text-[11px] text-slate-400">
                  Broadcasting order to nearby qualified motorcycle riders in Lagos...
                </p>
              </div>
            )}

            {/* Multi-Stop Itinerary Timeline */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Route Waypoints ({1 + trackingData.stops.length})
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {formatNaira(trackingData.totalFareKobo)}
                </span>
              </div>

              <div className="space-y-4 border-l-2 border-slate-800 ml-2.5 pl-4">
                {/* Pickup */}
                <div className="relative">
                  <div className="absolute -left-[22px] top-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-slate-900" />
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
                        className={`absolute -left-[22px] top-3 w-3 h-3 rounded-full ring-4 ring-slate-900 ${
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
                              : 'bg-slate-800 text-slate-300'
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
            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 text-xs text-slate-400 flex items-start space-x-3">
              <span className="text-amber-400 text-lg leading-none">🛡️</span>
              <div className="space-y-1">
                <span className="font-semibold text-slate-200 block">Anti-Fraud PIN Shield</span>
                <p className="text-[11px] leading-relaxed">
                  Verification PINs are strictly hidden from this public link. The 4-digit pickup
                  PIN is delivered only to the sender, and the delivery PIN to the recipient.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
