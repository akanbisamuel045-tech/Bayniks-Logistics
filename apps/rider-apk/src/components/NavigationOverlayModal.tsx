import React from 'react';
import { ArrowUp, Compass, Mic, Volume2, X } from 'lucide-react';
import { playKeypadChime } from '../utils/audioChimes';
import { useRiderStore } from '../store/riderStore';
import { BayniksLiveMap } from './map/BayniksLiveMap';

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
  const { currentLocation, currentBearing, activeOrder, tripPhase } = useRiderStore();

  if (!isOpen) return null;

  const isDropoff = tripPhase === 'in_transit' || tripPhase === 'at_dropoff';
  const targetCoord = isDropoff
    ? activeOrder?.stops?.[0]?.dropoffLocation || { lat: 6.5655, lng: 3.368 }
    : activeOrder?.pickup?.location || { lat: 6.5882, lng: 3.3489 };

  return (
    <div
      className="absolute inset-0 z-50 bg-[#18181B] text-white flex flex-col justify-between select-none animate-fadeIn"
      data-testid="navigation-overlay-modal"
    >
      {/* Top Turn-by-Turn Header in Black & Atomic Orange */}
      <div className="bg-[#18181B] px-4 py-3.5 shadow-lg flex items-center justify-between border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF5722] text-white flex items-center justify-center shadow-md">
            <ArrowUp size={22} strokeWidth={3} />
          </div>
          <div>
            <div className="text-[16px] font-bold tracking-tight">Head east</div>
            <div className="text-[12px] text-zinc-400 truncate max-w-[195px]">
              Towards {destinationAddress}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white transition-colors"
            aria-label="Sound"
          >
            <Volume2 size={17} />
          </button>
          <button
            type="button"
            className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white transition-colors"
            aria-label="Voice"
          >
            <Mic size={17} />
          </button>
        </div>
      </div>

      {/* Center Live Dual-Engine Map Canvas with Floating Bayniks Return Orb */}
      <div className="relative flex-1 bg-[#F4F4F5] overflow-hidden">
        <BayniksLiveMap
          riderLocation={currentLocation}
          riderBearing={currentBearing}
          dropoffLocation={targetCoord}
          dropoffLabel={destinationAddress.split(',')[0]}
          routeOrigin={currentLocation}
          routeTarget={targetCoord}
          zoom={16}
          pitch={52}
          testId="navigation-live-map"
        />

        {/* Floating Quick-Switch Bayniks Orb */}
        <button
          type="button"
          onClick={() => {
            playKeypadChime();
            onClose();
          }}
          className="absolute top-5 left-4 z-20 w-14 h-14 rounded-full bg-[#18181B] text-white font-bold text-xs flex flex-col items-center justify-center shadow-2xl border-2 border-[#FF5722] hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          aria-label="Return to Bayniks App"
        >
          <span className="text-[11.5px] leading-tight font-black text-[#FF5722]">Bayniks</span>
          <span className="text-[8px] uppercase tracking-wider text-zinc-300">Return</span>
        </button>

        {/* Compass */}
        <div className="absolute top-5 right-4 z-20 w-10 h-10 rounded-full bg-white shadow-md border border-zinc-200 text-[#18181B] flex items-center justify-center">
          <Compass size={19} className="text-[#FF5722]" />
        </div>
      </div>

      {/* Bottom Turn-by-Turn Card */}
      <div className="bg-white text-[#18181B] px-5 py-4 border-t border-zinc-200 flex items-center justify-between shadow-2xl">
        <div className="text-center pr-4 border-r border-zinc-200">
          <span className="block text-[22px] font-black leading-none">0</span>
          <span className="block text-[10px] font-semibold text-zinc-400 uppercase mt-1">
            km/h
          </span>
        </div>

        <div className="flex-1 px-4 text-center">
          <div className="text-[16px] font-bold flex items-center justify-center gap-1.5">
            <span>{etaMins} min</span>
            <span className="text-zinc-300">•</span>
            <span className="text-[#FF5722] font-bold">{distanceText}</span>
          </div>
          <div className="text-[12px] text-zinc-500 truncate max-w-[190px] mx-auto mt-0.5">
            {destinationAddress}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            playKeypadChime();
            onClose();
          }}
          className="w-10 h-10 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-[#18181B] transition-colors cursor-pointer"
          aria-label="Exit Navigation"
        >
          <X size={19} />
        </button>
      </div>
    </div>
  );
};

export default NavigationOverlayModal;
