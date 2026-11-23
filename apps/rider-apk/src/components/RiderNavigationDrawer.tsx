import React, { useState } from 'react';
import {
  X,
  Wallet,
  Clock,
  Tag,
  CalendarClock,
  Settings,
  ChevronRight,
  ArrowLeft,
  ShieldCheck,
  Building2,
  Bike,
  LifeBuoy,
  MessageSquare,
  LogOut,
  User,
  Sun,
  Home,
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
  | 'campaigns'
  | 'scheduled'
  | 'portal'
  | 'privacy';

export interface RiderNavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (target: DrawerNavTarget) => void;
  // Backward compatibility with initial test harness
  activeView?: string;
  onSelectView?: (view: any) => void;
  isSunlightMode?: boolean;
  onToggleSunlightMode?: () => void;
  initialView?: 'main' | 'settings';
}

export const RiderNavigationDrawer: React.FC<RiderNavigationDrawerProps> = ({
  isOpen,
  onClose,
  onNavigate,
  activeView,
  onSelectView,
  isSunlightMode,
  onToggleSunlightMode,
  initialView,
}) => {
  const {
    riderName,
    plateNumber,
    riderStatus,
    kycStatus,
    walletBalanceKobo,
    logoutRider,
    toggleOnlineStatus,
  } = useRiderStore();

  const [drawerView, setDrawerView] = useState<'main' | 'settings'>(() => {
    if (initialView) return initialView;
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('drawerView');
      if (q === 'settings') return 'settings';
    }
    return 'main';
  });

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

  const handleLogout = () => {
    playKeypadChime();
    onClose();
    logoutRider();
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
         * 1. TOP LIGHT HEADER BANNER (Matches Reference Image)
         * ===================================================================== */}
        <div className="bg-[#F8F6F2] border-b border-[#E8E2D9] p-5 shrink-0">
          {/* Top subtle badge row: Bayniks Courier, rating, and Close button */}
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white border border-[#E2DDD5] text-zinc-700 text-[10px] font-black uppercase tracking-wider shadow-2xs">
              <span>🇳🇬</span>
              <span>BAYNIKS COURIER</span>
              <span className="w-1 h-1 rounded-full bg-emerald-500 ml-0.5" />
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

          {/* Avatar and Driver Title / Tier */}
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
              {/* Bolt Driver -> Bayniks Rider / Rider Name */}
              <h2 className="text-base font-black text-zinc-900 truncate tracking-tight">
                {riderName || 'Bayniks Rider'}
              </h2>

              {/* Subtitle: Bronze > with bronze dot badge */}
              <button
                type="button"
                onClick={() => handleNavClick('campaigns')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 mt-0.5 hover:text-zinc-900 transition-colors cursor-pointer"
                aria-label="Bronze rewards tier"
              >
                <span className="w-3.5 h-3.5 rounded-full bg-[#EA580C] ring-2 ring-[#EA580C]/20 flex items-center justify-center shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                </span>
                <span className="font-bold text-zinc-800">Bronze</span>
                <ChevronRight size={13} className="text-zinc-400" />
              </button>
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
         * 2. MAIN MENU VIEW (Exact items from User Image)
         * ===================================================================== */}
        <div className={`flex-1 flex flex-col justify-between overflow-y-auto ${drawerView === 'main' ? 'block' : 'hidden'}`}>
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
                  Shift Earnings & Payouts Earnings & Wallet • ₦
                  {(walletBalanceKobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
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
                <span className="sr-only">Delivery History & Waybills</span>
              </div>
            </button>

            {/* 3. Campaigns */}
            <button
              type="button"
              onClick={() => handleNavClick('campaigns')}
              className="w-full px-5 py-3.5 flex items-center gap-4 text-[15px] font-bold text-zinc-900 hover:bg-zinc-50 active:bg-zinc-100 transition-colors text-left cursor-pointer"
              aria-label="Campaigns"
            >
              <Tag size={22} className="text-zinc-800 shrink-0" strokeWidth={1.9} />
              <span className="block truncate">Campaigns</span>
            </button>

            {/* 4. Scheduled rides */}
            <button
              type="button"
              onClick={() => handleNavClick('scheduled')}
              className="w-full px-5 py-3.5 flex items-center gap-4 text-[15px] font-bold text-zinc-900 hover:bg-zinc-50 active:bg-zinc-100 transition-colors text-left cursor-pointer"
              aria-label="Scheduled rides"
            >
              <CalendarClock size={22} className="text-zinc-800 shrink-0" strokeWidth={1.9} />
              <span className="block truncate">Scheduled rides</span>
            </button>

            {/* 5. Settings (Clicks into dedicated Settings view) */}
            <button
              type="button"
              onClick={() => {
                playKeypadChime();
                setDrawerView('settings');
              }}
              className="w-full px-5 py-3.5 flex items-center justify-between text-[15px] font-bold text-zinc-900 hover:bg-zinc-50 active:bg-zinc-100 transition-colors text-left cursor-pointer"
              aria-label="Settings"
              data-testid="drawer-settings-btn"
            >
              <div className="flex items-center gap-4">
                <Settings size={22} className="text-zinc-800 shrink-0" strokeWidth={1.9} />
                <span>Settings</span>
              </div>
              <ChevronRight size={18} className="text-zinc-400" />
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

        {/* =====================================================================
         * 3. SETTINGS VIEW ("move all kyc, logout option, customer live chat,
         * rider's profile and others to settings")
         * ===================================================================== */}
        <div className={`flex-1 flex flex-col overflow-hidden ${drawerView === 'settings' ? 'block' : 'hidden'}`}>
          {/* Settings Sub-header with Back button */}
          <div className="p-4 border-b border-zinc-200/80 flex items-center justify-between bg-zinc-50/70 shrink-0">
            <button
              type="button"
              onClick={() => {
                playKeypadChime();
                setDrawerView('main');
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 hover:text-zinc-950 px-2 py-1 rounded-lg hover:bg-zinc-200/60 transition-colors cursor-pointer"
              aria-label="Back to main menu"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
            <h3 className="text-sm font-black text-zinc-900 tracking-tight">Settings</h3>
            <div className="w-8" />
          </div>

          {/* Scrollable list of moved Settings items */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
            {/* Category: Profile & Regulatory */}
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 px-2 mb-1.5">
                Profile & Verification
              </div>
              <div className="space-y-1">
                {/* Rider Profile & Vehicle */}
                <button
                  type="button"
                  onClick={() => handleNavClick('vehicle')}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/60 flex items-center justify-between text-xs font-bold text-zinc-800 transition cursor-pointer"
                >
                  <div className="flex items-center space-x-3 min-w-0 text-left">
                    <Bike className="w-4 h-4 shrink-0 text-zinc-900 stroke-[2.2]" />
                    <div className="min-w-0">
                      <div className="font-extrabold text-zinc-900 truncate">
                        Rider Profile & Vehicle
                      </div>
                      <div className="text-[10px] text-zinc-400 font-medium truncate">
                        Express Bike • {plateNumber || 'No Plate Linked'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0 stroke-[2]" />
                </button>

                {/* KYC & Regulatory Compliance */}
                <button
                  type="button"
                  onClick={() => handleNavClick('kyc')}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/60 flex items-center justify-between text-xs font-bold text-zinc-800 transition cursor-pointer"
                >
                  <div className="flex items-center space-x-3 min-w-0 text-left">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 stroke-[2.2]" />
                    <div className="min-w-0">
                      <div className="font-extrabold text-zinc-900 truncate">
                        KYC & Regulatory Compliance
                      </div>
                      <div className="text-[10px] text-emerald-600 font-bold truncate">
                        {kycStatus === 'approved' ? 'KYC Level 2 Verified' : 'KYC Pending Review'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0 stroke-[2]" />
                </button>

                {/* Payout Bank Account */}
                <button
                  type="button"
                  onClick={() => handleNavClick('bank')}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/60 flex items-center justify-between text-xs font-bold text-zinc-800 transition cursor-pointer"
                >
                  <div className="flex items-center space-x-3 min-w-0 text-left">
                    <Building2 className="w-4 h-4 shrink-0 text-zinc-900 stroke-[2.2]" />
                    <div className="min-w-0">
                      <div className="font-extrabold text-zinc-900 truncate">
                        Payout Bank Account
                      </div>
                      <div className="text-[10px] text-zinc-400 font-medium truncate">
                        Settlement accounts & instant cashout
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0 stroke-[2]" />
                </button>
              </div>
            </div>

            {/* Category: Support & Communication */}
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 px-2 mb-1.5">
                Support & Communications
              </div>
              <div className="space-y-1">
                {/* Customer Live Chat */}
                <button
                  type="button"
                  onClick={() => handleNavClick('chat')}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/60 flex items-center justify-between text-xs font-bold text-zinc-800 transition cursor-pointer"
                >
                  <div className="flex items-center space-x-3 min-w-0 text-left">
                    <MessageSquare className="w-4 h-4 shrink-0 text-zinc-900 stroke-[2.2]" />
                    <div className="min-w-0">
                      <div className="font-extrabold text-zinc-900 truncate">
                        Customer Live Chat
                      </div>
                      <div className="text-[10px] text-zinc-400 font-medium truncate">
                        Direct support & courier hotline
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0 stroke-[2]" />
                </button>

                {/* 24/7 Safety & SOS Support */}
                <button
                  type="button"
                  onClick={() => handleNavClick('support_sos')}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/60 flex items-center justify-between text-xs font-bold text-zinc-800 transition cursor-pointer"
                >
                  <div className="flex items-center space-x-3 min-w-0 text-left">
                    <LifeBuoy className="w-4 h-4 shrink-0 text-red-600 stroke-[2.2]" />
                    <div className="min-w-0">
                      <div className="font-extrabold text-zinc-900 truncate">
                        24/7 Safety & SOS Support
                      </div>
                      <div className="text-[10px] text-zinc-400 font-medium truncate">
                        Roadside Emergency SOS
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0 stroke-[2]" />
                </button>

                {/* Radar Dispatch Map */}
                <button
                  type="button"
                  onClick={() => handleNavClick('home')}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/60 flex items-center justify-between text-xs font-bold text-zinc-800 transition cursor-pointer"
                >
                  <div className="flex items-center space-x-3 min-w-0 text-left">
                    <Home className="w-4 h-4 shrink-0 text-zinc-900 stroke-[2.2]" />
                    <div className="min-w-0">
                      <div className="font-extrabold text-zinc-900 truncate">
                        Radar Dispatch Map
                      </div>
                      <div className="text-[10px] text-zinc-400 font-medium truncate">
                        Cockpit & Mission Radar
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0 stroke-[2]" />
                </button>
              </div>
            </div>

            {/* Category: Preferences */}
            {onToggleSunlightMode && (
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 px-2 mb-1.5">
                  Display
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playKeypadChime();
                    onToggleSunlightMode();
                  }}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/60 flex items-center justify-between text-xs font-bold text-zinc-800 transition cursor-pointer"
                >
                  <div className="flex items-center space-x-3 min-w-0 text-left">
                    <Sun className="w-4 h-4 shrink-0 text-amber-500 stroke-[2.2]" />
                    <span className="font-extrabold text-zinc-900 truncate">
                      Sunlight High-Contrast Mode
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0 stroke-[2]" />
                </button>
              </div>
            )}

            {/* Category: Account & Logout */}
            <div className="pt-2 border-t border-zinc-200/70 space-y-1">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 px-2 mb-1.5">
                Account
              </div>

              {/* Switch / Re-Login Account */}
              <button
                type="button"
                onClick={() => handleNavClick('auth')}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/60 flex items-center justify-between text-xs font-bold text-zinc-800 transition cursor-pointer"
              >
                <div className="flex items-center space-x-3 min-w-0 text-left">
                  <User className="w-4 h-4 shrink-0 text-zinc-900 stroke-[2.2]" />
                  <span className="font-extrabold text-zinc-900 truncate">
                    Switch / Re-Login Account
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0 stroke-[2]" />
              </button>

              {/* Sign Out of Rider App (Logout) */}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-red-50 hover:bg-red-100/80 border border-red-200/70 flex items-center justify-between text-xs font-bold text-red-700 transition cursor-pointer group"
                aria-label="Sign Out of Rider App"
              >
                <div className="flex items-center space-x-3 min-w-0 text-left">
                  <LogOut className="w-4 h-4 shrink-0 text-red-600 stroke-[2.2]" />
                  <span className="font-extrabold text-red-700 truncate">
                    Sign Out of Rider App
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-red-400 shrink-0 stroke-[2]" />
              </button>
            </div>
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
