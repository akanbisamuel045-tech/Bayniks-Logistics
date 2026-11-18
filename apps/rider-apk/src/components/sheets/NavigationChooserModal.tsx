import React from 'react';
import { X, Navigation, Compass, MapPin, ExternalLink, ShieldAlert } from 'lucide-react';
import { openGoogleMapsNavigation, openWazeNavigation, NavigationTarget } from '../../utils/navigationDeepLink';
import { playKeypadChime } from '../../utils/audioChimes';

export interface NavigationChooserModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: NavigationTarget | null;
  targetType: 'pickup' | 'dropoff';
}

export const NavigationChooserModal: React.FC<NavigationChooserModalProps> = ({
  isOpen,
  onClose,
  target,
  targetType,
}) => {
  if (!isOpen || !target) return null;

  const handleLaunchGoogleMaps = () => {
    playKeypadChime();
    openGoogleMapsNavigation(target.lat, target.lng, target.address);
    onClose();
  };

  const handleLaunchWaze = () => {
    playKeypadChime();
    openWazeNavigation(target.lat, target.lng);
    onClose();
  };

  const title = targetType === 'pickup' ? 'Navigate to Pickup Depot' : 'Navigate to Drop-Off';

  return (
    <div
      className="absolute inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-3 bg-black/60 backdrop-blur-sm animate-fadeIn"
      data-testid="navigation-chooser-modal"
    >
      <div className="relative w-full max-w-[390px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-neutral-200">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#1E1C1A] to-[#2B2724] px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF5722] flex items-center justify-center text-white shadow-md">
              <Navigation size={16} strokeWidth={2.4} />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight">{title}</h2>
              <p className="text-[11px] text-zinc-300">Turn-by-turn motorcycle guidance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label="Close Navigation Chooser"
          >
            <X size={15} />
          </button>
        </div>

        {/* Destination Card Preview */}
        <div className="p-4 space-y-3.5">
          <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs">
            <div className="flex items-start gap-2">
              <MapPin size={16} className="text-[#FF5722] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="font-extrabold text-neutral-900 truncate">
                  {target.address || 'Victoria Island Towers, Plot 4, Lagos'}
                </div>
                {target.landmark && (
                  <div className="text-[11px] text-neutral-500 mt-0.5 font-medium">
                    Landmark: {target.landmark}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Choices */}
          <div className="space-y-2">
            {/* 1. Google Maps (2-Wheeler Mode) */}
            <button
              type="button"
              onClick={handleLaunchGoogleMaps}
              className="w-full p-3.5 rounded-2xl bg-neutral-900 hover:bg-black text-white font-extrabold text-xs flex items-center justify-between transition-all shadow-md active:scale-[0.98]"
              data-testid="btn-nav-google-maps"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[#FF5722]">
                  <Compass size={18} strokeWidth={2.4} />
                </div>
                <div className="text-left">
                  <div className="font-black text-white flex items-center gap-1.5">
                    <span>Google Maps</span>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-[#FF5722] text-white rounded-full">
                      Two-Wheeler Mode
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-300">Fastest motorcycle route & bridge bypasses</div>
                </div>
              </div>
              <ExternalLink size={15} className="text-zinc-400" />
            </button>

            {/* 2. Waze Live Traffic */}
            <button
              type="button"
              onClick={handleLaunchWaze}
              className="w-full p-3.5 rounded-2xl bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-200 font-extrabold text-xs flex items-center justify-between transition-all shadow-sm active:scale-[0.98]"
              data-testid="btn-nav-waze"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                  <Navigation size={18} strokeWidth={2.4} />
                </div>
                <div className="text-left">
                  <div className="font-black text-neutral-900">Waze Navigation</div>
                  <div className="text-[10px] text-neutral-500">Live police traps, gridlock & accident alerts</div>
                </div>
              </div>
              <ExternalLink size={15} className="text-neutral-400" />
            </button>
          </div>

          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-neutral-500 hover:text-neutral-800"
            >
              Keep In-App Map
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
