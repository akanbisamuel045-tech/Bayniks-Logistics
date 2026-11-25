import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  ChevronRight,
  X,
} from 'lucide-react';
import { playKeypadChime } from '../../utils/audioChimes';
import { useRiderStore } from '../../store/riderStore';

export interface TripReceiptData {
  id: string;
  date: string;
  time: string;
  pickupAddress: string;
  dropoffAddress: string;
  cityLabel?: string;
  fareNaira: number;
  customerPaidNaira: number;
  platformCompensatedNaira: number;
  distanceKm: number;
  durationMins: number;
  status: 'completed' | 'cancelled';
}

export interface TripReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip?: TripReceiptData;
}

type SupportStage = 'none' | 'issues' | 'other' | 'submitted';

const RIDE_ISSUE_OPTIONS = [
  { id: 'underpaid', label: 'Passenger did not pay or paid less' },
  { id: 'fare_low', label: 'Price lower than expected' },
  { id: 'conduct', label: "I have a complaint about passenger's behaviour" },
  { id: 'lost_item', label: 'Passenger left an item in a vehicle' },
  { id: 'balance_issue', label: 'I have issues with my balance' },
  { id: 'app_crash', label: 'My Bayniks Driver app crashed' },
  { id: 'other', label: 'Other' },
] as const;

const GENERAL_HELP_CATEGORIES = [
  { id: 'account', label: 'Account' },
  { id: 'earnings_payments', label: 'Earnings and payments' },
  { id: 'trip_issues', label: 'Trip issues' },
  { id: 'using_app', label: 'Using Bayniks app' },
  { id: 'driving_with_bayniks', label: 'Driving with Bayniks' },
  { id: 'requirements', label: 'Driver and vehicle requirements' },
  { id: 'about', label: 'About Bayniks' },
] as const;

