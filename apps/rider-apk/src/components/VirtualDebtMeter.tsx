import React from 'react';
import { AlertCircle, ShieldAlert, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { MAX_CASH_DEBT_LIMIT_KOBO } from '@logistics/shared-types';

export interface VirtualDebtMeterProps {
  walletBalanceKobo: number;
  isDebtLocked?: boolean;
  onOpenTopUp: () => void;
}

function formatKoboToNaira(kobo: number): string {
  const naira = Math.floor(Math.abs(kobo) / 100);
  return `₦${naira.toLocaleString('en-NG')}`;
}

export const VirtualDebtMeter: React.FC<VirtualDebtMeterProps> = ({
  walletBalanceKobo,
  isDebtLocked = false,
  onOpenTopUp,
}) => {
  const isNegative = walletBalanceKobo < 0;
  const currentDebtKobo = isNegative ? Math.abs(walletBalanceKobo) : 0;
  const maxLimitKobo = MAX_CASH_DEBT_LIMIT_KOBO || 500_000; // ₦5,000 default

  // Percentage of debt limit used (0 to 100)
  const debtPercent = Math.min(100, Math.round((currentDebtKobo / maxLimitKobo) * 100));
  const remainingDebtKobo = Math.max(0, maxLimitKobo - currentDebtKobo);

  const isWarning = debtPercent >= 70 && !isDebtLocked;

  return (
    <div
      className={`p-4 rounded-2xl border transition-all ${
        isDebtLocked
          ? 'bg-red-50 border-2 border-red-500 text-red-950'
          : isWarning
          ? 'bg-amber-50 border-2 border-amber-400 text-amber-950'
          : isNegative
          ? 'bg-neutral-50 border border-neutral-300 text-neutral-900'
          : 'bg-emerald-50/60 border border-emerald-200 text-emerald-950'
      }`}
      data-testid="virtual-debt-meter"
    >
      {/* Title Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isDebtLocked ? (
            <ShieldAlert size={18} className="text-red-600 shrink-0" />
          ) : isWarning ? (
            <AlertCircle size={18} className="text-amber-600 shrink-0" />
          ) : (
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          )}
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider block leading-none">
              {isDebtLocked
                ? 'CIRCUIT-BREAKER LOCKED'
                : isNegative
                ? 'CASH COMMISSION DEBT'
                : 'COMMISSION BALANCE CLEAR'}
            </span>
            <div className="text-xs font-black mt-0.5">
              {isNegative ? `Current Debt: -${formatKoboToNaira(currentDebtKobo)}` : 'Zero Cash Debt • In Good Standing'}
            </div>
          </div>
        </div>

        <span
          className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
            isDebtLocked
              ? 'bg-red-600 text-white animate-pulse'
              : isWarning
              ? 'bg-amber-500 text-white'
              : isNegative
              ? 'bg-neutral-200 text-neutral-700'
              : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {isDebtLocked ? 'Locked' : `${debtPercent}% Limit`}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-neutral-200 h-2.5 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full transition-all duration-300 ${
            isDebtLocked
              ? 'bg-red-600'
              : isWarning
              ? 'bg-amber-500'
              : isNegative
              ? 'bg-neutral-800'
              : 'bg-emerald-500'
          }`}
          style={{ width: `${Math.max(4, debtPercent)}%` }}
        />
      </div>

      {/* Explanatory Message */}
      <div className="flex items-center justify-between text-[11px] mb-3">
        <span className="text-neutral-500 font-medium">
          {isDebtLocked
            ? 'Dispatch blocked: exceeded ₦5,000 threshold.'
            : isNegative
            ? `${formatKoboToNaira(remainingDebtKobo)} debt remaining before auto-lockout.`
            : 'Prepaid order earnings automatically offset cash debts.'}
        </span>
        <span className="font-extrabold text-neutral-700 font-mono">
          Max: ₦5,000
        </span>
      </div>

      {/* Top-up Button */}
      {isNegative && (
        <button
          type="button"
          onClick={onOpenTopUp}
          className={`w-full py-2.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition-all ${
            isDebtLocked
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-neutral-900 hover:bg-black text-white'
          }`}
          data-testid="btn-open-debt-topup"
        >
          <span>Top Up via Paystack / Card to Clear Debt</span>
          <ArrowUpRight size={14} strokeWidth={2.4} />
        </button>
      )}
    </div>
  );
};

