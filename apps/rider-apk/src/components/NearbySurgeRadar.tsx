import React from 'react';
import { Navigation } from 'lucide-react';
import { useRiderStore } from '../store/riderStore';

export interface NearbySurgeRadarProps {
  onOpenFullMap: () => void;
  onTriggerSurgeDispatch?: () => void;
}

export const NearbySurgeRadar: React.FC<NearbySurgeRadarProps> = ({
  onOpenFullMap,
  onTriggerSurgeDispatch,
}) => {
  const { showToast, triggerDemoOffer, riderStatus } = useRiderStore();

  const handleHubClick = (name: string, mult: string, bonus: string) => {
    showToast(`${name} (${mult} Surge • ${bonus} per drop)`);
    if (onTriggerSurgeDispatch) {
      onTriggerSurgeDispatch();
    } else if (riderStatus === 'available') {
      triggerDemoOffer();
    }
  };

  return (
    <div className="surface-card orange-frame" data-testid="nearby-surge-radar-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div>
          <span className="micro-label">NEARBY DELIVERY ZONES</span>
          <div style={{ fontSize: '14px', fontWeight: 800, marginTop: '2px' }}>
            Yaba Tech Hub • <span style={{ color: 'var(--accent-orange)' }}>1.4x Active</span>
          </div>
        </div>
        <button
          type="button"
          className="pill-peach-btn"
          onClick={onOpenFullMap}
          data-testid="surge-radar-fullmap-btn"
          aria-label="View full map"
        >
          <span>View full map →</span>
        </button>
      </div>

      <div className="surge-radar-canvas" data-testid="surge-radar-canvas">
        <svg
          width="100%"
          height="175"
          viewBox="0 0 360 175"
          preserveAspectRatio="none"
          style={{ display: 'block' }}
          aria-hidden="true"
        >
          <path
            d="M0 38 L360 64 M0 124 L360 102 M86 0 L114 175 M252 0 L220 175"
            stroke="rgba(148,163,184,0.34)"
            strokeWidth="5"
          />
          <path
            d="M22 158 Q 175 95, 325 28"
            stroke="#FF6D1F"
            strokeWidth="3"
            strokeDasharray="6 5"
            fill="none"
          />
          <circle cx="102" cy="56" r="34" fill="rgba(255,109,31,0.18)" />
          <circle cx="274" cy="126" r="38" fill="rgba(255,109,31,0.18)" />
        </svg>

        <button
          type="button"
          className="hub-pin hot"
          style={{ left: '29%', top: '32%' }}
          onClick={() => handleHubClick('Yaba Tech Hub', '1.4x', '+₦1,250')}
          data-testid="hub-pin-yaba"
        >
          <span>🔥 Yaba Tech • 1.4x</span>
        </button>

        <button
          type="button"
          className="hub-pin warm"
          style={{ left: '72%', top: '24%' }}
          onClick={() => handleHubClick('Ikeja Hub', '1.2x', '+₦850')}
          data-testid="hub-pin-ikeja"
        >
          <span>Ikeja • 1.2x</span>
        </button>

        <button
          type="button"
          className="hub-pin hot"
          style={{ left: '74%', top: '74%' }}
          onClick={() => handleHubClick('VI Towers', '1.5x', '+₦1,500')}
          data-testid="hub-pin-vi"
        >
          <span>⚡ VI Towers • 1.5x</span>
        </button>

        <div className="rider-gps-puck" title="Your Current Position" data-testid="rider-gps-puck">
          <Navigation size={14} className="fill-current text-white -rotate-45" />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '10px',
          fontSize: '11px',
          color: 'var(--text-secondary)',
          fontWeight: 600,
        }}
      >
        <span>📍 Commercial Ave, Yaba</span>
        <span className="tabular-num" style={{ color: 'var(--accent-emerald-text)' }}>
          GPS Locked
        </span>
      </div>
    </div>
  );
};

