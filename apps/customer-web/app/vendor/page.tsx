'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  VendorCsvRow,
  VendorBatchSummaryResponse,
  OrderPickupInput,
  formatNaira,
} from '@logistics/shared-types';
import { VendorBulkUploader } from '../../components/vendor/VendorBulkUploader';
import { VendorBatchCheckoutCard } from '../../components/vendor/VendorBatchCheckoutCard';
import { VendorMultiBikeMap, VendorDispatchedOrder } from '../../components/vendor/VendorMultiBikeMap';
import { Zap, CheckCircle2, AlertTriangle, X, FileSpreadsheet, Radio, Building2, Bike, Key, ArrowLeft, ArrowRight } from 'lucide-react';

export default function VendorWorkstationPage() {
  const [activeTab, setActiveTab] = useState<'upload' | 'manifest'>('upload');
  const [pickup, setPickup] = useState<OrderPickupInput>({
    address: 'Warehouse Hub, 10 Mobolaji Bank Anthony Way, Ikeja, Lagos',
    landmark: 'Opposite Ikeja General Hospital',
    location: { lat: 6.5933, lng: 3.3421 },
    contactName: 'Lagos Central Logistics Hub',
    contactPhone: '+2348139990001',
  });

  const [rows, setRows] = useState<VendorCsvRow[]>([]);
  const [summary, setSummary] = useState<VendorBatchSummaryResponse | null>(null);
  const [walletBalanceKobo, setWalletBalanceKobo] = useState<number>(5000000); // Default ₦50,000 for merchants
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'pay_on_pickup'>('wallet');

  const [isEstimating, setIsEstimating] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [dispatchedOrders, setDispatchedOrders] = useState<VendorDispatchedOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Fetch Vendor Orders Manifest
  const fetchVendorOrders = useCallback(async () => {
    setIsLoadingOrders(true);
    try {
      const token = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
        ? window.localStorage.getItem('auth_token')
        : null;
      const res = await fetch('/api/v1/vendor/orders', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setDispatchedOrders(data.orders || []);
      }
    } catch {
      // Fallback or offline
    } finally {
      setIsLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    fetchVendorOrders();
  }, [fetchVendorOrders]);

  // Recalculate Batch Estimate when rows change
  const handleRowsValidated = async (validRows: VendorCsvRow[]) => {
    setRows(validRows);
    setStatusMessage(null);

    if (validRows.length === 0) {
      setSummary(null);
      return;
    }

    setIsEstimating(true);
    try {
      const token = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
        ? window.localStorage.getItem('auth_token')
        : null;
      const res = await fetch('/api/v1/vendor/batch-estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          pickup,
          rows: validRows,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to estimate batch fares');
      }

      const data: VendorBatchSummaryResponse = await res.json();
      setSummary(data);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Error computing batch estimate. Please verify row addresses.',
      });
    } finally {
      setIsEstimating(false);
    }
  };

  // Confirm and Execute Bulk Dispatch
  const handleConfirmDispatch = async () => {
    if (!summary || rows.length === 0) return;

    setIsDispatching(true);
    setStatusMessage(null);
    try {
      const token = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
        ? window.localStorage.getItem('auth_token')
        : null;
      const res = await fetch('/api/v1/vendor/batch-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          pickup,
          rows,
          paymentMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch batch orders');
      }

      setStatusMessage({
        type: 'success',
        text: `Successfully created and dispatched ${data.summary.totalRunsCount} bike runs (${data.summary.totalStopsCount} stops) with escrow locked!`,
      });

      // Deduct simulated or real balance
      if (paymentMethod === 'wallet') {
        setWalletBalanceKobo((prev) => Math.max(0, prev - data.summary.grandTotalFareKobo));
      }

      // Refresh dispatched orders list
      fetchVendorOrders();
      // Clear rows and switch to manifest view
      setRows([]);
      setSummary(null);
      setActiveTab('manifest');
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Bulk dispatch failed. Please check your escrow wallet balance.',
      });
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-bayniks-orange selection:text-white pb-16">
      {/* Top Navigation Bar */}
      <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-9 h-9 rounded-xl bg-bayniks-orange flex items-center justify-center font-mono font-bold text-white shadow-bolt-glow text-base">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-mono font-bold tracking-wider text-sm text-slate-900 group-hover:text-bayniks-orange transition-colors">
                BAYNIKS
              </span>
              <span className="text-[10px] uppercase font-mono tracking-widest text-bayniks-orange -mt-0.5 font-bold">
                Vendor Portal
              </span>
            </div>
          </Link>

          <span className="text-slate-400 hidden sm:inline">/</span>
          <span className="text-xs font-mono text-slate-600 hidden sm:inline font-semibold">Bulk Multi-Stop Dispatch</span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Wallet Balance Badge */}
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center space-x-2 text-xs font-mono">
            <span className="text-slate-500 font-medium">Escrow Balance:</span>
            <span className="font-black text-emerald-600">{formatNaira(walletBalanceKobo)}</span>
          </div>

          <Link
            href="/"
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:text-slate-900 hover:border-bayniks-orange transition-colors shadow-sm flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Live Tracking Console</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Status Toast Notification */}
        {statusMessage && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-center justify-between shadow-sm ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                : 'bg-rose-50 border-rose-200 text-rose-800 font-semibold'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-900 ml-4 font-bold"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* View Switcher Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-wide transition-all flex items-center gap-2 ${
              activeTab === 'upload'
                ? 'bg-bayniks-orange text-white shadow-bolt-glow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-white border border-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Batch Upload & Plan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manifest')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-wide transition-all flex items-center gap-2 ${
              activeTab === 'manifest'
                ? 'bg-bayniks-orange text-white shadow-bolt-glow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-white border border-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Live Radar & Manifest ({dispatchedOrders.length})</span>
          </button>
        </div>

        {activeTab === 'upload' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left 2 Cols: Pickup Config & CSV Uploader */}
            <div className="lg:col-span-2 space-y-6">
              {/* Pickup Location Configuration */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-bayniks-orange" />
                    <span>Central Dispatch Hub (Pickup)</span>
                  </h3>
                  <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Active Hub
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-600 font-medium">Warehouse Address</label>
                    <input
                      type="text"
                      value={pickup.address}
                      onChange={(e) => setPickup({ ...pickup, address: e.target.value })}
                      className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-bayniks-orange focus:bg-white text-xs transition"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 font-medium">Mandatory Hub Landmark</label>
                    <input
                      type="text"
                      value={pickup.landmark}
                      onChange={(e) => setPickup({ ...pickup, landmark: e.target.value })}
                      className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-bayniks-orange focus:bg-white text-xs transition"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 font-medium">Hub Contact Person</label>
                    <input
                      type="text"
                      value={pickup.contactName}
                      onChange={(e) => setPickup({ ...pickup, contactName: e.target.value })}
                      className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-bayniks-orange focus:bg-white text-xs transition"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 font-medium">Hub Phone (E.164)</label>
                    <input
                      type="text"
                      value={pickup.contactPhone}
                      onChange={(e) => setPickup({ ...pickup, contactPhone: e.target.value })}
                      className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-bayniks-orange focus:bg-white text-xs transition"
                    />
                  </div>
                </div>
              </div>

              {/* Bulk CSV Uploader */}
              <VendorBulkUploader
                onRowsValidated={handleRowsValidated}
                isLoading={isEstimating || isDispatching}
              />
            </div>

            {/* Right Col: Checkout Card & Preview */}
            <div className="space-y-6">
              <VendorBatchCheckoutCard
                summary={summary}
                walletBalanceKobo={walletBalanceKobo}
                paymentMethod={paymentMethod}
                onPaymentMethodChange={setPaymentMethod}
                onConfirmDispatch={handleConfirmDispatch}
                isDispatching={isDispatching}
                isEstimating={isEstimating}
              />

              {/* Informational Guidance Card */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2 shadow-sm">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Bike className="w-4 h-4 text-bayniks-orange" />
                  <span>Nigerian Street Delivery Standard</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500 font-medium">
                  In Lagos, couriers navigate using bus stops, notable plazas, and recognized landmarks rather than numbering alone.
                  Every stop in your CSV must include a recognized landmark.
                </p>
                <div className="border-t border-slate-100 pt-2 text-[10px] font-mono text-bayniks-orange font-bold">
                  Fleet Rule: Maximum 5 parcels per express courier bike
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Live Radar & Manifest Tab */
          <div className="space-y-6">
            <VendorMultiBikeMap
              warehouseLocation={{
                address: pickup.address,
                landmark: pickup.landmark,
                location: pickup.location,
              }}
              orders={dispatchedOrders}
              onRefresh={fetchVendorOrders}
              isLoading={isLoadingOrders}
            />

            {/* Manifest Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Dispatched Orders Manifest</h3>
                <span className="text-xs font-mono font-bold text-slate-500">
                  {dispatchedOrders.length} Total Waybill{dispatchedOrders.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-mono text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Tracking Code</th>
                      <th className="py-2.5 px-3">Pickup PIN</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Stops</th>
                      <th className="py-2.5 px-3">Assigned Courier</th>
                      <th className="py-2.5 px-3">Total Fare</th>
                      <th className="py-2.5 px-3 text-right">Track Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dispatchedOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500 font-mono text-xs">
                          No dispatched orders found. Upload a batch to launch courier runs.
                        </td>
                      </tr>
                    ) : (
                      dispatchedOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-black text-bayniks-orange">
                            {order.trackingCode}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-900">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] font-bold inline-flex items-center gap-1">
                              <Key className="w-3 h-3 text-slate-500" />
                              <span>{order.pickup.pickupPin}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-bayniks-orange/15 text-bayniks-orange border border-bayniks-orange/30">
                              {order.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 font-medium">
                            {order.stops.length} stop{order.stops.length > 1 ? 's' : ''}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {order.rider ? (
                              <div className="font-semibold text-slate-900">
                                {order.rider.fullName} ({order.rider.plateNumber || 'BIKE'})
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">Searching...</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            {formatNaira(order.totalFareKobo)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Link
                              href={`/track/${order.trackingCode}`}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 font-bold text-[11px] font-mono transition-colors inline-flex items-center gap-1"
                            >
                              <span>Live Track</span>
                              <ArrowRight className="w-3 h-3 text-bayniks-orange" />
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

