'use client';

import React from 'react';
import { VendorBatchSummaryResponse, formatNaira } from '@logistics/shared-types';

export interface VendorBatchCheckoutCardProps {
  summary: VendorBatchSummaryResponse | null;
  walletBalanceKobo: number;
  paymentMethod: 'wallet' | 'pay_on_pickup';
  onPaymentMethodChange: (method: 'wallet' | 'pay_on_pickup') => void;
  onConfirmDispatch: () => void;
  isDispatching: boolean;
  isEstimating: boolean;
}

export function VendorBatchCheckoutCard({
  summary,
  walletBalanceKobo,
  paymentMethod,
  onPaymentMethodChange,
  onConfirmDispatch,
  isDispatching,
  isEstimating,
}: VendorBatchCheckoutCardProps) {
  if (isEstimating) {
    return (
      <div className="bg-bayniks-cardDark p-6 rounded-2xl border border-slate-800 animate-pulse text-center">
        <div className="w-8 h-8 mx-auto mb-3 rounded-full bg-bayniks-orange/20 border border-bayniks-orange flex items-center justify-center text-bayniks-orange">
          🏍️
        </div>
        <p className="text-sm font-semibold text-white">Calculating Batch Motorcycle Routes & Fares...</p>
        <p className="text-xs text-slate-400 mt-1">Chunking runs and optimizing waypoint matrix across Lagos</p>
      </div>
    );
  }

  if (!summary || summary.totalStopsCount === 0) {
    return null;
  }

  const hasInsufficientBalance =
    paymentMethod === 'wallet' && walletBalanceKobo < summary.grandTotalFareKobo;

  return (
    <div className="bg-bayniks-cardDark rounded-2xl border border-slate-800 overflow-hidden shadow-2xl space-y-5 p-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>🏍️</span> Batch Dispatch Summary
          </h3>
          <p className="text-[11px] text-slate-400">
            Motorcycle fleet: max 5 parcel stops per courier
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-bayniks-orange/10 border border-bayniks-orange/40 text-bayniks-orange">
          {summary.totalRunsCount} Bike Run{summary.totalRunsCount > 1 ? 's' : ''}
        </span>
      </div>

      {/* Per-Run Breakdown Cards */}
      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
        {summary.runs.map((run, idx) => (
          <div
            key={idx}
            className="p-3 rounded-xl bg-bayniks-surfaceDark/80 border border-slate-800 flex items-center justify-between text-xs"
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 font-mono font-bold text-white">
                <span className="text-bayniks-orange">⚡ {run.batchGroupKey}</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  ({run.stopsCount} stop{run.stopsCount > 1 ? 's' : ''})
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {run.totalDistanceKm.toFixed(1)} km • Est. {run.estimatedDurationMinutes} mins
              </div>
            </div>

            <div className="text-right">
              <div className="font-mono font-bold text-white">
                {formatNaira(run.estimatedFareKobo)}
              </div>
              <div className="text-[10px] text-emerald-400 font-mono">Express Bike</div>
            </div>
          </div>
        ))}
      </div>

      {/* Grand Total & Wallet Balance Status */}
      <div className="p-4 rounded-xl bg-bayniks-black border border-slate-800 space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-slate-400 font-medium">Grand Total Batch Fare</span>
          <span className="text-xl font-mono font-bold text-bayniks-orange">
            {formatNaira(summary.grandTotalFareKobo)}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs border-t border-slate-800/80 pt-2 font-mono">
          <span className="text-slate-400">Vendor Escrow Wallet:</span>
          <span
            className={`font-semibold ${
              hasInsufficientBalance ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {formatNaira(walletBalanceKobo)}
          </span>
        </div>

        {hasInsufficientBalance && (
          <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-[11px]">
            ⚠️ <strong>Insufficient Wallet Balance:</strong> You need an additional{' '}
            <span className="font-mono font-bold">
              {formatNaira(summary.grandTotalFareKobo - walletBalanceKobo)}
            </span>{' '}
            to lock escrow for this batch. All-or-nothing guarantee requires full escrow funding.
          </div>
        )}
      </div>

      {/* Payment Method Selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-300">Payment Option</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onPaymentMethodChange('wallet')}
            className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
              paymentMethod === 'wallet'
                ? 'bg-bayniks-orange/15 border-bayniks-orange text-white'
                : 'bg-bayniks-surfaceDark border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <div className="font-bold flex items-center gap-1.5">
              <span>💳</span> Vendor Escrow
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Instant atomic lock</div>
          </button>

          <button
            type="button"
            onClick={() => onPaymentMethodChange('pay_on_pickup')}
            className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
              paymentMethod === 'pay_on_pickup'
                ? 'bg-bayniks-orange/15 border-bayniks-orange text-white'
                : 'bg-bayniks-surfaceDark border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <div className="font-bold flex items-center gap-1.5">
              <span>💵</span> Pay on Pickup
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Direct courier cash</div>
          </button>
        </div>
      </div>

      {/* Action CTA */}
      <button
        type="button"
        disabled={isDispatching || hasInsufficientBalance}
        onClick={onConfirmDispatch}
        className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 ${
          isDispatching || hasInsufficientBalance
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
            : 'bg-bayniks-orange hover:bg-bayniks-orangeDark text-white shadow-bolt-glow active:scale-[0.99]'
        }`}
      >
        {isDispatching ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Locking Escrow & Dispatching Courier Bikes...</span>
          </>
        ) : (
          <>
            <span>🚀</span>
            <span>
              Dispatch {summary.totalRunsCount} Bike Run{summary.totalRunsCount > 1 ? 's' : ''} (
              {formatNaira(summary.grandTotalFareKobo)})
            </span>
          </>
        )}
      </button>
    </div>
  );
}

