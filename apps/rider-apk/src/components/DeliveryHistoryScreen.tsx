import React, { useMemo, useState } from 'react';
import { ArrowLeft, Banknote, ChevronRight } from 'lucide-react';
import { DeliveryHistoryItem, useRiderStore } from '../store/riderStore';
import { playKeypadChime } from '../utils/audioChimes';
import { TripReceiptData, TripReceiptModal } from './sheets/TripReceiptModal';

export interface DeliveryHistoryScreenProps {
  onBack?: () => void;
  showBackButton?: boolean;
}

const DEFAULT_RIDE_HISTORY: TripReceiptData[] = [
  {
    id: 'TRIP-884920',
    date: '24 Oct',
    time: '19:12',
    pickupAddress: '1 Airport Road, Warri 330102',
    dropoffAddress: '5 Westend Road',
    cityLabel: 'Warri',
    fareNaira: 600,
    customerPaidNaira: 400,
    platformCompensatedNaira: 200,
    distanceKm: 2.9,
    durationMins: 7,
    status: 'completed',
  },
  {
    id: 'TRIP-884918',
    date: '24 Oct',
    time: '18:52',
    pickupAddress: 'Warri, Warri 330102',
    dropoffAddress: 'Effurun Roundabout, Warri',
    cityLabel: 'Warri',
    fareNaira: 500,
    customerPaidNaira: 500,
    platformCompensatedNaira: 0,
    distanceKm: 2.1,
    durationMins: 6,
    status: 'completed',
  },
  {
    id: 'TRIP-884915',
    date: '24 Oct',
    time: '17:22',
    pickupAddress: 'Ekete, Orhuwhorun 330103',
    dropoffAddress: 'DSC Expressway, Warri',
    cityLabel: 'Warri',
    fareNaira: 2500,
    customerPaidNaira: 2200,
    platformCompensatedNaira: 300,
    distanceKm: 11.4,
    durationMins: 24,
    status: 'completed',
  },
  {
    id: 'TRIP-884911',
    date: '24 Oct',
    time: '17:11',
    pickupAddress: 'Orhuwhorun Road, Ovwian 330103',
    dropoffAddress: 'Ovwian Main Market',
    cityLabel: 'Warri',
    fareNaira: 0,
    customerPaidNaira: 0,
    platformCompensatedNaira: 0,
    distanceKm: 0.4,
    durationMins: 2,
    status: 'cancelled',
  },
  {
    id: 'TRIP-884904',
    date: '24 Oct',
    time: '16:16',
    pickupAddress: '26 Council Road, Warri 330102',
    dropoffAddress: 'Delta Mall, Effurun',
    cityLabel: 'Warri',
    fareNaira: 2400,
    customerPaidNaira: 2400,
    platformCompensatedNaira: 0,
    distanceKm: 10.2,
    durationMins: 21,
    status: 'completed',
  },
  {
    id: 'TRIP-884898',
    date: '24 Oct',
    time: '15:25',
    pickupAddress: 'Effurun-Sapele Rd, Warri 330102',
    dropoffAddress: 'NPA Expressway Junction',
    cityLabel: 'Warri',
    fareNaira: 1400,
    customerPaidNaira: 1200,
    platformCompensatedNaira: 200,
    distanceKm: 6.4,
    durationMins: 14,
    status: 'completed',
  },
  {
    id: 'TRIP-884890',
    date: '24 Oct',
    time: '12:20',
    pickupAddress: 'Asubi, Nigeria',
    dropoffAddress: 'Airport Junction, Warri',
    cityLabel: 'Warri',
    fareNaira: 800,
    customerPaidNaira: 800,
    platformCompensatedNaira: 0,
    distanceKm: 3.8,
    durationMins: 9,
    status: 'completed',
  },
  {
    id: 'TRIP-884842',
    date: '11 Oct',
    time: '09:57',
    pickupAddress: 'Ugborikoko 330102, Nigeria',
    dropoffAddress: 'Bendel Estate, Warri',
    cityLabel: 'Warri',
    fareNaira: 500,
    customerPaidNaira: 500,
    platformCompensatedNaira: 0,
    distanceKm: 2.3,
    durationMins: 7,
    status: 'completed',
  },
  {
    id: 'TRIP-884839',
    date: '11 Oct',
    time: '09:51',
    pickupAddress: 'Ugborikoko 330102, Nigeria',
    dropoffAddress: 'Jakpa Road, Effurun',
    cityLabel: 'Warri',
    fareNaira: 0,
    customerPaidNaira: 0,
    platformCompensatedNaira: 0,
    distanceKm: 0.3,
    durationMins: 1,
    status: 'cancelled',
  },
  {
    id: 'TRIP-884831',
    date: '11 Oct',
    time: '09:34',
    pickupAddress: 'Bavoch Hotel and Suites, Ochuko Male',
    dropoffAddress: 'PTI Road, Effurun',
    cityLabel: 'Warri',
    fareNaira: 1300,
    customerPaidNaira: 1300,
    platformCompensatedNaira: 0,
    distanceKm: 5.5,
    durationMins: 13,
    status: 'completed',
  },
];

