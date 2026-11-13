'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import {
  Zap,
  ArrowLeft,
  Info,
  Check,
  Repeat,
  Calendar,
  MapPin,
  ChevronDown,
} from 'lucide-react';

export interface ScheduleDeliveryViewProps {
  onBackClick?: () => void;
  onConfirmSchedule?: (reservation: ScheduledReservation) => void;
  defaultPickup?: string;
  defaultPickupLandmark?: string;
  defaultDropoff?: string;
  defaultDropoffLandmark?: string;
}

export interface ScheduledReservation {
  id: string;
  timingMode: 'pickup' | 'dropoff';
  dateLabel: string;
  timeSlot: string;
  isRecurring: boolean;
  recurrenceFreq?: 'Weekly' | 'Bi-weekly' | 'Weekdays';
  pickupAddress: string;
  pickupLandmark: string;
  dropoffAddress: string;
  dropoffLandmark: string;
  packageTier: 'small' | 'medium' | 'large';
  sendReminders: boolean;
  totalKobo: number;
}

interface DateOption {
  id: string;
  label: string;
  dayNumber: string;
  dayName: string;
  fullDate: string;
}

interface TimeSlotOption {
  id: string;
  title: string;
  badge: string;
  badgeType: 'neutral' | 'popular' | 'high_demand';
  description: string;
  surchargeKobo: number;
}

const DATE_OPTIONS: DateOption[] = [
  { id: 'd-today', label: 'Today', dayNumber: '26', dayName: 'MON', fullDate: 'Today, Oct 26' },
  { id: 'd-tmrw', label: 'Tmrw', dayNumber: '27', dayName: 'TUE', fullDate: 'Tomorrow, Oct 27' },
  { id: 'd-2days', label: '+2 Days', dayNumber: '28', dayName: 'WED', fullDate: 'Wednesday, Oct 28' },
  { id: 'd-3days', label: '+3 Days', dayNumber: '29', dayName: 'THU', fullDate: 'Thursday, Oct 29' },
  { id: 'd-4days', label: '+4 Days', dayNumber: '30', dayName: 'FRI', fullDate: 'Friday, Oct 30' },
  { id: 'd-weekend', label: 'Weekend', dayNumber: '31', dayName: 'SAT', fullDate: 'Saturday, Oct 31' },
];

const TIME_SLOTS: TimeSlotOption[] = [
  {
    id: 'slot-morning',
    title: '08:00 AM – 11:00 AM',
    badge: 'Morning Rush',
    badgeType: 'neutral',
    description: 'Ideal for corporate business dispatches',
    surchargeKobo: 0,
  },
  {
    id: 'slot-midday',
    title: '11:00 AM – 02:00 PM',
    badge: 'Popular ★',
    badgeType: 'popular',
    description: 'Top choice for parcel handover',
    surchargeKobo: 0,
  },
  {
    id: 'slot-afternoon',
    title: '02:00 PM – 05:00 PM',
    badge: 'Afternoon Wave',
    badgeType: 'neutral',
    description: 'Optimal traffic routing across highway',
    surchargeKobo: 0,
  },
  {
    id: 'slot-evening',
    title: '05:00 PM – 08:00 PM',
    badge: 'High Demand ⚡',
    badgeType: 'high_demand',
    description: 'End-of-day courier rush (+₦200)',
    surchargeKobo: 20000,
  },
];

