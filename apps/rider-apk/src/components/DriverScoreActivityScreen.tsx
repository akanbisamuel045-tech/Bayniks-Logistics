import React, { useState } from 'react';
import {
  ArrowLeft,
  Shield,
  Clock,
  Car,
  AlertTriangle,
  Info,
  ChevronRight,
  Sparkles,
  PhoneCall,
  CheckCircle2,
} from 'lucide-react';
import { playKeypadChime } from '../utils/audioChimes';

export interface DriverScoreActivityScreenProps {
  onBack: () => void;
  initialTab?: 'score' | 'activity';
}

export const DriverScoreActivityScreen: React.FC<DriverScoreActivityScreenProps> = ({
  onBack,
  initialTab = 'score',
}) => {
  const [mainTab, setMainTab] = useState<'score' | 'activity'>(initialTab);
  const [activitySubTab, setActivitySubTab] = useState<'hours' | 'trips' | 'cancels'>('cancels');

  return (
    <div
      className="w-full h-full flex flex-col bg-white text-zinc-900 select-none overflow-hidden"
      data-testid="driver-score-activity-screen"
    >
      {/* Top Header */}
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

          {/* Segmented Controller: Driver Score vs Activity */}
          <div className="flex items-center bg-zinc-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                playKeypadChime();
                setMainTab('score');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                mainTab === 'score'
                  ? 'bg-white text-zinc-950 shadow-xs'
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
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Activity
            </button>
          </div>

          <div className="w-9" />
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mainTab === 'score' ? (
          /* =====================================================================
           * VIEW A: DRIVER SCORE & REASONS
           * Matches Bolt Driver App Frames #19 - #20
           * ===================================================================== */
          <div className="space-y-4">
            {/* Circular Gauge Card */}
            <div className="bg-[#F8FAFC] border border-zinc-200/80 rounded-3xl p-6 flex flex-col items-center text-center shadow-2xs">
              {/* Circular Gauge */}
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth="10"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="10"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 * (1 - 0.92)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-zinc-950 font-mono">92%</span>
                  <span className="text-[11px] font-bold text-emerald-600">Great</span>
                </div>
              </div>

              <div className="text-sm font-bold text-zinc-800 mt-3">
                Rating: 4.92 ★ • Level 3 Tier
              </div>
              <div className="text-xs text-zinc-500 font-medium mt-1">
                Calculated dynamically based on your past 100 journeys
              </div>
            </div>

            {/* Score Deduction Breakdown */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-3">
              <div className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                What reduced my score
              </div>

              <div className="flex items-center justify-between text-sm py-1.5 border-b border-zinc-100">
                <div>
                  <div className="font-bold text-zinc-800">Cancellation rate</div>
                  <div className="text-[11px] text-zinc-400">Orders cancelled after accepting</div>
                </div>
                <span className="font-mono font-bold text-red-600">6%</span>
              </div>

              <div className="flex items-center justify-between text-sm py-1.5 border-b border-zinc-100">
                <div>
                  <div className="font-bold text-zinc-800">Passenger cancelled before pickup</div>
                  <div className="text-[11px] text-zinc-400">Arrived late to pickup location</div>
                </div>
                <span className="font-mono font-bold text-zinc-600">1%</span>
              </div>

              <div className="flex items-center justify-between text-sm py-1.5 border-b border-zinc-100">
                <div>
                  <div className="font-bold text-zinc-800">Passenger feedback</div>
                  <div className="text-[11px] text-zinc-400">Reports on vehicle cleanliness or route</div>
                </div>
                <span className="font-mono font-bold text-zinc-600">1%</span>
              </div>

              <div className="flex items-center justify-between text-sm py-1.5">
                <div>
                  <div className="font-bold text-zinc-800">Conduct & behaviour</div>
                  <div className="text-[11px] text-zinc-400">Politeness and safety compliance</div>
                </div>
                <span className="font-mono font-bold text-zinc-600">1%</span>
              </div>
            </div>
          </div>
        ) : (
          /* =====================================================================
           * VIEW B: ACTIVITY TELEMETRY (HOURS | TRIPS | CANCELS)
           * Matches Bolt Driver App Frames #21 - #26
           * ===================================================================== */
          <div className="space-y-4">
            {/* Sub-tabs: HOURS | TRIPS | CANCELS */}
            <div className="flex items-center justify-around bg-zinc-100 p-1 rounded-xl">
              {(['hours', 'trips', 'cancels'] as const).map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => {
                    playKeypadChime();
                    setActivitySubTab(sub);
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activitySubTab === sub
                      ? 'bg-white text-zinc-950 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>

            {activitySubTab === 'hours' && (
              <div className="bg-[#F8FAFC] border border-zinc-200/80 rounded-2xl p-5 space-y-3">
                <div className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                  Weekly Online Time
                </div>
                <div className="text-3xl font-black text-zinc-950 font-mono">30h 31m</div>
                <div className="text-xs font-medium text-zinc-500">
                  Daily average: 4h 21m • Active hours this week
                </div>
              </div>
            )}

            {activitySubTab === 'trips' && (
              <div className="bg-[#F8FAFC] border border-zinc-200/80 rounded-2xl p-5 space-y-3">
                <div className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                  Weekly Completed Trips
                </div>
                <div className="text-3xl font-black text-zinc-950 font-mono">9 / 12</div>
                <div className="text-xs font-medium text-zinc-500">
                  75% delivery completion target achieved
                </div>
              </div>
            )}

            {activitySubTab === 'cancels' && (
              <div className="space-y-4">
                {/* Cancellation Distribution Card */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-3.5 shadow-2xs">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                    Reasons for past 50 cancelled trips
                  </div>

                  {/* Red: You cancelled */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-zinc-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        <span>You cancelled</span>
                      </span>
                      <span className="font-mono text-zinc-900">16%</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: '16%' }} />
                    </div>
                  </div>

                  {/* Yellow: You did not confirm */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-zinc-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span>You did not confirm</span>
                      </span>
                      <span className="font-mono text-zinc-900">4%</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: '4%' }} />
                    </div>
                  </div>

                  {/* Blue: Passenger cancelled */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-zinc-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                        <span>Passenger cancelled</span>
                      </span>
                      <span className="font-mono text-zinc-900">80%</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500 rounded-full" style={{ width: '80%' }} />
                    </div>
                  </div>

                  {/* Purple: Passenger did not show */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-zinc-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                        <span>Passenger did not show</span>
                      </span>
                      <span className="font-mono text-zinc-900">0%</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: '0%' }} />
                    </div>
                  </div>
                </div>

                {/* Pro Tips Cards matching Bolt */}
                <div className="bg-[#EFF6FF] border border-blue-200/80 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-blue-900 font-extrabold text-xs uppercase tracking-wider">
                    <Sparkles size={15} />
                    <span>Pro Tips</span>
                  </div>
                  <div className="text-xs text-blue-950 font-bold">
                    Call before you cancel
                  </div>
                  <div className="text-xs text-blue-800/90 leading-relaxed font-medium">
                    Your customer or sender might be right around the corner. Give them a quick call before cancelling.
                  </div>
                </div>

                <div className="bg-[#F8FAFC] border border-zinc-200 rounded-2xl p-4 space-y-2">
                  <div className="text-xs text-zinc-900 font-bold">
                    Be ready to accept orders
                  </div>
                  <div className="text-xs text-zinc-600 leading-relaxed font-medium">
                    Only remain online when you are ready to confirm jobs immediately to keep your acceptance rate high.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverScoreActivityScreen;

