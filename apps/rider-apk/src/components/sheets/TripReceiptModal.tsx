import React, { useState } from 'react';
import {
  X,
  MapPin,
  Clock,
  Navigation,
  CreditCard,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { playKeypadChime } from '../../utils/audioChimes';
import { useRiderStore } from '../../store/riderStore';

export interface TripReceiptData {
  id: string;
  date: string;
  time: string;
  pickupAddress: string;
  dropoffAddress: string;
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

export const TripReceiptModal: React.FC<TripReceiptModalProps> = ({
  isOpen,
  onClose,
  trip,
}) => {
  const { showToast } = useRiderStore();
  const [isDisputeOpen, setIsDisputeOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentTrip: TripReceiptData = trip || {
    id: 'TRIP-884920',
    date: '24 Oct',
    time: '19:12',
    pickupAddress: '1 Airport Road, Warri',
    dropoffAddress: '5 Westend Road, Warri',
    fareNaira: 600,
    customerPaidNaira: 400,
    platformCompensatedNaira: 200,
    distanceKm: 2.9,
    durationMins: 7,
    status: 'completed',
  };

  const disputeIssues = [
    { id: 'underpaid', label: 'Passenger did not pay or paid less' },
    { id: 'fare_low', label: 'Price lower than expected' },
    { id: 'conduct', label: "I have a complaint about passenger's behaviour" },
    { id: 'lost_item', label: 'Passenger left an item in a vehicle' },
    { id: 'balance_issue', label: 'I have issues with my balance' },
    { id: 'app_crash', label: 'My Bayniks Driver app crashed' },
    { id: 'other', label: 'Other' },
  ];

  const handleSelectIssue = (issueId: string, label: string) => {
    playKeypadChime();
    setSelectedIssue(label);
    showToast(`Support ticket opened for "${label}". Reviewing receipt ${currentTrip.id}...`);
    setTimeout(() => {
      setIsDisputeOpen(false);
      onClose();
    }, 1500);
  };

  return (
    <div
      className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col justify-end select-none"
      data-testid="trip-receipt-modal"
    >
      <div className="bg-white rounded-t-3xl max-h-[90%] flex flex-col overflow-hidden animate-slideUp">
        {/* Top Header */}
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isDisputeOpen ? (
              <button
                type="button"
                onClick={() => setIsDisputeOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700"
              >
                <ArrowLeft size={16} />
              </button>
            ) : null}
            <h3 className="text-sm font-black text-zinc-900">
              {isDisputeOpen ? 'Ride Issues' : `${currentTrip.date}, ${currentTrip.time}`}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-600 cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!isDisputeOpen ? (
            /* VIEW A: ITEMISED TRIP RECEIPT */
            <div className="space-y-4">
              {/* Route Map Preview */}
              <div className="w-full h-32 rounded-2xl bg-zinc-100 overflow-hidden relative border border-zinc-200/80">
                <svg className="w-full h-full object-cover" viewBox="0 0 300 130">
                  <rect width="100%" height="100%" fill="#EEF2F6" />
                  <path d="M-10 40 L 310 50" stroke="#CBD5E1" strokeWidth="6" />
                  <path d="M-10 40 L 310 50" stroke="#FFFFFF" strokeWidth="4" />
                  <path d="M80 -10 L 120 140" stroke="#CBD5E1" strokeWidth="6" />
                  <path d="M80 -10 L 120 140" stroke="#FFFFFF" strokeWidth="4" />
                  {/* Route Polyline */}
                  <path
                    d="M 60 45 Q 110 50 180 85 T 250 90"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  {/* Pickup pin */}
                  <circle cx="60" cy="45" r="5" fill="#10B981" stroke="#FFF" strokeWidth="1.5" />
                  {/* Dropoff pin */}
                  <circle cx="250" cy="90" r="5" fill="#EF4444" stroke="#FFF" strokeWidth="1.5" />
                </svg>
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-white/90 text-[10px] font-bold text-zinc-700 shadow-xs">
                  {currentTrip.distanceKm} km • {currentTrip.durationMins} min
                </div>
              </div>

              {/* Waypoint Addresses */}
              <div className="bg-[#F8FAFC] border border-zinc-200/80 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-start gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-zinc-400 uppercase">Pickup</div>
                    <div className="text-xs font-black text-zinc-900 truncate">
                      {currentTrip.pickupAddress}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 mt-1 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-zinc-400 uppercase">Dropoff</div>
                    <div className="text-xs font-black text-zinc-900 truncate">
                      {currentTrip.dropoffAddress}
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Payment Breakdown */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-2.5 shadow-2xs">
                <div className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                  Fare Breakdown
                </div>

                <div className="flex items-center justify-between text-base font-black py-1">
                  <span className="text-zinc-900">Total Cash Payment</span>
                  <span className="font-mono text-zinc-950">
                    ₦{currentTrip.fareNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-1 border-t border-zinc-100 text-zinc-600">
                  <span>Customer paid in cash</span>
                  <span className="font-mono font-bold text-zinc-900">
                    ₦{currentTrip.customerPaidNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-1 border-t border-zinc-100 text-emerald-700 bg-emerald-50/60 p-2 rounded-xl">
                  <span>Platform Fare Adjustment</span>
                  <span className="font-mono font-black text-emerald-700">
                    +₦{currentTrip.platformCompensatedNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Get Help with Ride Button */}
              <button
                type="button"
                onClick={() => {
                  playKeypadChime();
                  setIsDisputeOpen(true);
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-extrabold text-xs transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>Get help with ride</span>
                <ChevronRight size={16} className="text-zinc-500" />
              </button>
            </div>
          ) : (
            /* VIEW B: PARAMETERISED RIDE ISSUES DISPUTE SHEET (Frames #52 - #54) */
            <div className="space-y-3">
              <div className="text-xs text-zinc-500 font-medium">
                Browse common ride-related issues and get in touch with our support team below:
              </div>

              <div className="space-y-1.5">
                {disputeIssues.map((issue) => (
                  <button
                    key={issue.id}
                    type="button"
                    onClick={() => handleSelectIssue(issue.id, issue.label)}
                    className="w-full p-3.5 rounded-2xl bg-[#F8FAFC] hover:bg-zinc-100 border border-zinc-200/80 flex items-center justify-between text-left text-xs font-bold text-zinc-800 transition cursor-pointer active:scale-[0.99]"
                  >
                    <span>{issue.label}</span>
                    <ChevronRight size={16} className="text-zinc-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripReceiptModal;

