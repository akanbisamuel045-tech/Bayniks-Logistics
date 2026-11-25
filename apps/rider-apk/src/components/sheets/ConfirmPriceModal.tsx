import React from 'react';
import { ChevronsRight } from 'lucide-react';
import { playMissionAcceptChime } from '../../utils/audioChimes';

export interface ConfirmPriceModalProps {
  isOpen: boolean;
  cashNaira?: number;
  subsidyNaira?: number;
  totalNaira?: number;
  passengerName?: string;
  onConfirm: () => void;
}

function formatNairaDecimals(amount: number): string {
  return `₦ ${amount.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
      className="absolute inset-0 z-50 bg-white flex flex-col justify-between select-none animate-fadeIn text-[#18181B]"
      data-testid="confirm-price-modal"
    >
      <div>
        {/* Centered Header */}
        <header className="px-5 pt-5 pb-3 text-center">
          <h2 className="text-[17px] font-bold text-[#18181B] tracking-tight">
            Confirm Price
          </h2>
        </header>

        {/* Atomic Orange Compensation Pill + Hero Cash Amount */}
        <div className="px-5 pt-2 pb-5 text-center space-y-3">
          {subsidyNaira > 0 && (
            <span className="inline-block px-3.5 py-1 rounded-md bg-[#FF5722] text-white text-[12px] font-bold tracking-wide">
              Trip with compensation
            </span>
          )}
          <div>
            <span className="text-[38px] font-black text-[#18181B] tracking-tight tabular-nums">
              {formatNairaDecimals(cashNaira)}
            </span>
          </div>
        </div>

        {/* Full-Width Black Cash Collection Strip */}
        <div className="w-full bg-[#18181B] text-white py-3.5 px-5 text-center">
          <p className="text-[12.5px] font-medium text-zinc-300 leading-snug">
            Cash ride, collect displayed sum from:
          </p>
          <p className="text-[17px] font-bold text-[#FF5722] tracking-tight mt-0.5">
            {passengerName}
          </p>
        </div>

        {/* Compensation & Total Fare Breakdown */}
        <div className="px-5 py-4 divide-y divide-zinc-100">
          <div className="py-3 flex items-center justify-between text-[13.5px]">
            <span className="text-zinc-500 font-medium">Bayniks will compensate you</span>
            <span className="font-bold text-[#FF5722] tabular-nums">
              {formatNairaDecimals(subsidyNaira)}
            </span>
          </div>
          <div className="py-3 flex items-center justify-between text-[15px] font-bold text-[#18181B]">
            <span>Total fare</span>
            <span className="tabular-nums">{formatNairaDecimals(totalNaira)}</span>
          </div>
        </div>
      </div>

      {/* Bottom Full-Width Black Slider / Confirm Action */}
      <div className="p-4 bg-white border-t border-zinc-100">
        <button
          type="button"
          onClick={() => {
            playMissionAcceptChime();
            onConfirm();
          }}
          data-testid="confirm-price-submit-btn"
          className="w-full py-4 px-5 rounded-xl bg-[#18181B] hover:bg-zinc-800 active:scale-[0.98] text-white font-bold text-[15px] flex items-center justify-between shadow-md transition-all cursor-pointer"
        >
          <ChevronsRight size={22} className="text-[#FF5722]" strokeWidth={2.8} />
          <span>Confirm</span>
          <span className="w-5" />
        </button>
      </div>
    </div>
  );
};

export default ConfirmPriceModal;
