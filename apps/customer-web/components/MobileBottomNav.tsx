'use client';

import React from 'react';

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
    <nav className="lg:hidden fixed bottom-3 left-4 right-4 z-40 clay-blur-dock rounded-3xl px-4 py-2 flex items-center justify-between shadow-nav-float">
      {/* Home */}
      <button
        type="button"
        onClick={() => onSelectTab('dashboard')}
        className={`flex flex-col items-center space-y-0.5 p-1.5 transition-colors ${
          activeTab === 'dashboard' ? 'text-bayniks-orange' : 'text-slate-400 hover:text-white'
        }`}
      >
        <span className="text-base">⚡</span>
        <span className="text-[10px] font-medium">Home</span>
      </button>

      {/* Parcels / Active */}
      <button
        type="button"
        onClick={() => {
          onSelectTab('active_deliveries');
          onOpenDeliveries?.();
        }}
        className={`flex flex-col items-center space-y-0.5 p-1.5 transition-colors ${
          activeTab === 'active_deliveries' ? 'text-bayniks-orange' : 'text-slate-400 hover:text-white'
        }`}
      >
        <span className="text-base">📦</span>
        <span className="text-[10px] font-medium">Parcels</span>
      </button>

      {/* Prominent Action Button: Book */}
      <button
        type="button"
        onClick={() => {
          onSelectTab('new_delivery');
          onOpenCreate?.();
        }}
        className="w-12 h-12 -mt-6 rounded-2xl bg-bayniks-orange text-white flex items-center justify-center text-xl font-bold shadow-bolt-glow hover:scale-105 active:scale-95 transition-transform"
      >
        +
      </button>

      {/* Track */}
      <button
        type="button"
        onClick={() => onSelectTab('track')}
        className={`flex flex-col items-center space-y-0.5 p-1.5 transition-colors ${
          activeTab === 'track' ? 'text-bayniks-orange' : 'text-slate-400 hover:text-white'
        }`}
      >
        <span className="text-base">📍</span>
        <span className="text-[10px] font-medium">Track</span>
      </button>

      {/* Profile / Support */}
      <button
        type="button"
        onClick={() => onSelectTab('support')}
        className={`flex flex-col items-center space-y-0.5 p-1.5 transition-colors ${
          activeTab === 'support' ? 'text-bayniks-orange' : 'text-slate-400 hover:text-white'
        }`}
      >
        <span className="text-base">👤</span>
        <span className="text-[10px] font-medium">Profile</span>
      </button>
    </nav>
  );
}
