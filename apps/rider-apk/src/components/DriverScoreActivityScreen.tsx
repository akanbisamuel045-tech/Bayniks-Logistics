import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { playKeypadChime } from '../utils/audioChimes';

export interface DriverScoreActivityScreenProps {
  onBack: () => void;
  initialTab?: 'score' | 'activity';
}

type ActivitySubTab = 'hours' | 'trips' | 'cancels';

interface DayActivityStat {
  day: string;
  tripsCompleted: number;
  tripsTotal: number;
  hoursLabel: string;
  hoursMinutes: number;
}

interface ActivityWeekData {
  id: string;
  label: string;
  totalCompletedTrips: number;
  totalIncomingTrips: number;
  totalHoursLabel: string;
  defaultSelectedDayIdx: number;
  days: DayActivityStat[];
}

const ACTIVITY_WEEKS: ActivityWeekData[] = [
  {
    id: 'w-0310',
    label: '03.10-09.10',
    totalCompletedTrips: 18,
    totalIncomingTrips: 21,
    totalHoursLabel: '22h 15m',
    defaultSelectedDayIdx: 5,
    days: [
      { day: 'Mon', tripsCompleted: 2, tripsTotal: 2, hoursLabel: '2h 40m', hoursMinutes: 160 },
      { day: 'Tue', tripsCompleted: 3, tripsTotal: 4, hoursLabel: '3h 55m', hoursMinutes: 235 },
      { day: 'Wed', tripsCompleted: 4, tripsTotal: 4, hoursLabel: '4h 10m', hoursMinutes: 250 },
      { day: 'Thu', tripsCompleted: 2, tripsTotal: 3, hoursLabel: '3h 05m', hoursMinutes: 185 },
      { day: 'Fri', tripsCompleted: 1, tripsTotal: 2, hoursLabel: '2h 15m', hoursMinutes: 135 },
      { day: 'Sat', tripsCompleted: 4, tripsTotal: 4, hoursLabel: '4h 30m', hoursMinutes: 270 },
      { day: 'Sun', tripsCompleted: 2, tripsTotal: 2, hoursLabel: '1h 40m', hoursMinutes: 100 },
    ],
  },
  {
    id: 'w-1010',
    label: '10.10-16.10',
    totalCompletedTrips: 25,
    totalIncomingTrips: 30,
    totalHoursLabel: '30h 31m',
    defaultSelectedDayIdx: 1,
    days: [
      { day: 'Mon', tripsCompleted: 0, tripsTotal: 0, hoursLabel: '0h 00m', hoursMinutes: 0 },
      { day: 'Tue', tripsCompleted: 9, tripsTotal: 12, hoursLabel: '9h 44m', hoursMinutes: 584 },
      { day: 'Wed', tripsCompleted: 2, tripsTotal: 2, hoursLabel: '2h 18m', hoursMinutes: 138 },
      { day: 'Thu', tripsCompleted: 5, tripsTotal: 6, hoursLabel: '5h 02m', hoursMinutes: 302 },
      { day: 'Fri', tripsCompleted: 9, tripsTotal: 10, hoursLabel: '7h 45m', hoursMinutes: 465 },
      { day: 'Sat', tripsCompleted: 0, tripsTotal: 0, hoursLabel: '5h 42m', hoursMinutes: 342 },
      { day: 'Sun', tripsCompleted: 0, tripsTotal: 0, hoursLabel: '0h 00m', hoursMinutes: 0 },
    ],
  },
  {
    id: 'w-1710',
    label: '17.10-23.10',
    totalCompletedTrips: 0,
    totalIncomingTrips: 0,
    totalHoursLabel: '0h 00m',
    defaultSelectedDayIdx: 3,
    days: [
      { day: 'Mon', tripsCompleted: 0, tripsTotal: 0, hoursLabel: '0h 00m', hoursMinutes: 0 },
      { day: 'Tue', tripsCompleted: 0, tripsTotal: 0, hoursLabel: '0h 00m', hoursMinutes: 0 },
      { day: 'Wed', tripsCompleted: 0, tripsTotal: 0, hoursLabel: '0h 00m', hoursMinutes: 0 },
      { day: 'Thu', tripsCompleted: 0, tripsTotal: 0, hoursLabel: '0h 00m', hoursMinutes: 0 },
      { day: 'Fri', tripsCompleted: 0, tripsTotal: 0, hoursLabel: '0h 00m', hoursMinutes: 0 },
      { day: 'Sat', tripsCompleted: 0, tripsTotal: 0, hoursLabel: '0h 00m', hoursMinutes: 0 },
      { day: 'Sun', tripsCompleted: 0, tripsTotal: 0, hoursLabel: '0h 00m', hoursMinutes: 0 },
    ],
  },
  {
    id: 'w-2410',
    label: '24.10-30.10',
    totalCompletedTrips: 9,
    totalIncomingTrips: 12,
    totalHoursLabel: '14h 20m',
    defaultSelectedDayIdx: 0,
    days: [
      { day: 'Mon', tripsCompleted: 9, tripsTotal: 12, hoursLabel: '14h 20m', hoursMinutes: 860 },
      { day: 'Tue', tripsCompleted: 0, tripsTotal: 0, hoursLabel: '0h 00m', hoursMinutes: 0 },
      { day: 'Wed', tripsCompleted: 0, tripsTotal: 0, hoursLabel: '0h 00m', hoursMinutes: 0 },
      { day: 'Thu', tripsCompleted: 0, tripsTotal: 0, hoursLabel: '0h 00m', hoursMinutes: 0 },
      { day: 'Fri', tripsCompleted: 0, tripsTotal: 0, hoursLabel: '0h 00m', hoursMinutes: 0 },
      { day: 'Sat', tripsCompleted: 0, tripsTotal: 0, hoursLabel: '0h 00m', hoursMinutes: 0 },
      { day: 'Sun', tripsCompleted: 0, tripsTotal: 0, hoursLabel: '0h 00m', hoursMinutes: 0 },
    ],
  },
  {
    id: 'w-current',
    label: 'Current week',
    totalCompletedTrips: 0,
    totalIncomingTrips: 0,
    totalHoursLabel: '0h 00m',
    defaultSelectedDayIdx: 3,
    days: [
      { day: 'Mon', tripsCompleted: 0, tripsTotal: 0, hoursLabel: '0h 00m', hoursMinutes: 0 },
      { day: 'Tue', tripsCompleted: 0, tripsTotal: 0, hoursLabel: '0h 00m', hoursMinutes: 0 },
      { day: 'Wed', tripsCompleted: 0, tripsTotal: 0, hoursLabel: '0h 00m', hoursMinutes: 0 },
      { day: 'Thu', tripsCompleted: 0, tripsTotal: 0, hoursLabel: '0h 00m', hoursMinutes: 0 },
      { day: 'Fri', tripsCompleted: 0, tripsTotal: 0, hoursLabel: '0h 00m', hoursMinutes: 0 },
      { day: 'Sat', tripsCompleted: 0, tripsTotal: 0, hoursLabel: '0h 00m', hoursMinutes: 0 },
      { day: 'Sun', tripsCompleted: 0, tripsTotal: 0, hoursLabel: '0h 00m', hoursMinutes: 0 },
    ],
  },
  {
    id: 'w-past3m',
    label: 'Past 3 months',
    totalCompletedTrips: 52,
    totalIncomingTrips: 63,
    totalHoursLabel: '67h 06m',
    defaultSelectedDayIdx: 4,
    days: [
      { day: 'Mon', tripsCompleted: 11, tripsTotal: 14, hoursLabel: '17h 00m', hoursMinutes: 1020 },
      { day: 'Tue', tripsCompleted: 12, tripsTotal: 16, hoursLabel: '13h 39m', hoursMinutes: 819 },
      { day: 'Wed', tripsCompleted: 6, tripsTotal: 6, hoursLabel: '6h 28m', hoursMinutes: 388 },
      { day: 'Thu', tripsCompleted: 7, tripsTotal: 9, hoursLabel: '8h 07m', hoursMinutes: 487 },
      { day: 'Fri', tripsCompleted: 10, tripsTotal: 12, hoursLabel: '10h 00m', hoursMinutes: 600 },
      { day: 'Sat', tripsCompleted: 4, tripsTotal: 4, hoursLabel: '10h 12m', hoursMinutes: 612 },
      { day: 'Sun', tripsCompleted: 2, tripsTotal: 2, hoursLabel: '1h 40m', hoursMinutes: 100 },
    ],
  },
];

