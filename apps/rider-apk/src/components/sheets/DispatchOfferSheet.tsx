import React, { useEffect, useState } from 'react';
import { Package, MapPin, Navigation } from 'lucide-react';
import { useRiderStore } from '../../store/riderStore';
import { playDispatchOfferChime, playMissionAcceptChime } from '../../utils/audioChimes';

export interface DispatchOfferSheetProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const DispatchOfferSheet: React.FC<DispatchOfferSheetProps> = ({
  isOpen,
  onAccept,
  onDecline,
}) => {
  const { incomingOffer } = useRiderStore();
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    if (!isOpen) {
      setSecondsLeft(30);
      return;
    }

    playDispatchOfferChime();
    setSecondsLeft(30);

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, onDecline]);

  if (!isOpen) return null;

  const fareFormatted = incomingOffer?.riderEarningKobo
    ? `₦${(incomingOffer.riderEarningKobo / 100).toLocaleString()}`
    : '₦3,200';
  const distanceFormatted = incomingOffer?.estimatedDistanceKm
    ? `${incomingOffer.estimatedDistanceKm} km`
    : '4.8 km';
  const pickupAddress = incomingOffer?.pickupAddress || '14 Commercial Ave, Yaba • 1.1 km away';
  const pickupName = incomingOffer?.pickupLandmark || 'Kuchi Empire';
  const dropoffAddress = 'Victoria Island Towers, Lagos • Sarah Jenkins';

  const percentage = Math.max(0, Math.min(100, (secondsLeft / 30) * 100));

  return (
    <div
      id="sheetDispatchOffer"
      className="sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="offerSheetTitle"
      data-testid="sheet-dispatch-offer"
    >
      <div className="bottom-sheet-panel">
        <div className="sheet-drag-handle" />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <h3 id="offerSheetTitle" style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-0.02em' }}>
              New delivery request
            </h3>
            <span className="live-chip">New trip</span>
          </div>
          <span
            id="offerCountdownPill"
            className="tabular-num"
            style={{
              padding: '4px 10px',
              borderRadius: '999px',
              backgroundColor: 'var(--accent-orange)',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 700,
            }}
            data-testid="offer-countdown-pill"
          >
            {secondsLeft}s
          </span>
        </div>

        <div className="timer-bar-bg">
          <div
            id="offerCountdownBar"
            className="timer-bar-fill"
            style={{ width: `${percentage}%` }}
            data-testid="offer-countdown-bar"
          />
        </div>

        <div className="stack-10" style={{ marginBottom: '12px' }}>
          {/* Pickup Node */}
          <div className="sub-card" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <div className="kpi-icon-box" style={{ flexShrink: 0 }}>
              <MapPin size={16} strokeWidth={2.4} className="text-orange-500" />
            </div>
            <div>
              <span className="micro-label">PICKUP • YABA, LAGOS</span>
              <div style={{ fontSize: '13px', fontWeight: 800, marginTop: '2px' }}>
                {pickupName}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{pickupAddress}</div>
            </div>
          </div>

          {/* Drop-off Node */}
          <div className="sub-card" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <div className="kpi-icon-box" style={{ flexShrink: 0 }}>
              <Navigation size={16} strokeWidth={2.4} className="text-orange-500 -rotate-45" />
            </div>
            <div>
              <span className="micro-label">DROP-OFF • VICTORIA ISLAND</span>
              <div style={{ fontSize: '13px', fontWeight: 800, marginTop: '2px' }}>Customer destination</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{dropoffAddress}</div>
            </div>
          </div>

          {/* Goods Description & Weight Card */}
          <div
            className="sub-card"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', minWidth: 0 }}>
              <div className="kpi-icon-box" style={{ flexShrink: 0 }}>
                <Package size={16} strokeWidth={2.3} className="text-orange-500" />
              </div>
              <div style={{ minWidth: 0 }}>
                <span className="micro-label">GOODS TO DELIVER</span>
                <div style={{ fontSize: '13px', fontWeight: 800, marginTop: '2px' }}>
                  Sealed Tech &amp; Fashion Parcel
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Medium Box • Fits 60L Thermal Carrier
                </div>
              </div>
            </div>
            <div
              style={{
                textAlign: 'right',
                flexShrink: 0,
                padding: '6px 10px',
                borderRadius: '12px',
                background: 'var(--accent-peach)',
                border: '1px solid var(--accent-peach-border)',
              }}
            >
              <span className="micro-label" style={{ color: 'var(--accent-orange)' }}>
                WEIGHT
              </span>
              <div
                className="tabular-num"
                style={{ fontSize: '15px', color: 'var(--accent-orange)', marginTop: '1px' }}
              >
                4.5 kg
              </div>
            </div>
          </div>
        </div>

        {/* 3-Column Route & Earnings Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
          <div className="sub-card" style={{ textAlign: 'center', padding: '9px 4px' }}>
            <span className="micro-label">DISTANCE</span>
            <div className="tabular-num" style={{ fontSize: '14px', marginTop: '2px' }}>
              {distanceFormatted}
            </div>
          </div>
          <div className="sub-card" style={{ textAlign: 'center', padding: '9px 4px' }}>
            <span className="micro-label">EST. TIME</span>
            <div className="tabular-num" style={{ fontSize: '14px', marginTop: '2px' }}>
              18 min
            </div>
          </div>
          <div
            className="sub-card"
            style={{
              textAlign: 'center',
              padding: '9px 4px',
              background: 'var(--accent-peach)',
              borderColor: 'var(--accent-peach-border)',
            }}
          >
            <span className="micro-label" style={{ color: 'var(--accent-orange)' }}>
              EARNINGS
            </span>
            <div
              className="tabular-num"
              style={{ fontSize: '15px', color: 'var(--accent-orange)', marginTop: '2px' }}
            >
              {fareFormatted}
            </div>
          </div>
        </div>

        {/* Chunky 54px Accept & Decline Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '8px' }}>
          <button
            type="button"
            className="btn-orange-xl"
            onClick={() => {
              playMissionAcceptChime();
              onAccept();
            }}
            data-testid="offer-accept-btn"
          >
            <span>Accept trip ✓</span>
          </button>
          <button
            type="button"
            className="btn-neutral-xl"
            onClick={onDecline}
            data-testid="offer-decline-btn"
          >
            <span>Decline</span>
          </button>
        </div>
      </div>
    </div>
  );
};
