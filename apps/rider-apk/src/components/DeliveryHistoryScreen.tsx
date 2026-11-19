import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  PackageCheck,
  MapPin,
  Clock,
  Navigation,
  ShieldCheck,
  QrCode,
  KeyRound,
  FileText,
  X,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { useRiderStore, DeliveryHistoryItem } from '../store/riderStore';
import { playKeypadChime } from '../utils/audioChimes';

export interface DeliveryHistoryScreenProps {
  onBack?: () => void;
}

function formatKobo(kobo: number): string {
  const naira = kobo / 100;
  return `₦${naira.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const DeliveryHistoryScreen: React.FC<DeliveryHistoryScreenProps> = ({ onBack }) => {
  const { deliveryHistory, onTimeSlaPercent, showToast } = useRiderStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'delivered' | 'disputed'>('all');
  const [activeWaybill, setActiveWaybill] = useState<DeliveryHistoryItem | null>(null);

  // Filtered deliveries list
  const filteredDeliveries = useMemo(() => {
    return deliveryHistory.filter((item) => {
      // Search matching
      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const matchesCode = item.trackingCode.toLowerCase().includes(query);
        const matchesAddress =
          item.fromAddress.toLowerCase().includes(query) ||
          item.toAddress.toLowerCase().includes(query) ||
          item.fromLandmark.toLowerCase().includes(query) ||
          item.toLandmark.toLowerCase().includes(query);
        const matchesRecipient = item.recipientName.toLowerCase().includes(query);
        if (!matchesCode && !matchesAddress && !matchesRecipient) {
          return false;
        }
      }

      // Period matching
      if (selectedPeriod === 'today') {
        if (item.date !== 'Today') return false;
      } else if (selectedPeriod === 'week') {
        const oneWeekAgo = Date.now() - 7 * 24 * 3600 * 1000;
        if (item.timestamp < oneWeekAgo) return false;
      } else if (selectedPeriod === 'month') {
        const oneMonthAgo = Date.now() - 30 * 24 * 3600 * 1000;
        if (item.timestamp < oneMonthAgo) return false;
      }

      // Status matching
      if (selectedStatus !== 'all') {
        if (item.status !== selectedStatus) return false;
      }

      return true;
    });
  }, [deliveryHistory, searchQuery, selectedPeriod, selectedStatus]);

  // Aggregated totals
  const totalEarnedKobo = useMemo(() => {
    return deliveryHistory.reduce((acc, curr) => acc + curr.fareKobo + (curr.tipKobo || 0), 0);
  }, [deliveryHistory]);

  const totalDistanceKm = useMemo(() => {
    return deliveryHistory.reduce((acc, curr) => acc + curr.distanceKm, 0);
  }, [deliveryHistory]);

  return (
    <div
      className="min-h-full pb-28 bg-[#FAFAF9] text-zinc-900 select-none animate-fadeIn"
      data-testid="delivery-history-screen"
    >
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 py-3.5 border-b border-zinc-200 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={() => {
                playKeypadChime();
                onBack();
              }}
              className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:scale-95 flex items-center justify-center text-zinc-800 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <h1 className="text-base font-black tracking-tight leading-tight">
              Delivery History
            </h1>
            <p className="text-[11px] font-semibold text-zinc-500">
              Completed missions, proof of delivery & payouts
            </p>
          </div>
        </div>

        <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-orange-50 text-[#FF5722] border border-orange-200">
          {filteredDeliveries.length} Records
        </span>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-sm text-center">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Total Deliveries
            </span>
            <span className="block text-lg font-black text-zinc-900 mt-0.5">
              {deliveryHistory.length}
            </span>
            <span className="text-[10px] text-emerald-600 font-bold">
              {deliveryHistory.length > 0 ? `${onTimeSlaPercent || 99.4}% on-time` : '100% on-time'}
            </span>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-sm text-center">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Distance (Km)
            </span>
            <span className="block text-lg font-black text-zinc-900 mt-0.5">
              {totalDistanceKm.toFixed(1)}
            </span>
            <span className="text-[10px] text-zinc-400 font-medium">
              Lagos Corridors
            </span>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-sm text-center">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Total Earned
            </span>
            <span className="block text-base font-black text-[#FF5722] mt-1 truncate">
              {formatKobo(totalEarnedKobo)}
            </span>
            <span className="text-[10px] text-zinc-400 font-medium">
              Gross Net
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tracking code (#LGS-...), landmark, or recipient..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#FF5722] shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Period Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all' as const, label: 'All Time' },
            { id: 'today' as const, label: 'Today' },
            { id: 'week' as const, label: 'This Week' },
            { id: 'month' as const, label: 'This Month' },
          ].map((tab) => {
            const active = selectedPeriod === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  playKeypadChime();
                  setSelectedPeriod(tab.id);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-[#1E1C1A] text-white shadow-sm'
                    : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Deliveries List */}
        <div className="space-y-3">
          {filteredDeliveries.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-zinc-200 text-center space-y-2">
              <PackageCheck size={32} className="mx-auto text-zinc-300" />
              <div className="text-sm font-bold text-zinc-700">No delivery records found</div>
              <p className="text-xs text-zinc-400">
                Try adjusting your search keywords or period filter.
              </p>
            </div>
          ) : (
            filteredDeliveries.map((delivery) => (
              <div
                key={delivery.id}
                className="bg-white rounded-3xl p-4 border border-zinc-200 shadow-sm hover:border-orange-200 transition-all space-y-3"
              >
                {/* Header: Tracking Code, Status & Payout */}
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-zinc-900 bg-zinc-100 px-2.5 py-1 rounded-xl">
                      #{delivery.trackingCode}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck size={12} />
                      <span>Delivered</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-[#FF5722]">
                      {formatKobo(delivery.fareKobo + (delivery.tipKobo || 0))}
                    </span>
                    {delivery.tipKobo > 0 && (
                      <span className="block text-[10px] font-semibold text-emerald-600">
                        +{formatKobo(delivery.tipKobo)} Tip
                      </span>
                    )}
                  </div>
                </div>

                {/* Route Flow */}
                <div className="space-y-2 text-xs">
                  {/* Pickup */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0 ring-4 ring-emerald-50" />
                    <div>
                      <div className="font-bold text-zinc-800 line-clamp-1">
                        {delivery.fromAddress}
                      </div>
                      <div className="text-[11px] text-zinc-400 line-clamp-1">
                        📍 {delivery.fromLandmark}
                      </div>
                    </div>
                  </div>

                  {/* Dropoff */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#FF5722] mt-1 shrink-0 ring-4 ring-orange-50" />
                    <div>
                      <div className="font-bold text-zinc-800 line-clamp-1">
                        {delivery.toAddress}
                      </div>
                      <div className="text-[11px] text-zinc-400 line-clamp-1">
                        🏁 {delivery.toLandmark}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metadata Strip & Proof Badge */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-[11px] text-zinc-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock size={12} className="text-zinc-400" />
                      <span>{delivery.date}, {delivery.time}</span>
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <Navigation size={12} className="text-zinc-400" />
                      <span>{delivery.distanceKm} km ({delivery.durationMins}m)</span>
                    </span>
                  </div>

                  {/* Proof of delivery pill */}
                  <div className="flex items-center gap-1 font-bold text-zinc-700 bg-zinc-50 px-2 py-0.5 rounded-lg border border-zinc-200">
                    {delivery.proofType === 'pin' ? (
                      <>
                        <KeyRound size={11} className="text-[#FF5722]" />
                        <span>PIN {delivery.pinUsed || '7482'}</span>
                      </>
                    ) : (
                      <>
                        <QrCode size={11} className="text-[#FF5722]" />
                        <span>QR Verified</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Electronic Waybill Button */}
                <button
                  type="button"
                  onClick={() => {
                    playKeypadChime();
                    setActiveWaybill(delivery);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-bold flex items-center justify-center gap-1.5 border border-zinc-200 transition-colors"
                >
                  <FileText size={13} className="text-zinc-500" />
                  <span>View Electronic Waybill & Breakdown</span>
                  <ChevronRight size={13} className="text-zinc-400" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Electronic Waybill Modal Sheet */}
      {activeWaybill && (
        <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-3 animate-fadeIn">
          <div className="bg-white w-full max-w-[390px] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-zinc-200 space-y-4 max-h-[85vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-[#FF5722]" />
                <h3 className="text-base font-black text-zinc-900">
                  Electronic Waybill #{activeWaybill.trackingCode}
                </h3>
              </div>
              <button
                onClick={() => setActiveWaybill(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-zinc-900"
              >
                <X size={16} />
              </button>
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Delivery Date & Time</span>
                <span className="font-bold text-zinc-800">
                  {activeWaybill.date}, {activeWaybill.time}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Package Description</span>
                <span className="font-bold text-zinc-800">{activeWaybill.packageType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Recipient</span>
                <span className="font-bold text-zinc-800">
                  {activeWaybill.recipientName} ({activeWaybill.recipientPhone})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Handover Proof Mode</span>
                <span className="font-bold text-emerald-600">
                  {activeWaybill.proofType === 'pin'
                    ? `4-Digit Customer PIN Verified (${activeWaybill.pinUsed})`
                    : 'Tactile QR Scanner Laser Verified'}
                </span>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="space-y-2 border-t border-zinc-100 pt-3 text-xs">
              <div className="flex justify-between text-zinc-600">
                <span>Base Fare (First 2.0 km)</span>
                <span>{formatKobo(Math.round(activeWaybill.fareKobo * 0.55))}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Distance Pay ({activeWaybill.distanceKm} km)</span>
                <span>{formatKobo(Math.round(activeWaybill.fareKobo * 0.35))}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Surge & Peak Multiplier (1.2x)</span>
                <span>{formatKobo(Math.round(activeWaybill.fareKobo * 0.1))}</span>
              </div>
              {activeWaybill.tipKobo > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Customer Tip (100% to Rider)</span>
                  <span>+{formatKobo(activeWaybill.tipKobo)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-zinc-900 pt-2 border-t border-zinc-200">
                <span>Total Net Credited to Wallet</span>
                <span className="text-[#FF5722]">
                  {formatKobo(activeWaybill.fareKobo + (activeWaybill.tipKobo || 0))}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                showToast('Waybill receipt PDF downloaded');
                setActiveWaybill(null);
              }}
              className="w-full py-3 px-4 rounded-2xl bg-[#FF5722] hover:bg-[#E64A19] text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-orange-500/20"
            >
              Download PDF Waybill Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
