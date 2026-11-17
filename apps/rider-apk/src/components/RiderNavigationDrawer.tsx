import React from 'react';
import {
  X,
  Zap,
  PackageCheck,
  ShieldCheck,
  Wallet,
  Building2,
  Bike,
  ShieldAlert,
  MessageSquare,
  LogOut,
  User,
  ChevronRight,
  Sun,
  FileCheck2,
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
    logoutRider,
    toggleOnlineStatus,
  } = useRiderStore();

  if (!isOpen) return null;

  const isOnline = riderStatus === 'available' || riderStatus === 'busy';
  const firstName = riderName.trim().split(/\s+/)[0] || 'Babajide';

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
      <div className="relative w-[82%] max-w-[340px] h-full bg-[#FAFAF9] shadow-2xl flex flex-col z-10 border-r border-zinc-200 animate-slideRight">
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
              <h2 className="text-sm font-black text-white truncate">{riderName}</h2>
              <div className="text-[11px] text-zinc-300 truncate font-semibold">
                4.95 ★ • Express Bike • {plateNumber}
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

        {/* Scrollable Navigation Options */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Group 1: Main Operations */}
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400 px-3 mb-1">
              Operations
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => handleNavClick('home')}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-white text-zinc-800 font-bold text-xs transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#FF5722] flex items-center justify-center">
                    <Zap size={16} />
                  </div>
                  <div className="text-left">
                    <div>Radar Dispatch Map</div>
                    <div className="text-[10px] text-zinc-400 font-medium">Cockpit & Mission Radar</div>
                  </div>
                </div>
                <ChevronRight size={14} className="text-zinc-400" />
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('history')}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-white text-zinc-800 font-bold text-xs transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <PackageCheck size={16} />
                  </div>
                  <span>Delivery History & Waybills</span>
                </div>
                <ChevronRight size={14} className="text-zinc-400" />
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('kyc')}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-white text-zinc-800 font-bold text-xs transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                    <FileCheck2 size={16} />
                  </div>
                  <span>KYC & Regulatory Compliance</span>
                </div>
                <ChevronRight size={14} className="text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Group 2: Finances */}
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400 px-3 mb-1">
              Wallet & Settlements
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => handleNavClick('earnings')}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-white text-zinc-800 font-bold text-xs transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Wallet size={16} />
                  </div>
                  <div className="text-left">
                    <div className="leading-tight">Shift Earnings & Payouts</div>
                    <div className="text-[10px] text-zinc-400 font-semibold">Earnings & Wallet • ₦92,300.00 Balance</div>
                  </div>
                </div>
                <ChevronRight size={14} className="text-zinc-400" />
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('bank')}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-white text-zinc-800 font-bold text-xs transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-zinc-200 text-zinc-800 flex items-center justify-center">
                    <Building2 size={16} />
                  </div>
                  <span>Payout Bank Account</span>
                </div>
                <ChevronRight size={14} className="text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Group 3: Safety & Fleet */}
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400 px-3 mb-1">
              Safety & Fleet
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => handleNavClick('vehicle')}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-white text-zinc-800 font-bold text-xs transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Bike size={16} />
                  </div>
                  <span>Rider Profile & Vehicle</span>
                </div>
                <ChevronRight size={14} className="text-zinc-400" />
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('support_sos')}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-white text-zinc-800 font-bold text-xs transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                    <ShieldAlert size={16} />
                  </div>
                  <div className="text-left">
                    <div>24/7 Safety & SOS Support</div>
                    <div className="text-[10px] text-zinc-400 font-medium">Roadside Emergency SOS</div>
                  </div>
                </div>
                <ChevronRight size={14} className="text-zinc-400" />
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('chat')}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-white text-zinc-800 font-bold text-xs transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <MessageSquare size={16} />
                  </div>
                  <span>Customer Live Chat</span>
                </div>
                <ChevronRight size={14} className="text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Backward compatibility with Sunlight mode test if provided */}
          {onToggleSunlightMode && (
            <div>
              <button
                type="button"
                onClick={() => {
                  playKeypadChime();
                  onToggleSunlightMode();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-white text-zinc-800 font-bold text-xs transition-colors border border-amber-200 bg-amber-50/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center">
                    <Sun size={16} />
                  </div>
                  <span>Sunlight High-Contrast Mode</span>
                </div>
                <ChevronRight size={14} className="text-amber-500" />
              </button>
            </div>
          )}

          {/* Group 4: Account Actions */}
          <div className="pt-2 border-t border-zinc-200 space-y-1">
            <button
              type="button"
              onClick={() => handleNavClick('auth')}
              className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-white text-zinc-800 font-bold text-xs transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-zinc-200 text-zinc-700 flex items-center justify-center">
                  <User size={16} />
                </div>
                <span>Switch / Re-Login Account</span>
              </div>
              <ChevronRight size={14} className="text-zinc-400" />
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-red-50 text-red-600 font-bold text-xs transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                  <LogOut size={16} />
                </div>
                <span>Sign Out of Rider App</span>
              </div>
              <ChevronRight size={14} className="text-red-400" />
            </button>
          </div>
        </div>

        {/* Footer Shift Status Bar */}
        <div className="p-4 bg-white border-t border-zinc-200">
          <button
            type="button"
            onClick={toggleOnlineStatus}
            className={`w-full py-2.5 px-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                : 'bg-zinc-100 text-zinc-600 border border-zinc-300'
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
