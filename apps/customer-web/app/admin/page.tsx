'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FleetBikeTelemetryItem,
  AdminFleetOverviewResponse,
} from '@logistics/shared-types';
import { GodsEyeFleetMap } from '../../components/admin/GodsEyeFleetMap';
import { KycApprovalQueue, PendingKycApplicant } from '../../components/admin/KycApprovalQueue';
import { OrderReassignModal } from '../../components/admin/OrderReassignModal';

export default function AdminCommandCenterPage() {
  const [activeTab, setActiveTab] = useState<'radar' | 'kyc' | 'orders'>('radar');
  const [fleetOverview, setFleetOverview] = useState<AdminFleetOverviewResponse>({
    onlineCount: 0,
    busyCount: 0,
    mockLocationFlaggedCount: 0,
    pendingKycCount: 0,
    bikes: [],
  });
  const [kycQueue, setKycQueue] = useState<PendingKycApplicant[]>([]);
  const [isLoadingFleet, setIsLoadingFleet] = useState(false);
  const [isLoadingKyc, setIsLoadingKyc] = useState(false);

  // Reassignment Modal State
  const [reassignModal, setReassignModal] = useState<{
    isOpen: boolean;
    orderId: string;
    trackingCode: string;
    currentRiderId: string;
  }>({
    isOpen: false,
    orderId: '',
    trackingCode: '',
    currentRiderId: '',
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch Live Fleet Overview from Redis/MongoDB
  const fetchFleetOverview = useCallback(async () => {
    setIsLoadingFleet(true);
    try {
      const token = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
        ? window.localStorage.getItem('auth_token')
        : null;
      const response = await fetch('/api/v1/admin/fleet/live', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data: AdminFleetOverviewResponse = await response.json();
        setFleetOverview(data);
      }
    } catch {
      // offline fallback
    } finally {
      setIsLoadingFleet(false);
    }
  }, []);

  // Fetch Pending KYC Queue
  const fetchKycQueue = useCallback(async () => {
    setIsLoadingKyc(true);
    try {
      const token = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
        ? window.localStorage.getItem('auth_token')
        : null;
      const response = await fetch('/api/v1/admin/kyc/pending', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setKycQueue(data.riders || []);
      }
    } catch {
      // offline fallback
    } finally {
      setIsLoadingKyc(false);
    }
  }, []);

  useEffect(() => {
    fetchFleetOverview();
    fetchKycQueue();

    // Auto-refresh fleet radar every 10 seconds
    const interval = setInterval(() => {
      fetchFleetOverview();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchFleetOverview, fetchKycQueue]);

  const handleOpenReassign = (orderId: string, trackingCode: string, currentRiderId: string) => {
    setReassignModal({
      isOpen: true,
      orderId,
      trackingCode,
      currentRiderId,
    });
  };

  const handleReassignSuccess = (updatedOrder: any) => {
    setNotification({
      type: 'success',
      message: `Order ${updatedOrder.trackingCode || 'reassigned'} successfully transferred to replacement dispatch rider!`,
    });
    fetchFleetOverview();
  };

  return (
    <div className="min-h-screen bg-bayniks-black text-slate-100 font-sans selection:bg-bayniks-orange selection:text-white pb-16">
      {/* Top Header */}
      <header className="h-16 bg-bayniks-cardDark/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-9 h-9 rounded-xl bg-bayniks-orange flex items-center justify-center font-mono font-bold text-white shadow-bolt-glow text-base">
              🛡️
            </div>
            <div className="flex flex-col">
              <span className="font-mono font-bold tracking-wider text-sm text-white group-hover:text-bayniks-orange transition-colors">
                BAYNIKS
              </span>
              <span className="text-[10px] uppercase font-mono tracking-widest text-bayniks-orange -mt-0.5">
                Command Center
              </span>
            </div>
          </Link>

          <span className="text-slate-600 hidden sm:inline">/</span>
          <span className="text-xs font-mono text-slate-300 hidden sm:inline">
            Super-Admin &amp; Fleet Radar
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-[11px] font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Redis 5s Telemetry Engine</span>
          </div>

          <Link
            href="/"
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-bayniks-surfaceDark border border-slate-800 hover:text-white hover:border-bayniks-orange transition-colors"
          >
            ← Live Tracking Console
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Toast Feedback */}
        {notification && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-center justify-between shadow-xl ${
              notification.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                : 'bg-rose-950/60 border-rose-800 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{notification.type === 'success' ? '✅' : '⚠️'}</span>
              <span>{notification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Enterprise Fleet Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Online Fleet */}
          <div className="p-4 rounded-2xl bg-bayniks-cardDark border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Online Couriers</span>
              <span className="text-emerald-400 font-bold">● Active</span>
            </div>
            <div className="text-2xl font-mono font-bold text-white">
              {fleetOverview.onlineCount}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Available or In Transit across Lagos
            </div>
          </div>

          {/* Busy / In-Transit */}
          <div className="p-4 rounded-2xl bg-bayniks-cardDark border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>In-Transit Couriers</span>
              <span className="text-bayniks-orange font-bold">⚡ Active</span>
            </div>
            <div className="text-2xl font-mono font-bold text-bayniks-orange">
              {fleetOverview.busyCount}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Currently delivering customer parcels
            </div>
          </div>

          {/* Pending KYC Queue */}
          <div className="p-4 rounded-2xl bg-bayniks-cardDark border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Pending KYC Queue</span>
              <span className="text-amber-400 font-bold">🪪 Verification</span>
            </div>
            <div className="text-2xl font-mono font-bold text-amber-400">
              {fleetOverview.pendingKycCount}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Riders awaiting documentation review
            </div>
          </div>

          {/* Fake GPS / Spoof Alert */}
          <div className={`p-4 rounded-2xl border space-y-1 ${
            fleetOverview.mockLocationFlaggedCount > 0
              ? 'bg-rose-950/40 border-rose-800'
              : 'bg-bayniks-cardDark border-slate-800'
          }`}>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className={fleetOverview.mockLocationFlaggedCount > 0 ? 'text-rose-300 font-bold' : ''}>
                Mock GPS Spoof Flags
              </span>
              <span className="text-rose-400 font-bold">⚠️ Anti-Fraud</span>
            </div>
            <div className={`text-2xl font-mono font-bold ${
              fleetOverview.mockLocationFlaggedCount > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-400'
            }`}>
              {fleetOverview.mockLocationFlaggedCount}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Bikes reporting mock provider coordinates
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('radar')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-wide transition-all flex items-center gap-2 ${
              activeTab === 'radar'
                ? 'bg-bayniks-orange text-white shadow-bolt-glow'
                : 'text-slate-400 hover:text-white hover:bg-bayniks-surfaceDark'
            }`}
          >
            <span>📡</span> &ldquo;God&apos;s Eye&rdquo; Live Radar ({fleetOverview.bikes.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kyc')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-wide transition-all flex items-center gap-2 ${
              activeTab === 'kyc'
                ? 'bg-bayniks-orange text-white shadow-bolt-glow'
                : 'text-slate-400 hover:text-white hover:bg-bayniks-surfaceDark'
            }`}
          >
            <span>🪪</span> Rider KYC Queue ({kycQueue.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-wide transition-all flex items-center gap-2 ${
              activeTab === 'orders'
                ? 'bg-bayniks-orange text-white shadow-bolt-glow'
                : 'text-slate-400 hover:text-white hover:bg-bayniks-surfaceDark'
            }`}
          >
            <span>⚡</span> Active Interventions
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'radar' && (
          <GodsEyeFleetMap
            bikes={fleetOverview.bikes}
            onReassignOrder={handleOpenReassign}
            onRefresh={fetchFleetOverview}
            isLoading={isLoadingFleet}
          />
        )}

        {activeTab === 'kyc' && (
          <KycApprovalQueue
            applicants={kycQueue}
            onReviewSuccess={() => {
              fetchKycQueue();
              fetchFleetOverview();
            }}
            isLoading={isLoadingKyc}
          />
        )}

        {activeTab === 'orders' && (
          <div className="bg-bayniks-cardDark rounded-2xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>⚡</span> Active Order Intervention &amp; Breakdown Command
                </h3>
                <p className="text-[11px] text-slate-400">
                  Select any active bike on the radar map to initiate mid-trip emergency order transfer
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fleetOverview.bikes
                .filter((b) => b.status === 'busy' && b.activeOrderId)
                .map((bike) => (
                  <div
                    key={bike.riderUserId}
                    className="p-4 rounded-xl bg-bayniks-surfaceDark border border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-bayniks-orange text-xs">
                        Waybill: {bike.activeTrackingCode || 'LGS-ACTIVE'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800">
                        IN TRANSIT
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-slate-300">
                      <div>Assigned Courier: <strong>{bike.fullName}</strong></div>
                      <div className="text-[11px] font-mono text-slate-400">
                        Plate: {bike.plateNumber} • Phone: {bike.phone} • Speed: {bike.speed}km/h
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleOpenReassign(
                          bike.activeOrderId!,
                          bike.activeTrackingCode || 'LGS-ACTIVE',
                          bike.riderUserId
                        )
                      }
                      className="w-full py-2 px-3 rounded-xl bg-bayniks-orange hover:bg-bayniks-orangeDark text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>⚡</span> Reassign Courier (Breakdown)
                    </button>
                  </div>
                ))}

              {fleetOverview.bikes.filter((b) => b.status === 'busy' && b.activeOrderId).length === 0 && (
                <div className="col-span-2 py-12 text-center text-slate-500 font-mono text-xs">
                  No busy motorcycle orders currently in-transit across this fleet scope.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mid-Trip Reassign Modal */}
        <OrderReassignModal
          isOpen={reassignModal.isOpen}
          orderId={reassignModal.orderId}
          trackingCode={reassignModal.trackingCode}
          currentRiderId={reassignModal.currentRiderId}
          availableBikes={fleetOverview.bikes}
          onClose={() =>
            setReassignModal({
              isOpen: false,
              orderId: '',
              trackingCode: '',
              currentRiderId: '',
            })
          }
          onSuccess={handleReassignSuccess}
        />
      </main>
    </div>
  );
}
