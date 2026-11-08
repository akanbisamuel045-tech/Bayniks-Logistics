import React, { useEffect } from 'react';
import { useRiderStore } from '../store/riderStore';
import { koboToNaira } from '@logistics/shared-types';

export const IncomingJobModal: React.FC = () => {
  const {
    incomingOffer,
    offerSecondsLeft,
    tickOfferTimer,
    acceptOffer,
    declineOffer,
    isSubmitting,
  } = useRiderStore();

  // Run 1-second countdown ticker
  useEffect(() => {
    if (!incomingOffer) return;
    const interval = setInterval(() => {
      tickOfferTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [incomingOffer, tickOfferTimer]);

  if (!incomingOffer) return null;

  const earningNaira = koboToNaira(incomingOffer.riderEarningKobo).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const progressPercent = Math.max(0, Math.min(100, (offerSecondsLeft / 30) * 100));

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-end p-4 safe-bottom animate-in fade-in slide-in-from-bottom duration-200">
      <div className="bg-zinc-950 border-2 border-amber-400 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 max-w-lg mx-auto w-full">
        {/* Header: Offer Title & 30s Countdown Ring */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              <h2 className="text-xl font-black text-amber-400 uppercase tracking-wider">
                NEW JOB OFFER
              </h2>
            </div>
            <p className="text-xs font-mono text-zinc-400 mt-0.5">
              Ref: {incomingOffer.trackingCode} • {incomingOffer.stopsCount} STOP{incomingOffer.stopsCount > 1 ? 'S' : ''}
            </p>
          </div>

          {/* Countdown Timer Badge */}
          <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-zinc-900 border-2 border-amber-400 font-mono font-black text-xl text-amber-400 shadow-lg shadow-amber-500/20">
            {offerSecondsLeft}s
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              offerSecondsLeft <= 7 ? 'bg-red-500' : 'bg-amber-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Massive Rider Earning Display */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
          <span className="text-xs uppercase font-bold text-zinc-400 tracking-wider">
            YOUR TAKE-HOME PAYOUT
          </span>
          <div className="text-4xl font-black text-emerald-400 font-mono tracking-tight mt-1">
            ₦{earningNaira}
          </div>
          <div className="text-xs font-bold text-zinc-300 mt-1">
            {incomingOffer.estimatedDistanceKm} km total route distance
          </div>
        </div>

        {/* Landmark Route Details */}
        <div className="space-y-3">
          {/* Pickup Landmark */}
          <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase">
              <span>📍 PICKUP LOCATION</span>
            </div>
            <div className="text-sm font-black text-white mt-1">
              {incomingOffer.pickupAddress}
            </div>
            {incomingOffer.pickupLandmark && (
              <div className="text-xs font-bold text-amber-300 mt-1 bg-amber-950/40 px-2 py-1 rounded border border-amber-800/40">
                🏷️ Landmark: {incomingOffer.pickupLandmark}
              </div>
            )}
          </div>

          {/* Stops Preview */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 uppercase">
              <span>🏁 TOTAL DROPOFFS</span>
            </div>
            <div className="text-sm font-black text-amber-400 font-mono">
              {incomingOffer.stopsCount} Delivery Destination{incomingOffer.stopsCount > 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Big Gloved Thumb Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => declineOffer(incomingOffer.orderId)}
            disabled={isSubmitting}
            className="touch-target-large py-3.5 px-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 text-zinc-300 font-black text-base uppercase tracking-wider border border-zinc-700 transition-all flex items-center justify-center"
          >
            DECLINE
          </button>

          <button
            onClick={() => acceptOffer(incomingOffer.orderId)}
            disabled={isSubmitting}
            className={`touch-target-large py-3.5 px-4 rounded-2xl font-black text-base uppercase tracking-wider text-black transition-all flex items-center justify-center shadow-xl shadow-emerald-500/30 ${
              isSubmitting
                ? 'bg-zinc-600 cursor-not-allowed'
                : 'bg-emerald-400 hover:bg-emerald-300 active:scale-95'
            }`}
          >
            {isSubmitting ? 'ACCEPTING...' : 'ACCEPT JOB'}
          </button>
        </div>
      </div>
    </div>
  );
};
