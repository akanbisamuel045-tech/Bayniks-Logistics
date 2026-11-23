import React, { useState } from 'react';
import {
  ArrowLeft,
  Tag,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Info,
  X,
} from 'lucide-react';
import { playKeypadChime } from '../utils/audioChimes';

export interface CampaignItem {
  id: string;
  title: string;
  bonusAmountKobo: number;
  timeWindow: string;
  baseCity: string;
  tag: 'Rush' | 'Weekend' | 'Standard';
  targetTrips: number;
  completedTrips: number;
  targetOnlineHours: number;
  completedOnlineHours: number;
  minConfirmationRate: number;
  currentConfirmationRate: number;
  minCompletionRate: number;
  currentCompletionRate: number;
}

export interface RiderCampaignsScreenProps {
  onBack: () => void;
}

export const RiderCampaignsScreen: React.FC<RiderCampaignsScreenProps> = ({ onBack }) => {
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignItem | null>(null);

  const campaigns: CampaignItem[] = [
    {
      id: 'morning_rush_1500',
      title: '₦1500 MORNING BONUS',
      bonusAmountKobo: 150000,
      timeWindow: 'Today, 07:00-11:59',
      baseCity: 'Lagos',
      tag: 'Rush',
      targetTrips: 6,
      completedTrips: 0,
      targetOnlineHours: 4,
      completedOnlineHours: 0,
      minConfirmationRate: 85,
      currentConfirmationRate: 100,
      minCompletionRate: 85,
      currentCompletionRate: 100,
    },
    {
      id: 'all_day_1500',
      title: '₦1500 ALL DAY BONUS',
      bonusAmountKobo: 150000,
      timeWindow: 'Today, 07:00-21:59',
      baseCity: 'Lagos',
      tag: 'Rush',
      targetTrips: 6,
      completedTrips: 0,
      targetOnlineHours: 6,
      completedOnlineHours: 0,
      minConfirmationRate: 85,
      currentConfirmationRate: 100,
      minCompletionRate: 85,
      currentCompletionRate: 100,
    },
    {
      id: 'weekend_4200',
      title: '₦4200 WEEKEND BONUS',
      bonusAmountKobo: 420000,
      timeWindow: 'Fri 00:00 - Sun 23:59',
      baseCity: 'Lagos',
      tag: 'Weekend',
      targetTrips: 21,
      completedTrips: 0,
      targetOnlineHours: 21,
      completedOnlineHours: 0,
      minConfirmationRate: 85,
      currentConfirmationRate: 100,
      minCompletionRate: 85,
      currentCompletionRate: 100,
    },
  ];

  return (
    <div
      className="w-full h-full flex flex-col bg-white text-zinc-900 select-none overflow-hidden"
      data-testid="rider-campaigns-screen"
    >
      {/* Top Header */}
      <div className="shrink-0 bg-white border-b border-zinc-200 px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-700 transition-colors cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft size={20} strokeWidth={2.2} />
        </button>
        <h2 className="text-base font-extrabold text-zinc-900">Campaigns</h2>
        <div className="w-9" />
      </div>

      {/* Campaigns List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        <div className="text-xs font-semibold text-zinc-500 mb-2">
          Complete trips and hours to unlock guaranteed cash bonuses
        </div>

        {campaigns.map((camp) => (
          <div
            key={camp.id}
            role="button"
            tabIndex={0}
            onClick={() => {
              playKeypadChime();
              setSelectedCampaign(camp);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelectedCampaign(camp);
              }
            }}
            className="w-full bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-zinc-200/80 rounded-2xl p-4 transition-all cursor-pointer shadow-2xs active:scale-[0.99]"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {camp.tag}
                  </span>
                  <span className="text-xs font-semibold text-zinc-500">
                    {camp.timeWindow}
                  </span>
                </div>
                <h3 className="text-base font-black text-zinc-900 mt-2">
                  {camp.title}
                </h3>
              </div>
              <ChevronRight size={18} className="text-zinc-400 mt-1" />
            </div>

            <div className="text-xs text-zinc-600 mt-2 font-medium">
              Complete {camp.targetTrips} trips, accept {camp.minConfirmationRate}% and complete {camp.minCompletionRate}% of orders.
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-zinc-500 mt-3 pt-3 border-t border-zinc-200/60">
              <span>Trips: {camp.completedTrips}/{camp.targetTrips}</span>
              <span>Hours: {camp.completedOnlineHours}h/{camp.targetOnlineHours}h</span>
              <span className="text-purple-600 font-extrabold">View conditions</span>
            </div>
          </div>
        ))}
      </div>

      {/* =========================================================================
       * CAMPAIGN DETAIL MODAL (Matching Frames #9 - #11 in Video)
       * ========================================================================= */}
      {selectedCampaign && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl max-h-[85%] flex flex-col overflow-hidden animate-slideUp">
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                Bonus Criteria
              </span>
              <button
                type="button"
                onClick={() => setSelectedCampaign(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                  <Tag size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-zinc-900">
                    {selectedCampaign.title}
                  </h3>
                  <div className="text-xs text-zinc-500 font-medium">
                    {selectedCampaign.timeWindow} • Base: {selectedCampaign.baseCity}
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200/70 rounded-2xl p-3.5 text-xs text-purple-900 font-bold">
                Bonus ₦{(selectedCampaign.bonusAmountKobo / 100).toLocaleString('en-NG')} for {selectedCampaign.targetTrips} completed trips
              </div>

              {/* Progress Checklist */}
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-zinc-700">
                    <span>Trips completed</span>
                    <span>{selectedCampaign.completedTrips}/{selectedCampaign.targetTrips}</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full"
                      style={{
                        width: `${Math.min(100, (selectedCampaign.completedTrips / selectedCampaign.targetTrips) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-zinc-700">
                    <span>Online hours</span>
                    <span>{selectedCampaign.completedOnlineHours}h/{selectedCampaign.targetOnlineHours}h</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full"
                      style={{
                        width: `${Math.min(100, (selectedCampaign.completedOnlineHours / selectedCampaign.targetOnlineHours) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200/60 rounded-xl text-xs font-bold text-zinc-800">
                  <span className="flex items-center gap-1.5">
                    <span>Confirmation rate</span>
                    <Info size={13} className="text-zinc-400" />
                  </span>
                  <span className="text-emerald-600">
                    {selectedCampaign.currentConfirmationRate}% (min {selectedCampaign.minConfirmationRate}%)
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200/60 rounded-xl text-xs font-bold text-zinc-800">
                  <span className="flex items-center gap-1.5">
                    <span>Completion rate</span>
                    <Info size={13} className="text-zinc-400" />
                  </span>
                  <span className="text-emerald-600">
                    {selectedCampaign.currentCompletionRate}% (min {selectedCampaign.minCompletionRate}%)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCampaign(null)}
                className="w-full py-3.5 rounded-2xl bg-zinc-950 hover:bg-black text-white font-extrabold text-sm transition-colors cursor-pointer mt-2"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiderCampaignsScreen;

