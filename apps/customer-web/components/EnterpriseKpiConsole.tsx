'use client';

import React from 'react';
import { formatNaira } from '@logistics/shared-types';

export interface EnterpriseKpiConsoleProps {
  activeDeliveriesCount?: number;
  completedDeliveriesCount?: number;
  onTimeSlaPercent?: number;
  walletBalanceKobo?: number;
  onTopUpClick?: () => void;
  onActiveDeliveriesClick?: () => void;
}

export function EnterpriseKpiConsole({
  activeDeliveriesCount = 3,
  completedDeliveriesCount = 1489,
  onTimeSlaPercent = 99.4,
  walletBalanceKobo = 4520000,
  onTopUpClick,
  onActiveDeliveriesClick,
}: EnterpriseKpiConsoleProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 select-none">
      {/* 1. Active Deliveries */}
      <div
        onClick={onActiveDeliveriesClick}
        className="clay-card-interactive p-4 rounded-2xl cursor-pointer group"
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider">Active Deliveries</span>
          <span className="p-1.5 rounded-lg bg-bayniks-orange/10 text-bayniks-orange text-xs group-hover:scale-110 transition-transform">
            🏍️
          </span>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-mono font-bold text-white tracking-tight">
            {activeDeliveriesCount}
          </span>
          <span className="text-xs font-mono text-bayniks-orange font-semibold">In Transit</span>
        </div>
        <div className="mt-2 text-[10px] text-slate-400 flex items-center space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Real-time GPS pings active</span>
        </div>
      </div>

      {/* 2. Completed Deliveries */}
      <div className="clay-card p-4 rounded-2xl">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider">Completed Waybills</span>
          <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs">
            ✓
          </span>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-mono font-bold text-white tracking-tight">
            {completedDeliveriesCount.toLocaleString()}
          </span>
          <span className="text-xs font-mono text-emerald-400 font-semibold">Delivered</span>
        </div>
        <div className="mt-2 text-[10px] text-slate-400">
          <span>100% 4-Digit PIN Verified POD</span>
        </div>
      </div>

      {/* 3. On-Time SLA */}
      <div className="clay-card p-4 rounded-2xl">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider">On-Time SLA</span>
          <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 text-xs">
            ⏱️
          </span>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-mono font-bold text-white tracking-tight">
            {onTimeSlaPercent.toFixed(1)}%
          </span>
          <span className="text-xs font-mono text-sky-400 font-semibold">Lagos Mainland & Island</span>
        </div>
        <div className="mt-2 text-[10px] text-slate-400">
          <span>Sub-45 min express motorcycle routing</span>
        </div>
      </div>

      {/* 4. Live Wallet Balance */}
      <div className="clay-card p-4 rounded-2xl relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider">Escrow Balance</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTopUpClick?.();
            }}
            className="px-2 py-0.5 rounded-md bg-bayniks-orange text-white text-[10px] font-semibold hover:bg-bayniks-orangeDark transition-colors shadow-sm"
          >
            + Top Up
          </button>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-xl md:text-2xl font-mono font-bold text-bayniks-orange tracking-tight">
            {formatNaira(walletBalanceKobo)}
          </span>
        </div>
        <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
          <span>Protected by Paystack & Monnify</span>
          <span className="text-emerald-400 font-mono text-[9px] uppercase">Active</span>
        </div>
      </div>
    </div>
  );
}

