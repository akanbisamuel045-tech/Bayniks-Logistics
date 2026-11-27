import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  CreditCard,
  Info,
  RefreshCw,
  FileCheck2,
  Bell,
} from 'lucide-react';
import { useRiderStore } from '../store/riderStore';
import { playKeypadChime } from '../utils/audioChimes';

export interface RiderInboxScreenProps {
  onOpenEarnings?: () => void;
}

export const RiderInboxScreen: React.FC<RiderInboxScreenProps> = () => {
  const { inboxNotifications, fetchInboxNotifications } = useRiderStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchInboxNotifications().catch(() => {});
  }, [fetchInboxNotifications]);

  const handleRefresh = async () => {
    playKeypadChime();
    setRefreshing(true);
    try {
      await fetchInboxNotifications();
    } finally {
      setRefreshing(false);
    }
  };

  const resolveIcon = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('fin') || lower.includes('pay')) return CreditCard;
    if (lower.includes('kyc')) return FileCheck2;
    if (lower.includes('traf') || lower.includes('disp')) return ShieldAlert;
    if (lower.includes('safe')) return Info;
    return Bell;
  };

  return (
    <div
      className="w-full h-full flex flex-col bg-[#F8FAFC] text-zinc-900 select-none overflow-hidden"
      data-testid="rider-inbox-screen"
    >
      {/* Top Header */}
      <div className="shrink-0 bg-white border-b border-zinc-200 px-5 py-3.5 flex items-center justify-between">
        <h2 className="text-lg font-black text-zinc-900 tracking-tight">Inbox</h2>
        <button
          type="button"
          onClick={handleRefresh}
          data-testid="inbox-refresh-btn"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#18181B] hover:text-[#FF5722] transition-colors cursor-pointer"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin text-[#FF5722]' : ''} />
          <span>Updates</span>
        </button>
      </div>

      {/* Main List Body (Live Backend Notifications + System Updates) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {inboxNotifications.map((item) => {
          const Icon = resolveIcon(item.category);
          return (
            <div
              key={item.id}
              className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-2xs space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 font-extrabold text-[#FF5722] bg-[#18181B] px-2.5 py-0.5 rounded-md">
                  <Icon size={12} />
                  <span>{item.category}</span>
                </span>
                <span className="text-zinc-400 font-medium">{item.date}</span>
              </div>
              <h3 className="text-sm font-black text-zinc-900">{item.title}</h3>
              <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                {item.body}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RiderInboxScreen;
