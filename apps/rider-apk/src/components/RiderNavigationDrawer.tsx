import React from 'react';
import {
  X,
  Home,
  Clock,
  ShieldCheck,
  Wallet,
  Building2,
  Bike,
  LifeBuoy,
  MessageSquare,
  LogOut,
  User,
  ChevronRight,
  Sun,
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
  | 'auth';

export interface RiderNavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (target: DrawerNavTarget) => void;
  // Backward compatibility with initial test harness
  activeView?: string;
  onSelectView?: (view: any) => void;
  isSunlightMode?: boolean;
  onToggleSunlightMode?: () => void;
}

export const RiderNavigationDrawer: React.FC<RiderNavigationDrawerProps> = ({
  isOpen,
  onClose,
  onNavigate,
  activeView,
  onSelectView,
  isSunlightMode,
  onToggleSunlightMode,
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
      className="absolute inset-0 z-[90] flex overflow-hidden animate-fadeIn"
      data-testid="rider-navigation-drawer"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container (Sliding from Left) */}
      <div className="relative w-[82%] max-w-[340px] h-full bg-white shadow-2xl flex flex-col z-10 border-r border-neutral-200 animate-slideRight">
        {/* Header Profile Card */}
        <div className="bg-gradient-to-br from-[#1E1C1A] to-[#2B2724] p-5 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FF5722] text-white text-[10px] font-black uppercase tracking-wider">
              <span>🇳🇬</span>
              <span>BAYNIKS COURIER</span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              aria-label="Close drawer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-14 h-14 rounded-2xl bg-zinc-800 border-2 border-[#FF5722] flex items-center justify-center text-white font-black text-lg shadow-md shrink-0">
              <span>{firstName.slice(0, 2).toUpperCase()}</span>
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#1E1C1A] ${
                  isOnline ? 'bg-emerald-500' : 'bg-zinc-500'
                }`}
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-white truncate">{riderName || 'New Rider'}</h2>
              <div className="text-[11px] text-zinc-300 truncate font-semibold">
                4.95 ★ • Express Bike • {plateNumber || 'No Plate Linked'}
              </div>
              <button
                type="button"
                onClick={() => handleNavClick('kyc')}
                className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 transition-colors"
              >
                <ShieldCheck size={11} />
                <span>
                  {kycStatus === 'approved' ? 'KYC Level 2 Verified' : 'KYC Pending'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Navigation Options with Crisp Black Lucide Icons */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
          {/* Group 1: Main Operations */}
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 px-3.5 mb-1.5">
              Operations
            </div>
            <div className="space-y-0.5">
              {/* Radar Dispatch Map */}
              <button
                type="button"
                onClick={() => handleNavClick('home')}
                className={`w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs transition ${
                  activeView === 'radar' || activeView === 'home'
                    ? 'bg-neutral-100 text-neutral-900 font-extrabold'
                    : 'text-neutral-800 hover:bg-neutral-50 hover:text-black font-bold'
                }`}
              >
                <div className="flex items-center space-x-3 text-left min-w-0">
                  <Home className="w-4 h-4 shrink-0 text-black stroke-[2.2]" style={{ color: '#000000' }} />
                  <div className="min-w-0">
                    <div className="font-extrabold text-neutral-900 truncate">Radar Dispatch Map</div>
                    <div className="text-[10px] text-neutral-400 font-medium truncate">Cockpit & Mission Radar</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0 stroke-[2]" />
              </button>

              {/* Delivery History & Waybills */}
              <button
                type="button"
                onClick={() => handleNavClick('history')}
                className="w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold text-neutral-800 hover:bg-neutral-50 hover:text-black transition"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <Clock className="w-4 h-4 shrink-0 text-black stroke-[2.2]" style={{ color: '#000000' }} />
                  <span className="font-extrabold text-neutral-900 truncate">Delivery History & Waybills</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0 stroke-[2]" />
              </button>

              {/* KYC & Regulatory Compliance */}
              <button
                type="button"
                onClick={() => handleNavClick('kyc')}
                className="w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold text-neutral-800 hover:bg-neutral-50 hover:text-black transition"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-black stroke-[2.2]" style={{ color: '#000000' }} />
                  <span className="font-extrabold text-neutral-900 truncate">KYC & Regulatory Compliance</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0 stroke-[2]" />
              </button>
            </div>
          </div>

          {/* Group 2: Finances */}
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 px-3.5 mb-1.5">
              Wallet & Settlements
            </div>
            <div className="space-y-0.5">
              {/* Shift Earnings & Payouts */}
              <button
                type="button"
                onClick={() => handleNavClick('earnings')}
                className="w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold text-neutral-800 hover:bg-neutral-50 hover:text-black transition"
              >
                <div className="flex items-center space-x-3 text-left min-w-0">
                  <Wallet className="w-4 h-4 shrink-0 text-black stroke-[2.2]" style={{ color: '#000000' }} />
                  <div className="min-w-0">
                    <div className="font-extrabold text-neutral-900 truncate">Shift Earnings & Payouts</div>
                    <div className="text-[10px] text-neutral-400 font-medium truncate">
                      Earnings &amp; Wallet • ₦{(walletBalanceKobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })} Balance
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0 stroke-[2]" />
              </button>

              {/* Payout Bank Account */}
              <button
                type="button"
                onClick={() => handleNavClick('bank')}
                className="w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold text-neutral-800 hover:bg-neutral-50 hover:text-black transition"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <Building2 className="w-4 h-4 shrink-0 text-black stroke-[2.2]" style={{ color: '#000000' }} />
                  <span className="font-extrabold text-neutral-900 truncate">Payout Bank Account</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0 stroke-[2]" />
              </button>
            </div>
          </div>

          {/* Group 3: Safety & Fleet */}
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 px-3.5 mb-1.5">
              Safety & Fleet
            </div>
            <div className="space-y-0.5">
              {/* Rider Profile & Vehicle */}
              <button
                type="button"
                onClick={() => handleNavClick('vehicle')}
                className="w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold text-neutral-800 hover:bg-neutral-50 hover:text-black transition"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <Bike className="w-4 h-4 shrink-0 text-black stroke-[2.2]" style={{ color: '#000000' }} />
                  <span className="font-extrabold text-neutral-900 truncate">Rider Profile & Vehicle</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0 stroke-[2]" />
              </button>

              {/* 24/7 Safety & SOS Support */}
              <button
                type="button"
                onClick={() => handleNavClick('support_sos')}
                className="w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold text-neutral-800 hover:bg-neutral-50 hover:text-black transition"
              >
                <div className="flex items-center space-x-3 text-left min-w-0">
                  <LifeBuoy className="w-4 h-4 shrink-0 text-black stroke-[2.2]" style={{ color: '#000000' }} />
                  <div className="min-w-0">
                    <div className="font-extrabold text-neutral-900 truncate">24/7 Safety & SOS Support</div>
                    <div className="text-[10px] text-neutral-400 font-medium truncate">Roadside Emergency SOS</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0 stroke-[2]" />
              </button>

              {/* Customer Live Chat */}
              <button
                type="button"
                onClick={() => handleNavClick('chat')}
                className="w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold text-neutral-800 hover:bg-neutral-50 hover:text-black transition"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <MessageSquare className="w-4 h-4 shrink-0 text-black stroke-[2.2]" style={{ color: '#000000' }} />
                  <span className="font-extrabold text-neutral-900 truncate">Customer Live Chat</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0 stroke-[2]" />
              </button>
            </div>
          </div>

          {/* Sunlight High-Contrast Mode (if provided) */}
          {onToggleSunlightMode && (
            <div>
              <button
                type="button"
                onClick={() => {
                  playKeypadChime();
                  onToggleSunlightMode();
                }}
                className="w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold text-neutral-800 hover:bg-neutral-50 hover:text-black transition"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <Sun className="w-4 h-4 shrink-0 text-black stroke-[2.2]" style={{ color: '#000000' }} />
                  <span className="font-extrabold text-neutral-900 truncate">Sunlight High-Contrast Mode</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0 stroke-[2]" />
              </button>
            </div>
          )}

          {/* Group 4: Account Actions */}
          <div className="pt-2 border-t border-neutral-200/80 space-y-0.5">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 px-3.5 mb-1.5">
              Account
            </div>
            {/* Switch / Re-Login Account */}
            <button
              type="button"
              onClick={() => handleNavClick('auth')}
              className="w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold text-neutral-800 hover:bg-neutral-50 hover:text-black transition"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <User className="w-4 h-4 shrink-0 text-black stroke-[2.2]" style={{ color: '#000000' }} />
                <span className="font-extrabold text-neutral-900 truncate">Switch / Re-Login Account</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0 stroke-[2]" />
            </button>

            {/* Sign Out of Rider App */}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold text-neutral-800 hover:bg-red-50 hover:text-red-600 transition group"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <LogOut className="w-4 h-4 shrink-0 text-black stroke-[2.2] group-hover:text-red-600 transition-colors" style={{ color: '#000000' }} />
                <span className="font-extrabold text-neutral-900 group-hover:text-red-600 truncate transition-colors">
                  Sign Out of Rider App
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0 stroke-[2] group-hover:text-red-400" />
            </button>
          </div>
        </div>

        {/* Footer Shift Status Bar */}
        <div className="p-4 bg-white border-t border-neutral-200">
          <button
            type="button"
            onClick={toggleOnlineStatus}
            className={`w-full py-2.5 px-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                : 'bg-neutral-100 text-neutral-600 border border-neutral-300'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'
              }`}
            />
            <span>{isOnline ? 'ONLINE • ACCEPTING JOBS' : 'OFFLINE • TAP TO START'}</span>
          </button>
          <div className="text-[10px] text-neutral-400 text-center mt-2 font-medium">
            Bayniks Logistics v2.4.1 (Lagos Build 2026)
          </div>
        </div>
      </div>
    </div>
  );
};
