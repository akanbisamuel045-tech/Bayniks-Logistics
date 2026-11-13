'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Search,
  Plus,
  LayoutGrid,
  Bell,
  ShieldCheck,
  FileSpreadsheet,
  QrCode,
} from 'lucide-react';

export interface DesktopHeaderProps {
  onToggleSidebar?: () => void;
  onOpenMobileSidebar?: () => void;
  onBookDelivery?: () => void;
  onBookDeliveryClick?: () => void;
  onOpenQrScan?: () => void;
  onOpenQrScanner?: () => void;
  onOpenDeliveries?: () => void;
  onOpenNotifications?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  activeTabTitle?: string;
}

export function DesktopHeader({
  onToggleSidebar,
  onOpenMobileSidebar,
  onBookDelivery,
  onBookDeliveryClick,
  onOpenQrScan,
  onOpenQrScanner,
  onOpenDeliveries,
  onOpenNotifications,
  searchQuery = '',
  onSearchChange,
  activeTabTitle = 'Dashboard',
}: DesktopHeaderProps) {
  const router = useRouter();

  const handleBook = () => {
    if (onBookDelivery) onBookDelivery();
    else if (onBookDeliveryClick) onBookDeliveryClick();
  };

  const handleQr = () => {
    if (onOpenQrScan) onOpenQrScan();
    else if (onOpenQrScanner) onOpenQrScanner();
  };

  return (
    <header
      id="desktopHeader"
      className="px-4 md:px-7 py-3 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 flex items-center justify-between shrink-0 z-20"
    >
      {/* Left Menu Toggle & Breadcrumb */}
      <div className="flex items-center space-x-2 md:space-x-2.5 min-w-0">
        {/* Mobile Hamburger (visible < 1024px) */}
        {onOpenMobileSidebar && (
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="lg:hidden w-8 h-8 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900 flex items-center justify-center transition active:scale-95 mr-1"
            title="Open Menu"
            aria-label="Open navigation sidebar"
          >
            <Menu className="w-4 h-4 text-neutral-800" />
          </button>
        )}

        {/* Desktop Hamburger (visible >= 1024px) */}
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden lg:flex w-8 h-8 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900 items-center justify-center transition active:scale-95 mr-1"
            title="Toggle Sidebar"
            aria-label="Toggle sidebar collapse"
          >
            <Menu className="w-4 h-4 text-neutral-800" />
          </button>
        )}

        <span className="text-xs font-bold text-neutral-400 hidden sm:inline">Bayniks</span>
        <span className="text-neutral-300 hidden sm:inline">/</span>
        <div className="flex items-center space-x-1.5 md:space-x-2">
          <span className="w-2 h-2 rounded-full bg-[#FF6D1F]" />
          <h1 className="text-xs md:text-sm font-extrabold text-neutral-900 tracking-tight truncate">
            {activeTabTitle}
          </h1>
        </div>
        <span className="ml-1 md:ml-2 px-2 md:px-2.5 py-0.5 rounded-full bg-[#FFF7ED] text-[#FF6D1F] text-[9px] md:text-[10px] font-extrabold border border-[#FF6D1F]/20 whitespace-nowrap">
          Lagos Hub • Live
        </span>
        <span className="sr-only">Hub Online • 99.4% SLA</span>
      </div>

      {/* Center Global Omni-Search Bar */}
      <div className="flex-1 max-w-md mx-3 md:mx-6 hidden md:block">
        <div className="relative flex items-center">
          <span className="absolute left-3.5 text-neutral-400 pointer-events-none">
            <Search className="w-4 h-4 text-neutral-400" />
          </span>
          <input
            id="desktopOmniSearchInput"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search waybill ID (#BF12345, #473215090), recipient..."
            className="w-full bg-neutral-100 text-neutral-900 text-xs font-semibold pl-10 pr-14 py-2 rounded-2xl border border-neutral-200/90 focus:outline-none focus:border-[#FF6D1F] focus:bg-white transition"
          />
          <kbd className="absolute right-3 px-1.5 py-0.5 rounded-md bg-white border border-neutral-200 text-[10px] font-mono font-bold text-neutral-400 shadow-2xs">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Quick Action Suite */}
      <div className="flex items-center space-x-1.5 md:space-x-2.5 shrink-0">
        <button
          type="button"
          onClick={handleBook}
          className="px-3 md:px-4 py-1.5 md:py-2 rounded-2xl bg-[#FF6D1F] hover:bg-[#EA580C] text-white text-xs font-extrabold shadow-bolt-glow flex items-center space-x-1 md:space-x-2 transition active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="hidden sm:inline whitespace-nowrap">Book Delivery</span>
          <span className="sm:hidden whitespace-nowrap">Book</span>
        </button>

        {/* Quick QR Scanner Shortcut */}
        <button
          type="button"
          onClick={handleQr}
          title="Scan Handover QR Code"
          aria-label="Scan Handover QR Code"
          className="hidden sm:flex w-9 h-9 md:w-10 md:h-10 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-200/80 items-center justify-center transition active:scale-90"
        >
          <QrCode className="w-4 h-4 text-[#FF6D1F]" />
        </button>

        {/* Bulk CSV Shortcut for vendor integration tests */}
        <button
          type="button"
          onClick={() => router.push('/vendor')}
          title="Vendor Bulk Multi-Stop Dispatch"
          className="hidden xl:flex w-9 h-9 md:w-10 md:h-10 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-200/80 items-center justify-center transition active:scale-90"
        >
          <FileSpreadsheet className="w-4 h-4 text-neutral-700" />
        </button>

        {/* Command Center Shortcut for admin integration tests */}
        <button
          type="button"
          onClick={() => router.push('/admin')}
          title="Super-Admin & Fleet Command Center"
          className="hidden xl:flex w-9 h-9 md:w-10 md:h-10 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-200/80 items-center justify-center transition active:scale-90"
        >
          <ShieldCheck className="w-4 h-4 text-neutral-700" />
        </button>

        <button
          type="button"
          onClick={onOpenNotifications}
          title="Notifications"
          aria-label="Notifications"
          className="relative w-9 h-9 md:w-10 md:h-10 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-200/80 flex items-center justify-center transition active:scale-90"
        >
          <Bell className="w-4 h-4 text-neutral-700" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FF6D1F]" />
        </button>

        <div className="w-9 h-9 md:w-10 md:h-10 rounded-2xl bg-[#FFEDD5] border-2 border-[#FED7AA] flex items-center justify-center text-[#C2410C] font-extrabold text-xs md:text-sm shadow-xs select-none">
          J
        </div>
      </div>
    </header>
  );
}
