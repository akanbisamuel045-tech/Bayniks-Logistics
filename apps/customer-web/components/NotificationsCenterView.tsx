'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import {
  ArrowLeft,
  Bike,
  ShieldCheck,
  CreditCard,
  Tag,
  Check,
  X,
  ArrowUpRight,
  Copy,
  Receipt,
  Bell,
} from 'lucide-react';

export type NotificationType = 'delivery' | 'security' | 'wallet' | 'promo';

export interface AppNotificationItem {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  time: string;
  group: 'TODAY' | 'YESTERDAY' | 'EARLIER';
  unread: boolean;
  actionType?: 'track' | 'otp' | 'wallet' | 'receipt' | 'promo';
  actionLabel?: string;
  waybillId?: string;
  otpCode?: string;
  voucherCode?: string;
}

export interface NotificationsCenterViewProps {
  initialNotifications?: AppNotificationItem[];
  onBackClick?: () => void;
  onTrackWaybill?: (waybillId: string) => void;
  onViewOtp?: (otpCode: string) => void;
  onViewWallet?: () => void;
}

const DEFAULT_NOTIFICATIONS: AppNotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Courier is 5 mins away!',
    message: 'Tariq Danladi (BLT-4912) is 5 minutes away from drop-off destination at Victoria Island Towers with package #BYN-LGS-473215.',
    type: 'delivery',
    time: '2m ago',
    group: 'TODAY',
    unread: true,
    actionType: 'track',
    actionLabel: 'Track Live',
    waybillId: '#BYN-LGS-473215',
  },
  {
    id: 'notif-2',
    title: 'Handover Security PIN (OTP)',
    message: 'Share this 4-digit verification code with your courier upon arrival at Sabo Yaba to confirm secure package handover.',
    type: 'security',
    time: '18m ago',
    group: 'TODAY',
    unread: true,
    actionType: 'otp',
    actionLabel: 'View Handover Pass',
    otpCode: '4829',
    waybillId: '#BYN-LGS-473215',
  },
  {
    id: 'notif-3',
    title: 'Wallet Credited (+₦20,000.00)',
    message: 'Mastercard •••• 4022 successfully credited your Bayniks Delivery Wallet. Current available balance: ₦45,200.00.',
    type: 'wallet',
    time: '2h ago',
    group: 'TODAY',
    unread: true,
    actionType: 'wallet',
    actionLabel: 'View Wallet',
  },
  {
    id: 'notif-4',
    title: 'Package Delivered & Signed',
    message: 'Waybill #BYN-LGS-882410 (Apple MacBook Pro 16") was safely delivered to Alex Rivera at Marina Hub and confirmed by digital signature.',
    type: 'delivery',
    time: 'Yesterday, 4:48 PM',
    group: 'YESTERDAY',
    unread: false,
    actionType: 'receipt',
    actionLabel: 'View Waybill Archive',
    waybillId: '#BYN-LGS-882410',
  },
  {
    id: 'notif-5',
    title: '15% Off Your Next Lagos Dispatch!',
    message: 'Use voucher code BAYNIKSFAST15 on checkout for insured express motorcycle dispatches anywhere across Lagos State.',
    type: 'promo',
    time: 'Yesterday, 10:15 AM',
    group: 'YESTERDAY',
    unread: false,
    actionType: 'promo',
    actionLabel: 'Use Voucher Code',
    voucherCode: 'BAYNIKSFAST15',
  },
];

