import React from 'react';
import {
  X,
  Home,
  Star,
  MapPin,
  Plus,
  Info,
  ChevronRight,
} from 'lucide-react';
import { playKeypadChime } from '../../utils/audioChimes';
import { useRiderStore } from '../../store/riderStore';

export interface DestinationModeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDestination: (destName: string) => void;
}

export const DestinationModeSheet: React.FC<DestinationModeSheetProps> = ({
  isOpen,
  onClose,
  onSelectDestination,
}) => {
  const { showToast } = useRiderStore();

  if (!isOpen) return null;

  const destinations = [
    { id: 'home', label: 'Home', address: 'Bendel Estate, Warri', icon: Home },
    { id: 'fav', label: 'Favourite', address: 'Jakpa Road, Effurun', icon: Star },
    { id: 'shell', label: 'Shell Guest House', address: 'Edjeba, Warri', icon: MapPin },
  ];

  const handleSelect = (dest: { label: string; address: string }) => {
    playKeypadChime();
    onSelectDestination(dest.address);
    showToast(`Destination set: ${dest.address}. Matching homeward orders only.`);
    onClose();
  };

  return (
    <div
      className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col justify-end select-none"
      data-testid="destination-mode-sheet"
    >
      <div className="bg-white rounded-t-3xl max-h-[80%] flex flex-col overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-zinc-900">
              Trips towards destination
            </h3>
            <div className="text-xs text-zinc-500 font-semibold mt-0.5">
              2 of 2 remaining today • <span className="text-emerald-700 underline cursor-pointer">Read more</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* List of Destinations */}
        <div className="p-4 space-y-2.5">
          {destinations.map((dest) => {
            const Icon = dest.icon;
            return (
              <button
                key={dest.id}
                type="button"
                onClick={() => handleSelect(dest)}
                className="w-full p-3.5 rounded-2xl bg-[#F8FAFC] hover:bg-zinc-100 border border-zinc-200/80 flex items-center justify-between text-left transition cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-700 shrink-0">
                    <Icon size={19} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-zinc-900 truncate">
                      {dest.label}
                    </div>
                    <div className="text-[11px] text-zinc-500 truncate font-medium">
                      {dest.address}
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-zinc-400 shrink-0" />
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              playKeypadChime();
              showToast('Type address to set custom corridor destination...');
            }}
            className="w-full py-3.5 border-2 border-dashed border-zinc-300 hover:border-zinc-400 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-zinc-700 transition cursor-pointer"
          >
            <Plus size={16} />
            <span>Set destination</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DestinationModeSheet;

