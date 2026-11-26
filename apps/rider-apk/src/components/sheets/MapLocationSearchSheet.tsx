import React, { useEffect, useState } from 'react';
import { Crosshair, Home, MapPin, Search, Star, X } from 'lucide-react';
import {
  CURATED_NIGERIA_PLACES,
  MapSearchPlace,
  searchMapLocations,
} from '../../utils/locationSearch';
import { playKeypadChime } from '../../utils/audioChimes';

export interface MapLocationSearchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlace: (place: MapSearchPlace) => void;
  onUseRealLocation: () => void;
}

export const MapLocationSearchSheet: React.FC<MapLocationSearchSheetProps> = ({
  isOpen,
  onClose,
  onSelectPlace,
  onUseRealLocation,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MapSearchPlace[]>(CURATED_NIGERIA_PLACES);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      const hits = await searchMapLocations(query);
      if (!cancelled) {
        setResults(hits);
        setIsSearching(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 z-50 bg-white flex flex-col select-none animate-fadeIn text-[#18181B]"
      data-testid="map-location-search-sheet"
    >
      {/* Top Search Header */}
      <header className="px-4 pt-4 pb-3 border-b border-zinc-100 flex items-center gap-3 shrink-0 bg-white">
        <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#F4F4F5] border border-zinc-200 focus-within:border-[#18181B]">
          <Search size={17} className="text-[#FF5722] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search street, landmark or area..."
            data-testid="map-search-input"
            className="w-full bg-transparent text-[14px] font-medium text-[#18181B] placeholder:text-zinc-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="text-zinc-400 hover:text-[#18181B]"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close search"
          data-testid="map-search-close-btn"
          className="w-9 h-9 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-[#18181B] shrink-0"
        >
          <X size={18} />
        </button>
      </header>

      {/* Current GPS Location Action */}
      <button
        type="button"
        onClick={() => {
          playKeypadChime();
          onUseRealLocation();
          onClose();
        }}
        data-testid="map-search-real-gps-btn"
        className="w-full px-5 py-3.5 border-b border-zinc-100 flex items-center gap-3.5 text-left hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
      >
        <span className="w-9 h-9 rounded-full bg-[#18181B] text-[#FF5722] flex items-center justify-center shrink-0">
          <Crosshair size={17} />
        </span>
        <div>
          <p className="text-[14.5px] font-bold text-[#18181B]">Use my real current location</p>
          <p className="text-[12px] text-zinc-500">Sync map directly to live device GPS</p>
        </div>
      </button>

      {/* Search Results & Saved Home/Favourite Places */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
        {isSearching && query.trim().length >= 3 && (
          <div className="px-5 py-3 text-[12px] text-zinc-400 font-medium">
            Searching Nigeria places...
          </div>
        )}

        {results.length === 0 ? (
          <div className="px-5 py-10 text-center text-[13.5px] text-zinc-400">
            No matching locations found for "{query}"
          </div>
        ) : (
          results.map((place) => {
            const Icon =
              place.category === 'home' ? Home : place.category === 'favourite' ? Star : MapPin;

            return (
              <button
                key={place.id}
                type="button"
                onClick={() => {
                  playKeypadChime();
                  onSelectPlace(place);
                  onClose();
                }}
                data-testid={`map-search-result-${place.id}`}
                className="w-full px-5 py-3.5 flex items-center gap-3.5 text-left hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
              >
                <span className="w-9 h-9 rounded-full bg-[#F4F4F5] text-[#18181B] flex items-center justify-center shrink-0">
                  <Icon
                    size={16}
                    className={
                      place.category === 'home' || place.category === 'favourite'
                        ? 'text-[#FF5722]'
                        : 'text-[#18181B]'
                    }
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-semibold text-[#18181B] truncate">
                    {place.label}
                  </p>
                  <p className="text-[12.5px] text-zinc-500 truncate mt-0.5">{place.address}</p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MapLocationSearchSheet;