const PRO_TIPS = [
  {
    id: 'call',
    title: 'Call before you cancel',
    body: 'Your passenger might be waiting for you around the corner.',
  },
  {
    id: 'pickup',
    title: 'Drive straight to pickup',
    body: 'After confirming a trip take the fastest route to pickup pin.',
  },
  {
    id: 'ready',
    title: 'Be ready to accept bookings',
    body: "Be online only when you're ready to confirm trips.",
  },
];

const CANCEL_REASONS = [
  { label: 'You cancelled', pct: 16, color: '#FF5722' },
  { label: 'You did not confirm', pct: 4, color: '#71717A' },
  { label: 'Passenger cancelled', pct: 80, color: '#F59E0B' },
  { label: 'Passenger did not show', pct: 0, color: '#18181B' },
];

export const DriverScoreActivityScreen: React.FC<DriverScoreActivityScreenProps> = ({
  onBack,
  initialTab = 'activity',
}) => {
  const [mainTab, setMainTab] = useState<'score' | 'activity'>(initialTab);
  const [activitySubTab, setActivitySubTab] = useState<ActivitySubTab>(() => {
    if (typeof window !== 'undefined') {
      const sub = new URLSearchParams(window.location.search).get('subtab');
      if (sub === 'hours' || sub === 'trips' || sub === 'cancels') return sub;
    }
    return 'trips';
  });

  const [selectedWeekId, setSelectedWeekId] = useState<string>('w-1010');
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(1);
  const [proTipIdx, setProTipIdx] = useState<number>(0);

  const weekStripRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    setMainTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    try {
      const activeEl = weekStripRef.current?.querySelector('[data-active-week="true"]') as HTMLElement | null;
      if (activeEl && typeof activeEl.scrollIntoView === 'function') {
        activeEl.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      }
    } catch {}
  }, [selectedWeekId, activitySubTab]);

  const currentWeek =
    ACTIVITY_WEEKS.find((w) => w.id === selectedWeekId) || ACTIVITY_WEEKS[1]!;

  const handleSelectWeek = (week: ActivityWeekData) => {
    playKeypadChime();
    setSelectedWeekId(week.id);
    setSelectedDayIdx(week.defaultSelectedDayIdx);
  };

  const maxTripsInWeek = Math.max(12, ...currentWeek.days.map((d) => d.tripsTotal));
  const maxMinutesInWeek = Math.max(600, ...currentWeek.days.map((d) => d.hoursMinutes));
  const selectedDayStat = currentWeek.days[selectedDayIdx] || currentWeek.days[0]!;
  const activeProTip = PRO_TIPS[proTipIdx] || PRO_TIPS[0]!;

  const handleTipSwipeEnd = (endX: number) => {
    if (touchStartXRef.current === null) return;
    const dx = endX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(dx) < 30) return;
    playKeypadChime();
    if (dx < 0) {
      setProTipIdx((prev) => (prev + 1) % PRO_TIPS.length);
    } else {
      setProTipIdx((prev) => (prev - 1 + PRO_TIPS.length) % PRO_TIPS.length);
    }
  };

  return (
    <div
      className="w-full h-full flex flex-col bg-[#F4F5F7] text-zinc-900 select-none overflow-hidden"
      data-testid="driver-score-activity-screen"
    >
      {/* =========================================================================
       * 1. TOP HEADER BAR
       * Pure Back + Centered "Activity" (matches Confirmation Rate video frames)
       * When opened as Driver Score, offers Driver Score vs Activity switch
       * ========================================================================= */}
      <header className="shrink-0 bg-white border-b border-zinc-100 px-4 h-14 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            playKeypadChime();
            onBack();
          }}
          className="w-10 h-10 -ml-2 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-900 transition-colors cursor-pointer"
          aria-label="Back"
          data-testid="activity-back-btn"
        >
          <ArrowLeft size={22} strokeWidth={2.2} />
        </button>

        {initialTab === 'score' ? (
          <div className="flex items-center bg-zinc-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                playKeypadChime();
                setMainTab('score');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                mainTab === 'score'
                  ? 'bg-[#18181B] text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Driver Score
            </button>
            <button
              type="button"
              onClick={() => {
                playKeypadChime();
                setMainTab('activity');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                mainTab === 'activity'
                  ? 'bg-[#18181B] text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Activity
            </button>
          </div>
        ) : (
          <h1 className="text-base font-black text-zinc-900 tracking-tight">Activity</h1>
        )}

        <div className="w-10" />
      </header>

      {/* =========================================================================
       * 2. MAIN CONTENT BODY
       * ========================================================================= */}
      {mainTab === 'score' ? (
        /* -----------------------------------------------------------------------
         * VIEW A: DRIVER SCORE GAUGE & DEDUCTION FACTORS (Black + Atomic Orange)
         * ----------------------------------------------------------------------- */
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F4F5F7]">
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 flex flex-col items-center text-center shadow-2xs">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#E4E4E7" strokeWidth="10" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#18181B"
                  strokeWidth="10"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 * (1 - 0.92)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-zinc-950 font-mono">92%</span>
                <span className="text-[11px] font-extrabold text-[#FF5722]">Great</span>
              </div>
            </div>

            <div className="text-sm font-bold text-zinc-800 mt-3">
              Rating: 4.92 ★ • Verified Courier
            </div>
            <div className="text-xs text-zinc-500 font-medium mt-1">
              Calculated dynamically based on your past 100 journeys
            </div>
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 space-y-3">
            <div className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
              What reduced my score
            </div>

            <div className="flex items-center justify-between text-sm py-1.5 border-b border-zinc-100">
              <div>
                <div className="font-bold text-zinc-800">Cancellation rate</div>
                <div className="text-[11px] text-zinc-400">Orders cancelled after accepting</div>
              </div>
              <span className="font-mono font-bold text-[#FF5722]">6%</span>
            </div>

            <div className="flex items-center justify-between text-sm py-1.5 border-b border-zinc-100">
              <div>
                <div className="font-bold text-zinc-800">Passenger cancelled before pickup</div>
                <div className="text-[11px] text-zinc-400">Arrived late to pickup location</div>
              </div>
              <span className="font-mono font-bold text-zinc-700">1%</span>
            </div>

            <div className="flex items-center justify-between text-sm py-1.5 border-b border-zinc-100">
              <div>
                <div className="font-bold text-zinc-800">Passenger feedback</div>
                <div className="text-[11px] text-zinc-400">Reports on vehicle cleanliness or route</div>
              </div>
              <span className="font-mono font-bold text-zinc-700">1%</span>
            </div>

            <div className="flex items-center justify-between text-sm py-1.5">
              <div>
                <div className="font-bold text-zinc-800">Conduct &amp; behaviour</div>
                <div className="text-[11px] text-zinc-400">Politeness and safety compliance</div>
              </div>
              <span className="font-mono font-bold text-zinc-700">1%</span>
            </div>
          </div>
        </div>
      ) : (
        /* -----------------------------------------------------------------------
         * VIEW B: ACTIVITY / CONFIRMATION RATE VIEW (Video-Exact Architecture)
         * ----------------------------------------------------------------------- */
        <div className="flex-1 flex flex-col overflow-hidden" data-testid="activity-main-view">
          {/* Period Carousel Strip (shown in HOURS and TRIPS tabs matching video) */}
          {activitySubTab !== 'cancels' && (
            <div
              ref={weekStripRef}
              className="shrink-0 bg-white border-b border-zinc-200/70 overflow-x-auto hide-scrollbar px-4 py-2.5 flex items-center gap-5"
              data-testid="activity-week-strip"
            >
              {ACTIVITY_WEEKS.map((week) => {
                const isSelected = week.id === currentWeek.id;
                return (
                  <button
                    key={week.id}
                    type="button"
                    data-active-week={isSelected ? 'true' : undefined}
                    onClick={() => handleSelectWeek(week)}
                    className={`shrink-0 text-xs px-1.5 py-0.5 whitespace-nowrap transition-colors cursor-pointer ${
                      isSelected
                        ? 'font-black text-zinc-950'
                        : 'font-semibold text-zinc-400 hover:text-zinc-700'
                    }`}
                  >
                    {week.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Scrollable Activity Canvas */}
          <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col justify-between">
            {/* TAB 1 & TAB 2: HOURS & TRIPS */}
            {(activitySubTab === 'trips' || activitySubTab === 'hours') && (
              <div className="flex-1 flex flex-col justify-between">
                {/* Centered White Callout Badge (9 / 12 | 25 / 30 | 0 / 0 | 30h 31m) */}
                <div className="flex justify-center pt-1">
                  <div
                    className="relative bg-white rounded-xl px-5 py-2.5 shadow-sm border border-zinc-200/70 text-2xl font-black text-zinc-950 tracking-tight tabular-nums"
                    data-testid="activity-summary-badge"
                  >
                    {activitySubTab === 'trips'
                      ? `${currentWeek.totalCompletedTrips} / ${currentWeek.totalIncomingTrips}`
                      : currentWeek.totalHoursLabel}
                  </div>
                </div>

                {/* 7-Day Bar Chart Area (Mon - Sun) */}
                <div className="w-full pt-8 pb-4">
                  <div className="h-44 flex items-end justify-between gap-2.5 border-b border-zinc-200 px-2">
                    {currentWeek.days.map((d, idx) => {
                      const isDaySelected = idx === selectedDayIdx;

                      if (activitySubTab === 'trips') {
                        const totalHeightPct =
                          d.tripsTotal > 0 ? Math.max(8, (d.tripsTotal / maxTripsInWeek) * 100) : 0;
                        const completedShare =
                          d.tripsTotal > 0 ? (d.tripsCompleted / d.tripsTotal) * 100 : 100;
                        const cancelledShare = 100 - completedShare;

                        return (
                          <button
                            key={d.day}
                            type="button"
                            onClick={() => {
                              playKeypadChime();
                              setSelectedDayIdx(idx);
                            }}
                            aria-label={`${d.day} ${d.tripsCompleted}/${d.tripsTotal}`}
                            className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer focus:outline-none"
                          >
                            <div
                              className={`w-full max-w-[30px] overflow-hidden flex flex-col transition-all duration-300 ${
                                isDaySelected ? 'ring-1 ring-[#18181B]/20' : ''
                              }`}
                              style={{ height: `${totalHeightPct}%` }}
                            >
                              {/* Top cap: uncompleted/cancelled trips (Atomic Orange) */}
                              {cancelledShare > 0 && d.tripsTotal > 0 && (
                                <div
                                  className={`w-full transition-colors ${
                                    isDaySelected ? 'bg-[#FF5722]' : 'bg-[#FF5722]/45'
                                  }`}
                                  style={{ height: `${cancelledShare}%` }}
                                />
                              )}
                              {/* Base segment: completed trips (Solid Black) */}
                              {d.tripsCompleted > 0 && (
                                <div
                                  className={`w-full transition-colors ${
                                    isDaySelected ? 'bg-[#18181B]' : 'bg-[#18181B]/35 group-hover:bg-[#18181B]/60'
                                  }`}
                                  style={{ height: `${completedShare}%` }}
                                />
                              )}
                            </div>
                          </button>
                        );
                      }

                      // HOURS bar rendering (Black + Atomic Orange active top accent)
                      const hoursHeightPct =
                        d.hoursMinutes > 0
                          ? Math.max(8, (d.hoursMinutes / maxMinutesInWeek) * 100)
                          : 0;

                      return (
                        <button
                          key={d.day}
                          type="button"
                          onClick={() => {
                            playKeypadChime();
                            setSelectedDayIdx(idx);
                          }}
                          aria-label={`${d.day} ${d.hoursLabel}`}
                          className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer focus:outline-none"
                        >
                          <div
                            className={`w-full max-w-[30px] flex flex-col overflow-hidden transition-all duration-300 ${
                              isDaySelected
                                ? 'bg-[#18181B] border-t-[3px] border-[#FF5722]'
                                : 'bg-[#18181B]/35 group-hover:bg-[#18181B]/60'
                            }`}
                            style={{ height: `${hoursHeightPct}%` }}
                          />
                        </button>
                      );
                    })}
                  </div>

                  {/* Day Labels Row */}
                  <div className="flex items-center justify-between gap-2.5 px-2 pt-2">
                    {currentWeek.days.map((d, idx) => {
                      const isDaySelected = idx === selectedDayIdx;
                      return (
                        <button
                          key={`lbl-${d.day}`}
                          type="button"
                          onClick={() => {
                            playKeypadChime();
                            setSelectedDayIdx(idx);
                          }}
                          className={`flex-1 text-center text-[11px] transition-colors cursor-pointer ${
                            isDaySelected ? 'font-bold text-zinc-950' : 'font-medium text-zinc-400'
                          }`}
                        >
                          {d.day}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Day Floating Callout directly under the chosen day (Video Frames #12, #17, #23) */}
                  <div className="grid grid-cols-7 gap-2.5 px-2 mt-2">
                    {currentWeek.days.map((d, idx) => (
                      <div key={`callout-${d.day}`} className="flex justify-center">
                        {idx === selectedDayIdx && (
                          <div
                            className="bg-white border border-zinc-200/80 shadow-xs rounded-lg px-2 py-1 text-[11px] font-black text-zinc-900 whitespace-nowrap tabular-nums"
                            data-testid="day-selected-callout"
                          >
                            {activitySubTab === 'trips'
                              ? `${selectedDayStat.tripsCompleted} / ${selectedDayStat.tripsTotal}`
                              : selectedDayStat.hoursLabel}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Helper Explanation Line */}
                <div className="text-center text-[11px] font-medium text-zinc-500 pb-1">
                  {activitySubTab === 'trips'
                    ? 'Number of finished trips from all incoming requests'
                    : 'Waiting and driving hours in Bayniks app'}
                </div>
              </div>
            )}

            {/* TAB 3: CANCELS (Reasons Card + Segmented Bottom Progress Bar + Swipeable Pro Tips) */}
            {activitySubTab === 'cancels' && (
              <div className="flex-1 flex flex-col justify-between gap-5" data-testid="activity-cancels-view">
                {/* Top Section: Reasons for past 50 cancelled trips */}
                <div className="space-y-3 pt-1">
                  <div className="text-center text-xs font-semibold text-zinc-600">
                    Reasons for past 50 cancelled trips
                  </div>

                  {/* White Card with Unified Bottom Segmented Bar */}
                  <div className="bg-white rounded-2xl shadow-sm border border-zinc-200/60 overflow-hidden">
                    <div className="p-5 space-y-4">
                      {CANCEL_REASONS.map((reason) => (
                        <div key={reason.label} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <span
                              className="w-3.5 h-3.5 rounded-[3px] shrink-0"
                              style={{ backgroundColor: reason.color }}
                            />
                            <span className="font-medium text-zinc-800">{reason.label}</span>
                          </div>
                          <span className="font-bold text-zinc-900 tabular-nums">{reason.pct}%</span>
                        </div>
                      ))}
                    </div>

                    {/* Unified Segmented Bar flush along bottom edge */}
                    <div className="h-1.5 w-full flex bg-zinc-100" data-testid="cancels-segmented-bar">
                      {CANCEL_REASONS.map((reason) =>
                        reason.pct > 0 ? (
                          <div
                            key={`seg-${reason.label}`}
                            style={{ width: `${reason.pct}%`, backgroundColor: reason.color }}
                          />
                        ) : null
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Section: Interactive Swipeable Pro Tips Carousel (3 tips + pagination dots) */}
                <div className="space-y-3 pb-1">
                  <div className="text-center text-xs font-semibold text-zinc-600">
                    Pro tips
                  </div>

                  <div
                    className="bg-white rounded-2xl shadow-sm border border-zinc-200/60 px-4 py-5 flex items-center justify-between gap-2 touch-pan-y"
                    data-testid="pro-tips-carousel"
                    onTouchStart={(e) => {
                      touchStartXRef.current = e.touches[0]?.clientX ?? null;
                    }}
                    onTouchEnd={(e) => {
                      const endX = e.changedTouches[0]?.clientX;
                      if (typeof endX === 'number') handleTipSwipeEnd(endX);
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        playKeypadChime();
                        setProTipIdx((prev) => (prev - 1 + PRO_TIPS.length) % PRO_TIPS.length);
                      }}
                      className="w-7 h-7 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-900 shrink-0 cursor-pointer"
                      aria-label="Previous tip"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    <div className="text-center space-y-1 flex-1 min-w-0">
                      <h4 className="text-sm font-black text-zinc-950 tracking-tight">
                        {activeProTip.title}
                      </h4>
                      <p className="text-xs text-zinc-500 leading-relaxed font-normal">
                        {activeProTip.body}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        playKeypadChime();
                        setProTipIdx((prev) => (prev + 1) % PRO_TIPS.length);
                      }}
                      className="w-7 h-7 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-900 shrink-0 cursor-pointer"
                      aria-label="Next tip"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  {/* 3 Pagination Dots */}
                  <div className="flex items-center justify-center gap-2 pt-0.5">
                    {PRO_TIPS.map((tip, idx) => {
                      const isActive = idx === proTipIdx;
                      return (
                        <button
                          key={tip.id}
                          type="button"
                          onClick={() => {
                            playKeypadChime();
                            setProTipIdx(idx);
                          }}
                          data-testid={`pro-tip-dot-${idx}`}
                          aria-label={`Tip ${idx + 1}: ${tip.title}`}
                          className={`rounded-full transition-all cursor-pointer ${
                            isActive
                              ? 'w-2.5 h-2.5 bg-[#18181B] ring-2 ring-[#FF5722]/60'
                              : 'w-2 h-2 bg-zinc-300 hover:bg-zinc-400'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* =====================================================================
           * FIXED BOTTOM THREE-TAB BAR (HOURS | TRIPS | CANCELS)
           * Black + Touch of Atomic Orange active indicator
           * ===================================================================== */}
          <div
            className="shrink-0 bg-white border-t border-zinc-200 grid grid-cols-3"
            data-testid="activity-bottom-tabs"
          >
            {(['hours', 'trips', 'cancels'] as const).map((sub) => {
              const isSelected = activitySubTab === sub;
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => {
                    playKeypadChime();
                    setActivitySubTab(sub);
                  }}
                  data-testid={`activity-tab-${sub}`}
                  className={`relative py-3.5 text-xs uppercase tracking-wider transition-colors cursor-pointer ${
                    isSelected
                      ? 'font-black text-zinc-950'
                      : 'font-bold text-zinc-400 hover:text-zinc-700'
                  }`}
                >
                  <span>{sub}</span>
                  {isSelected && (
                    <span className="absolute bottom-0 inset-x-0 h-[3px] bg-gradient-to-r from-[#18181B] via-[#18181B] to-[#FF5722]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverScoreActivityScreen;