/** Computes formatted HH:MM arrival time by adding trip duration minutes to HH:MM start time. */
function computeDropoffTime(startTime: string, durationMins: number): string {
  const match = startTime.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return startTime;
  const startHours = Number(match[1]);
  const startMinutes = Number(match[2]);
  const totalMinutes = (startHours * 60 + startMinutes + Math.max(1, Math.round(durationMins))) % (24 * 60);
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

/** Formats integer Naira values concisely to match Nigerian rider trip receipts (e.g. ₦600). */
function formatNaira(amount: number): string {
  return `₦${Math.round(amount).toLocaleString('en-NG')}`;
}

export const TripReceiptModal: React.FC<TripReceiptModalProps> = ({
  isOpen,
  onClose,
  trip,
}) => {
  const { showToast } = useRiderStore();
  const [supportStage, setSupportStage] = useState<SupportStage>('none');
  const [selectedSupportTopic, setSelectedSupportTopic] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSupportStage('none');
      setSelectedSupportTopic(null);
    }
  }, [isOpen, trip?.id]);

  if (!isOpen) return null;

  const currentTrip: TripReceiptData = trip || {
    id: 'TRIP-884920',
    date: '24 Oct',
    time: '19:12',
    pickupAddress: '1 Airport Road',
    dropoffAddress: '5 Westend Road',
    cityLabel: 'Warri',
    fareNaira: 600,
    customerPaidNaira: 400,
    platformCompensatedNaira: 200,
    distanceKm: 2.9,
    durationMins: 7,
    status: 'completed',
  };

  const dropoffTime = computeDropoffTime(currentTrip.time, currentTrip.durationMins);
  const mapCityLabel = currentTrip.cityLabel || 'Warri';

  const handleOpenSupport = () => {
    playKeypadChime();
    setSupportStage('issues');
  };

  const handleSelectRideIssue = (id: string, label: string) => {
    playKeypadChime();
    if (id === 'other') {
      setSupportStage('other');
      return;
    }
    setSelectedSupportTopic(label);
    setSupportStage('submitted');
    showToast(`Support ticket opened for "${label}". Reviewing trip ${currentTrip.date}, ${currentTrip.time}.`);
  };

  const handleSelectGeneralHelp = (label: string) => {
    playKeypadChime();
    setSelectedSupportTopic(label);
    setSupportStage('submitted');
    showToast(`Support request opened under "${label}".`);
  };

  if (supportStage !== 'none') {
    return (
      <div
        className="absolute inset-0 z-50 bg-white flex flex-col select-none animate-fadeIn text-[#18181B]"
        data-testid="trip-support-view"
      >
        {/* Support Top Bar */}
        <header className="px-4 py-3.5 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-white">
          <button
            type="button"
            onClick={() => setSupportStage('none')}
            aria-label="Close support"
            data-testid="support-close-btn"
            className="w-9 h-9 -ml-1.5 rounded-full flex items-center justify-center text-[#18181B] hover:bg-zinc-100 active:scale-95 transition-all"
          >
            <X size={20} />
          </button>
          <h2 className="text-[16px] font-bold text-[#18181B]">Support</h2>
          <div className="w-9" />
        </header>

        {/* Subtle Atomic Orange + Black accent rule under Support header */}
        <div className="h-[2px] w-full bg-zinc-100">
          <div
            className={`h-full bg-[#FF5722] transition-all duration-300 ${
              supportStage === 'issues' ? 'w-1/2' : 'w-full'
            }`}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {supportStage === 'issues' && (
            <div data-testid="support-ride-issues">
              <h1 className="text-[24px] font-bold text-[#18181B] tracking-tight">
                Ride issues
              </h1>
              <p className="mt-2 text-[13.5px] text-zinc-500 leading-relaxed">
                Browse common ride-related issues and get in touch with our Support team below:
              </p>

              <div className="mt-6 divide-y divide-zinc-100">
                {RIDE_ISSUE_OPTIONS.map((issue) => (
                  <button
                    key={issue.id}
                    type="button"
                    onClick={() => handleSelectRideIssue(issue.id, issue.label)}
                    data-testid={`support-issue-${issue.id}`}
                    className="w-full py-4 flex items-center justify-between gap-3 text-left hover:bg-zinc-50 active:bg-zinc-100/70 transition-colors"
                  >
                    <span className="text-[14.5px] font-medium text-[#18181B] leading-snug">
                      {issue.label}
                    </span>
                    <ChevronRight size={17} className="text-zinc-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {supportStage === 'other' && (
            <div data-testid="support-other-help">
              <button
                type="button"
                onClick={() => setSupportStage('issues')}
                aria-label="Back to ride issues"
                data-testid="support-back-issues-btn"
                className="w-9 h-9 -ml-2 mb-3 rounded-full flex items-center justify-center text-[#18181B] hover:bg-zinc-100 active:scale-95 transition-all"
              >
                <ArrowLeft size={20} />
              </button>

              <h1 className="text-[24px] font-bold text-[#18181B] tracking-tight leading-tight">
                Get help with something else
              </h1>

              <div className="mt-5 divide-y divide-zinc-100">
                {GENERAL_HELP_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleSelectGeneralHelp(category.label)}
                    data-testid={`support-category-${category.id}`}
                    className="w-full py-4 flex items-center justify-between gap-3 text-left hover:bg-zinc-50 active:bg-zinc-100/70 transition-colors"
                  >
                    <span className="text-[14.5px] font-medium text-[#18181B]">
                      {category.label}
                    </span>
                    <ChevronRight size={17} className="text-zinc-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {supportStage === 'submitted' && (
            <div className="pt-8 text-center space-y-5" data-testid="support-submitted-view">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#18181B] text-[#FF5722] flex items-center justify-center">
                <CheckCircle2 size={28} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-[20px] font-bold text-[#18181B]">
                  Support request received
                </h3>
                <p className="text-[13.5px] text-zinc-500">
                  Topic: <span className="font-semibold text-[#18181B]">{selectedSupportTopic}</span>
                </p>
                <p className="text-[12.5px] text-zinc-400">
                  Trip {currentTrip.date}, {currentTrip.time} ({currentTrip.id})
                </p>
              </div>
              <div className="pt-2 space-y-2.5">
                <button
                  type="button"
                  onClick={() => setSupportStage('none')}
                  className="w-full py-3.5 rounded-full bg-[#18181B] text-white text-[14px] font-semibold active:scale-[0.98] transition-all"
                >
                  Back to trip details
                </button>
                <button
                  type="button"
                  onClick={() => setSupportStage('issues')}
                  className="w-full py-3 rounded-full bg-zinc-100 text-[#18181B] text-[13.5px] font-semibold hover:bg-zinc-200 transition-colors"
                >
                  Browse other issues
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 z-50 bg-white flex flex-col select-none animate-fadeIn text-[#18181B]"
      data-testid="trip-receipt-modal"
    >
      {/* Top Bar: Back Arrow + Centered Timestamp */}
      <header className="px-4 py-3.5 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-white">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to ride history"
          data-testid="trip-detail-back-btn"
          className="w-9 h-9 -ml-1.5 rounded-full flex items-center justify-center text-[#18181B] hover:bg-zinc-100 active:scale-95 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-[17px] font-bold text-[#18181B] tracking-tight">
          {currentTrip.date}, {currentTrip.time}
        </h2>
        <div className="w-9" />
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Pickup & Dropoff Endpoints with Right Timestamps */}
        <section className="px-5 py-4 space-y-3.5 relative bg-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex flex-col items-center shrink-0">
                <span className="w-3 h-3 rounded-full bg-[#18181B] ring-4 ring-zinc-100 block" />
                <span className="w-[1.5px] h-5 bg-zinc-200 absolute top-3.5" />
              </div>
              <p className="text-[14px] font-medium text-[#18181B] truncate">
                {currentTrip.pickupAddress}
              </p>
            </div>
            <span className="text-[12px] text-zinc-400 tabular-nums shrink-0">
              {currentTrip.time}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-3 h-3 rounded-full bg-[#FF5722] ring-4 ring-[#FF5722]/15 shrink-0 block" />
              <p className="text-[14px] font-medium text-[#18181B] truncate">
                {currentTrip.dropoffAddress}
              </p>
            </div>
            <span className="text-[12px] text-zinc-400 tabular-nums shrink-0">
              {dropoffTime}
            </span>
          </div>
        </section>

        {/* Clean Vector Map Preview Box (Black + Atomic Orange Route) */}
        <div
          className="h-44 w-full bg-[#F4F4F5] relative overflow-hidden border-y border-zinc-100"
          data-testid="trip-detail-map"
        >
          <svg
            viewBox="0 0 400 180"
            className="w-full h-full"
            preserveAspectRatio="xMidYMid slice"
          >
            {/* Light neutral street grid */}
            <path
              d="M0 45 L400 30 M0 110 L400 95 M0 155 L400 140 M75 0 L65 180 M185 0 L195 180 M305 0 L285 180"
              stroke="#FFFFFF"
              strokeWidth="4"
              fill="none"
            />
            <path
              d="M20 75 Q140 60 245 85 T385 55"
              stroke="#E4E4E7"
              strokeWidth="6"
              fill="none"
            />

            {/* Route path: Black base + Atomic Orange overlay */}
            <path
              d="M 88 118 Q 185 112, 240 82 T 326 62"
              stroke="#18181B"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 88 118 Q 185 112, 240 82 T 326 62"
              stroke="#FF5722"
              strokeWidth="2"
              strokeDasharray="6 4"
              strokeLinecap="round"
              fill="none"
            />

            {/* Pickup marker (Black) */}
            <circle cx="88" cy="118" r="8" fill="#18181B" />
            <circle cx="88" cy="118" r="3" fill="#FFFFFF" />

            {/* Dropoff marker (Atomic Orange) */}
            <circle cx="326" cy="62" r="9" fill="#FF5722" />
            <circle cx="326" cy="62" r="3.5" fill="#FFFFFF" />
          </svg>

          <span className="absolute top-3 left-1/2 -translate-x-1/2 text-[13px] font-semibold text-zinc-500 tracking-wide">
            {mapCityLabel}
          </span>
          <span className="absolute bottom-2 left-3 text-[11px] font-bold text-zinc-500/80 bg-white/85 px-1.5 py-0.5 rounded">
            Bayniks Maps
          </span>
        </div>

        {/* Cash Payment & Breakdown Section */}
        <section className="px-5 py-4 border-b border-zinc-100">
          {currentTrip.status === 'completed' ? (
            <>
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-[#18181B] text-[#FF5722] flex items-center justify-center shrink-0">
                    <Banknote size={15} />
                  </span>
                  <span className="text-[16px] font-bold text-[#18181B]">
                    Cash payment
                  </span>
                </div>
                <span className="text-[17px] font-bold text-[#18181B] tabular-nums">
                  {formatNaira(currentTrip.fareNaira)}
                </span>
              </div>

              <div className="space-y-2 pl-9">
                <div className="flex items-center justify-between text-[13.5px]">
                  <span className="text-zinc-500">Customer paid</span>
                  <span className="font-medium text-[#18181B] tabular-nums">
                    {formatNaira(currentTrip.customerPaidNaira)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[13.5px]">
                  <span className="text-zinc-500">Compensated by Bayniks</span>
                  <span className="font-medium text-[#18181B] tabular-nums">
                    {formatNaira(currentTrip.platformCompensatedNaira)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-[14.5px] font-semibold text-[#FF5722]">
                Passenger cancelled
              </span>
              <span className="text-[15px] font-bold text-[#18181B] tabular-nums">
                ₦0
              </span>
            </div>
          )}
        </section>

        {/* Distance & Trip Duration */}
        <section className="px-5 py-4 border-b border-zinc-100 space-y-2.5">
          <div className="flex items-center justify-between text-[14px]">
            <span className="text-zinc-500">Distance</span>
            <span className="font-medium text-[#18181B] tabular-nums">
              {currentTrip.distanceKm.toFixed(1)}km
            </span>
          </div>
          <div className="flex items-center justify-between text-[14px]">
            <span className="text-zinc-500">Trip duration</span>
            <span className="font-medium text-[#18181B] tabular-nums">
              {currentTrip.durationMins} min
            </span>
          </div>
        </section>

        {/* Get Help with Ride Action Row */}
        <button
          type="button"
          onClick={handleOpenSupport}
          data-testid="get-help-with-ride-btn"
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-zinc-50 active:bg-zinc-100/70 transition-colors border-b border-zinc-100"
        >
          <span className="text-[15px] font-semibold text-[#18181B]">
            Get help with ride
          </span>
          <ChevronRight size={18} className="text-zinc-400" />
        </button>
      </div>
    </div>
  );
};

export default TripReceiptModal;
