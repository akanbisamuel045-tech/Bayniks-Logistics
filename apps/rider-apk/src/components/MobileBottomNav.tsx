import React from 'react';
import { Home, QrCode, User } from 'lucide-react';
import { useRiderStore, RiderTab } from '../store/riderStore';
import { playKeypadChime } from '../utils/audioChimes';

export interface MobileBottomNavProps {
  onOpenQr?: () => void;
  onSelectTab?: (tab: RiderTab) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onOpenQr,
  onSelectTab,
}) => {
  const { activeTab, setActiveTab, setQuickQrOpen } = useRiderStore();

  const handleTabClick = (tab: RiderTab) => {
    playKeypadChime();
    setActiveTab(tab);
    if (onSelectTab) {
      onSelectTab(tab);
    }
    if (typeof document !== 'undefined') {
      const scrollStage = document.querySelector('.mobile-scroll-stage');
      if (scrollStage) {
        scrollStage.scrollTop = 0;
      }
    }
  };

  const handleQrClick = () => {
    playKeypadChime();
    setQuickQrOpen(true);
    if (onOpenQr) {
      onOpenQr();
    }
  };

  const isHomeActive = activeTab === 'home';
  const isProfileActive =
    activeTab === 'profile' || activeTab === 'earnings' || activeTab === 'support';

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Rider Navigation">
      {/* Tab 1: Home Cockpit */}
      <button
        type="button"
        className={`nav-tab-btn ${isHomeActive ? 'active' : ''}`}
        data-screen="home"
        onClick={() => handleTabClick('home')}
        aria-label="Home Cockpit"
      >
        <span className="nav-circle-wrap">
          <Home size={19} strokeWidth={2.2} />
        </span>
        <span>Home</span>
      </button>

      {/* Central Dark Charcoal (#22252A) QR / Radar Quick-Action Orb */}
      <button
        type="button"
        className="nav-center-qr-orb"
        onClick={handleQrClick}
        title="Quick QR & Handover Scanner"
        aria-label="Quick QR & Handover Scanner"
        data-testid="nav-center-qr-orb"
      >
        <QrCode size={20} strokeWidth={2.3} />
      </button>

      {/* Tab 2: Profile & Performance Hub */}
      <button
        type="button"
        className={`nav-tab-btn ${isProfileActive ? 'active' : ''}`}
        data-screen="profile"
        onClick={() => handleTabClick('profile')}
        aria-label="Rider Profile & Performance"
      >
        <span className="nav-circle-wrap">
          <User size={19} strokeWidth={2.2} />
        </span>
        <span>Profile</span>
      </button>
    </nav>
  );
};

export default MobileBottomNav;
