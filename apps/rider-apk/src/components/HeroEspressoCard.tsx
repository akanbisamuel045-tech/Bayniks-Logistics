import React from 'react';
import { Zap, Bell, QrCode, Menu } from 'lucide-react';
import { useRiderStore } from '../store/riderStore';
import { playKeypadChime } from '../utils/audioChimes';

export interface HeroEspressoCardProps {
  onOpenNotifications?: () => void;
  onOpenQr?: () => void;
  onOpenDrawer?: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (parts.length >= 2 && first && last) {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  }
  if (first && first.length >= 2) {
    return first.slice(0, 2).toUpperCase();
  }
  return 'JO';
}

function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function formatKoboToNaira(kobo: number): string {
  const naira = Math.floor(kobo / 100);
  return `₦${naira.toLocaleString('en-NG')}`;
}

export const HeroEspressoCard: React.FC<HeroEspressoCardProps> = ({
  onOpenNotifications,
  onOpenQr,
  onOpenDrawer,
}) => {
  const {
    riderName,
    plateNumber,
    riderStatus,
    todayEarningsKobo,
    tripsCompletedToday,
    toggleOnlineStatus,
    setQuickQrOpen,
    showToast,
  } = useRiderStore();

  const isOnline = riderStatus === 'available' || riderStatus === 'busy';
  const isBusy = riderStatus === 'busy';
  const firstName = riderName?.trim().split(/\s+/)[0];
  const initials = riderName ? getInitials(riderName) : 'BY';
  const greeting = riderName
    ? `Good ${getTimeOfDayGreeting()}, ${firstName} 👋`
    : 'Welcome to Bayniks Courier';

  const handleQrClick = () => {
    playKeypadChime();
    setQuickQrOpen(true);
    if (onOpenQr) {
      onOpenQr();
    }
  };

  const handleBellClick = () => {
    playKeypadChime();
    if (onOpenNotifications) {
      onOpenNotifications();
    } else {
      showToast('Notifications: Audio dispatch & surge alerts active');
    }
  };

  return (
    <div className="hero-espresso-card" data-testid="hero-espresso-card">
      {/* Top Utility Strip: Menu + Brand Bolt + Status Pill + Notification Bell */}
      <div className="hero-utility-strip">
        <div className="flex items-center gap-2">
          {onOpenDrawer && (
            <button
              type="button"
              onClick={() => {
                playKeypadChime();
                onOpenDrawer();
              }}
              aria-label="Open Navigation Drawer"
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-colors shrink-0"
              data-testid="hero-drawer-toggle-btn"
            >
              <Menu size={16} />
            </button>
          )}
          <div className="hero-brand-tag">
            <span className="hero-brand-dot">
              <Zap size={13} strokeWidth={2.8} />
            </span>
            <span>BAYNIKS</span>
          </div>
        </div>

        <div className="hero-top-controls">
          {/* Note: Dark mode option removed per explicit UI design requirements */}

          <button
            type="button"
            id="heroStatusPill"
            className={`hero-status-pill ${isOnline ? 'online' : 'offline'}`}
            onClick={toggleOnlineStatus}
            aria-label={`Rider is currently ${isBusy ? 'on mission' : isOnline ? 'online' : 'offline'}. Tap to toggle`}
            data-testid="hero-status-pill"
          >
            <span className="pulse-dot" />
            <span id="heroStatusText">{isBusy ? 'ON MISSION' : isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </button>

          <button
            type="button"
            className="hero-bell-btn"
            onClick={handleBellClick}
            aria-label="Notifications"
            data-testid="hero-bell-btn"
          >
            <Bell size={15} strokeWidth={2.3} />
            <span id="heroBellDot" className="hero-bell-dot" />
          </button>
        </div>
      </div>

      {/* Rider Identity Row: Gradient Ring Avatar + Greeting + PRO Badge + Plate */}
      <div className="hero-rider-row">
        <div className="avatar-orange-ring" data-testid="avatar-orange-ring">
          <div className="avatar-core">{initials}</div>
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <h1 className="hero-greeting" data-testid="hero-greeting">{greeting}</h1>
            <span className="pro-badge">PRO</span>
          </div>
          <div className="hero-subline">
            {plateNumber ? (
              <>Express Bike • <span className="tabular-num" style={{ color: '#FFFFFF' }}>{plateNumber}</span></>
            ) : (
              <span style={{ color: '#A8A29E' }}>Rider • No Vehicle Linked</span>
            )}
          </div>
        </div>
      </div>

      {/* Inner Translucent Earnings Glass: Net Earnings + Drops + Quick QR Scan */}
      <div className="hero-earnings-glass">
        <div>
          <span className="micro-label" style={{ color: '#A8A29E' }}>Today's earnings</span>
          <div id="heroEarningsVal" className="hero-money" data-testid="hero-earnings-val">
            {formatKoboToNaira(todayEarningsKobo)}
          </div>
          <div id="heroCompletedText" className="hero-drops-sub">
            {tripsCompletedToday} completed deliveries today
          </div>
        </div>
        <button
          type="button"
          className="hero-qr-action"
          onClick={handleQrClick}
          aria-label="Quick QR Verification Scan"
          data-testid="hero-qr-action"
        >
          <QrCode size={16} strokeWidth={2.4} />
          <span>QR Scan</span>
        </button>
      </div>
    </div>
  );
};

export default HeroEspressoCard;
