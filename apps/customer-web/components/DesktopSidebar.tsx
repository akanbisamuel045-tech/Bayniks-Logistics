'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu,
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
  FileSpreadsheet,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export interface DesktopSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  walletBalanceKobo?: number;
  activeDeliveriesCount?: number;
  onOpenSupport?: () => void;
  onOpenDeliveries?: () => void;
}

export function DesktopSidebar({
  collapsed,
  onToggleCollapse,
  activeTab,
  onSelectTab,
  activeDeliveriesCount = 2,
  onOpenSupport,
  onOpenDeliveries,
}: DesktopSidebarProps) {
  const router = useRouter();

  const handleNav = (tabId: string, customAction?: () => void) => {
    if (customAction) {
      customAction();
    } else {
      onSelectTab(tabId);
    }
  };

  return (
    <aside
      id="desktopSidebar"
      className={`hidden lg:flex flex-col justify-between shrink-0 bg-white text-neutral-900 border-r border-neutral-200/90 select-none z-30 transition-all duration-300 ease-in-out ${
        collapsed ? 'w-20' : 'w-[264px]'
      }`}
    >
      {/* Top Menu Toggle & Navigation Links */}
      <div className="p-4 space-y-4 overflow-y-auto hide-scrollbar flex-1">
        {/* Brand Header Row with Toggle Button */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-bayniks-orange flex items-center justify-center text-white shadow-bolt-glow shrink-0">
              <Zap className="w-5 h-5 fill-white stroke-none" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-mono font-bold tracking-wider text-base text-neutral-900 leading-none">
                  BAYNIKS
                </span>
                <span className="text-[10px] uppercase font-mono tracking-widest text-bayniks-orange mt-1">
                  Express Logistics
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="w-8 h-8 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900 flex items-center justify-center transition active:scale-95"
          >
            <Menu className="w-4 h-4 text-neutral-900 stroke-[2.2]" />
          </button>
        </div>

        {/* OPERATIONS SECTION */}
        <div className="space-y-1">
          {!collapsed && (
            <span className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 block mb-1.5">
              Operations
            </span>
          )}

          {/* 1. Dashboard / Console Home */}
          <button
            type="button"
            onClick={() => handleNav('dashboard')}
            title="Dashboard"
            className={`w-full rounded-2xl flex items-center transition ${
              collapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 justify-between text-xs'
            } ${
              activeTab === 'dashboard'
                ? 'bg-neutral-100 font-extrabold text-neutral-900'
                : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 font-bold'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Home className="w-4 h-4 shrink-0 text-neutral-900 stroke-[2.2]" />
              {!collapsed && <span>Dashboard</span>}
              <span className="sr-only">Console Home</span>
            </div>
            {!collapsed && activeTab === 'dashboard' && (
              <span className="w-2 h-2 rounded-full bg-neutral-900" />
            )}
          </button>

          {/* 2. Active Deliveries */}
          <button
            type="button"
            onClick={() => handleNav('active_deliveries')}
            title="Active Deliveries"
            className={`w-full rounded-2xl flex items-center transition ${
              collapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 justify-between text-xs'
            } ${
              activeTab === 'active_deliveries'
                ? 'bg-neutral-100 font-extrabold text-neutral-900'
                : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 font-bold'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Bike className="w-4 h-4 shrink-0 text-neutral-900 stroke-[2.2]" />
              {!collapsed && <span>Active Deliveries</span>}
            </div>
            {!collapsed && (
              <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-[10px] font-mono font-bold">
                {activeDeliveriesCount}
              </span>
            )}
          </button>

          {/* 3. + New Delivery */}
          <button
            type="button"
            onClick={() => handleNav('new_delivery')}
            title="New Delivery"
            className={`w-full rounded-2xl flex items-center transition ${
              collapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 justify-between text-xs'
            } ${
              activeTab === 'new_delivery'
                ? 'bg-bayniks-orange/10 text-bayniks-orange font-extrabold'
                : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 font-bold'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Plus className="w-4 h-4 shrink-0 text-neutral-900 stroke-[2.2]" />
              {!collapsed && <span className="font-extrabold text-neutral-900">+ New Delivery</span>}
            </div>
            {!collapsed && (
              <span className="px-2 py-0.5 rounded-full bg-bayniks-orange text-white text-[10px] font-extrabold shadow-bolt-glow">
                + Book
              </span>
            )}
          </button>

          {/* 4. Schedule Delivery */}
          <button
            type="button"
            onClick={() => handleNav('schedule')}
            title="Schedule Delivery"
            className={`w-full rounded-2xl flex items-center transition ${
              collapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 justify-between text-xs'
            } ${
              activeTab === 'schedule'
                ? 'bg-neutral-100 font-extrabold text-neutral-900'
                : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 font-bold'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Calendar className="w-4 h-4 shrink-0 text-neutral-900 stroke-[2.2]" />
              {!collapsed && <span>Schedule Delivery</span>}
            </div>
          </button>

          {/* 5. Repeat Delivery */}
          <button
            type="button"
            onClick={() => handleNav('repeat')}
            title="Repeat Delivery"
            className={`w-full rounded-2xl flex items-center transition ${
              collapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 justify-between text-xs'
            } ${
              activeTab === 'repeat'
                ? 'bg-neutral-100 font-extrabold text-neutral-900'
                : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 font-bold'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Repeat className="w-4 h-4 shrink-0 text-neutral-900 stroke-[2.2]" />
              {!collapsed && <span>Repeat Delivery</span>}
            </div>
            {!collapsed && (
              <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-[10px] font-mono font-bold">
                4
              </span>
            )}
          </button>

          {/* 6. Delivery History */}
          <button
            type="button"
            onClick={() => handleNav('archive')}
            title="Delivery History"
            className={`w-full rounded-2xl flex items-center transition ${
              collapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 justify-between text-xs'
            } ${
              activeTab === 'archive'
                ? 'bg-neutral-100 font-extrabold text-neutral-900'
                : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 font-bold'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Clock className="w-4 h-4 shrink-0 text-neutral-900 stroke-[2.2]" />
              {!collapsed && <span>Delivery History</span>}
            </div>
          </button>

          {/* 7. Vendor Bulk CSV */}
          <button
            type="button"
            onClick={() => router.push('/vendor')}
            title="Vendor Bulk CSV"
            className={`w-full rounded-2xl flex items-center transition ${
              collapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 justify-between text-xs'
            } text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 font-bold`}
          >
            <div className="flex items-center space-x-3">
              <FileSpreadsheet className="w-4 h-4 shrink-0 text-neutral-900 stroke-[2.2]" />
              {!collapsed && <span>Vendor Bulk CSV</span>}
            </div>
          </button>

          {/* 8. Command Center */}
          <button
            type="button"
            onClick={() => router.push('/admin')}
            title="Command Center"
            className={`w-full rounded-2xl flex items-center transition ${
              collapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 justify-between text-xs'
            } text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 font-bold`}
          >
            <div className="flex items-center space-x-3">
              <ShieldCheck className="w-4 h-4 shrink-0 text-neutral-900 stroke-[2.2]" />
              {!collapsed && <span>Command Center</span>}
            </div>
          </button>
        </div>

        {/* WORKSPACE SECTION */}
        <div className="space-y-1 pt-3 border-t border-neutral-100">
          {!collapsed && (
            <span className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 block mb-1.5">
              Workspace
            </span>
          )}

          {/* Notifications */}
          <button
            type="button"
            onClick={() => handleNav('notifications')}
            title="Notifications"
            className={`w-full rounded-2xl flex items-center transition ${
              collapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 justify-between text-xs'
            } text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 font-bold`}
          >
            <div className="flex items-center space-x-3">
              <Bell className="w-4 h-4 shrink-0 text-neutral-900 stroke-[2.2]" />
              {!collapsed && <span>Notifications</span>}
            </div>
            {!collapsed && (
              <span className="px-2 py-0.5 rounded-full bg-bayniks-orange/10 text-bayniks-orange text-[10px] font-bold">
                3 New
              </span>
            )}
          </button>

          {/* Rider Chat */}
          <button
            type="button"
            onClick={() => handleNav('rider_chat')}
            title="Rider Chat (Tariq)"
            className={`w-full rounded-2xl flex items-center transition ${
              collapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 justify-between text-xs'
            } text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 font-bold`}
          >
            <div className="flex items-center space-x-3">
              <MessageSquare className="w-4 h-4 shrink-0 text-neutral-900 stroke-[2.2]" />
              {!collapsed && <span>Rider Chat (Tariq)</span>}
            </div>
            {!collapsed && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            )}
          </button>

          {/* 24/7 Support Hub */}
          <button
            type="button"
            onClick={() => handleNav('support', onOpenSupport)}
            title="24/7 Support Hub"
            className={`w-full rounded-2xl flex items-center transition ${
              collapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 justify-between text-xs'
            } text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 font-bold`}
          >
            <div className="flex items-center space-x-3">
              <LifeBuoy className="w-4 h-4 shrink-0 text-neutral-900 stroke-[2.2]" />
              {!collapsed && <span>24/7 Support Hub</span>}
            </div>
            {!collapsed && (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold">
                24/7
              </span>
            )}
          </button>

          {/* Profile & Settings */}
          <button
            type="button"
            onClick={() => handleNav('profile')}
            title="Profile & Settings"
            className={`w-full rounded-2xl flex items-center transition ${
              collapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 justify-between text-xs'
            } text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 font-bold`}
          >
            <div className="flex items-center space-x-3">
              <Settings className="w-4 h-4 shrink-0 text-neutral-900 stroke-[2.2]" />
              {!collapsed && <span>Profile & Settings</span>}
            </div>
          </button>
        </div>
      </div>

      {/* User Profile Pill at Bottom (Matches bayniks_edition.html) */}
      <div className="p-4 border-t border-neutral-100 flex items-center justify-between bg-neutral-50/70">
        <div
          onClick={() => handleNav('profile')}
          className="flex items-center space-x-2.5 cursor-pointer group min-w-0"
        >
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-full bg-bayniks-orange text-white font-bold flex items-center justify-center text-xs border-2 border-white shadow-xs">
              KS
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h4 className="text-xs font-extrabold text-neutral-900 truncate group-hover:text-bayniks-orange transition">
                Kainul Stevano
              </h4>
              <span className="text-[10px] text-neutral-400 truncate block">
                Verified Sender • Lagos
              </span>
            </div>
          )}
        </div>

        {!collapsed && (
          <button
            type="button"
            onClick={() => handleNav('profile')}
            className="w-8 h-8 rounded-xl bg-white hover:bg-neutral-200 text-neutral-900 border border-neutral-200/90 flex items-center justify-center transition active:scale-95 shadow-2xs"
            title="Settings"
          >
            <Settings className="w-3.5 h-3.5 text-neutral-900 stroke-[2.2]" />
          </button>
        )}
      </div>
    </aside>
  );
}
