import React, { useState } from 'react';
import {
  Wallet,
  ArrowUpRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building,
  ChevronRight,
  X,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { useRiderStore } from '../store/riderStore';
import { koboToNaira } from '@logistics/shared-types';

interface RiderEarningsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RiderEarningsSheet: React.FC<RiderEarningsSheetProps> = ({ isOpen, onClose }) => {
  const {
    todayEarningsKobo,
    shiftSettledTrips,
    tripsCompletedToday,
    distanceCoveredKm,
    onTimeSlaPercent,
    requestInstantCashout,
  } = useRiderStore();
  const [isCashoutSuccess, setIsCashoutSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const totalNaira = koboToNaira(todayEarningsKobo);
  const formattedEarnings = `₦${totalNaira.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const handleInstantCashout = async () => {
    if (totalNaira <= 0 || isProcessing) return;
    setIsProcessing(true);
    const result = await requestInstantCashout(todayEarningsKobo);
    setIsProcessing(false);
    if (result.success) {
      setIsCashoutSuccess(true);
      setTimeout(() => setIsCashoutSuccess(false), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0E1013] border-t-2 sm:border-2 border-zinc-800 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden safe-bottom">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FF6D1F] flex items-center justify-center text-white shadow-md">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Shift Earnings & Wallet</h2>
              <p className="text-[10px] text-zinc-400">Guaranteed instant Nigerian bank settlement</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors active:scale-95"
          >
            <X className="w-4 h-4 text-black bg-white rounded-full p-0.5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 space-y-4 overflow-y-auto hide-scrollbar">
          {/* Success Banner */}
          {isCashoutSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500 text-emerald-200 flex items-center gap-2.5 text-xs animate-in slide-in-from-top">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold">Payout Initiated!</span>
                <p className="text-[11px] text-emerald-300">
                  {formattedEarnings} has been dispatched to your GTBank account via NIP.
                </p>
              </div>
            </div>
          )}

          {/* Main Earnings Card (Bayniks Atomic Orange Accent) */}
          <div className="relative overflow-hidden p-5 rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 shadow-xl">
            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 rounded-full bg-[#FF6D1F]/10 blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-bold uppercase tracking-wider">Today&apos;s Take-Home</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-800">
                ● 100% Retained (0% Commission Promo)
              </span>
            </div>

            <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white mt-2">
              {formattedEarnings}
            </div>

            <p className="text-xs text-zinc-400 mt-1">
              Includes base dispatch fees + instant 100% customer tips
            </p>

            {/* Quick Cashout CTA */}
            <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <Building className="w-4 h-4 text-[#FF6D1F]" />
                <span className="font-mono text-[11px]">GTBank • 0123****89</span>
              </div>

              <button
                onClick={handleInstantCashout}
                disabled={isProcessing || totalNaira <= 0}
                className="py-2.5 px-4 rounded-xl bg-[#FF6D1F] hover:bg-orange-600 active:scale-95 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/30 flex items-center gap-1.5 transition-all"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>{isProcessing ? 'SENDING NIP...' : 'CASHOUT NOW'}</span>
              </button>
            </div>
          </div>

          {/* Metric Stats Grid (Customer Page Style) */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center">
              <span className="text-[10px] font-bold uppercase text-zinc-500 block">Trips Today</span>
              <span className="text-lg font-black text-white font-mono mt-0.5 block">{tripsCompletedToday}</span>
              <span className="text-[9px] text-emerald-400 font-bold">+4 this shift</span>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center">
              <span className="text-[10px] font-bold uppercase text-zinc-500 block">On-Time SLA</span>
              <span className="text-lg font-black text-white font-mono mt-0.5 block">{onTimeSlaPercent}%</span>
              <span className="text-[9px] text-[#FF6D1F] font-bold">Top 1% Tier</span>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center">
              <span className="text-[10px] font-bold uppercase text-zinc-500 block">Distance</span>
              <span className="text-lg font-black text-white font-mono mt-0.5 block">{distanceCoveredKm} km</span>
              <span className="text-[9px] text-zinc-400 font-bold">Lagos Metro</span>
            </div>
          </div>

          {/* Today's Completed Trips Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
              <span className="uppercase tracking-wider">Settled Shift Deliveries</span>
              <span className="text-[11px] font-mono">{shiftSettledTrips.length} Recorded</span>
            </div>

            {shiftSettledTrips.map((trip) => (
              <div
                key={trip.id}
                className="p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-white">{trip.id}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">• {trip.time}</span>
                  </div>
                  <span className="text-xs font-mono font-black text-emerald-400">
                    +₦{koboToNaira(trip.fareKobo + trip.tipKobo).toLocaleString('en-NG')}
                  </span>
                </div>

                <div className="text-[11px] text-zinc-400 space-y-1">
                  <div className="flex items-center gap-1 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 shrink-0" />
                    <span className="truncate">{trip.from}</span>
                  </div>
                  <div className="flex items-center gap-1 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF6D1F] shrink-0" />
                    <span className="truncate text-zinc-200">{trip.to}</span>
                  </div>
                </div>

                {trip.tipKobo > 0 && (
                  <div className="text-[10px] font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40 inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Includes ₦{koboToNaira(trip.tipKobo).toLocaleString()} Customer Tip</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

