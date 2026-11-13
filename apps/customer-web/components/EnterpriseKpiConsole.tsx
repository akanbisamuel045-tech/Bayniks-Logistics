'use client';

import React from 'react';
import { formatNaira } from '@logistics/shared-types';
import { Bike, CheckCircle2, Clock, Plus, ShieldCheck } from 'lucide-react';

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
        className="clay-card-interactive p-4 rounded-2xl cursor-pointer group bg-white border border-slate-200 shadow-sm hover:border-bayniks-orange transition-all"
      >
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-[11px] font-mono uppercase font-bold tracking-wider">Active Deliveries</span>
          <span className="p-1.5 rounded-lg bg-bayniks-orange/10 text-bayniks-orange group-hover:scale-110 transition-transform">
            <Bike className="w-4 h-4" />
          </span>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-mono font-black text-slate-900 tracking-tight">
            {activeDeliveriesCount}
          </span>
          <span className="text-xs font-mono text-bayniks-orange font-bold">In Transit</span>
        </div>
        <div className="mt-2 text-[10px] text-slate-500 font-medium flex items-center space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real-time GPS pings active</span>
        </div>
      </div>

      {/* 2. Completed Deliveries */}
      <div className="clay-card p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-[11px] font-mono uppercase font-bold tracking-wider">Completed Waybills</span>
          <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </span>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-mono font-black text-slate-900 tracking-tight">
            {completedDeliveriesCount.toLocaleString()}
          </span>
          <span className="text-xs font-mono text-emerald-600 font-bold">Delivered</span>
        </div>
        <div className="mt-2 text-[10px] text-slate-500 font-medium">
          <span>100% 4-Digit PIN Verified POD</span>
        </div>
      </div>

      {/* 3. On-Time SLA */}
      <div className="clay-card p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-[11px] font-mono uppercase font-bold tracking-wider">On-Time SLA</span>
          <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600">
            <Clock className="w-4 h-4" />
          </span>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-mono font-black text-slate-900 tracking-tight">
            {onTimeSlaPercent.toFixed(1)}%
          </span>
          <span className="text-xs font-mono text-sky-600 font-bold">Lagos Mainland & Island</span>
        </div>
        <div className="mt-2 text-[10px] text-slate-500 font-medium">
          <span>Sub-45 min express motorcycle routing</span>
        </div>
      </div>

      {/* 4. Live Wallet Balance */}
      <div className="clay-card p-4 rounded-2xl relative overflow-hidden bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-[11px] font-mono uppercase font-bold tracking-wider">Escrow Balance</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTopUpClick?.();
            }}
            className="px-2 py-0.5 rounded-md bg-bayniks-orange text-white text-[10px] font-bold hover:bg-bayniks-orangeDark transition-colors shadow-sm flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>Top Up</span>
          </button>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-xl md:text-2xl font-mono font-black text-bayniks-orange tracking-tight">
            {formatNaira(walletBalanceKobo)}
          </span>
        </div>
        <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between font-medium">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-slate-400" />
            Protected by Paystack & Monnify
          </span>
          <span className="text-emerald-600 font-mono text-[9px] font-bold uppercase">Active</span>
        </div>
      </div>
    </div>
  );
}

