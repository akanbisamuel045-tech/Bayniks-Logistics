import React, { useEffect, useState } from 'react';
import { CalendarClock, MapPin, Navigation, RefreshCw, X } from 'lucide-react';
import { useRiderStore } from '../../store/riderStore';
import { playKeypadChime, playMissionAcceptChime } from '../../utils/audioChimes';

export interface ScheduledOrdersSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScheduledOrdersSheet: React.FC<ScheduledOrdersSheetProps> = ({
  isOpen,
  onClose,
}) => {
  const { scheduledOrders, fetchScheduledOrders, acceptOffer, showToast } = useRiderStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchScheduledOrders()
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isOpen, fetchScheduledOrders]);

  if (!isOpen) return null;

  const handleRefresh = async () => {
    playKeypadChime();
    setLoading(true);
    try {
      await fetchScheduledOrders();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="absolute inset-0 z-[95] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-3 select-none"
      data-testid="scheduled-orders-sheet"
    >
      <div className="w-full max-w-[390px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden max-h-[85vh] flex flex-col text-[#18181B]">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-[#18181B] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF5722] flex items-center justify-center text-white">
              <CalendarClock size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight">Scheduled Deliveries</h3>
              <p className="text-[11px] text-zinc-300">Upcoming pre-booked dispatch jobs</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleRefresh}
              aria-label="Refresh scheduled orders"
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-[#FF5722]' : ''} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close scheduled deliveries"
              data-testid="scheduled-close-btn"
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {scheduledOrders.length === 0 ? (
            <div className="py-10 text-center space-y-2" data-testid="scheduled-empty-state">
              <CalendarClock size={32} className="mx-auto text-zinc-300" />
              <p className="text-sm font-bold text-[#18181B]">No open scheduled deliveries</p>
              <p className="text-xs text-zinc-500 max-w-[260px] mx-auto">
                Pre-booked merchant and enterprise pickups matching your vehicle class will appear here automatically.
              </p>
            </div>
          ) : (
            scheduledOrders.map((order) => (
              <div
                key={order.orderId}
                className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50 space-y-2.5"
                data-testid={`scheduled-order-${order.trackingCode}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-black px-2 py-0.5 rounded-md bg-[#18181B] text-[#FF5722]">
                    {order.trackingCode}
                  </span>
                  <span className="text-xs font-black text-[#18181B] font-mono">
                    ₦{Math.round(order.riderEarningKobo / 100).toLocaleString('en-NG')}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2 text-zinc-700">
                    <MapPin size={13} className="text-[#FF5722] shrink-0" />
                    <span className="truncate font-semibold">{order.pickupAddress}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-600">
                    <Navigation size={13} className="text-[#18181B] shrink-0" />
                    <span className="truncate">{order.dropoffAddress}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-semibold text-zinc-500">
                    {order.scheduledFor
                      ? new Date(order.scheduledFor).toLocaleString('en-NG', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: 'numeric',
                          month: 'short',
                        })
                      : `${order.estimatedDistanceKm} km`}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      playMissionAcceptChime();
                      const ok = await acceptOffer(order.orderId);
                      if (ok) {
                        showToast(`Scheduled delivery ${order.trackingCode} accepted`);
                        onClose();
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-full bg-[#FF5722] text-white text-xs font-bold"
                  >
                    Accept Job
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

