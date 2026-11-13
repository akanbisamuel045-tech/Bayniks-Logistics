'use client';

import React from 'react';
import { LayoutDashboard, Package, Plus, Compass, User } from 'lucide-react';

export interface MobileBottomNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenDeliveries?: () => void;
  onOpenCreate?: () => void;
}

export function MobileBottomNav({
  activeTab,
  onSelectTab,
  onOpenDeliveries,
  onOpenCreate,
}: MobileBottomNavProps) {
  return (
    <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-sm z-50 lg:hidden liquid-glass-dock rounded-[32px] px-3.5 py-2 flex items-center justify-between gap-1 shadow-2xl transition-all">
      {/* Home / Dashboard */}
      <button
        type="button"
        onClick={() => onSelectTab('dashboard')}
        className={`flex flex-col items-center justify-center space-y-1 py-1.5 px-3.5 rounded-2xl transition-all ${
          activeTab === 'dashboard'
            ? 'text-bayniks-orange bg-orange-500/15 border border-orange-500/30 font-bold shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
        }`}
      >
        <LayoutDashboard className="w-5 h-5 stroke-[2.2]" />
        <span className="text-[10px] tracking-tight font-medium">Home</span>
      </button>

      {/* Parcels / Active Deliveries */}
      <button
        type="button"
        onClick={() => {
          onSelectTab('active_deliveries');
          onOpenDeliveries?.();
        }}
        className={`flex flex-col items-center justify-center space-y-1 py-1.5 px-3.5 rounded-2xl transition-all ${
          activeTab === 'active_deliveries'
            ? 'text-bayniks-orange bg-orange-500/15 border border-orange-500/30 font-bold shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
        }`}
      >
        <Package className="w-5 h-5 stroke-[2.2]" />
        <span className="text-[10px] tracking-tight font-medium">Parcels</span>
      </button>

      {/* Prominent Action Button: Book (Liquid Glass Action Orb) */}
      <button
        type="button"
        onClick={() => {
          onSelectTab('new_delivery');
          onOpenCreate?.();
        }}
        aria-label="Book Express Dispatch"
        className="w-14 h-14 -mt-7 rounded-2xl liquid-glass-action text-white flex items-center justify-center cursor-pointer active:scale-95 transition-transform shadow-lg group"
      >
        <Plus className="w-7 h-7 stroke-[3] group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Track */}
      <button
        type="button"
        onClick={() => onSelectTab('track')}
        className={`flex flex-col items-center justify-center space-y-1 py-1.5 px-3.5 rounded-2xl transition-all ${
          activeTab === 'track'
            ? 'text-bayniks-orange bg-orange-500/15 border border-orange-500/30 font-bold shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
        }`}
      >
        <Compass className="w-5 h-5 stroke-[2.2]" />
        <span className="text-[10px] tracking-tight font-medium">Track</span>
      </button>

      {/* Profile / Support */}
      <button
        type="button"
        onClick={() => onSelectTab('support')}
        className={`flex flex-col items-center justify-center space-y-1 py-1.5 px-3.5 rounded-2xl transition-all ${
          activeTab === 'support'
            ? 'text-bayniks-orange bg-orange-500/15 border border-orange-500/30 font-bold shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
        }`}
      >
        <User className="w-5 h-5 stroke-[2.2]" />
        <span className="text-[10px] tracking-tight font-medium">Profile</span>
      </button>
    </nav>
  );
}