export function NotificationsCenterView({
  initialNotifications = DEFAULT_NOTIFICATIONS,
  onBackClick,
  onTrackWaybill,
  onViewOtp,
  onViewWallet,
}: NotificationsCenterViewProps) {
  const router = useRouter();
  const { isDark } = useTheme();

  const [notifications, setNotifications] = useState<AppNotificationItem[]>(initialNotifications);
  const [activeFilter, setActiveFilter] = useState<'all' | 'delivery' | 'security' | 'wallet_promo'>('all');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3200);
  };

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      router.push('/');
    }
  };

  // Unread Count
  const unreadCount = useMemo(() => notifications.filter((n) => n.unread).length, [notifications]);

  // Mark all as read
  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    showToast('All notifications marked as read');
  };

  // Clear all notifications
  const handleClearAll = () => {
    setNotifications([]);
    showToast('Notification feed cleared');
  };

  // Dismiss single notification
  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    showToast('Notification dismissed');
  };

  // Copy OTP code
  const handleCopyOtp = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    showToast(`Copied 4-digit PIN: ${code}!`);
  };

  // Handle action click
  const handleActionClick = (item: AppNotificationItem) => {
    // Mark item as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n))
    );

    if (item.actionType === 'track') {
      if (onTrackWaybill && item.waybillId) {
        onTrackWaybill(item.waybillId);
      } else {
        router.push('/deliveries');
      }
    } else if (item.actionType === 'otp') {
      if (onViewOtp && item.otpCode) {
        onViewOtp(item.otpCode);
      } else {
        router.push('/handover');
      }
    } else if (item.actionType === 'wallet') {
      if (onViewWallet) {
        onViewWallet();
      } else {
        router.push('/wallet/history');
      }
    } else if (item.actionType === 'receipt') {
      router.push('/history');
    } else if (item.actionType === 'promo') {
      showToast(`Voucher code ${item.voucherCode || 'BAYNIKSFAST15'} applied!`);
      router.push('/shipment/new');
    }
  };

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'delivery') return item.type === 'delivery';
      if (activeFilter === 'security') return item.type === 'security';
      if (activeFilter === 'wallet_promo') return item.type === 'wallet' || item.type === 'promo';
      return true;
    });
  }, [notifications, activeFilter]);

  const groups = ['TODAY', 'YESTERDAY', 'EARLIER'] as const;

  const renderTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'delivery':
        return <Bike className="w-5 h-5 text-[#FF6D1F]" />;
      case 'security':
        return <ShieldCheck className="w-5 h-5 text-emerald-600" />;
      case 'wallet':
        return <CreditCard className="w-5 h-5 text-sky-600" />;
      case 'promo':
      default:
        return <Tag className="w-5 h-5 text-purple-600" />;
    }
  };

  return (
    <div className="min-h-full w-full flex flex-col justify-between bg-neutral-50/60 text-neutral-900 font-sans pb-16">
      {/* Top Header Matching bayniks.edition */}
      <header className="px-5 py-3.5 flex items-center justify-between w-full border-b border-neutral-200/90 bg-white sticky top-0 z-20 shadow-2xs">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back to dashboard"
          className="w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 bg-neutral-100 text-neutral-800 hover:bg-neutral-200 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-neutral-900" />
        </button>

        <div className="text-center">
          <div className="flex items-center justify-center space-x-2">
            <h1 className="text-sm md:text-base font-extrabold text-neutral-900 tracking-tight">
              Notifications
            </h1>
            {unreadCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-[#FF6D1F] text-white shadow-xs">
                {unreadCount} NEW
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-neutral-100 text-neutral-500 border border-neutral-200">
                ALL READ
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-neutral-400 font-bold block">
            {unreadCount > 0 ? `${unreadCount} Unread Alerts` : 'All Caught Up'} • {notifications.length} Total Alerts
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs font-extrabold text-[#FF6D1F] hover:underline px-2 py-1 cursor-pointer"
            >
              Read All
            </button>
          ) : (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs font-bold text-neutral-400 hover:text-neutral-700 px-2 py-1 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area — Desktop/Tablet Wide */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-5">
        {/* Category Filter Pills (Solid black active pill matching bayniks.edition) */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-full text-xs font-extrabold transition cursor-pointer shrink-0 ${
              activeFilter === 'all'
                ? 'bg-neutral-900 text-white shadow-sm'
                : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('delivery')}
            className={`px-4 py-2 rounded-full text-xs font-extrabold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeFilter === 'delivery'
                ? 'bg-neutral-900 text-white shadow-sm'
                : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200'
            }`}
          >
            Deliveries
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('security')}
            className={`px-4 py-2 rounded-full text-xs font-extrabold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeFilter === 'security'
                ? 'bg-neutral-900 text-white shadow-sm'
                : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200'
            }`}
          >
            Security & OTP
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('wallet_promo')}
            className={`px-4 py-2 rounded-full text-xs font-extrabold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeFilter === 'wallet_promo'
                ? 'bg-neutral-900 text-white shadow-sm'
                : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200'
            }`}
          >
            Wallet & Promos
          </button>
        </div>

        {/* Notifications Feed */}
        {filteredNotifications.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-neutral-200/80 p-8 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center mb-3">
              <Bell className="w-7 h-7 text-neutral-400" />
            </div>
            <h4 className="text-sm font-extrabold text-neutral-900">All caught up!</h4>
            <p className="text-xs text-neutral-400 mt-1">
              You have no active alerts or pending deliveries in this category.
            </p>
            <button
              type="button"
              onClick={handleBack}
              className="mt-4 px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-black transition cursor-pointer"
            >
              Back to Home
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((grp) => {
              const groupItems = filteredNotifications.filter((item) => item.group === grp);
              if (groupItems.length === 0) return null;

              return (
                <div key={grp} className="space-y-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 px-1">
                    {grp}
                  </span>

                  <div className="space-y-3">
                    {groupItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleActionClick(item)}
                        className={`rounded-3xl p-4 md:p-5 border transition shadow-card-soft cursor-pointer relative flex items-start space-x-3.5 ${
                          item.unread
                            ? 'bg-white border-[#FF6D1F]/40 hover:border-[#FF6D1F]'
                            : 'bg-white border-neutral-200/80 hover:border-neutral-300'
                        }`}
                      >
                        {/* Unread Orange Dot */}
                        {item.unread && (
                          <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-[#FF6D1F] animate-pulse" />
                        )}

                        {/* Icon Box */}
                        <div className="w-11 h-11 rounded-2xl bg-neutral-100 flex items-center justify-center shrink-0 border border-neutral-200/60 mt-0.5">
                          {renderTypeIcon(item.type)}
                        </div>

                        {/* Content Body */}
                        <div className="flex-1 min-w-0 pr-6">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-xs md:text-sm font-extrabold text-neutral-900 leading-snug">
                              {item.title}
                            </h3>
                            <span className="text-[10px] text-neutral-400 font-medium">
                              • {item.time}
                            </span>
                          </div>

                          <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                            {item.message}
                          </p>

                          {/* Action Button & Helpers */}
                          <div className="mt-3 flex items-center gap-2 flex-wrap">
                            {item.actionLabel && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleActionClick(item);
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-[11px] font-extrabold flex items-center space-x-1 transition active:scale-95 shadow-xs"
                              >
                                <span>{item.actionLabel}</span>
                                <ArrowUpRight className="w-3 h-3 text-[#FF6D1F]" />
                              </button>
                            )}

                            {item.otpCode && (
                              <div className="flex items-center space-x-2">
                                <span className="text-[11px] font-mono text-neutral-600">
                                  4-Digit Handover PIN: <strong className="text-neutral-900">{item.otpCode}</strong>
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyOtp(item.otpCode!, e)}
                                  className="px-2.5 py-1 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[11px] font-mono font-bold flex items-center space-x-1 border border-neutral-200 transition cursor-pointer"
                                >
                                  <Copy className="w-3 h-3 text-neutral-500" />
                                  <span>Copy PIN</span>
                                </button>
                              </div>
                            )}

                            {/* Dismiss button */}
                            <button
                              type="button"
                              onClick={(e) => handleDismiss(item.id, e)}
                              aria-label={`Dismiss ${item.title}`}
                              title="Dismiss"
                              className="w-7 h-7 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 flex items-center justify-center transition ml-auto"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl border border-neutral-700 flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
