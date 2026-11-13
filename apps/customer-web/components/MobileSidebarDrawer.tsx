'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Home,
  Bike,
  Plus,
  Calendar,
  Repeat,
  Clock,
  Bell,
  MessageSquare,
  LifeBuoy,
  Settings,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';

export interface MobileSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  activeDeliveriesCount?: number;
  walletBalanceKobo?: number;
  onOpenSupport?: () => void;
  onOpenDeliveries?: () => void;
}

export function MobileSidebarDrawer({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  activeDeliveriesCount = 2,
  onOpenSupport,
  onOpenDeliveries,
}: MobileSidebarDrawerProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleNav = (tabId: string, customAction?: () => void) => {
    if (customAction) {
      customAction();
    } else {
      onSelectTab(tabId);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex lg:hidden">
      {/* Backdrop overlay with blur */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-label="Close sidebar backdrop"
      />

      {/* Slide-out Sidebar Drawer */}
      <div className="relative w-[280px] max-w-[85vw] h-full bg-white flex flex-col justify-between shadow-2xl z-10 select-none overflow-hidden animate-in slide-in-from-left duration-200">
        {/* Header with Brand & Close Button */}
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF6D1F] flex items-center justify-center text-white font-bold text-sm shadow-sm">
              B
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-neutral-900 block leading-tight">
                Bayniks
              </span>
              <span className="text-[10px] font-bold text-[#FF6D1F] tracking-wide block">
                Express Logistics
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="w-8 h-8 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900 flex items-center justify-center transition"
          >
            <X className="w-4 h-4 text-neutral-900 stroke-[2.2]" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 hide-scrollbar">
          {/* Operations Section */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 block mb-1.5">
              Operations
            </span>

            {/* Dashboard */}
            <button
              type="button"
              onClick={() => handleNav('dashboard')}
              className={`w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs font-extrabold transition ${
                activeTab === 'dashboard'
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Home className="w-4 h-4 text-neutral-900 stroke-[2.2]" />
                <span>Dashboard</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-neutral-900" />
            </button>

            {/* Active Deliveries */}
            <button
              type="button"
              onClick={() => handleNav('active_deliveries')}
              className={`w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold transition ${
                activeTab === 'active_deliveries'
                  ? 'bg-neutral-100 text-neutral-900 font-extrabold'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Bike className="w-4 h-4 text-neutral-900 stroke-[2.2]" />
                <span>Active Deliveries</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-[10px] font-mono font-bold">
                {activeDeliveriesCount}
              </span>
            </button>

            {/* New Delivery */}
            <button
              type="button"
              onClick={() => handleNav('new_delivery')}
              className={`w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold transition ${
                activeTab === 'new_delivery'
                  ? 'bg-[#FF6D1F]/10 text-[#FF6D1F]'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Plus className="w-4 h-4 text-neutral-900 stroke-[2.2]" />
                <span className="font-extrabold text-neutral-900">+ New Delivery</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#FF6D1F] text-white text-[10px] font-extrabold">
                + Book
              </span>
            </button>

            {/* Schedule Delivery */}
            <button
              type="button"
              onClick={() => handleNav('schedule')}
              className={`w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold transition ${
                activeTab === 'schedule'
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Calendar className="w-4 h-4 text-neutral-900 stroke-[2.2]" />
                <span>Schedule Delivery</span>
              </div>
            </button>

            {/* Repeat Delivery */}
            <button
              type="button"
              onClick={() => handleNav('repeat')}
              className={`w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold transition ${
                activeTab === 'repeat'
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Repeat className="w-4 h-4 text-neutral-900 stroke-[2.2]" />
                <span>Repeat Delivery</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-[10px] font-mono font-bold">
                4
              </span>
            </button>

            {/* Delivery History */}
            <button
              type="button"
              onClick={() => handleNav('archive')}
              className="w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition"
            >
              <div className="flex items-center space-x-3">
                <Clock className="w-4 h-4 text-neutral-900 stroke-[2.2]" />
                <span>Delivery History</span>
              </div>
            </button>

            {/* Vendor Bulk CSV */}
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push('/vendor');
              }}
              className="w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition"
            >
              <div className="flex items-center space-x-3">
                <FileSpreadsheet className="w-4 h-4 text-neutral-900 stroke-[2.2]" />
                <span>Vendor Bulk CSV</span>
              </div>
            </button>

            {/* Command Center */}
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push('/admin');
              }}
              className="w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition"
            >
              <div className="flex items-center space-x-3">
                <ShieldCheck className="w-4 h-4 text-neutral-900 stroke-[2.2]" />
                <span>Command Center</span>
              </div>
            </button>
          </div>

          {/* Workspace Section */}
          <div className="space-y-1 pt-2 border-t border-neutral-100">
            <span className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 block mb-1.5">
              Workspace
            </span>

            {/* Notifications */}
            <button
              type="button"
              onClick={() => handleNav('notifications')}
              className="w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition"
            >
              <div className="flex items-center space-x-3">
                <Bell className="w-4 h-4 text-neutral-900 stroke-[2.2]" />
                <span>Notifications</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#FF6D1F]/10 text-[#FF6D1F] text-[10px] font-bold">
                3 New
              </span>
            </button>

            {/* Rider Chat */}
            <button
              type="button"
              onClick={() => handleNav('rider_chat')}
              className="w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition"
            >
              <div className="flex items-center space-x-3">
                <MessageSquare className="w-4 h-4 text-neutral-900 stroke-[2.2]" />
                <span>Rider Chat (Tariq)</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </button>

            {/* 24/7 Support Hub */}
            <button
              type="button"
              onClick={() => handleNav('support', onOpenSupport)}
              className="w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition"
            >
              <div className="flex items-center space-x-3">
                <LifeBuoy className="w-4 h-4 text-neutral-900 stroke-[2.2]" />
                <span>24/7 Support Hub</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold">
                24/7
              </span>
            </button>

            {/* Profile & Settings */}
            <button
              type="button"
              onClick={() => handleNav('profile')}
              className="w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition"
            >
              <div className="flex items-center space-x-3">
                <Settings className="w-4 h-4 text-neutral-900 stroke-[2.2]" />
                <span>Profile & Settings</span>
              </div>
            </button>
          </div>
        </div>

        {/* User Profile Pill at Bottom */}
        <div className="p-4 border-t border-neutral-100 flex items-center justify-between bg-neutral-50/70">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-[#FF6D1F] text-white font-bold flex items-center justify-center text-xs border-2 border-white shadow-xs">
                KS
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-extrabold text-neutral-900 truncate">
                Kainul Stevano
              </h4>
              <span className="text-[10px] text-neutral-400 truncate block">
                Verified Sender • Lagos
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleNav('profile')}
            className="w-8 h-8 rounded-xl bg-white hover:bg-neutral-200 text-neutral-900 border border-neutral-200 flex items-center justify-center transition"
            title="Settings"
          >
            <Settings className="w-3.5 h-3.5 text-neutral-900 stroke-[2.2]" />
          </button>
        </div>
      </div>
    </div>
  );
}
