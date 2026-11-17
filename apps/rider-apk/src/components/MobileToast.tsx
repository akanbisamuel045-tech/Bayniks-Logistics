import React from 'react';
import { useRiderStore } from '../store/riderStore';

export interface MobileToastProps {
  message?: string | null;
}

export function MobileToast({ message: propMessage }: MobileToastProps) {
  const storeMessage = useRiderStore((s) => s.toastMessage);
  const activeMessage = propMessage !== undefined ? propMessage : storeMessage;
  const isVisible = Boolean(activeMessage && activeMessage.trim().length > 0);

  return (
    <div
      id="mobileToast"
      className={`mobile-toast ${isVisible ? 'visible' : ''}`}
      role="status"
      aria-live="polite"
      data-testid="mobile-toast"
    >
      <span className="w-2 h-2 rounded-full bg-[#FF6D1F] shrink-0" aria-hidden="true" />
      <span id="mobileToastMsg" className="truncate">
        {activeMessage || ''}
      </span>
    </div>
  );
}

