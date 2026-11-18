import React from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';
import { playErrorChime } from '../utils/audioChimes';

export interface MockLocationWarningModalProps {
  isOpen: boolean;
  reason?: string;
  onDismiss: () => void;
  onRecheckLocation?: () => void;
}

export const MockLocationWarningModal: React.FC<MockLocationWarningModalProps> = ({
  isOpen,
  reason,
  onDismiss,
  onRecheckLocation,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
      data-testid="mock-location-warning-modal"
    >
      <div className="relative w-full max-w-[390px] bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-red-500">
        {/* Header Alert */}
        <div className="bg-red-600 px-6 py-5 text-white text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/20 mx-auto flex items-center justify-center mb-2 shadow-inner">
            <ShieldAlert size={28} className="text-white" strokeWidth={2.4} />
          </div>
          <h2 className="text-base font-black tracking-tight uppercase">
            Mock Location Detected
          </h2>
          <p className="text-xs text-red-100 mt-1">
            Platform Security & Anti-Fraud Protection
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-3.5 text-xs text-neutral-800">
          <div className="p-3 bg-red-50 rounded-2xl border border-red-200 text-red-900 leading-relaxed font-semibold">
            {reason || 'Android simulated location or Fake GPS provider has been detected.'}
          </div>

          <p className="text-neutral-600 leading-relaxed">
            Bayniks Logistics requires authentic GPS satellite coordinates to guarantee accurate customer tracking and delivery verification.
          </p>

          <div className="space-y-1.5 p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
            <span className="font-extrabold text-neutral-900 block text-[11px] uppercase tracking-wider">
              How to Resolve:
            </span>
            <ul className="list-disc list-inside space-y-1 text-neutral-600 font-medium text-[11px]">
              <li>Close any running Fake GPS or location spoofer apps.</li>
              <li>Go to <strong>Settings → Developer Options</strong>.</li>
              <li>Tap <strong>Select mock location app</strong> and choose <strong>None</strong>.</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            {onRecheckLocation && (
              <button
                type="button"
                onClick={onRecheckLocation}
                className="w-full py-3 px-4 rounded-xl bg-neutral-900 hover:bg-black text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all"
                data-testid="btn-recheck-location"
              >
                <RefreshCw size={15} />
                <span>Re-Check Live GPS</span>
              </button>
            )}

            <button
              type="button"
              onClick={onDismiss}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs"
              data-testid="btn-dismiss-mock-warning"
            >
              Dismiss Warning
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
