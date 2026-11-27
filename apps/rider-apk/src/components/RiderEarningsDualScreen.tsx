import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { useRiderStore } from '../store/riderStore';
import { playKeypadChime } from '../utils/audioChimes';

export interface RiderEarningsDualScreenProps {
  onBack: () => void;
  onOpenCashout?: () => void;
  onOpenHistory?: () => void;
  onOpenDebtTopUp?: () => void;
  initialSegment?: 'earnings' | 'balances';
}

type TimeRangeGranularity = 'daily' | 'weekly' | 'monthly';

interface ChartBarPoint {
  label: string;
  showTick?: boolean;
  totalNaira: number;
  expensesNaira: number;
  netNaira: number;
}

interface EarningsPeriodData {
  id: string;
  label: string;
  totalNaira: number;
  expensesNaira: number;
  netNaira: number;
  yMaxNaira: number;
  bars: ChartBarPoint[];
}

interface BalancePeriodData {
  id: string;
  label: string;
  startingNaira: number;
  changeNaira: number;
  endingNaira: number;
}

const WEEKLY_PERIODS: EarningsPeriodData[] = [
  {
    id: 'w-0919',
    label: '09-19 - 09-25',
    totalNaira: 39400,
    expensesNaira: 8665,
    netNaira: 30735,
    yMaxNaira: 30000,
    bars: [
      { label: 'Mon', showTick: true, totalNaira: 1800, expensesNaira: 400, netNaira: 1400 },
      { label: 'Tue', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: 'Wed', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: 'Thu', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: 'Fri', showTick: true, totalNaira: 3800, expensesNaira: 840, netNaira: 2960 },
      { label: 'Sat', showTick: true, totalNaira: 6200, expensesNaira: 1360, netNaira: 4840 },
      { label: 'Sun', showTick: true, totalNaira: 27600, expensesNaira: 6065, netNaira: 21535 },
    ],
  },
  {
    id: 'w-0926',
    label: '09-26 - 10-02',
    totalNaira: 13100,
    expensesNaira: 2521,
    netNaira: 10579,
    yMaxNaira: 30000,
    bars: [
      { label: 'Mon', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: 'Tue', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: 'Wed', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: 'Thu', showTick: true, totalNaira: 6800, expensesNaira: 1310, netNaira: 5490 },
      { label: 'Fri', showTick: true, totalNaira: 4200, expensesNaira: 810, netNaira: 3390 },
      { label: 'Sat', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: 'Sun', showTick: true, totalNaira: 2100, expensesNaira: 401, netNaira: 1699 },
    ],
  },
  {
    id: 'w-1003',
    label: '10-03 - 10-09',
    totalNaira: 64600,
    expensesNaira: 11822,
    netNaira: 52778,
    yMaxNaira: 30000,
    bars: [
      { label: 'Mon', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: 'Tue', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: 'Wed', showTick: true, totalNaira: 16200, expensesNaira: 2960, netNaira: 13240 },
      { label: 'Thu', showTick: true, totalNaira: 6100, expensesNaira: 1120, netNaira: 4980 },
      { label: 'Fri', showTick: true, totalNaira: 1100, expensesNaira: 202, netNaira: 898 },
      { label: 'Sat', showTick: true, totalNaira: 17600, expensesNaira: 3220, netNaira: 14380 },
      { label: 'Sun', showTick: true, totalNaira: 23600, expensesNaira: 4320, netNaira: 19280 },
    ],
  },
  {
    id: 'w-1010',
    label: '10-10 - 10-16',
    totalNaira: 30600,
    expensesNaira: 5746,
    netNaira: 24854,
    yMaxNaira: 16000,
    bars: [
      { label: 'Mon', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: 'Tue', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: 'Wed', showTick: true, totalNaira: 11400, expensesNaira: 2140, netNaira: 9260 },
      { label: 'Thu', showTick: true, totalNaira: 8200, expensesNaira: 1540, netNaira: 6660 },
      { label: 'Fri', showTick: true, totalNaira: 11000, expensesNaira: 2066, netNaira: 8934 },
      { label: 'Sat', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: 'Sun', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
    ],
  },
  {
    id: 'w-1017',
    label: '10-17 - 10-23',
    totalNaira: 0,
    expensesNaira: 0,
    netNaira: 0,
    yMaxNaira: 10,
    bars: [
      { label: 'Mon', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: 'Tue', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: 'Wed', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: 'Thu', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: 'Fri', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: 'Sat', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: 'Sun', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
    ],
  },
  {
    id: 'w-last',
    label: 'Last week',
    totalNaira: 15300,
    expensesNaira: 2921,
    netNaira: 12379,
    yMaxNaira: 16000,
    bars: [
      { label: 'Mon', showTick: true, totalNaira: 14700, expensesNaira: 2800, netNaira: 11900 },
      { label: 'Tue', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: 'Wed', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: 'Thu', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: 'Fri', showTick: true, totalNaira: 600, expensesNaira: 121, netNaira: 479 },
      { label: 'Sat', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: 'Sun', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
    ],
  },
  {
    id: 'w-current',
    label: 'Current week',
    totalNaira: 0,
    expensesNaira: 0,
    netNaira: 0,
    yMaxNaira: 10,
    bars: [
      { label: 'Mon', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: 'Tue', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: 'Wed', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: 'Thu', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: 'Fri', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: 'Sat', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: 'Sun', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
    ],
  },
];

function buildMonthlyBars(values: number[]): ChartBarPoint[] {
  const showTicks = new Set([1, 5, 10, 15, 20, 25, 31]);
  return Array.from({ length: 31 }, (_, i) => {
    const day = i + 1;
    const total = values[i] || 0;
    const expenses = Math.round(total * 0.21);
    const net = total - expenses;
    return {
      label: `${day}`,
      showTick: showTicks.has(day),
      totalNaira: total,
      expensesNaira: expenses,
      netNaira: net,
    };
  });
}

const MONTHLY_PERIODS: EarningsPeriodData[] = [
  {
    id: 'm-05',
    label: '05-01 - 05-31',
    totalNaira: 346850,
    expensesNaira: 72740,
    netNaira: 274110,
    yMaxNaira: 30000,
    bars: buildMonthlyBars([
      18000, 18000, 18500, 12500, 11800, 20500, 19000, 14200, 10600, 8800,
      8600, 15200, 13400, 7400, 3200, 14800, 10200, 7500, 17800, 14500,
      18200, 28500, 0, 9600, 6200, 7800, 1600, 7400, 0, 7200, 0,
    ]),
  },
  {
    id: 'm-06',
    label: '06-01 - 06-30',
    totalNaira: 175150,
    expensesNaira: 35229,
    netNaira: 139921,
    yMaxNaira: 30000,
    bars: buildMonthlyBars([
      0, 3200, 9400, 1100, 4600, 8100, 0, 5600, 6200, 8200,
      12800, 11400, 14500, 1200, 13400, 6400, 14100, 9600, 11800, 10200,
      0, 0, 12900, 7800, 8900, 9200, 6500, 5000, 13250, 0, 0,
    ]),
  },
  {
    id: 'm-07',
    label: '07-01 - 07-31',
    totalNaira: 120760,
    expensesNaira: 25014,
    netNaira: 95746,
    yMaxNaira: 20000,
    bars: buildMonthlyBars([
      0, 0, 0, 2400, 11000, 14200, 7400, 10800, 6200, 12500,
      16800, 9100, 11500, 8600, 10260, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]),
  },
  {
    id: 'm-08',
    label: '08-01 - 08-31',
    totalNaira: 185000,
    expensesNaira: 36967,
    netNaira: 148033,
    yMaxNaira: 30000,
    bars: buildMonthlyBars([
      0, 0, 0, 0, 9200, 11400, 8400, 7600, 6800, 14200,
      11800, 8600, 10400, 11800, 7400, 9800, 11400, 12800, 9200, 7600,
      10200, 16400, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]),
  },
  {
    id: 'm-09',
    label: '09-01 - 09-30',
    totalNaira: 97750,
    expensesNaira: 19764,
    netNaira: 77986,
    yMaxNaira: 30000,
    bars: buildMonthlyBars([
      0, 6400, 7200, 0, 8600, 9400, 6800, 5200, 0, 7400,
      5400, 0, 0, 0, 4800, 6200, 0, 11200, 6500, 1650,
      1800, 0, 19200, 0, 0, 0, 0, 0, 0, 0, 0,
    ]),
  },
  {
    id: 'm-last',
    label: 'Last month',
    totalNaira: 111200,
    expensesNaira: 20640,
    netNaira: 90560,
    yMaxNaira: 30000,
    bars: buildMonthlyBars([
      800, 0, 0, 0, 15800, 5200, 1200, 17400, 24500, 0,
      11200, 0, 8900, 10200, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 14900, 0, 0, 0, 1100, 0, 0, 0,
    ]),
  },
  {
    id: 'm-this',
    label: 'This month',
    totalNaira: 0,
    expensesNaira: 0,
    netNaira: 0,
    yMaxNaira: 10,
    bars: buildMonthlyBars([]),
  },
];

const DAILY_PERIODS_STATIC: EarningsPeriodData[] = [
  {
    id: 'd-1101',
    label: '11-01',
    totalNaira: 0,
    expensesNaira: 0,
    netNaira: 0,
    yMaxNaira: 10,
    bars: [
      { label: '10-30', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: '10-31', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: '11-01', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
    ],
  },
  {
    id: 'd-yesterday',
    label: 'Yesterday',
    totalNaira: 8400,
    expensesNaira: 1680,
    netNaira: 6720,
    yMaxNaira: 10000,
    bars: [
      { label: '10-31', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
      { label: '11-01', showTick: true, totalNaira: 4200, expensesNaira: 840, netNaira: 3360 },
      { label: 'Yesterday', showTick: true, totalNaira: 8400, expensesNaira: 1680, netNaira: 6720 },
    ],
  },
];

export const RiderEarningsDualScreen: React.FC<RiderEarningsDualScreenProps> = ({
  onBack,
  onOpenCashout,
  onOpenHistory,
  initialSegment = 'earnings',
}) => {
  const { walletBalanceKobo, todayEarningsKobo, showToast, liveEarningsPeriods, simulationMode } = useRiderStore();

  const [activeSegment, setActiveSegment] = useState<'earnings' | 'balances'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const seg = params.get('segment');
      const view = params.get('view');
      if (seg === 'balances' || view === 'balances') return 'balances';
      if (seg === 'earnings') return 'earnings';
    }
    return initialSegment;
  });

  const [granularity, setGranularity] = useState<TimeRangeGranularity>('weekly');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('w-last');
  const [balancePeriodId, setBalancePeriodId] = useState<string>('b-today');
  const [isTimeRangeModalOpen, setIsTimeRangeModalOpen] = useState(false);

  // Accordion row states
  const [earningsExpanded, setEarningsExpanded] = useState(false);
  const [expensesExpanded, setExpensesExpanded] = useState(false);
  const [owesYouExpanded, setOwesYouExpanded] = useState(false);
  const [hoveredBarIdx, setHoveredBarIdx] = useState<number | null>(null);

  const periodStripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const activeEl = periodStripRef.current?.querySelector('[data-active-period="true"]') as HTMLElement | null;
      if (activeEl && typeof activeEl.scrollIntoView === 'function') {
        activeEl.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      }
    } catch {}
  }, [granularity, selectedPeriodId, activeSegment]);

  const todayEarningsNaira = Math.floor((todayEarningsKobo || 0) / 100);
  const todayExpensesNaira = Math.round(todayEarningsNaira * 0.2);
  const todayNetNaira = todayEarningsNaira - todayExpensesNaira;

  const dailyPeriods: EarningsPeriodData[] = [
    ...DAILY_PERIODS_STATIC,
    {
      id: 'd-today',
      label: 'Today',
      totalNaira: todayEarningsNaira,
      expensesNaira: todayExpensesNaira,
      netNaira: todayNetNaira,
      yMaxNaira: todayEarningsNaira > 0 ? Math.max(10000, Math.ceil(todayEarningsNaira / 5000) * 5000) : 10,
      bars: [
        { label: '11-01', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
        { label: '11-02', showTick: true, totalNaira: 0, expensesNaira: 0, netNaira: 0 },
        {
          label: 'Thu 11-03',
          showTick: true,
          totalNaira: todayEarningsNaira,
          expensesNaira: todayExpensesNaira,
          netNaira: todayNetNaira,
        },
      ],
    },
  ];

  // Live wallet & backend weekly aggregation when authenticated; curated fallback in simulation
  const baseWeeklyPeriods: EarningsPeriodData[] =
    !simulationMode && liveEarningsPeriods && liveEarningsPeriods.length > 0
      ? liveEarningsPeriods
      : WEEKLY_PERIODS;

  const weeklyPeriods: EarningsPeriodData[] = baseWeeklyPeriods.map((p, idx) => {
    const isLatestBucket = p.id === 'w-current' || idx === baseWeeklyPeriods.length - 1;
    if (!isLatestBucket || todayEarningsNaira === 0) return p;
    if (!simulationMode && liveEarningsPeriods && liveEarningsPeriods.length > 0) return p;
    return {
      ...p,
      totalNaira: todayEarningsNaira,
      expensesNaira: todayExpensesNaira,
      netNaira: todayNetNaira,
      yMaxNaira: Math.max(10000, Math.ceil(todayEarningsNaira / 5000) * 5000),
      bars: p.bars.map((b, bIdx) =>
        bIdx === 3 ? { ...b, totalNaira: todayEarningsNaira, expensesNaira: todayExpensesNaira, netNaira: todayNetNaira } : b
      ),
    };
  });

  const monthlyPeriods: EarningsPeriodData[] = MONTHLY_PERIODS.map((p) => {
    if (p.id !== 'm-this' || todayEarningsNaira === 0) return p;
    return {
      ...p,
      totalNaira: todayEarningsNaira,
      expensesNaira: todayExpensesNaira,
      netNaira: todayNetNaira,
      yMaxNaira: Math.max(10000, Math.ceil(todayEarningsNaira / 5000) * 5000),
      bars: p.bars.map((b, idx) =>
        idx === 2 ? { ...b, totalNaira: todayEarningsNaira, expensesNaira: todayExpensesNaira, netNaira: todayNetNaira } : b
      ),
    };
  });

  const activePeriods =
    granularity === 'daily'
      ? dailyPeriods
      : granularity === 'weekly'
      ? weeklyPeriods
      : monthlyPeriods;

  const currentPeriod =
    activePeriods.find((p) => p.id === selectedPeriodId) ||
    activePeriods[activePeriods.length - 1]!;

  // Balances time periods matching video (11-01 | Yesterday | Today)
  const currentWalletNaira = Math.floor((walletBalanceKobo || 0) / 100);
  const displayTodayBalance = currentWalletNaira;
  const minCashoutNaira = 1015;
  const canCashout = displayTodayBalance >= minCashoutNaira;

  const balancePeriods: BalancePeriodData[] = [
    {
      id: 'b-1101',
      label: '11-01',
      startingNaira: 0,
      changeNaira: 0,
      endingNaira: 0,
    },
    {
      id: 'b-yesterday',
      label: 'Yesterday',
      startingNaira: 0,
      changeNaira: displayTodayBalance,
      endingNaira: displayTodayBalance,
    },
    {
      id: 'b-today',
      label: 'Today',
      startingNaira: displayTodayBalance,
      changeNaira: 0,
      endingNaira: displayTodayBalance,
    },
  ];

  const activeBalanceData =
    balancePeriods.find((b) => b.id === balancePeriodId) ||
    balancePeriods[balancePeriods.length - 1]!;

  const handleSelectGranularity = (mode: TimeRangeGranularity) => {
    playKeypadChime();
    setGranularity(mode);
    setHoveredBarIdx(null);
    if (mode === 'daily') setSelectedPeriodId('d-today');
    else if (mode === 'weekly') setSelectedPeriodId('w-last');
    else setSelectedPeriodId('m-last');
    setIsTimeRangeModalOpen(false);
  };

  const handleCashoutClick = () => {
    playKeypadChime();
    if (!canCashout) {
      showToast(`Minimum balance to request Cashout is ${formatNairaPlain(minCashoutNaira)}`);
      return;
    }
    if (onOpenCashout) {
      onOpenCashout();
    } else {
      showToast('Processing Instant Cashout to linked bank...');
    }
  };

  const formatNairaPlain = (amt: number) => `₦${amt.toLocaleString('en-NG')}`;
  const yMid = Math.round(currentPeriod.yMaxNaira / 2);

  return (
    <div
      className="relative w-full h-full flex flex-col bg-white text-zinc-900 select-none overflow-hidden"
      data-testid="rider-earnings-dual-screen"
    >
      {/* =========================================================================
       * 1. TOP HEADER BAR (Back arrow left | Centered Title | Calendar right)
       * ========================================================================= */}
      <header className="shrink-0 bg-white px-4 h-14 flex items-center justify-between border-b border-zinc-100">
        <button
          type="button"
          onClick={() => {
            playKeypadChime();
            onBack();
          }}
          className="w-10 h-10 -ml-2 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-900 transition-colors cursor-pointer"
          aria-label="Back"
          data-testid="earnings-back-btn"
        >
          <ArrowLeft size={22} strokeWidth={2.2} />
        </button>

        <h1 className="text-base font-black text-zinc-900 tracking-tight">
          {activeSegment === 'earnings' ? 'Earnings' : 'Balances'}
        </h1>

        <button
          type="button"
          onClick={() => {
            playKeypadChime();
            setIsTimeRangeModalOpen(true);
          }}
          className="w-10 h-10 -mr-2 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-900 transition-colors cursor-pointer"
          aria-label="Select time range"
          data-testid="earnings-calendar-btn"
        >
          <Calendar size={20} strokeWidth={2} />
        </button>
      </header>

      {/* =========================================================================
       * 2. HORIZONTAL PERIOD CAROUSEL STRIP (bg-[#F7F8FA])
       * ========================================================================= */}
      <div
        ref={periodStripRef}
        className="shrink-0 bg-[#F7F8FA] border-b border-zinc-100 overflow-x-auto hide-scrollbar px-4 py-2.5 flex items-center justify-between gap-4"
        data-testid="period-selector-strip"
      >
        {activeSegment === 'earnings'
          ? activePeriods.map((period) => {
              const isSelected = period.id === currentPeriod.id;
              return (
                <button
                  key={period.id}
                  type="button"
                  data-active-period={isSelected ? 'true' : undefined}
                  onClick={() => {
                    playKeypadChime();
                    setSelectedPeriodId(period.id);
                    setHoveredBarIdx(null);
                  }}
                  className={`shrink-0 text-xs px-2 py-0.5 rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                    isSelected
                      ? 'font-black text-zinc-950'
                      : 'font-semibold text-zinc-400 hover:text-zinc-700'
                  }`}
                >
                  {period.label}
                </button>
              );
            })
          : balancePeriods.map((period) => {
              const isSelected = period.id === activeBalanceData.id;
              return (
                <button
                  key={period.id}
                  type="button"
                  onClick={() => {
                    playKeypadChime();
                    setBalancePeriodId(period.id);
                  }}
                  className={`flex-1 text-center text-xs px-2 py-0.5 whitespace-nowrap transition-colors cursor-pointer ${
                    isSelected
                      ? 'font-black text-zinc-950'
                      : 'font-semibold text-zinc-400 hover:text-zinc-700'
                  }`}
                >
                  {period.label}
                </button>
              );
            })}
      </div>

      {/* =========================================================================
       * 3. SCROLLABLE MAIN BODY (Earnings Chart View vs Balances View)
       * ========================================================================= */}
      <div className="flex-1 overflow-y-auto bg-white">
        {activeSegment === 'earnings' ? (
          <div className="flex flex-col" data-testid="earnings-tab-view">
            {/* Hero Total + Expenses / NET Legend */}
            <div className="px-4 pt-5 pb-3 text-center">
              <div
                className="text-3xl font-black text-zinc-950 tracking-tight"
                data-testid="earnings-hero-total"
              >
                {formatNairaPlain(currentPeriod.totalNaira)}
              </div>

              {(currentPeriod.totalNaira > 0 || granularity !== 'daily') && (
                <div className="flex items-center justify-center gap-4 mt-1.5 text-[11px] font-semibold text-zinc-500">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FF5722]" />
                    <span>Expenses: {formatNairaPlain(currentPeriod.expensesNaira)}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#18181B]" />
                    <span>NET: {formatNairaPlain(currentPeriod.netNaira)}</span>
                  </span>
                </div>
              )}

              {/* Active bar hover/click pill */}
              {hoveredBarIdx !== null && currentPeriod.bars[hoveredBarIdx] && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#18181B] text-white text-[11px] font-bold shadow-xs animate-fadeIn">
                  <span className="text-[#FF5722]">{currentPeriod.bars[hoveredBarIdx]!.label}</span>
                  <span>•</span>
                  <span>{formatNairaPlain(currentPeriod.bars[hoveredBarIdx]!.totalNaira)}</span>
                </div>
              )}
            </div>

            {/* Stacked Vertical Bar Chart with Y-Axis Left + Gridlines */}
            <div className="px-4 pt-2 pb-5">
              <div className="relative h-48 flex">
                {/* Y-Axis Labels */}
                <div className="w-14 shrink-0 flex flex-col justify-between text-[10px] font-semibold text-zinc-400 pr-2 py-0.5 text-right tabular-nums whitespace-nowrap">
                  <span>{currentPeriod.yMaxNaira} ₦</span>
                  <span>{yMid} ₦</span>
                  <span>0 ₦</span>
                </div>

                {/* Plot Area */}
                <div className="flex-1 relative flex flex-col">
                  {/* Horizontal Gridlines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    <div className="border-t border-zinc-100 w-full" />
                    <div className="border-t border-zinc-100 w-full" />
                    <div className="border-t border-zinc-200 w-full" />
                  </div>

                  {/* Stacked Bars Container */}
                  <div
                    className={`relative z-10 flex-1 flex items-end justify-between px-1 ${
                      granularity === 'monthly' ? 'gap-[2px]' : 'gap-2'
                    }`}
                  >
                    {currentPeriod.bars.map((bar, idx) => {
                      const ratioTotal = Math.min(
                        100,
                        currentPeriod.yMaxNaira > 0
                          ? (bar.totalNaira / currentPeriod.yMaxNaira) * 100
                          : 0
                      );
                      const netShare =
                        bar.totalNaira > 0 ? (bar.netNaira / bar.totalNaira) * 100 : 80;
                      const expShare = 100 - netShare;
                      const barHeightPct = bar.totalNaira > 0 ? Math.max(4, ratioTotal) : 0;

                      return (
                        <button
                          key={`${bar.label}-${idx}`}
                          type="button"
                          onClick={() => {
                            playKeypadChime();
                            setHoveredBarIdx(hoveredBarIdx === idx ? null : idx);
                          }}
                          className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer focus:outline-none"
                          aria-label={`${bar.label} ${formatNairaPlain(bar.totalNaira)}`}
                        >
                          <div
                            className={`w-full rounded-t-[3px] overflow-hidden flex flex-col transition-all duration-300 ${
                              granularity === 'monthly' ? 'max-w-[9px]' : 'max-w-[26px]'
                            } ${hoveredBarIdx === idx ? 'ring-2 ring-[#FF5722]/60' : ''}`}
                            style={{ height: `${barHeightPct}%` }}
                          >
                            {/* Top cap: Expenses (Atomic Orange) */}
                            {bar.expensesNaira > 0 && (
                              <div
                                className="w-full bg-[#FF5722]/85 transition-opacity group-hover:opacity-100"
                                style={{ height: `${expShare}%` }}
                              />
                            )}
                            {/* Bottom segment: NET Earnings (Solid Black) */}
                            {bar.netNaira > 0 && (
                              <div
                                className="w-full bg-[#18181B] group-hover:bg-black"
                                style={{ height: `${netShare}%` }}
                              />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* X-Axis Labels aligned below plot area */}
              <div className="flex mt-1.5">
                <div className="w-14 shrink-0" />
                <div
                  className={`flex-1 flex items-center justify-between px-1 ${
                    granularity === 'monthly' ? 'gap-[2px]' : 'gap-2'
                  }`}
                >
                  {currentPeriod.bars.map((bar, idx) => (
                    <div
                      key={`tick-${bar.label}-${idx}`}
                      className="flex-1 flex justify-center text-[10px] font-semibold text-zinc-400 overflow-visible"
                    >
                      {bar.showTick !== false ? (
                        <span className="whitespace-nowrap">{bar.label}</span>
                      ) : (
                        ''
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Section Divider Band matching Video */}
            <div className="h-2.5 bg-[#F4F5F7] border-y border-zinc-100" />

            {/* 3-Row Collapsible Summary Ledger (Earnings, Expenses, Net earnings) */}
            <div className="divide-y divide-zinc-100 bg-white">
              {/* Row 1: Earnings */}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    playKeypadChime();
                    setEarningsExpanded(!earningsExpanded);
                  }}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors cursor-pointer text-left"
                >
                  <span className="text-sm font-medium text-zinc-800">Earnings</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-zinc-950 tabular-nums">
                      {formatNairaPlain(currentPeriod.totalNaira)}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-zinc-400 transition-transform ${
                        earningsExpanded ? 'rotate-180 text-[#FF5722]' : ''
                      }`}
                    />
                  </div>
                </button>
                {earningsExpanded && (
                  <div className="px-5 pb-3 pt-1 bg-[#FAFAFA] space-y-2 text-xs text-zinc-600 animate-fadeIn">
                    <div className="flex justify-between">
                      <span>Trip fares</span>
                      <span className="font-bold text-zinc-900 tabular-nums">
                        {formatNairaPlain(Math.round(currentPeriod.totalNaira * 0.92))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tips &amp; surge adjustments</span>
                      <span className="font-bold text-[#FF5722] tabular-nums">
                        {formatNairaPlain(currentPeriod.totalNaira - Math.round(currentPeriod.totalNaira * 0.92))}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Row 2: Expenses */}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    playKeypadChime();
                    setExpensesExpanded(!expensesExpanded);
                  }}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors cursor-pointer text-left"
                >
                  <span className="text-sm font-medium text-zinc-800">Expenses</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-zinc-950 tabular-nums">
                      {formatNairaPlain(currentPeriod.expensesNaira)}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-zinc-400 transition-transform ${
                        expensesExpanded ? 'rotate-180 text-[#FF5722]' : ''
                      }`}
                    />
                  </div>
                </button>
                {expensesExpanded && (
                  <div className="px-5 pb-3 pt-1 bg-[#FAFAFA] space-y-2 text-xs text-zinc-600 animate-fadeIn">
                    <div className="flex justify-between">
                      <span>Bayniks platform fee</span>
                      <span className="font-bold text-zinc-900 tabular-nums">
                        {formatNairaPlain(currentPeriod.expensesNaira)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Row 3: Net earnings */}
              <div className="px-5 py-4 flex items-center justify-between">
                <span className="text-sm font-bold text-zinc-900">Net earnings</span>
                <span className="text-sm font-black text-zinc-950 tabular-nums pr-6">
                  {formatNairaPlain(currentPeriod.netNaira)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* =====================================================================
           * VIEW B: BALANCES TAB (Exact match to Video Frames #4 - #16)
           * ===================================================================== */
          <div className="flex flex-col" data-testid="balances-tab-view">
            {/* Top Balance Summary Block */}
            <div className="px-5 pt-5 pb-5 space-y-3 bg-white">
              <div>
                <div className="text-xs font-medium text-zinc-500">Your balance</div>
                <div
                  className="text-3xl font-black text-zinc-950 tracking-tight mt-0.5 tabular-nums"
                  data-testid="balances-hero-amount"
                >
                  {formatNairaPlain(activeBalanceData.endingNaira)}
                </div>
                <div className="text-[11px] font-medium text-zinc-500 mt-1">
                  Next weekly payout: 7 November
                </div>
              </div>

              {/* Early Cashout Button (Black + Touch of Atomic Orange per User Directive) */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleCashoutClick}
                  data-testid="early-cashout-btn"
                  className={`px-7 py-2.5 rounded-full font-bold text-xs tracking-wide inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-xs ${
                    canCashout
                      ? 'bg-[#18181B] hover:bg-black text-white border border-[#18181B]'
                      : 'bg-[#18181B]/90 hover:bg-[#18181B] text-white border border-[#18181B]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#FF5722] shrink-0" />
                  <span>Early cashout</span>
                </button>
                <div className="text-[11px] font-medium text-zinc-500 mt-2.5">
                  Minimum balance to request Cashout is {formatNairaPlain(minCashoutNaira)}
                </div>
              </div>
            </div>

            {/* View Transaction History Row */}
            <div className="border-t border-zinc-100 bg-white">
              <button
                type="button"
                onClick={() => {
                  playKeypadChime();
                  if (onOpenHistory) onOpenHistory();
                }}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors cursor-pointer text-left"
              >
                <span className="text-sm font-bold text-zinc-900">
                  View transaction history
                </span>
                <ChevronRight size={18} className="text-zinc-400" />
              </button>
            </div>

            {/* Section Header: Balance movement */}
            <div className="bg-[#F4F5F7] border-y border-zinc-100 px-5 py-3 text-xs font-bold text-zinc-500">
              Balance movement
            </div>

            {/* Balance Reconciliation Ledger Rows */}
            <div className="divide-y divide-zinc-100 bg-white">
              <div className="px-5 py-4 flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-800">Starting balance</span>
                <span className="text-sm font-black text-zinc-950 tabular-nums">
                  {formatNairaPlain(activeBalanceData.startingNaira)}
                </span>
              </div>

              <div className="px-5 py-4 flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-800">Change in balance</span>
                <span className="text-sm font-black text-zinc-950 tabular-nums">
                  {formatNairaPlain(activeBalanceData.changeNaira)}
                </span>
              </div>

              <div className="px-5 py-4 flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-800">Ending balance</span>
                <span className="text-sm font-black text-zinc-950 tabular-nums">
                  {formatNairaPlain(activeBalanceData.endingNaira)}
                </span>
              </div>

              {/* Bayniks owes you (Expandable) */}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    playKeypadChime();
                    setOwesYouExpanded(!owesYouExpanded);
                  }}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors cursor-pointer text-left"
                >
                  <span className="text-sm font-medium text-zinc-800">Bayniks owes you</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-zinc-950 tabular-nums">
                      {formatNairaPlain(activeBalanceData.endingNaira)}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-zinc-400 transition-transform ${
                        owesYouExpanded ? 'rotate-180 text-[#FF5722]' : ''
                      }`}
                    />
                  </div>
                </button>
                {owesYouExpanded && (
                  <div className="px-5 pb-3 pt-1 bg-[#FAFAFA] space-y-2 text-xs text-zinc-600 animate-fadeIn">
                    <div className="flex justify-between">
                      <span>Pending bank transfer settlement</span>
                      <span className="font-bold text-[#FF5722] tabular-nums">
                        {formatNairaPlain(activeBalanceData.endingNaira)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
       * 4. BOTTOM TWO-TAB BAR (Earnings | Balances)
       * Exact placement matching Video Bottom Navigation with Black + Atomic Orange underline
       * ========================================================================= */}
      <div
        className="shrink-0 bg-white border-t border-zinc-200 grid grid-cols-2"
        data-testid="earnings-bottom-tabs"
      >
        <button
          type="button"
          onClick={() => {
            playKeypadChime();
            setActiveSegment('earnings');
          }}
          data-testid="tab-btn-earnings"
          className={`relative py-3.5 text-xs tracking-wide transition-colors cursor-pointer ${
            activeSegment === 'earnings'
              ? 'font-black text-zinc-950'
              : 'font-semibold text-zinc-400 hover:text-zinc-700'
          }`}
        >
          <span>Earnings</span>
          {activeSegment === 'earnings' && (
            <span className="absolute bottom-0 inset-x-0 h-[3px] bg-gradient-to-r from-[#18181B] via-[#18181B] to-[#FF5722]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            playKeypadChime();
            setActiveSegment('balances');
          }}
          data-testid="tab-btn-balances"
          className={`relative py-3.5 text-xs tracking-wide transition-colors cursor-pointer ${
            activeSegment === 'balances'
              ? 'font-black text-zinc-950'
              : 'font-semibold text-zinc-400 hover:text-zinc-700'
          }`}
        >
          <span>Balances</span>
          {activeSegment === 'balances' && (
            <span className="absolute bottom-0 inset-x-0 h-[3px] bg-gradient-to-r from-[#18181B] via-[#18181B] to-[#FF5722]" />
          )}
        </button>
      </div>

      {/* =========================================================================
       * 5. TIME RANGE BOTTOM SHEET MODAL (Daily | Weekly | Monthly)
       * Opened by tapping top-right Calendar icon (Frames #24 - #29)
       * ========================================================================= */}
      {isTimeRangeModalOpen && (
        <div
          className="absolute inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex flex-col justify-end animate-fadeIn"
          data-testid="time-range-modal"
          onClick={() => setIsTimeRangeModalOpen(false)}
        >
          <div
            className="bg-white rounded-t-2xl pb-6 pt-3 shadow-2xl animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-2.5 text-xs font-medium text-zinc-400">
              Time range
            </div>
            <div className="divide-y divide-zinc-100">
              {(['daily', 'weekly', 'monthly'] as const).map((mode) => {
                const isSelected = granularity === mode;
                const label = mode === 'daily' ? 'Daily' : mode === 'weekly' ? 'Weekly' : 'Monthly';
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleSelectGranularity(mode)}
                    data-testid={`time-range-option-${mode}`}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors cursor-pointer text-left"
                  >
                    <span className={`text-sm ${isSelected ? 'font-bold text-zinc-950' : 'font-medium text-zinc-800'}`}>
                      {label}
                    </span>
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors ${
                        isSelected ? 'border-[#18181B]' : 'border-zinc-400'
                      }`}
                    >
                      {isSelected && (
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FF5722]" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiderEarningsDualScreen;
