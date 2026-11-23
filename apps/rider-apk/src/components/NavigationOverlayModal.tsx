import React from 'react';
import {
  ArrowUp,
  Volume2,
  Mic,
  Compass,
  X,
  Navigation,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { playKeypadChime } from '../utils/audioChimes';

export interface NavigationOverlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  destinationAddress?: string;
  distanceText?: string;
  etaMins?: number;
}

export const NavigationOverlayModal: React.FC<NavigationOverlayModalProps> = ({
  isOpen,
  onClose,
  destinationAddress = '78 Airport Road, Warri 330102',
  distanceText = '170 m',
  etaMins = 1,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1F2937] text-white flex flex-col justify-between select-none animate-fadeIn"
      data-testid="navigation-overlay-modal"
    >
      {/* Top Green Turn-by-Turn Header (Google Maps Style) */}
      <div className="bg-[#15803D] px-4 py-3.5 shadow-lg flex items-center justify-between border-b border-emerald-600/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white text-[#15803D] flex items-center justify-center font-black shadow-md">
            <ArrowUp size={24} strokeWidth={3} />
          </div>
          <div>
            <div className="text-base font-black tracking-tight flex items-center gap-1.5">
              <span>Head east</span>
            </div>
            <div className="text-xs text-emerald-100 font-medium truncate max-w-[200px]">
              Towards {destinationAddress}
            </div>
          </div>
        </div>

        {/* Action icons: Sound, Search, Mic */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="w-9 h-9 rounded-full bg-emerald-800/60 hover:bg-emerald-850 flex items-center justify-center text-white transition-colors"
            aria-label="Sound"
          >
            <Volume2 size={18} />
          </button>
          <button
            type="button"
            className="w-9 h-9 rounded-full bg-emerald-800/60 hover:bg-emerald-850 flex items-center justify-center text-white transition-colors"
            aria-label="Voice"
          >
            <Mic size={18} />
          </button>
        </div>
      </div>

      {/* Center Simulated Vector Road Canvas with Floating Bolt Bubble */}
      <div className="relative flex-1 bg-[#242F3E] overflow-hidden flex items-center justify-center">
        {/* Simulated Road Grid SVG */}
        <svg className="absolute inset-0 w-full h-full opacity-60 pointer-events-none">
          <path
            d="M 100 0 L 100 800 M 250 0 L 250 800 M 0 250 L 500 250 M 0 450 L 500 450"
            stroke="#374151"
            strokeWidth="8"
          />
          {/* Active Navigation Polyline (Blue) */}
          <path
            d="M 180 550 L 180 320 L 280 320"
            stroke="#3B82F6"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>

        {/* Vehicle Arrow Marker */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-[#3B82F6] text-white flex items-center justify-center shadow-2xl border-4 border-white animate-pulse">
            <Navigation size={22} className="rotate-45" fill="currentColor" />
          </div>
          <div className="text-[11px] font-black bg-black/70 px-2 py-0.5 rounded-full mt-1.5 backdrop-blur-sm">
            Current Location
          </div>
        </div>

        {/* Floating Quick-Switch "Bolt" Bubble (Frame #44-#46) */}
        <button
          type="button"
          onClick={() => {
            playKeypadChime();
            onClose();
          }}
          className="absolute top-6 left-4 z-20 w-14 h-14 rounded-full bg-white text-[#00A859] font-black text-xs flex flex-col items-center justify-center shadow-2xl border-2 border-[#00A859] hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          aria-label="Return to Bolt App"
        >
          <span className="text-[14px] leading-tight font-black tracking-tight">Bolt</span>
          <span className="text-[8px] uppercase tracking-wider font-bold text-zinc-500">Return</span>
        </button>

        {/* Compass Needle */}
        <div className="absolute top-6 right-4 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center">
          <Compass size={20} className="text-red-400" />
        </div>
      </div>

      {/* Bottom Turn-by-Turn Card with Speedometer & ETA */}
      <div className="bg-[#111827] px-5 py-4 border-t border-gray-800 flex items-center justify-between shadow-2xl">
        {/* Speedometer */}
        <div className="text-center pr-4 border-r border-gray-800">
          <span className="block text-2xl font-black text-white">0</span>
          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            km/h
          </span>
        </div>

        {/* ETA & Distance */}
        <div className="flex-1 px-4 text-center">
          <div className="text-lg font-black text-white flex items-center justify-center gap-1.5">
            <span>{etaMins} min</span>
            <span className="text-gray-500">•</span>
            <span className="text-emerald-400 font-bold">{distanceText}</span>
          </div>
          <div className="text-xs text-gray-400 truncate max-w-[190px] mx-auto mt-0.5">
            {destinationAddress}
          </div>
        </div>

        {/* Close / Return Button */}
        <button
          type="button"
          onClick={() => {
            playKeypadChime();
            onClose();
          }}
          className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-300 hover:text-white transition-colors cursor-pointer"
          aria-label="Exit Navigation"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

export default NavigationOverlayModal;

