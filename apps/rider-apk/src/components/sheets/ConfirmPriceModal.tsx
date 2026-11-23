import React from 'react';
import { ChevronRight, ShieldCheck, Banknote, Sparkles } from 'lucide-react';
import { playMissionAcceptChime, playKeypadChime } from '../../utils/audioChimes';

export interface ConfirmPriceModalProps {
  isOpen: boolean;
  cashNaira?: number;
  subsidyNaira?: number;
  totalNaira?: number;
  passengerName?: string;
  onConfirm: () => void;
}

export const ConfirmPriceModal: React.FC<ConfirmPriceModalProps> = ({
  isOpen,
  cashNaira = 400,
  subsidyNaira = 100,
  totalNaira = 500,
  passengerName = 'Ebi',
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fadeIn"
      data-testid="confirm-price-modal"
    >
      <div className="bg-white w-full max-w-[390px] rounded-3xl p-6 shadow-2xl border border-zinc-200 text-center animate-slideUp space-y-5">
        {/* Header Title */}
        <div>
          <h2 className="text-xl font-black tracking-tight text-zinc-900">Confirm Price</h2>
        </div>

        {/* Orange Compensation Pill */}
        <div className="inline-block px-3 py-1 rounded-full bg-[#EA580C] text-white text-xs font-black uppercase tracking-wider shadow-sm">
          Trip with compensation
        </div>

        {/* Big Hero Cash Amount */}
        <div>
          <span className="text-4xl font-black text-zinc-950 tracking-tight">
            ₦ {cashNaira.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Green Instruction Banner */}
        <div className="bg-[#00A859] text-white py-3.5 px-4 rounded-2xl shadow-sm text-center">
          <p className="text-xs font-bold leading-snug">
            Cash ride, collect displayed sum from:
          </p>
          <p className="text-base font-black tracking-tight mt-0.5">
            {passengerName}
          </p>
        </div>

        {/* Itemized Subsidy Ledger */}
        <div className="space-y-2 pt-2 border-t border-zinc-100 text-xs">
          <div className="flex items-center justify-between text-zinc-500 font-semibold">
            <span>Bayniks will compensate you</span>
            <span className="text-emerald-600 font-black">
              +₦ {subsidyNaira.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm font-black text-zinc-900 pt-1.5 border-t border-zinc-100">
            <span>Total fare</span>
            <span className="text-zinc-900">
              ₦ {totalNaira.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Slide / Click to Confirm Action */}
        <button
          type="button"
          onClick={() => {
            playMissionAcceptChime();
            onConfirm();
          }}
          className="w-full py-4 rounded-2xl bg-[#00A859] hover:bg-[#00924C] active:scale-[0.98] text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
        >
          <ChevronRight size={20} strokeWidth={3} />
          <span>Confirm</span>
        </button>
      </div>
    </div>
  );
};

export default ConfirmPriceModal;

