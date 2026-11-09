'use client';

import React, { useState } from 'react';
import { FleetBikeTelemetryItem } from '@logistics/shared-types';

export interface OrderReassignModalProps {
  orderId: string;
  trackingCode: string;
  currentRiderId: string;
  availableBikes: FleetBikeTelemetryItem[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedOrder: any) => void;
}

export function OrderReassignModal({
  orderId,
  trackingCode,
  currentRiderId,
  availableBikes,
  isOpen,
  onClose,
  onSuccess,
}: OrderReassignModalProps) {
  const [selectedRiderId, setSelectedRiderId] = useState<string>('');
  const [reason, setReason] = useState<string>('Motorcycle flat tire / emergency breakdown on route');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter bikes that are available and not the current rider
  const candidateBikes = availableBikes.filter(
    (b) => b.status === 'available' && b.kycStatus === 'approved' && b.riderUserId !== currentRiderId
  );

  const handleConfirmReassignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRiderId) {
      setErrorMessage('Please select a replacement dispatch rider');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const token = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
        ? window.localStorage.getItem('auth_token')
        : null;
      const response = await fetch(`/api/v1/admin/orders/${orderId}/reassign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          newRiderUserId: selectedRiderId,
          reason,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reassign order');
      }

      onSuccess(data.order);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Emergency reassignment failed. Please check rider availability.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-bayniks-cardDark border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <div>
              <h3 className="text-sm font-bold text-white">Emergency Mid-Trip Reassignment</h3>
              <p className="text-[11px] font-mono text-bayniks-orange">
                Waybill: {trackingCode}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleConfirmReassignment} className="space-y-4 text-xs">
          {/* Reason Input */}
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold">Incident / Reassignment Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Motorcycle engine breakdown at Ikeja Under Bridge"
              required
              className="w-full bg-bayniks-surfaceDark border border-slate-700/80 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-bayniks-orange text-xs"
            />
          </div>

          {/* Replacement Rider Selector */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold flex items-center justify-between">
              <span>Select Verified Replacement Rider</span>
              <span className="text-[11px] font-mono text-emerald-400">
                {candidateBikes.length} Available Couriers
              </span>
            </label>

            {candidateBikes.length === 0 ? (
              <div className="p-3 rounded-xl bg-bayniks-surfaceDark border border-slate-800 text-slate-400 text-center font-mono text-[11px]">
                No available replacement dispatch riders in range. Please wait for an idle rider to go online.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {candidateBikes.map((bike) => {
                  const isSelected = selectedRiderId === bike.riderUserId;
                  return (
                    <div
                      key={bike.riderUserId}
                      onClick={() => setSelectedRiderId(bike.riderUserId)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-bayniks-orange/15 border-bayniks-orange text-white'
                          : 'bg-bayniks-surfaceDark/80 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">🏍️</span>
                        <div>
                          <div className="font-semibold text-white">{bike.fullName}</div>
                          <div className="text-[10px] font-mono text-slate-400">
                            Plate: {bike.plateNumber} • {bike.phone}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                          AVAILABLE
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-bayniks-black border border-slate-800 text-[11px] text-slate-400 leading-relaxed font-mono">
            ℹ️ <strong>Atomic Invariants:</strong> Reassignment preserves all delivered stop states, recipient PINs, and locks the replacement rider to busy in MongoDB &amp; Redis.
          </div>

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-bayniks-surfaceDark border border-slate-800 text-xs transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || candidateBikes.length === 0 || !selectedRiderId}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                isSubmitting || candidateBikes.length === 0 || !selectedRiderId
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
                  : 'bg-bayniks-orange hover:bg-bayniks-orangeDark text-white shadow-bolt-glow'
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Reassigning...</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>Confirm Emergency Reassignment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