/** Converts store delivery record (integer kobo) into display trip receipt details (integer Naira). */
function mapHistoryItemToTripReceipt(item: DeliveryHistoryItem): TripReceiptData {
  const isCancelled = item.status === 'cancelled';
  const totalNaira = isCancelled
    ? 0
    : Math.max(0, Math.round((item.fareKobo + (item.tipKobo || 0)) / 100));
  const compensatedNaira = !isCancelled && totalNaira >= 600 ? Math.min(200, Math.round(totalNaira * 0.25 / 50) * 50) : 0;
  const customerPaidNaira = Math.max(0, totalNaira - compensatedNaira);

  return {
    id: item.trackingCode || item.id,
    date: item.date,
    time: item.time,
    pickupAddress: item.fromAddress,
    dropoffAddress: item.toAddress,
    cityLabel: 'Lagos',
    fareNaira: totalNaira,
    customerPaidNaira,
    platformCompensatedNaira: compensatedNaira,
    distanceKm: item.distanceKm,
    durationMins: item.durationMins,
    status: isCancelled ? 'cancelled' : 'completed',
  };
}

/** Formats integer Naira amount for compact row display (e.g. ₦600). */
function formatCompactNaira(amount: number): string {
  return `₦${Math.round(amount).toLocaleString('en-NG')}`;
}

export const DeliveryHistoryScreen: React.FC<DeliveryHistoryScreenProps> = ({
  onBack,
  showBackButton = false,
}) => {
  const { deliveryHistory } = useRiderStore();
  const [selectedTrip, setSelectedTrip] = useState<TripReceiptData | null>(null);

  const rides = useMemo<TripReceiptData[]>(() => {
    if (deliveryHistory.length === 0) {
      return DEFAULT_RIDE_HISTORY;
    }
    return deliveryHistory.map(mapHistoryItemToTripReceipt);
  }, [deliveryHistory]);

  return (
    <div
      className="min-h-full pb-28 bg-white text-[#18181B] select-none animate-fadeIn"
      data-testid="delivery-history-screen"
    >
      {/* Centered Minimalist Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 py-3.5 border-b border-zinc-100 flex items-center justify-between">
        <div className="w-9 flex items-center">
          {showBackButton && onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              data-testid="ride-history-back-btn"
              className="w-9 h-9 -ml-1.5 rounded-full flex items-center justify-center text-[#18181B] hover:bg-zinc-100 active:scale-95 transition-all"
            >
              <ArrowLeft size={20} />
            </button>
          ) : null}
        </div>
        <h1 className="text-[17px] font-bold text-[#18181B] tracking-tight">
          Ride history
        </h1>
        <div className="w-9" />
      </header>

      {/* Hairline-Divided Trip List */}
      <div className="divide-y divide-zinc-100" data-testid="ride-history-list">
        {rides.map((trip) => {
          const isCompleted = trip.status === 'completed';

          return (
            <button
              key={trip.id}
              type="button"
              onClick={() => {
                playKeypadChime();
                setSelectedTrip(trip);
              }}
              data-testid={`ride-row-${trip.id}`}
              className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left bg-white hover:bg-zinc-50 active:bg-zinc-100/70 transition-colors"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-[12px] text-zinc-400 font-medium leading-tight">
                  {trip.date}, {trip.time}
                </p>
                <p className="text-[15px] font-medium text-[#18181B] leading-snug truncate">
                  {trip.pickupAddress}
                </p>
                {isCompleted ? (
                  <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#18181B] pt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF5722] shrink-0" />
                    Journey finished
                  </p>
                ) : (
                  <p className="text-[13px] font-semibold text-[#FF5722] pt-0.5">
                    Passenger cancelled
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isCompleted && (
                  <>
                    <span
                      className="w-6 h-6 rounded-full bg-[#18181B] text-[#FF5722] flex items-center justify-center"
                      aria-hidden="true"
                    >
                      <Banknote size={13} />
                    </span>
                    <span className="text-[15px] font-bold text-[#18181B] tabular-nums">
                      {formatCompactNaira(trip.fareNaira)}
                    </span>
                  </>
                )}
                <ChevronRight size={17} className="text-zinc-400" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Full-Screen Trip Detail & Support Modal */}
      <TripReceiptModal
        isOpen={Boolean(selectedTrip)}
        onClose={() => setSelectedTrip(null)}
        trip={selectedTrip || undefined}
      />
    </div>
  );
};

export default DeliveryHistoryScreen;
