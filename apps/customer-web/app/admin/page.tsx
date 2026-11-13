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
import { ShieldCheck, ArrowLeft, CheckCircle2, AlertTriangle, X, Zap, Radio, UserCheck } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-bayniks-orange selection:text-white pb-16">
      {/* Top Header */}
      <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-9 h-9 rounded-xl bg-bayniks-orange flex items-center justify-center font-bold text-white shadow-bolt-glow">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-mono font-bold tracking-wider text-sm text-slate-900 group-hover:text-bayniks-orange transition-colors">
                BAYNIKS
              </span>
              <span className="text-[10px] uppercase font-mono tracking-widest text-bayniks-orange -mt-0.5 font-bold">
                Command Center
              </span>
            </div>
          </Link>

          <span className="text-slate-400 hidden sm:inline">/</span>
          <span className="text-xs font-mono text-slate-600 hidden sm:inline font-semibold">
            Super-Admin &amp; Fleet Radar
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-mono text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Redis 5s Telemetry Engine</span>
          </div>

          <Link
            href="/"
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:text-slate-900 hover:border-bayniks-orange transition-colors shadow-sm flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Live Tracking Console</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Toast Feedback */}
        {notification && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-center justify-between shadow-sm ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-slate-500 hover:text-slate-900 ml-4"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Enterprise Fleet Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Online Fleet */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Online Couriers</span>
              <span className="text-emerald-600 font-bold">● Active</span>
            </div>
            <div className="text-2xl font-mono font-black text-slate-900">
              {fleetOverview.onlineCount}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Available or In Transit across Lagos
            </div>
          </div>

          {/* Busy / In-Transit */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>In-Transit Couriers</span>
              <span className="text-bayniks-orange font-bold flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                <span>Active</span>
              </span>
            </div>
            <div className="text-2xl font-mono font-black text-bayniks-orange">
              {fleetOverview.busyCount}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Currently delivering customer parcels
            </div>
          </div>

          {/* Pending KYC Queue */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Pending KYC Queue</span>
              <span className="text-amber-600 font-bold flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Verification</span>
              </span>
            </div>
            <div className="text-2xl font-mono font-black text-amber-600">
              {fleetOverview.pendingKycCount}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Riders awaiting documentation review
            </div>
          </div>

          {/* Fake GPS / Spoof Alert */}
          <div className={`p-4 rounded-2xl border shadow-sm space-y-1 ${
            fleetOverview.mockLocationFlaggedCount > 0
              ? 'bg-rose-50 border-rose-200'
              : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span className={fleetOverview.mockLocationFlaggedCount > 0 ? 'text-rose-700 font-bold' : ''}>
                Mock GPS Spoof Flags
              </span>
              <span className="text-rose-600 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Anti-Fraud</span>
              </span>
            </div>
            <div className={`text-2xl font-mono font-black ${
              fleetOverview.mockLocationFlaggedCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'
            }`}>
              {fleetOverview.mockLocationFlaggedCount}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Bikes reporting mock provider coordinates
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('radar')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-wide transition-all flex items-center gap-2 ${
              activeTab === 'radar'
                ? 'bg-bayniks-orange text-white shadow-bolt-glow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-white border border-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>&ldquo;God&apos;s Eye&rdquo; Live Radar ({fleetOverview.bikes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kyc')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-wide transition-all flex items-center gap-2 ${
              activeTab === 'kyc'
                ? 'bg-bayniks-orange text-white shadow-bolt-glow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-white border border-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Rider KYC Queue ({kycQueue.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-wide transition-all flex items-center gap-2 ${
              activeTab === 'orders'
                ? 'bg-bayniks-orange text-white shadow-bolt-glow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-white border border-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Active Interventions</span>
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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-bayniks-orange" />
                  <span>Active Order Intervention &amp; Breakdown Command</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
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
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-bayniks-orange text-xs">
                        Waybill: {bike.activeTrackingCode || 'LGS-ACTIVE'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                        IN TRANSIT
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-slate-700">
                      <div>Assigned Courier: <strong className="text-slate-900">{bike.fullName}</strong></div>
                      <div className="text-[11px] font-mono text-slate-500">
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
                      className="w-full py-2 px-3 rounded-xl bg-bayniks-orange hover:bg-bayniks-orangeDark text-white font-semibold text-xs shadow-sm transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Reassign Courier (Breakdown)</span>
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
