import React from 'react';
import { Power } from 'lucide-react';
import { useRiderStore } from '../store/riderStore';

export interface AvailabilityBarProps {
  onToggle?: () => void;
}

export const AvailabilityBar: React.FC<AvailabilityBarProps> = ({ onToggle }) => {
  const { riderStatus, toggleOnlineStatus } = useRiderStore();
  const isOnline = riderStatus === 'available' || riderStatus === 'busy';
  const isBusy = riderStatus === 'busy';

  const handleClick = async () => {
    await toggleOnlineStatus();
    if (onToggle) {
      onToggle();
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      await handleClick();
    }
  };

  return (
    <div
      id="availabilityBar"
      className={`availability-bar ${isOnline ? 'is-online' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="switch"
      aria-checked={isOnline}
      aria-label={`Rider Availability Switch: Currently ${isBusy ? 'On Mission' : isOnline ? 'Online' : 'Offline'}`}
      tabIndex={0}
      data-testid="availability-bar"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        <div
          className="kpi-icon-box"
          style={{ width: '36px', height: '36px', flexShrink: 0 }}
          data-testid="kpi-power-icon-box"
        >
          <Power size={18} strokeWidth={2.4} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            id="availTitle"
            style={{ fontSize: '13px', fontWeight: 800, lineHeight: 1.2 }}
            data-testid="avail-title"
          >
            {isBusy ? 'Active Mission in Progress' : isOnline ? 'You are Online' : 'You are Offline'}
          </div>
          <div
            id="availSubtitle"
            style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            data-testid="avail-subtitle"
          >
            {isBusy
              ? 'Capacity locked (1/1) • Heading to drop-off'
              : isOnline
              ? 'Ready for nearby Lagos assignments'
              : 'Tap to go online for assignments'}
          </div>
        </div>
      </div>

      <div className="avail-switch-track" data-testid="avail-switch-track">
        <div className="avail-switch-thumb" data-testid="avail-switch-thumb" />
      </div>
    </div>
  );
};

export default AvailabilityBar;

