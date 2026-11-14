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
      <div className="relative w-full max-w-xs sm:max-w-sm h-full bg-white border-r border-zinc-200 text-zinc-900 flex flex-col z-10 shadow-2xl safe-top safe-bottom overflow-hidden">
        {/* Top Header Bar */}
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF6D1F] flex items-center justify-center font-black text-white text-base shadow-md shadow-orange-500/20">
              B
            </div>
            <div>
              <div className="font-black text-sm tracking-tight text-zinc-900 flex items-center gap-1.5">
                <span>BAYNIKS</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-[#FF6D1F]/15 text-[#FF6D1F] rounded font-bold uppercase tracking-wider">
                  Rider
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 font-medium">Enterprise Courier Portal</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close menu"
            className="w-9 h-9 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-600 hover:bg-zinc-200 flex items-center justify-center transition-colors active:scale-95 shadow-sm"
          >
            <X className="w-5 h-5 text-black" />
          </button>
        </div>

        {/* Rider Profile Card (Bayniks Customer Theme Style) */}
        <div className="p-4 border-b border-zinc-200 bg-zinc-50">
          <div className="flex items-start gap-3">
            <div className="relative">
              <div className="w-13 h-13 rounded-2xl bg-zinc-200 border-2 border-[#FF6D1F] overflow-hidden flex items-center justify-center text-xl font-black text-zinc-800">
                TD
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-white" />
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-sm text-zinc-900 truncate">Tariq Danladi</h3>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase border border-emerald-200">
                  Verified
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-zinc-600">
                <Bike className="w-3.5 h-3.5 text-black" />
                <span className="font-mono font-medium truncate">Bajaj Boxer • {plateNumber}</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  <span>4.95</span>
                </div>
                <span className="text-[11px] font-mono font-bold text-emerald-600">
                  {formattedEarnings} Today
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation List Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 hide-scrollbar">
          <div className="px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
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
                    ? 'bg-orange-50/70 border-2 border-[#FF6D1F] shadow-sm'
                    : 'bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-[#FF6D1F] text-white shadow-sm' : 'bg-zinc-100 text-black border border-zinc-200'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-black" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold truncate ${isActive ? 'text-zinc-900' : 'text-zinc-800'}`}>
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
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      item.id === 'earnings'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : item.id === 'support'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : item.badgeColor || 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Actions: Sunlight Mode & Status */}
        <div className="p-3 border-t border-zinc-200 bg-zinc-50 space-y-2">
          {/* Sunlight Mode Toggle */}
          <button
            onClick={onToggleSunlightMode}
            className="w-full py-2.5 px-3 rounded-xl bg-white border border-zinc-200 flex items-center justify-between text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-colors shadow-xs"
          >
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Sunlight High-Contrast Mode</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
              {isSunlightMode ? 'HIGH CONTRAST' : 'LIGHT MODE'}
            </span>
          </button>

          {/* Quick Toggle Online/Offline */}
          <button
            onClick={() => {
              toggleOnlineStatus();
              onClose();
            }}
            disabled={riderStatus === 'busy'}
            className={`w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-98 ${
              riderStatus === 'busy'
                ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                : riderStatus === 'available'
                ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800 border border-zinc-300'
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

