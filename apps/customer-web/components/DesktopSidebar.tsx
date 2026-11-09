'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { formatNaira } from '@logistics/shared-types';

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
  walletBalanceKobo = 4520000, // ₦45,200.00 default enterprise balance
  activeDeliveriesCount = 2,
  onOpenSupport,
  onOpenDeliveries,
}: DesktopSidebarProps) {
  const router = useRouter();

  const navItems = [
    { id: 'dashboard', label: 'Console Home', icon: '⚡' },
    {
      id: 'active_deliveries',
      label: 'Active Deliveries',
      icon: '🏍️',
      badge: activeDeliveriesCount > 0 ? `${activeDeliveriesCount}` : undefined,
      onClick: onOpenDeliveries,
    },
    { id: 'new_delivery', label: 'New Delivery', icon: '📦' },
    {
      id: 'vendor',
      label: 'Vendor Bulk CSV',
      icon: '📊',
      onClick: () => router.push('/vendor'),
    },
    { id: 'schedule', label: 'Scheduled Fleet', icon: '📅' },
    { id: 'repeat', label: 'Repeat Orders', icon: '🔄' },
    { id: 'archive', label: 'Waybill Archive', icon: '📑' },
    {
      id: 'support',
      label: '24/7 Priority Desk',
      icon: '🎧',
      onClick: onOpenSupport,
    },
  ];

  return (
    <aside
      className={`hidden lg:flex flex-col flex-shrink-0 bg-bayniks-cardDark border-r border-slate-800/80 transition-all duration-300 ease-in-out relative z-30 select-none ${
        collapsed ? 'w-20' : 'w-[264px]'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-bayniks-orange flex items-center justify-center font-mono font-bold text-white shadow-bolt-glow flex-shrink-0 text-lg">
            ⚡
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-mono font-bold tracking-wider text-base text-white leading-none">
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
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-bayniks-surfaceDark transition-colors"
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.onClick) {
                  item.onClick();
                } else {
                  onSelectTab(item.id);
                }
              }}
              className={`w-full flex items-center rounded-xl transition-all duration-150 group relative ${
                collapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 justify-between'
              } ${
                isActive
                  ? 'bg-bayniks-orange text-white font-semibold shadow-bolt-glow'
                  : 'text-slate-300 hover:text-white hover:bg-bayniks-surfaceDark'
              }`}
            >
              <div className="flex items-center space-x-3 overflow-hidden">
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                {!collapsed && (
                  <span className="text-xs truncate tracking-wide">{item.label}</span>
                )}
              </div>

              {!collapsed && item.badge && (
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-white text-bayniks-orange'
                      : 'bg-bayniks-orange/20 text-bayniks-orange border border-bayniks-orange/40'
                  }`}
                >
                  {item.badge}
                </span>
              )}

              {/* Tooltip on collapsed state */}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2.5 py-1 bg-bayniks-black text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity border border-slate-800 shadow-xl z-50">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Verified User Identity & Wallet Balance Card */}
      <div className="p-3 border-t border-slate-800/80 bg-bayniks-black/60">
        {!collapsed ? (
          <div className="p-3 rounded-xl bg-bayniks-surfaceDark/70 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                  AB
                </div>
                <div className="truncate">
                  <div className="text-xs font-semibold text-white truncate">Adeola Balogun</div>
                  <div className="text-[10px] font-mono text-emerald-400 flex items-center space-x-1">
                    <span>✓</span>
                    <span>VERIFIED ENTERPRISE</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-slate-400">Escrow Balance</span>
              <span className="text-xs font-mono font-bold text-bayniks-orange">
                {formatNaira(walletBalanceKobo)}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title={`Escrow Balance: ${formatNaira(walletBalanceKobo)}`}>
            <div className="w-10 h-10 rounded-xl bg-bayniks-surfaceDark border border-slate-800 flex items-center justify-center text-bayniks-orange font-mono font-bold text-xs">
              ₦
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

