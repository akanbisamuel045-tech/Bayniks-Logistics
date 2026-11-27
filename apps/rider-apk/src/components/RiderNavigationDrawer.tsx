import React from 'react';
import {
  X,
  Wallet,
  Clock,
  CalendarClock,
} from 'lucide-react';
import { useRiderStore } from '../store/riderStore';
import { playKeypadChime } from '../utils/audioChimes';

export type DrawerNavTarget =
  | 'home'
  | 'history'
  | 'kyc'
  | 'earnings'
  | 'bank'
  | 'vehicle'
  | 'support_sos'
  | 'chat'
  | 'auth'
  | 'scheduled'
  | 'portal'
  | 'privacy';

export interface RiderNavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (target: DrawerNavTarget) => void;
  // Backward compatibility props
  activeView?: string;
  onSelectView?: (view: any) => void;
  isSunlightMode?: boolean;
  onToggleSunlightMode?: () => void;
}

export const RiderNavigationDrawer: React.FC<RiderNavigationDrawerProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onSelectView,
}) => {
  const {
    riderName,
    plateNumber,
    riderStatus,
    walletBalanceKobo,
    toggleOnlineStatus,
  } = useRiderStore();

  if (!isOpen) return null;

  const isOnline = riderStatus === 'available' || riderStatus === 'busy';
  const firstName = riderName?.trim().split(/\s+/)[0] || 'Rider';

  const handleNavClick = (target: DrawerNavTarget) => {
    playKeypadChime();
    onClose();
    if (onNavigate) {
      onNavigate(target);
    }
    if (onSelectView) {
      onSelectView(target === 'home' ? 'radar' : target);
    }
  };

  return (
    <div
      className="absolute inset-0 z-[90] flex overflow-hidden"
      data-testid="rider-navigation-drawer"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container (Clean Solid Light Mode) */}
      <div className="relative w-[82%] max-w-[340px] h-full !bg-white shadow-2xl flex flex-col z-10 border-r border-zinc-200 select-none">
        {/* =====================================================================
         * 1. TOP LIGHT HEADER BANNER
         * ===================================================================== */}
        <div className="bg-[#F8F6F2] border-b border-[#E8E2D9] p-5 shrink-0">
          {/* Top subtle badge row: Bayniks Courier, rating, and Close button */}
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white border border-[#E2DDD5] text-zinc-700 text-[10px] font-black uppercase tracking-wider shadow-2xs">
              <span>🇳🇬</span>
              <span>BAYNIKS COURIER</span>
              <span className="w-1 h-1 rounded-full bg-[#FF5722] ml-0.5" />
              <span className="text-zinc-600">4.95 ★</span>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white hover:bg-zinc-100 text-zinc-600 border border-[#E2DDD5] flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close drawer"
            >
              <X size={15} />
            </button>
          </div>

          {/* Avatar and Driver Title / Vehicle */}
          <div className="flex items-center gap-3">
            {/* Green Circular Avatar with Bayniks / Rider initial */}
            <div className="relative w-12 h-12 rounded-full bg-[#10B981] text-white flex items-center justify-center font-black text-lg shadow-sm shrink-0 border-2 border-white">
              <span>{firstName.slice(0, 1).toUpperCase()}</span>
              {/* Online Pulse Dot */}
              <span
                className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                  isOnline ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-zinc-400'
                }`}
              />
            </div>

            <div className="min-w-0">
              <h2 className="text-base font-black text-zinc-900 truncate tracking-tight">
                {riderName || 'Bayniks Rider'}
              </h2>
              <div className="text-xs font-semibold text-zinc-600 mt-0.5 truncate">
                Express Bike • {plateNumber || 'Lagos Courier'}
              </div>
            </div>
          </div>

          {/* Two Side-by-Side Stat Cards: 100% Driver Score, 100% Acceptance Rate */}
          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <div className="bg-white border border-[#E4DFD7] rounded-2xl p-3 shadow-2xs">
              <div className="text-base font-black text-zinc-900 leading-tight">100%</div>
              <div className="text-[11px] font-semibold text-zinc-500 mt-0.5 leading-none">
                Driver Score
              </div>
            </div>
            <div className="bg-white border border-[#E4DFD7] rounded-2xl p-3 shadow-2xs">
              <div className="text-base font-black text-zinc-900 leading-tight">100%</div>
              <div className="text-[11px] font-semibold text-zinc-500 mt-0.5 leading-none">
                Acceptance rate
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
         * 2. MAIN MENU VIEW (Bonuses/Campaigns and Settings removed)
         * ===================================================================== */}
        <div className="flex-1 flex flex-col justify-between overflow-y-auto">
          <div className="py-2">
            {/* 1. Earnings */}
            <button
              type="button"
              onClick={() => handleNavClick('earnings')}
              className="w-full px-5 py-3.5 flex items-center gap-4 text-[15px] font-bold text-zinc-900 hover:bg-zinc-50 active:bg-zinc-100 transition-colors text-left cursor-pointer"
            >
              <Wallet size={22} className="text-zinc-800 shrink-0" strokeWidth={1.9} />
              <div className="min-w-0 flex-1">
                <span className="block truncate">Earnings</span>
                <span className="sr-only">
                  ₦{(walletBalanceKobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </button>

            {/* 2. Trip history */}
            <button
              type="button"
              onClick={() => handleNavClick('history')}
              className="w-full px-5 py-3.5 flex items-center gap-4 text-[15px] font-bold text-zinc-900 hover:bg-zinc-50 active:bg-zinc-100 transition-colors text-left cursor-pointer"
            >
              <Clock size={22} className="text-zinc-800 shrink-0" strokeWidth={1.9} />
              <div className="min-w-0 flex-1">
                <span className="block truncate">Trip history</span>
              </div>
            </button>

            {/* 3. Scheduled rides */}
            <button
              type="button"
              onClick={() => handleNavClick('scheduled')}
              className="w-full px-5 py-3.5 flex items-center gap-4 text-[15px] font-bold text-zinc-900 hover:bg-zinc-50 active:bg-zinc-100 transition-colors text-left cursor-pointer"
              aria-label="Scheduled rides"
            >
              <CalendarClock size={22} className="text-zinc-800 shrink-0" strokeWidth={1.9} />
              <span className="block truncate">Scheduled rides</span>
            </button>
          </div>

          {/* Bottom Links (Driver Portal & Privacy) */}
          <div className="px-5 py-6 space-y-3.5 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => handleNavClick('portal')}
              className="block text-sm font-semibold text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer text-left"
            >
              Driver Portal
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('privacy')}
              className="block text-sm font-semibold text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer text-left"
            >
              Privacy
            </button>
          </div>
        </div>

        {/* Footer Shift Status Bar */}
        <div className="p-4 bg-white border-t border-zinc-200 shrink-0">
          <button
            type="button"
            onClick={toggleOnlineStatus}
            className={`w-full py-2.5 px-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                : 'bg-zinc-100 text-zinc-700 border border-zinc-300'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
              }`}
            />
            <span>{isOnline ? 'ONLINE • ACCEPTING JOBS' : 'OFFLINE • TAP TO START'}</span>
          </button>
          <div className="text-[10px] text-zinc-400 text-center mt-2 font-medium">
            Bayniks Logistics v2.4.1 (Lagos Build 2026)
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiderNavigationDrawer;
