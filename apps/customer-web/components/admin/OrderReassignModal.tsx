'use client';

import React, { useState } from 'react';
import { FleetBikeTelemetryItem } from '@logistics/shared-types';
import { Zap, X, AlertTriangle, Bike, Info } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-bayniks-orange" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Emergency Mid-Trip Reassignment</h3>
              <p className="text-[11px] font-mono text-bayniks-orange font-bold">
                Waybill: {trackingCode}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleConfirmReassignment} className="space-y-4 text-xs">
          {/* Reason Input */}
          <div className="space-y-1">
            <label className="text-slate-700 font-bold">Incident / Reassignment Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Motorcycle engine breakdown at Ikeja Under Bridge"
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-bayniks-orange focus:bg-white text-xs shadow-sm font-sans"
            />
          </div>

          {/* Replacement Rider Selector */}
          <div className="space-y-1.5">
            <label className="text-slate-700 font-bold flex items-center justify-between">
              <span>Select Verified Replacement Rider</span>
              <span className="text-[11px] font-mono text-emerald-700 font-bold">
                {candidateBikes.length} Available Couriers
              </span>
            </label>

            {candidateBikes.length === 0 ? (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-center font-mono text-[11px]">
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
                          ? 'bg-orange-50 border-bayniks-orange text-slate-900 ring-1 ring-bayniks-orange shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Bike className="w-4 h-4 text-bayniks-orange shrink-0" />
                        <div>
                          <div className="font-bold text-slate-900">{bike.fullName}</div>
                          <div className="text-[10px] font-mono text-slate-500">
                            Plate: {bike.plateNumber} • {bike.phone}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          AVAILABLE
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed font-mono flex items-start gap-1.5">
            <Info className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
            <span><strong className="text-slate-800">Atomic Invariants:</strong> Reassignment preserves all delivered stop states, recipient PINs, and locks the replacement rider to busy in MongoDB &amp; Redis.</span>
          </div>

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs transition-colors font-semibold"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || candidateBikes.length === 0 || !selectedRiderId}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                isSubmitting || candidateBikes.length === 0 || !selectedRiderId
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  : 'bg-bayniks-orange hover:bg-bayniks-orangeDark text-white shadow-sm'
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Reassigning...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
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
