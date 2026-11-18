import React from 'react';
import { MapPin, CheckCircle2, ChevronRight } from 'lucide-react';
import { playMissionAcceptChime } from '../utils/audioChimes';

export interface ProximityArrivalBannerProps {
  isOpen: boolean;
  targetName: string;
  distanceFormatted: string;
  onConfirmArrival: () => void;
  onDismiss?: () => void;
}

export const ProximityArrivalBanner: React.FC<ProximityArrivalBannerProps> = ({
  isOpen,
  targetName,
  distanceFormatted,
  onConfirmArrival,
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    playMissionAcceptChime();
    onConfirmArrival();
  };

  return (
    <div
      className="p-3 bg-emerald-50 border-2 border-emerald-500 rounded-2xl shadow-lg flex items-center justify-between gap-3 animate-bounce"
      data-testid="proximity-arrival-banner"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
          <MapPin size={16} strokeWidth={2.4} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
              Within {distanceFormatted} of Destination
            </span>
          </div>
          <div className="text-xs font-black text-neutral-900 truncate">
            {targetName}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleConfirm}
        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shrink-0 flex items-center gap-1 shadow-sm active:scale-95 transition-all"
        data-testid="btn-proximity-confirm-arrival"
      >
        <CheckCircle2 size={13} strokeWidth={2.4} />
        <span>I'm Here</span>
      </button>
    </div>
  );
};

