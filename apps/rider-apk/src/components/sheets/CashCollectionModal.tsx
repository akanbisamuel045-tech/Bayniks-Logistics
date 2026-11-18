import React, { useState } from 'react';
import { X, Banknote, Calculator, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { playMissionAcceptChime, playKeypadChime } from '../../utils/audioChimes';

export interface CashCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  fareKobo: number;
  trackingCode: string;
  onConfirmCollection: (tenderedKobo: number, changeKobo: number) => void;
}

function formatKoboToNaira(kobo: number): string {
  const naira = Math.floor(kobo / 100);
  return `₦${naira.toLocaleString('en-NG')}`;
}

export const CashCollectionModal: React.FC<CashCollectionModalProps> = ({
  isOpen,
  onClose,
  fareKobo,
  trackingCode,
  onConfirmCollection,
}) => {
  const [tenderedKobo, setTenderedKobo] = useState<number>(fareKobo);
  const [customInput, setCustomInput] = useState<string>('');
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);

  if (!isOpen) return null;

  const fareNaira = Math.floor(fareKobo / 100);
  const changeKobo = Math.max(0, tenderedKobo - fareKobo);
  const isSufficient = tenderedKobo >= fareKobo;

  const handleSelectPreset = (naira: number) => {
    playKeypadChime();
    setTenderedKobo(naira * 100);
    setCustomInput('');
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setCustomInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      setTenderedKobo(num * 100);
    }
  };

  const handleProceed = () => {
    if (!isSufficient || !isConfirmed) return;
    playMissionAcceptChime();
    onConfirmCollection(tenderedKobo, changeKobo);
    onClose();
  };

  return (
    <div
      className="absolute inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-3 bg-black/60 backdrop-blur-sm animate-fadeIn"
      data-testid="cash-collection-modal"
    >
      <div className="relative w-full max-w-[390px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-neutral-200">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#1E1C1A] to-[#2B2724] px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-md">
              <Banknote size={17} strokeWidth={2.4} />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight">Collect Physical Cash</h2>
              <p className="text-[11px] text-zinc-300">Order #{trackingCode} • Cash on Delivery</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label="Close Cash Modal"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4">
          {/* Target Amount To Collect Banner */}
          <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-center">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 block">
              Exact Fare to Collect
            </span>
            <div className="text-2xl font-black text-neutral-900 mt-1 font-mono tracking-tight" data-testid="target-fare-amount">
              {formatKoboToNaira(fareKobo)}
            </div>
            <span className="text-[11px] text-neutral-600 mt-1 block font-medium">
              20% platform commission will be deducted atomically from your wallet ledger.
            </span>
          </div>

          {/* Quick Tendered Denominations */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">
                Amount Handed by Customer
              </span>
              <span className="text-[10px] font-bold text-neutral-500">Select or Enter Bill</span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 mb-2">
              <button
                type="button"
                onClick={() => handleSelectPreset(fareNaira)}
                className={`py-2 rounded-xl text-xs font-black border transition-all ${
                  tenderedKobo === fareKobo && !customInput
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 bg-neutral-50 text-neutral-800 hover:bg-neutral-100'
                }`}
              >
                Exact
              </button>
              {[1000, 2000, 5000].map((naira) => (
                <button
                  key={naira}
                  type="button"
                  onClick={() => handleSelectPreset(naira)}
                  className={`py-2 rounded-xl text-xs font-black border transition-all ${
                    tenderedKobo === naira * 100 && !customInput
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-800 hover:bg-neutral-100'
                  }`}
                >
                  ₦{naira.toLocaleString('en-NG')}
                </button>
              ))}
            </div>

            {/* Custom Cash Input */}
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-neutral-500">₦</span>
              <input
                type="text"
                inputMode="numeric"
                value={customInput}
                onChange={handleCustomChange}
                placeholder={`Or enter custom cash (e.g. ${fareNaira + 500})`}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900"
              />
            </div>
          </div>

          {/* Change Calculation Box */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
              !isSufficient
                ? 'bg-red-50 border-red-300 text-red-900'
                : changeKobo > 0
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-neutral-50 border-neutral-200 text-neutral-900'
            }`}
            data-testid="change-calculation-box"
          >
            <div className="flex items-center gap-2">
              <Calculator size={18} />
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider">
                  {!isSufficient ? 'INSUFFICIENT CASH TENDERED' : 'CHANGE TO RETURN TO CUSTOMER'}
                </div>
                <div className="text-sm font-extrabold">
                  {!isSufficient
                    ? `Missing ${formatKoboToNaira(fareKobo - tenderedKobo)}`
                    : formatKoboToNaira(changeKobo)}
                </div>
              </div>
            </div>
            {isSufficient && changeKobo > 0 && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white uppercase">
                Return Change
              </span>
            )}
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-neutral-200 bg-neutral-50 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isConfirmed}
              onChange={(e) => setIsConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-amber-500 border-neutral-300 focus:ring-0"
              data-testid="chk-confirm-cash-receipt"
            />
            <span className="text-xs font-semibold text-neutral-800 leading-tight">
              I have physically counted and received <strong>{formatKoboToNaira(tenderedKobo)}</strong> in physical cash from the customer.
            </span>
          </label>

          {/* Submit Action */}
          <button
            type="button"
            disabled={!isSufficient || !isConfirmed}
            onClick={handleProceed}
            className={`w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] ${
              isSufficient && isConfirmed
                ? 'bg-amber-500 hover:bg-amber-600 text-white cursor-pointer'
                : 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
            }`}
            data-testid="btn-confirm-cash-proceed"
          >
            <span>Confirm Cash Received & Verify Handover</span>
            <ArrowRight size={14} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>
  );
};
