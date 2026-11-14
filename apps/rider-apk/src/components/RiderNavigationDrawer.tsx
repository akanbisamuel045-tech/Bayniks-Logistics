import React from 'react';
import {
  Navigation,
  PackageCheck,
  Wallet,
  MessageSquareQuote,
  ShieldAlert,
  UserCheck,
  X,
  Sun,
  Moon,
  Bike,
  Star,
  CheckCircle2,
  ChevronRight,
  LogOut,
  Radio,
} from 'lucide-react';
import { useRiderStore } from '../store/riderStore';
import { koboToNaira } from '@logistics/shared-types';

export type RiderActiveView = 'radar' | 'earnings' | 'chat' | 'support' | 'profile';

interface RiderNavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: RiderActiveView;
  onSelectView: (view: RiderActiveView) => void;
  isSunlightMode: boolean;
  onToggleSunlightMode: () => void;
}

export const RiderNavigationDrawer: React.FC<RiderNavigationDrawerProps> = ({
  isOpen,
  onClose,
  activeView,
  onSelectView,
  isSunlightMode,
  onToggleSunlightMode,
}) => {
  const {
    riderStatus,
    todayEarningsKobo,
    tripPhase,
    activeOrder,
    plateNumber,
    toggleOnlineStatus,
  } = useRiderStore();

  if (!isOpen) return null;

  const formattedEarnings = `₦${koboToNaira(todayEarningsKobo).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const navItems = [
    {
      id: 'radar' as RiderActiveView,
      label: 'Radar Dispatch Map',
      description: 'Live GPS navigation & Lagos street radar',
      icon: Navigation,
      badge: tripPhase !== 'idle' ? 'Live Order' : riderStatus === 'available' ? 'Listening' : undefined,
      badgeColor: tripPhase !== 'idle' ? 'bg-[#FF6D1F] text-white' : 'bg-emerald-500 text-black',
    },
    {
      id: 'earnings' as RiderActiveView,
      label: 'Shift Earnings & Payouts',
      description: 'Daily cashout, tips & trip settlements',
      icon: Wallet,
      badge: formattedEarnings,
      badgeColor: 'bg-emerald-950 text-emerald-400 border border-emerald-800',
    },
    {
      id: 'chat' as RiderActiveView,
      label: 'Customer Live Chat',
      description: 'In-transit coordination with senders & recipients',
      icon: MessageSquareQuote,
      badge: tripPhase !== 'idle' ? 'Active' : undefined,
      badgeColor: 'bg-[#FF6D1F] text-white',
    },
    {
      id: 'support' as RiderActiveView,
      label: '24/7 Safety & SOS Support',
      description: 'Emergency panic line, breakdown assistance',
      icon: ShieldAlert,
      badge: '24/7 Live',
      badgeColor: 'bg-red-950 text-red-400 border border-red-800',
    },
    {
      id: 'profile' as RiderActiveView,
      label: 'Rider Profile & Vehicle',
      description: `${plateNumber} • Lagos Central Hub`,
      icon: UserCheck,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative w-full max-w-xs sm:max-w-sm h-full bg-[#0E1013] border-r border-zinc-800/90 text-white flex flex-col z-10 shadow-2xl safe-top safe-bottom overflow-hidden">
        {/* Top Header Bar */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF6D1F] flex items-center justify-center font-black text-white text-base shadow-lg shadow-orange-500/30">
              B
            </div>
            <div>
              <div className="font-black text-sm tracking-tight text-white flex items-center gap-1.5">
                <span>BAYNIKS</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-[#FF6D1F]/20 text-[#FF6D1F] rounded font-bold uppercase tracking-wider">
                  Rider
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium">Enterprise Courier Portal</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close menu"
            className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors active:scale-95"
          >
            <X className="w-5 h-5 text-black bg-white rounded-full p-0.5" />
          </button>
        </div>

        {/* Rider Profile Card (Bayniks Customer Theme Style) */}
        <div className="p-4 border-b border-zinc-800/80 bg-zinc-950/60">
          <div className="flex items-start gap-3">
            <div className="relative">
              <div className="w-13 h-13 rounded-2xl bg-zinc-800 border-2 border-[#FF6D1F] overflow-hidden flex items-center justify-center text-xl font-black text-white">
                TD
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-black flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-black" />
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-sm text-white truncate">Tariq Danladi</h3>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 text-[9px] font-bold uppercase">
                  Verified
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-zinc-400">
                <Bike className="w-3.5 h-3.5 text-black bg-zinc-300 rounded-sm p-0.5" />
                <span className="font-mono font-medium truncate">Bajaj Boxer • {plateNumber}</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-900/60">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>4.95</span>
                </div>
                <span className="text-[11px] font-mono font-bold text-emerald-400">
                  {formattedEarnings} Today
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation List Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 hide-scrollbar">
          <div className="px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Dispatch Workspace
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectView(item.id);
                  onClose();
                }}
                className={`w-full p-3 rounded-2xl flex items-center justify-between text-left transition-all active:scale-98 ${
                  isActive
                    ? 'bg-zinc-900 border-2 border-[#FF6D1F] shadow-lg shadow-orange-500/10'
                    : 'bg-zinc-950/50 hover:bg-zinc-900 border border-zinc-800/80 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-[#FF6D1F] text-white shadow-md' : 'bg-zinc-900 text-black border border-zinc-700'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-black" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-zinc-200'}`}>
                        {item.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.badge && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${item.badgeColor || 'bg-zinc-800 text-zinc-300'}`}>
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Actions: Sunlight Mode & Status */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-950 space-y-2">
          {/* Sunlight Mode Toggle */}
          <button
            onClick={onToggleSunlightMode}
            className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs font-bold text-zinc-300 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2">
              {isSunlightMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-zinc-400" />
              )}
              <span>Sunlight High-Contrast Mode</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-zinc-800 text-zinc-300">
              {isSunlightMode ? 'HIGH CONSTRAST' : 'AMOLED'}
            </span>
          </button>

          {/* Quick Toggle Online/Offline */}
          <button
            onClick={() => {
              toggleOnlineStatus();
              onClose();
            }}
            disabled={riderStatus === 'busy'}
            className={`w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-98 ${
              riderStatus === 'busy'
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : riderStatus === 'available'
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                : 'bg-[#FF6D1F] hover:bg-orange-600 text-white shadow-orange-500/25'
            }`}
          >
            <Radio className="w-4 h-4 text-black bg-white rounded-full p-0.5" />
            <span>
              {riderStatus === 'busy'
                ? 'CANNOT GO OFFLINE WHILE ON TRIP'
                : riderStatus === 'available'
                ? 'SWITCH TO STANDBY (GO OFFLINE)'
                : 'GO ONLINE & RECEIVE ORDERS'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
