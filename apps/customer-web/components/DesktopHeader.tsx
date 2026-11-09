'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface DesktopHeaderProps {
  onOpenQrScanner: () => void;
  onBookDeliveryClick: () => void;
  onOpenDeliveries?: () => void;
}

export function DesktopHeader({
  onOpenQrScanner,
  onBookDeliveryClick,
  onOpenDeliveries,
}: DesktopHeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = searchQuery.trim().toUpperCase();
    if (!cleanQuery) return;
    if (cleanQuery.startsWith('LGS-')) {
      router.push(`/track/${cleanQuery}`);
    } else {
      router.push(`/track/LGS-${cleanQuery.replace(/[^0-9]/g, '').slice(0, 6) || cleanQuery}`);
    }
  };

  return (
    <header className="h-16 bg-bayniks-cardDark/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-20 px-6 flex items-center justify-between">
      {/* Breadcrumb & Hub Status */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-slate-400">Lagos Hub</span>
          <span className="text-slate-600">/</span>
          <span className="text-white font-semibold">Live Fleet Console</span>
        </div>

        <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-[11px] font-mono text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Hub Online • 99.4% SLA</span>
        </div>
      </div>

      {/* Omni-search Bar & Actions */}
      <div className="flex items-center space-x-3">
        {/* Waybill Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative hidden md:block">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search waybill (e.g. LGS-847291) or phone..."
            className="w-72 bg-bayniks-surfaceDark border border-slate-700/80 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-bayniks-orange focus:ring-1 focus:ring-bayniks-orange transition-all font-mono"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center space-x-1 text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
            <span>⌘K</span>
          </div>
        </form>

        {/* QR Scanner Shortcut */}
        <button
          type="button"
          onClick={onOpenQrScanner}
          title="Scan Handover QR Code"
          className="p-2 rounded-xl bg-bayniks-surfaceDark border border-slate-800 text-slate-300 hover:text-white hover:border-bayniks-orange transition-all flex items-center space-x-1 text-xs"
        >
          <span className="text-sm">📷</span>
          <span className="hidden xl:inline font-mono text-[11px]">Scan QR</span>
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-xl bg-bayniks-surfaceDark border border-slate-800 text-slate-300 hover:text-white transition-all relative"
          >
            <span className="text-sm">🔔</span>
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-bayniks-orange ring-2 ring-bayniks-cardDark" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-bayniks-cardDark border border-slate-800 rounded-2xl shadow-nav-float p-3 text-xs space-y-2 z-50">
              <div className="font-semibold text-white border-b border-slate-800 pb-2 flex justify-between items-center">
                <span>Dispatch Updates</span>
                <span className="text-[10px] font-mono text-bayniks-orange">2 new</span>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                <div className="p-2 rounded-lg bg-bayniks-surfaceDark border border-slate-800/80 space-y-1">
                  <div className="text-white font-medium">Waybill LGS-482019 Delivered</div>
                  <div className="text-[10px] text-slate-400 font-mono">2 mins ago • Tariq D.</div>
                </div>
                <div className="p-2 rounded-lg bg-bayniks-surfaceDark border border-slate-800/80 space-y-1">
                  <div className="text-white font-medium">Rider Assigned: LGS-938102</div>
                  <div className="text-[10px] text-slate-400 font-mono">14 mins ago • En route pickup</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dark Mode Indicator */}
        <div className="p-2 rounded-xl bg-bayniks-surfaceDark border border-slate-800 text-slate-400 text-xs hidden sm:flex items-center">
          <span>🌙</span>
        </div>

        {/* Quick CTA */}
        <button
          type="button"
          onClick={onBookDeliveryClick}
          className="bg-bayniks-orange hover:bg-bayniks-orangeDark text-white px-3.5 py-1.5 rounded-xl font-semibold text-xs shadow-bolt-glow transition-all flex items-center space-x-1.5"
        >
          <span>+</span>
          <span>Book Delivery</span>
        </button>
      </div>
    </header>
  );
}