export function ScheduleDeliveryView({
  onBackClick,
  onConfirmSchedule,
  defaultPickup = '12 Commercial Avenue, Sabo Yaba, Lagos',
  defaultPickupLandmark = 'Near Ozone Cinemas, Sabo Bus Stop',
  defaultDropoff = 'Victoria Island Towers, Plot 4, Adeola Odeku, Lagos',
  defaultDropoffLandmark = 'Opposite Eko Hotel Roundabout',
}: ScheduleDeliveryViewProps) {
  const router = useRouter();
  const { isDark } = useTheme();

  // Reservation States
  const [timingMode, setTimingMode] = useState<'pickup' | 'dropoff'>('pickup');
  const [selectedDate, setSelectedDate] = useState<DateOption>(DATE_OPTIONS[1]!); // Default Tomorrow (27)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlotOption>(TIME_SLOTS[1]!); // Default Midday (11:00 AM - 02:00 PM)
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<'Weekly' | 'Bi-weekly' | 'Weekdays'>('Weekly');

  const [pickupAddress, setPickupAddress] = useState(defaultPickup);
  const [pickupLandmark, setPickupLandmark] = useState(defaultPickupLandmark);
  const [dropoffAddress, setDropoffAddress] = useState(defaultDropoff);
  const [dropoffLandmark, setDropoffLandmark] = useState(defaultDropoffLandmark);

  const [packageTier, setPackageTier] = useState<'small' | 'medium' | 'large'>('medium');
  const [sendReminders, setSendReminders] = useState(true);

  // Success Confirmation Modal
  const [confirmedReservation, setConfirmedReservation] = useState<ScheduledReservation | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      router.push('/');
    }
  };

  // Financial calculations in Integer Kobo
  const BASE_FARE_KOBO = 350000; // ₦3,500.00
  const SLOT_FEE_KOBO = 50000; // ₦500.00 reservation fee
  const tierFeeKobo =
    packageTier === 'small' ? 0 : packageTier === 'medium' ? 70000 : 180000;
  const slotSurchargeKobo = selectedSlot.surchargeKobo;
  const totalPayableKobo = BASE_FARE_KOBO + SLOT_FEE_KOBO + tierFeeKobo + slotSurchargeKobo;

  const formatKobo = (kobo: number) => {
    return `₦${(kobo / 100).toLocaleString()}`;
  };

  const handleConfirm = () => {
    const reservation: ScheduledReservation = {
      id: `SCHED-${Date.now().toString().slice(-6)}`,
      timingMode,
      dateLabel: selectedDate.fullDate,
      timeSlot: selectedSlot.title,
      isRecurring,
      recurrenceFreq: isRecurring ? recurrenceFreq : undefined,
      pickupAddress,
      pickupLandmark,
      dropoffAddress,
      dropoffLandmark,
      packageTier,
      sendReminders,
      totalKobo: totalPayableKobo,
    };

    setConfirmedReservation(reservation);

    if (onConfirmSchedule) {
      onConfirmSchedule(reservation);
    }
  };

  return (
    <div className="min-h-full w-full flex flex-col justify-between bg-neutral-50/60 text-neutral-900 pb-16">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#FF6D1F] text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-bolt-glow flex items-center space-x-2 animate-bounce">
          <Zap className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Header Matching media_1794567057133_08eb0ea0.jpg */}
      <header className="px-5 py-3.5 border-b flex items-center justify-between shrink-0 sticky top-0 z-30 bg-white border-neutral-200/90 shadow-2xs">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back to dashboard"
          className="w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 bg-neutral-100 text-neutral-800 hover:bg-neutral-200 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-neutral-900" />
        </button>

        <div className="text-center">
          <span className="text-[9px] uppercase font-mono font-extrabold text-[#FF6D1F] tracking-wider block">
            COURIER RESERVATION
          </span>
          <h1 className="text-sm md:text-base font-extrabold tracking-tight text-neutral-900">
            Schedule Delivery
          </h1>
        </div>

        <button
          type="button"
          onClick={() =>
            showToast('Scheduled slots guarantee driver arrival within selected window ±10 mins')
          }
          title="Schedule Guarantee Information"
          aria-label="Schedule Information"
          className="w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 bg-neutral-100 text-neutral-600 hover:bg-neutral-200 cursor-pointer"
        >
          <Info className="w-4 h-4 text-neutral-700" />
        </button>
      </header>

      {/* Main Workstation Body — Spacious Desktop/Tablet Width */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* 1. Guarantee Hero Card (Black card matching screenshot & bayniks_edition.html) */}
        <div className="bg-neutral-900 text-white rounded-[28px] p-5 md:p-6 shadow-xl relative overflow-hidden border border-neutral-800">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-[#FF6D1F]/20 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF6D1F] animate-pulse" />
              <span className="text-[10px] md:text-xs font-extrabold tracking-wider uppercase text-[#FF6D1F]">
                SCHEDULED COURIER GUARANTEE
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-white/10 text-white border border-white/15">
              ● 94% Slots Open
            </span>
          </div>

          <div className="mt-3">
            <h2 className="text-base md:text-lg font-extrabold text-white leading-snug">
              Lock your courier window ahead of time.
            </h2>
            <p className="text-xs text-neutral-300 font-medium mt-1 leading-relaxed max-w-2xl">
              Assigned courier arrives punctually with dedicated routing, zero route bunching, and complete cargo liability cover.
            </p>
          </div>

          <div className="mt-4 pt-3.5 border-t border-white/10 flex items-center justify-between text-[10px] md:text-xs font-bold text-neutral-300">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#FF6D1F] stroke-[2.5]" />
              <span>Priority Dispatch</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#FF6D1F] stroke-[2.5]" />
              <span>Driver SLA Pledge</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#FF6D1F] stroke-[2.5]" />
              <span>₦500k Cargo Cover</span>
            </span>
          </div>
        </div>

        {/* 2. Timing Mode Segmented Switch */}
        <div>
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-neutral-400 mb-2 px-1">
            TIMING PREFERENCE
          </label>
          <div className="p-1 rounded-2xl flex items-center border shadow-2xs bg-neutral-100 border-neutral-200/90">
            <button
              type="button"
              onClick={() => setTimingMode('pickup')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                timingMode === 'pickup'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 font-bold'
              }`}
            >
              Schedule Pickup Time
            </button>
            <button
              type="button"
              onClick={() => setTimingMode('dropoff')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                timingMode === 'dropoff'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 font-bold'
              }`}
            >
              Guaranteed Drop-off Window
            </button>
          </div>
          <p className="text-[10px] text-neutral-400 font-medium mt-1.5 px-1">
            {timingMode === 'pickup'
              ? 'Courier arrives at pickup address within the selected timeframe.'
              : 'Parcel will be safely delivered at the destination within this guaranteed window.'}
          </p>
        </div>

        {/* 3. Horizontal Date Strip Selector */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-400">
              SELECT DATE
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold text-neutral-900 font-mono">
                October / November 2026
              </span>
              <span className="text-[11px] font-extrabold text-[#FF6D1F] font-mono">
                {selectedDate.fullDate}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 overflow-x-auto hide-scrollbar py-1">
            {DATE_OPTIONS.map((d) => {
              const isSelected = selectedDate.id === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  className={`sched-date-card shrink-0 w-[68px] md:w-[76px] py-3 rounded-2xl text-center transition flex flex-col items-center justify-center cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-900 text-white border-2 border-neutral-900 shadow-md'
                      : 'bg-white text-neutral-800 border border-neutral-200 hover:border-neutral-900'
                  }`}
                >
                  <span
                    className={`text-[10px] uppercase font-bold ${
                      isSelected ? 'text-[#FF6D1F]' : 'text-neutral-400'
                    }`}
                  >
                    {d.label}
                  </span>
                  <span className="text-base font-extrabold font-mono my-0.5">
                    {d.dayNumber}
                  </span>
                  <span
                    className={`text-[9px] font-extrabold ${
                      isSelected ? 'text-neutral-300' : 'text-neutral-400'
                    }`}
                  >
                    {d.dayName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Time Slot Grid with Capacity Badges */}
        <div>
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-neutral-400 mb-2 px-1">
            AVAILABLE TIME WINDOW
          </label>
          <div className="space-y-2.5">
            {TIME_SLOTS.map((slot) => {
              const isSelected = selectedSlot.id === slot.id;

              return (
                <div
                  key={slot.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedSlot(slot)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedSlot(slot)}
                  className={`p-3.5 md:p-4 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'border-2 border-[#FF6D1F] bg-white shadow-card-soft ring-1 ring-[#FF6D1F]/20'
                      : 'bg-white border-neutral-200/90 hover:border-neutral-400 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                        isSelected
                          ? 'border-[#FF6D1F]'
                          : 'border-neutral-300'
                      }`}
                    >
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-neutral-900" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs md:text-sm font-extrabold font-mono text-neutral-900">
                          {slot.title}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            slot.badgeType === 'popular'
                              ? 'bg-orange-100 text-[#FF6D1F]'
                              : slot.badgeType === 'high_demand'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          {slot.badge}
                        </span>
                      </div>
                      <p className="text-[10px] md:text-xs text-neutral-400 mt-0.5 font-medium">
                        {slot.description}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-extrabold ${
                      slot.badgeType === 'popular'
                        ? 'bg-[#FF6D1F] text-white shadow-xs'
                        : slot.badgeType === 'high_demand'
                        ? 'bg-neutral-900 text-white'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {slot.surchargeKobo > 0 ? '+₦200' : 'Available'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Recurrence / Repeat Option */}
        <div className="rounded-3xl p-4 md:p-5 border space-y-3 bg-white border-neutral-200/90 shadow-card-soft">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-[#FF6D1F]/10 text-[#FF6D1F] flex items-center justify-center">
                <Repeat className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-extrabold block text-neutral-900">
                  Make this a recurring delivery
                </span>
                <span className="text-[10px] text-neutral-400">
                  Automatically repeat courier dispatch
                </span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="sr-only peer"
                aria-label="Recurring Delivery Toggle"
              />
              <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6D1F]" />
            </label>
          </div>

          {isRecurring && (
            <div className="pt-3 border-t border-neutral-100 space-y-2 animate-in fade-in duration-200">
              <span className="text-[10px] font-bold text-neutral-400 block uppercase tracking-wider">
                Repeat Frequency
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(['Weekly', 'Bi-weekly', 'Weekdays'] as const).map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setRecurrenceFreq(freq)}
                    className={`py-2 rounded-xl text-[11px] font-extrabold transition cursor-pointer ${
                      recurrenceFreq === freq
                        ? 'bg-neutral-900 text-white shadow-sm'
                        : 'bg-neutral-100 text-neutral-700 border border-neutral-200 hover:bg-neutral-200'
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 6. Route & Nigerian Landmark Specifications */}
        <div className="rounded-3xl p-4 md:p-5 border space-y-3 bg-white border-neutral-200/90 shadow-card-soft">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-400">
              Route & Package Specs
            </span>
            <span className="text-[10px] font-mono font-bold text-[#FF6D1F]">
              NIGERIAN LANDMARK VERIFIED
            </span>
          </div>

          {/* Pickup Address & Landmark */}
          <div className="space-y-1">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-2.5 flex-1 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-neutral-900 mt-1 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[9px] uppercase font-bold text-neutral-400 block">
                    Pickup Origin
                  </span>
                  <p className="text-xs font-bold truncate mt-0.5 text-neutral-900">{pickupAddress}</p>
                  <p className="text-[10px] font-mono text-[#FF6D1F] truncate">
                    Landmark: {pickupLandmark}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push('/shipment/address-picker')}
                className="text-[10px] font-extrabold text-[#FF6D1F] hover:underline shrink-0 ml-2 cursor-pointer"
              >
                Edit Map →
              </button>
            </div>
          </div>

          {/* Dropoff Address & Landmark */}
          <div className="space-y-1 pt-2 border-t border-neutral-100">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-2.5 flex-1 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF6D1F] mt-1 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[9px] uppercase font-bold text-neutral-400 block">
                    Drop-off Destination
                  </span>
                  <p className="text-xs font-bold truncate mt-0.5 text-neutral-900">{dropoffAddress}</p>
                  <p className="text-[10px] font-mono text-[#FF6D1F] truncate">
                    Landmark: {dropoffLandmark}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push('/shipment/address-picker')}
                className="text-[10px] font-extrabold text-[#FF6D1F] hover:underline shrink-0 ml-2 cursor-pointer"
              >
                Edit Map →
              </button>
            </div>
          </div>

          {/* Package Size Tier */}
          <div className="pt-2 border-t border-neutral-100">
            <label className="block text-[11px] font-bold mb-1.5 text-neutral-800">
              Package Size Tier
            </label>
            <div className="relative">
              <select
                value={packageTier}
                onChange={(e) => setPackageTier(e.target.value as any)}
                aria-label="Package Size Tier"
                className="w-full text-xs font-semibold px-3.5 py-3 rounded-2xl border transition focus:outline-none focus:border-[#FF6D1F] cursor-pointer bg-neutral-50 text-neutral-900 border-neutral-300 appearance-none pr-10"
              >
                <option value="small">Small Envelope (Pouch • Up to 3kg) - ₦0 Fee</option>
                <option value="medium">Medium Box (Standard • Up to 10kg) - +₦700</option>
                <option value="large">Large Cargo (Bulky • Up to 25kg) - +₦1,800</option>
              </select>
              <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* 7. Reminder Notification Preference */}
        <label className="flex items-center space-x-3 p-3.5 rounded-2xl border cursor-pointer bg-white border-neutral-200/90 shadow-card-soft">
          <input
            type="checkbox"
            checked={sendReminders}
            onChange={(e) => setSendReminders(e.target.checked)}
            className="w-4 h-4 rounded accent-[#FF6D1F]"
          />
          <div className="min-w-0">
            <span className="text-xs font-bold block leading-tight text-neutral-900">
              Send WhatsApp & SMS arrival notice 30 mins prior
            </span>
            <span className="text-[10px] text-neutral-400">
              Driver contact details and live telemetry link sent directly
            </span>
          </div>
        </label>

        {/* 8. Price & Slot Reservation Banner (Integer Kobo Precision) */}
        <div className="bg-orange-50/70 border border-[#FF6D1F]/40 rounded-3xl p-5 space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#FF6D1F]/20">
            <span className="text-xs font-extrabold text-[#FF6D1F] uppercase tracking-wider">
              Locked Schedule Fare
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-neutral-900 text-white">
              NO SURGE GUARANTEE
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-600 pt-0.5">
            <span>Base Transit Fare</span>
            <span className="font-mono font-bold text-neutral-900">{formatKobo(BASE_FARE_KOBO)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-neutral-600">
            <span>
              {packageTier === 'small'
                ? 'Small Envelope Tier'
                : packageTier === 'medium'
                ? 'Medium Box Tier'
                : 'Large Cargo Tier'}
            </span>
            <span className="font-mono font-bold text-neutral-900">{formatKobo(tierFeeKobo)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-neutral-600">
            <span>Scheduled Slot Reservation</span>
            <span className="font-mono font-bold text-[#FF6D1F]">
              {formatKobo(SLOT_FEE_KOBO)}
            </span>
          </div>
          {slotSurchargeKobo > 0 && (
            <div className="flex items-center justify-between text-xs text-amber-800">
              <span>Evening Rush Surcharge</span>
              <span className="font-mono font-bold">{formatKobo(slotSurchargeKobo)}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-[#FF6D1F]/20 text-sm font-extrabold">
            <span className="text-neutral-900">Total Payable</span>
            <span className="font-mono text-base text-[#FF6D1F] font-bold">
              {formatKobo(totalPayableKobo)}
            </span>
          </div>
        </div>

        {/* 9. Primary Action Button */}
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full py-4 px-5 bg-[#FF6D1F] hover:bg-[#EA580C] text-white font-extrabold text-sm rounded-2xl shadow-bolt-glow active:scale-[0.98] transition flex items-center justify-center space-x-2 cursor-pointer"
        >
          <span>Confirm & Lock Schedule Slot</span>
          <span className="text-base font-bold">→</span>
        </button>
      </main>

      {/* Confirmation Success Modal */}
      {confirmedReservation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 border bg-white border-neutral-200 text-neutral-900 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 text-[#FF6D1F] flex items-center justify-center mx-auto shadow-bolt-glow">
              <Calendar className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-extrabold text-neutral-900">Reservation Locked!</h3>
              <p className="text-xs text-neutral-400">
                Waybill <span className="font-mono font-bold text-[#FF6D1F]">#{confirmedReservation.id}</span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">Slot Window:</span>
                <span className="font-bold text-neutral-900 font-mono">
                  {confirmedReservation.dateLabel} • {confirmedReservation.timeSlot}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Type:</span>
                <span className="font-bold text-neutral-900">
                  {confirmedReservation.isRecurring
                    ? `Recurring (${confirmedReservation.recurrenceFreq})`
                    : 'One-Time Scheduled'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Locked Total:</span>
                <span className="font-bold text-[#FF6D1F] font-mono">
                  {formatKobo(confirmedReservation.totalKobo)}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => router.push('/deliveries')}
                className="w-full py-3 rounded-xl bg-[#FF6D1F] hover:bg-[#EA580C] text-white font-bold text-xs shadow-bolt-glow transition active:scale-95 cursor-pointer"
              >
                View in Active Deliveries
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmedReservation(null);
                  handleBack();
                }}
                className="w-full py-3 rounded-xl font-bold text-xs transition bg-neutral-100 text-neutral-700 hover:bg-neutral-200 cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
