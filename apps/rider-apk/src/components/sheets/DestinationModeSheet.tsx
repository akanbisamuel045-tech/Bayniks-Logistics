import React, { useState } from 'react';
import {
  X,
  Home,
  Star,
  MapPin,
  Plus,
  Pencil,
  Check,
  ChevronRight,
} from 'lucide-react';
import { playKeypadChime } from '../../utils/audioChimes';
import { useRiderStore } from '../../store/riderStore';
import { FAVOURITE_SAVED_PLACE, HOME_SAVED_PLACE } from '../../utils/locationSearch';

export interface DestinationModeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDestination: (destName: string) => void;
  onOpenSearch?: () => void;
}

export const DestinationModeSheet: React.FC<DestinationModeSheetProps> = ({
  isOpen,
  onClose,
  onSelectDestination,
  onOpenSearch,
}) => {
  const { showToast, savedAddresses, updateSavedAddress } = useRiderStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftAddress, setDraftAddress] = useState('');

  if (!isOpen) return null;

  const homeSaved = savedAddresses.find((a) => a.id === 'home') || {
    id: HOME_SAVED_PLACE.id,
    label: HOME_SAVED_PLACE.label,
    address: HOME_SAVED_PLACE.address,
    lat: HOME_SAVED_PLACE.coords.lat,
    lng: HOME_SAVED_PLACE.coords.lng,
  };
  const favSaved = savedAddresses.find((a) => a.id === 'fav') || {
    id: FAVOURITE_SAVED_PLACE.id,
    label: FAVOURITE_SAVED_PLACE.label,
    address: FAVOURITE_SAVED_PLACE.address,
    lat: FAVOURITE_SAVED_PLACE.coords.lat,
    lng: FAVOURITE_SAVED_PLACE.coords.lng,
  };

  const destinations = [
    { ...homeSaved, icon: Home },
    { ...favSaved, icon: Star },
    {
      id: 'vi',
      label: 'Victoria Island',
      address: 'Victoria Island Towers, Lagos',
      lat: 6.4281,
      lng: 3.4219,
      icon: MapPin,
    },
  ];

  const handleSelect = (dest: { label: string; address: string }) => {
    playKeypadChime();
    onSelectDestination(dest.address);
    showToast(`Destination set: ${dest.address}. Matching homeward orders only.`);
    onClose();
  };

  const handleSaveAddressEdit = async (dest: { id: string; label: string; lat: number; lng: number }) => {
    const trimmed = draftAddress.trim();
    if (!trimmed) return;
    playKeypadChime();
    await updateSavedAddress({
      id: dest.id,
      label: dest.label,
      address: trimmed,
      lat: dest.lat,
      lng: dest.lng,
    });
    setEditingId(null);
    showToast(`${dest.label} address saved`);
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
              2 of 2 remaining today • <span className="text-[#FF5722] underline cursor-pointer">Read more</span>
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
        <div className="p-4 space-y-2.5 overflow-y-auto">
          {destinations.map((dest) => {
            const Icon = dest.icon;
            const isEditable = dest.id === 'home' || dest.id === 'fav';
            const isEditing = editingId === dest.id;

            if (isEditing) {
              return (
                <div
                  key={dest.id}
                  className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#FF5722] flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={draftAddress}
                    onChange={(e) => setDraftAddress(e.target.value)}
                    placeholder={`Enter ${dest.label} address`}
                    data-testid={`saved-address-input-${dest.id}`}
                    className="flex-1 bg-white px-3 py-2 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-900 focus:outline-none focus:border-[#18181B]"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveAddressEdit(dest)}
                    data-testid={`saved-address-save-${dest.id}`}
                    className="w-8 h-8 rounded-xl bg-[#18181B] text-[#FF5722] flex items-center justify-center shrink-0"
                    aria-label={`Save ${dest.label}`}
                  >
                    <Check size={15} />
                  </button>
                </div>
              );
            }

            return (
              <div
                key={dest.id}
                className="w-full p-3.5 rounded-2xl bg-[#F8FAFC] hover:bg-zinc-100 border border-zinc-200/80 flex items-center justify-between gap-2 transition"
              >
                <button
                  type="button"
                  onClick={() => handleSelect(dest)}
                  className="flex items-center gap-3.5 min-w-0 flex-1 text-left cursor-pointer"
                >
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
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  {isEditable && (
                    <button
                      type="button"
                      onClick={() => {
                        playKeypadChime();
                        setEditingId(dest.id);
                        setDraftAddress(dest.address);
                      }}
                      data-testid={`saved-address-edit-${dest.id}`}
                      aria-label={`Edit ${dest.label}`}
                      className="w-7 h-7 rounded-lg hover:bg-white flex items-center justify-center text-zinc-400 hover:text-[#18181B]"
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                  <ChevronRight size={16} className="text-zinc-400" />
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => {
              playKeypadChime();
              if (onOpenSearch) {
                onClose();
                onOpenSearch();
              } else {
                showToast('Tap the map search icon to choose a custom destination');
              }
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
