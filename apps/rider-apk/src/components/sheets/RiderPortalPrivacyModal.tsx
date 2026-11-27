import React from 'react';
import { ShieldCheck, Globe, X, Lock, FileText } from 'lucide-react';
import { useRiderStore } from '../../store/riderStore';

export type InfoSheetMode = 'portal' | 'privacy' | null;

export interface RiderPortalPrivacyModalProps {
  mode: InfoSheetMode;
  onClose: () => void;
}

export const RiderPortalPrivacyModal: React.FC<RiderPortalPrivacyModalProps> = ({
  mode,
  onClose,
}) => {
  const { riderUser, riderName, plateNumber, kycStatus, todayEarningsKobo } = useRiderStore();

  if (!mode) return null;

  return (
    <div
      className="absolute inset-0 z-[95] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-3 select-none"
      data-testid="rider-info-modal"
    >
      <div className="w-full max-w-[390px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden max-h-[85vh] flex flex-col text-[#18181B]">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-[#18181B] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF5722] flex items-center justify-center text-white">
              {mode === 'portal' ? <Globe size={16} /> : <Lock size={16} />}
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight">
                {mode === 'portal' ? 'Bayniks Courier Web Portal' : 'Privacy & Data Protection'}
              </h3>
              <p className="text-[11px] text-zinc-300">
                {mode === 'portal' ? 'Settlements, KYC & Fleet Summary' : 'NDPR / Anti-Fraud Compliance'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            data-testid="info-modal-close-btn"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs text-zinc-600 leading-relaxed">
          {mode === 'portal' ? (
            <div className="space-y-3" data-testid="portal-info-content">
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-400 font-bold uppercase text-[10px]">Courier Partner</span>
                  <span className="font-bold text-[#18181B]">
                    {riderName || riderUser?.fullName || 'Verified Courier'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 font-bold uppercase text-[10px]">Active Plate</span>
                  <span className="font-mono font-bold text-[#18181B]">{plateNumber || 'LSR908KY'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 font-bold uppercase text-[10px]">KYC Compliance</span>
                  <span className="font-bold uppercase text-[#FF5722]">{kycStatus.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 font-bold uppercase text-[10px]">Today Settled</span>
                  <span className="font-mono font-bold text-[#18181B]">
                    ₦{Math.round((todayEarningsKobo || 0) / 100).toLocaleString('en-NG')}
                  </span>
                </div>
              </div>
              <p>
                Settlement statements, VAT commission receipts, and weekly NIP payout schedules mirror directly with your authenticated Bayniks account.
              </p>
            </div>
          ) : (
            <div className="space-y-3" data-testid="privacy-info-content">
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
                <ShieldCheck size={18} className="text-[#FF5722] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#18181B]">Live Location & Telemetry Policy</h4>
                  <p className="mt-0.5">
                    GPS telemetry is collected strictly while Online or executing active dispatches so senders can track parcels in real time.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
                <FileText size={18} className="text-[#18181B] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#18181B]">POD & PIN Verification Storage</h4>
                  <p className="mt-0.5">
                    Compressed Proof-of-Delivery photos and 4-digit handover codes are retained solely for audit protection and dispute resolution.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

