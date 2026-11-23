import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  CreditCard,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useRiderStore } from '../store/riderStore';
import { playKeypadChime } from '../utils/audioChimes';

export interface RiderEarningsDualScreenProps {
  onBack: () => void;
  onOpenCashout?: () => void;
  onOpenHistory?: () => void;
  onOpenDebtTopUp?: () => void;
}

export const RiderEarningsDualScreen: React.FC<RiderEarningsDualScreenProps> = ({
  onBack,
  onOpenCashout,
  onOpenHistory,
  onOpenDebtTopUp,
}) => {
  const { walletBalanceKobo, todayEarningsKobo, showToast } = useRiderStore();

  const [activeSegment, setActiveSegment] = useState<'earnings' | 'balances'>('earnings');
  const [earningsPeriod, setEarningsPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [balancePeriod, setBalancePeriod] = useState<'yesterday' | 'today'>('today');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // Weekly bar chart data matching the Bolt screen recording
  const weeklyData = [
    { day: 'Mon', gross: 42000, height: '45%' },
    { day: 'Tue', gross: 89000, height: '90%', active: true },
    { day: 'Wed', gross: 56000, height: '60%' },
    { day: 'Thu', gross: 61000, height: '65%' },
    { day: 'Fri', gross: 48000, height: '52%' },
    { day: 'Sat', gross: 32000, height: '35%' },
    { day: 'Sun', gross: 18850, height: '22%' },
  ];

  const grossEarningsNaira = 346850;
  const platformFeeNaira = 72740;
  const netIncomeNaira = grossEarningsNaira - platformFeeNaira;

  const currentBalanceNaira = (walletBalanceKobo || 0) / 100;
  const canCashout = currentBalanceNaira >= 1000;

  const handleCashoutClick = () => {
    playKeypadChime();
    if (!canCashout) {
      showToast('Minimum balance required to cash out is ₦1,000');
      return;
    }
    if (onOpenCashout) {
      onOpenCashout();
    } else {
      showToast('Processing Instant Cashout to linked bank...');
    }
  };

  return (
    <div
      className="w-full h-full flex flex-col bg-white text-zinc-900 select-none overflow-hidden"
      data-testid="rider-earnings-dual-screen"
    >
      {/* =========================================================================
       * 1. HEADER WITH TOP SEGMENT TABS (Earnings | Balances)
       * Matches Bolt Driver App Frames #12 - #17
       * ========================================================================= */}
      <div className="shrink-0 bg-white border-b border-zinc-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-700 transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft size={20} strokeWidth={2.2} />
          </button>

          {/* Segmented Controller: Earnings vs Balances */}
          <div className="flex items-center bg-zinc-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                playKeypadChime();
                setActiveSegment('earnings');
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeSegment === 'earnings'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Earnings
            </button>
            <button
              type="button"
              onClick={() => {
                playKeypadChime();
                setActiveSegment('balances');
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeSegment === 'balances'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Balances
            </button>
          </div>

          <div className="w-9 flex items-center justify-center text-zinc-500">
            <Calendar size={19} />
          </div>
        </div>
      </div>

      {/* =========================================================================
       * 2. MAIN SCROLLABLE CONTENT BODY
       * ========================================================================= */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeSegment === 'earnings' ? (
          /* =====================================================================
           * VIEW A: EARNINGS ANALYTICS & BAR CHART (Gross, Expenses, Net)
           * ===================================================================== */
          <div className="space-y-4">
            {/* Period Selector Dropdown Button (Daily | Weekly | Monthly) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 bg-zinc-100 px-3 py-1.5 rounded-full hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                <span className="capitalize">{earningsPeriod}</span>
                <ChevronDown size={14} />
              </button>

              {isFilterDropdownOpen && (
                <div className="absolute top-9 left-0 z-30 bg-white border border-zinc-200 rounded-xl shadow-lg p-1 min-w-[120px]">
                  {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        playKeypadChime();
                        setEarningsPeriod(p);
                        setIsFilterDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-colors ${
                        earningsPeriod === p ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-600 hover:bg-zinc-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Total Gross Amount Display */}
            <div className="pt-1">
              <div className="text-3xl font-black text-zinc-950 font-mono tracking-tight">
                ₦ {grossEarningsNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs font-medium text-zinc-500 mt-1">
                Expenses: -₦{platformFeeNaira.toLocaleString('en-NG')} • Net: ₦{netIncomeNaira.toLocaleString('en-NG')}
              </div>
            </div>

            {/* Interactive High-Fidelity Weekly Bar Chart */}
            <div className="bg-[#F8FAFC] border border-zinc-200/80 rounded-2xl p-4">
              <div className="h-44 flex items-end justify-between gap-2 pt-6 pb-2 px-1">
                {weeklyData.map((item) => (
                  <div key={item.day} className="flex-1 flex flex-col items-center h-full justify-end group">
                    {/* Amount Tooltip on hover/active */}
                    <span className="text-[9px] font-mono font-bold text-zinc-500 mb-1 opacity-80">
                      ₦{Math.round(item.gross / 1000)}k
                    </span>
                    {/* Bar */}
                    <div
                      className={`w-full max-w-[28px] rounded-t-lg transition-all ${
                        item.active
                          ? 'bg-[#2563EB] shadow-xs'
                          : 'bg-[#93C5FD] group-hover:bg-[#60A5FA]'
                      }`}
                      style={{ height: item.height }}
                    />
                    {/* Day label */}
                    <span className={`text-[11px] font-bold mt-2 ${item.active ? 'text-zinc-900 font-black' : 'text-zinc-400'}`}>
                      {item.day}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Financial Ledger Breakdown */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-3 shadow-2xs">
              <div className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                Turnover Summary
              </div>

              <div className="flex items-center justify-between text-sm py-1">
                <span className="text-zinc-600 font-medium">Gross Fare Earnings</span>
                <span className="font-bold font-mono text-zinc-900">
                  ₦{grossEarningsNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm py-1 border-t border-zinc-100">
                <span className="text-zinc-600 font-medium">Expenses & Platform Fee</span>
                <span className="font-bold font-mono text-red-600">
                  -₦{platformFeeNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-between text-base py-2 border-t border-zinc-200 font-black">
                <span className="text-zinc-950">Net Payout</span>
                <span className="font-mono text-emerald-600">
                  ₦{netIncomeNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* =====================================================================
           * VIEW B: BALANCES & REAL-TIME LIQUID SETTLEMENT
           * Matches Bolt Driver App Frames #13 & #44
           * ===================================================================== */
          <div className="space-y-4">
            {/* Period Pills: Yesterday | Today */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  playKeypadChime();
                  setBalancePeriod('yesterday');
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  balancePeriod === 'yesterday'
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => {
                  playKeypadChime();
                  setBalancePeriod('today');
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  balancePeriod === 'today'
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                Today
              </button>
            </div>

            {/* Current Balance Display (Clean Green Typography) */}
            <div className="bg-[#F0FDF4] border border-emerald-200/80 rounded-2xl p-5 shadow-2xs">
              <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Your Balance
              </div>
              <div className="text-3xl font-black text-emerald-600 font-mono tracking-tight mt-1">
                ₦ {currentBalanceNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs font-semibold text-emerald-700/90 mt-2">
                Next weekly payout: Monday, 7 November
              </div>
            </div>

            {/* Early Cashout Button */}
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={handleCashoutClick}
                className={`w-full py-3.5 px-4 rounded-2xl font-extrabold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] ${
                  canCashout
                    ? 'bg-zinc-950 hover:bg-black text-white'
                    : 'bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200'
                }`}
              >
                <CreditCard size={18} />
                <span>Early Cashout</span>
              </button>
              <div className="text-[11px] text-zinc-500 text-center font-medium">
                Minimum balance required to cash out is ₦1,000.00
              </div>
            </div>

            {/* View Transaction History Link */}
            <button
              type="button"
              onClick={() => {
                playKeypadChime();
                if (onOpenHistory) onOpenHistory();
              }}
              className="w-full bg-[#F8FAFC] hover:bg-zinc-100 border border-zinc-200/80 rounded-2xl p-3.5 flex items-center justify-between text-xs font-bold text-zinc-800 transition cursor-pointer"
            >
              <span>View transaction history</span>
              <ChevronRight size={16} className="text-zinc-400" />
            </button>

            {/* Balance Movement Reconciliation Breakdown */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-3">
              <div className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                Balance Movement
              </div>

              <div className="flex items-center justify-between text-sm py-1">
                <span className="text-zinc-600 font-medium">Starting balance</span>
                <span className="font-bold font-mono text-zinc-900">
                  ₦{currentBalanceNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm py-1 border-t border-zinc-100">
                <span className="text-zinc-600 font-medium">Change in balance</span>
                <span className="font-bold font-mono text-zinc-900">₦0.00</span>
              </div>

              <div className="flex items-center justify-between text-sm py-1 border-t border-zinc-100">
                <span className="text-zinc-600 font-medium">Bayniks owes you</span>
                <span className="font-bold font-mono text-emerald-600">
                  ₦{currentBalanceNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RiderEarningsDualScreen;

