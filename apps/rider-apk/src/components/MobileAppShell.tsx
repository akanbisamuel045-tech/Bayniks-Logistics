import React from 'react';
import { MobileToast } from './MobileToast';
import { MobileBottomNav } from './MobileBottomNav';
import { RiderTab } from '../store/riderStore';

export interface MobileAppShellProps {
  children: React.ReactNode;
  onOpenQr?: () => void;
  onSelectTab?: (tab: RiderTab) => void;
  hideNav?: boolean;
  className?: string;
}

export const MobileAppShell: React.FC<MobileAppShellProps> = ({
  children,
  onOpenQr,
  onSelectTab,
  hideNav = false,
  className = '',
}) => {
  return (
    <div
      className={`mobile-app-shell ${className}`.trim()}
      data-testid="mobile-app-shell"
    >
      {/* Floating In-App Toast Notification */}
      <MobileToast />

      {/* Main Viewport Content / Active Screen Stage */}
      {children}

      {/* Anchored 68px Mobile Bottom Navigation Bar */}
      {!hideNav && (
        <MobileBottomNav onOpenQr={onOpenQr} onSelectTab={onSelectTab} />
      )}
    </div>
  );
};

export default MobileAppShell;

