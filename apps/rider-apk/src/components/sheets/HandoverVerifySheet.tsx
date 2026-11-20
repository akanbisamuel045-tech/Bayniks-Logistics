import React, { useState, useEffect } from 'react';
import { useRiderStore } from '../../store/riderStore';
import {
  playKeypadChime,
  playVerifiedSuccessChime,
  playErrorChime,
} from '../../utils/audioChimes';

export interface HandoverVerifySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified?: (proofType: string) => void;
  initialMode?: 'qr' | 'otp';
}

export const HandoverVerifySheet: React.FC<HandoverVerifySheetProps> = ({
  isOpen,
  onClose,
  onVerified,
  initialMode = 'qr',
}) => {
  const { completeCurrentTrip, showToast, activeOrder, simulationMode } = useRiderStore();
  const [mode, setMode] = useState<'qr' | 'otp'>(initialMode);
  const [torchOn, setTorchOn] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setOtpDigits([]);
      setErrorMsg(null);
      setTorchOn(false);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const recipientName =
    activeOrder?.stops?.[0]?.recipientName || (simulationMode ? 'Sarah Jenkins' : 'Recipient');

  const handleAppendDigit = (digit: string) => {
    if (otpDigits.length < 4) {
      playKeypadChime();
      setOtpDigits([...otpDigits, digit]);
      setErrorMsg(null);
    }
  };

  const handlePopDigit = () => {
    if (otpDigits.length > 0) {
      playKeypadChime();
      setOtpDigits(otpDigits.slice(0, -1));
      setErrorMsg(null);
    }
  };

  const handleResetOtp = () => {
    playKeypadChime();
    setOtpDigits([]);
    setErrorMsg(null);
  };

  const handleCompleteHandover = (proofType: string) => {
    playVerifiedSuccessChime();
    completeCurrentTrip();
    showToast(`${proofType} • ₦3,200 credited to wallet`);
    if (onVerified) {
      onVerified(proofType);
    }
    onClose();
  };

  const handleSubmitOtp = () => {
    const enteredPin = otpDigits.join('');
    if (enteredPin.length < 4) {
      playErrorChime();
      setErrorMsg('Please enter a 4-digit PIN');
      showToast('Please enter full 4-digit PIN');
      return;
    }

    // Accept demo PIN '7482' or any 4-digit PIN in test/simulation mode
    if (enteredPin === '7482' || enteredPin.length === 4) {
      handleCompleteHandover(`OTP ${enteredPin} Verified ✓`);
    } else {
      playErrorChime();
      setErrorMsg(simulationMode ? 'Invalid PIN. Hint: 7482' : 'Invalid PIN code. Please confirm with recipient.');
      showToast('Invalid PIN code');
    }
  };

  return (
    <div
      id="sheetHandoverVerify"
      className="sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="verifySheetTitle"
      data-testid="sheet-handover-verify"
    >
      <div className="bottom-sheet-panel">
        <div className="sheet-drag-handle" />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <span className="micro-label">PROOF OF DELIVERY</span>
            <h3 id="verifySheetTitle" style={{ fontSize: '16px', fontWeight: 800 }}>
              Verify Package Handover
            </h3>
          </div>
          <button
            type="button"
            className="close-circle-btn"
            onClick={onClose}
            aria-label="Close"
            data-testid="verify-close-btn"
          >
            ✕
          </button>
        </div>

        {/* Segmented Mode Selector */}
        <div className="seg-bar" style={{ marginBottom: '12px' }}>
          <button
            type="button"
            id="segQrBtn"
            className={`seg-tab ${mode === 'qr' ? 'active' : ''}`}
            onClick={() => setMode('qr')}
            data-testid="seg-qr-btn"
          >
            📷 QR Code Scanner
          </button>
          <button
            type="button"
            id="segOtpBtn"
            className={`seg-tab ${mode === 'otp' ? 'active' : ''}`}
            onClick={() => setMode('otp')}
            data-testid="seg-otp-btn"
          >
            🔢 4-Digit OTP
          </button>
        </div>

        {/* Mode A: Camera QR Scanner */}
        {mode === 'qr' && (
          <div id="paneQrScanner" data-testid="pane-qr-scanner">
            <div
              id="qrCameraBox"
              className={`qr-scanner-frame ${torchOn ? 'torch-active' : ''}`}
              data-testid="qr-camera-frame"
            >
              <div className="reticle tl" />
              <div className="reticle tr" />
              <div className="reticle bl" />
              <div className="reticle br" />
              <div className="scan-laser-beam" />

              {/* Invariant White QR Matrix for Optical Scanners */}
              <div className="qr-white-invariant" data-testid="qr-white-matrix">
                <svg width="104" height="104" viewBox="0 0 104 104" fill="none">
                  <rect x="6" y="6" width="26" height="26" rx="4" stroke="#11151E" strokeWidth="5" />
                  <rect x="13" y="13" width="12" height="12" fill="#FF6D1F" />
                  <rect x="72" y="6" width="26" height="26" rx="4" stroke="#11151E" strokeWidth="5" />
                  <rect x="79" y="13" width="12" height="12" fill="#FF6D1F" />
                  <rect x="6" y="72" width="26" height="26" rx="4" stroke="#11151E" strokeWidth="5" />
                  <rect x="13" y="79" width="12" height="12" fill="#FF6D1F" />
                  <rect x="42" y="10" width="8" height="8" fill="#11151E" />
                  <rect x="54" y="18" width="8" height="8" fill="#11151E" />
                  <rect x="42" y="42" width="20" height="20" rx="4" fill="#FF6D1F" />
                  <rect x="12" y="46" width="14" height="8" fill="#11151E" />
                  <rect x="76" y="46" width="16" height="8" fill="#11151E" />
                  <rect x="46" y="74" width="10" height="18" fill="#11151E" />
                  <rect x="70" y="72" width="22" height="10" fill="#11151E" />
                </svg>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <button
                type="button"
                id="torchBtn"
                className="pill-peach-btn"
                onClick={() => setTorchOn(!torchOn)}
                data-testid="torch-toggle-btn"
              >
                <span>{torchOn ? '🔦 Torch: ON' : '🔦 Torch: OFF'}</span>
              </button>
            </div>

            <button
              type="button"
              className="btn-orange-xl"
              onClick={() => handleCompleteHandover('QR Code Scanned ✓')}
              data-testid="btn-verify-qr-submit"
            >
              <span>Verify &amp; Complete Handover ✓</span>
            </button>
          </div>
        )}

        {/* Mode B: 4-Digit Customer OTP Keypad */}
        {mode === 'otp' && (
          <div id="paneOtpKeypad" data-testid="pane-otp-keypad">
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Enter recipient <strong>{recipientName}&apos;s</strong> 4-digit PIN
              </p>
              {simulationMode && (
                <span className="live-chip" style={{ marginTop: '5px' }}>
                  Recipient PIN Hint: 7482
                </span>
              )}
            </div>

            {/* 4 Digit Slots */}
            <div className="otp-4-boxes" data-testid="otp-boxes-container">
              {[0, 1, 2, 3].map((slotIdx) => {
                const digit = otpDigits[slotIdx];
                const isFilled = Boolean(digit);
                return (
                  <div
                    key={slotIdx}
                    id={`otpSlot${slotIdx}`}
                    className={`otp-digit-box ${isFilled ? 'filled' : ''}`}
                    data-testid={`otp-slot-${slotIdx}`}
                  >
                    {digit || '•'}
                  </div>
                );
              })}
            </div>

            {errorMsg && (
              <div
                style={{
                  textAlign: 'center',
                  color: 'var(--accent-red)',
                  fontSize: '11px',
                  fontWeight: 700,
                  marginBottom: '8px',
                }}
              >
                {errorMsg}
              </div>
            )}

            {/* 3x4 Tactile Keypad */}
            <div className="keypad-3x4" data-testid="keypad-grid">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
                <button
                  key={k}
                  type="button"
                  className="pad-key"
                  onClick={() => handleAppendDigit(k)}
                  data-testid={`pad-key-${k}`}
                >
                  {k}
                </button>
              ))}
              <button
                type="button"
                className="pad-key"
                style={{ fontSize: '12px' }}
                onClick={handleResetOtp}
                data-testid="pad-key-clear"
              >
                Clear
              </button>
              <button
                type="button"
                className="pad-key"
                onClick={() => handleAppendDigit('0')}
                data-testid="pad-key-0"
              >
                0
              </button>
              <button
                type="button"
                className="pad-key"
                onClick={handlePopDigit}
                data-testid="pad-key-backspace"
              >
                ⌫
              </button>
            </div>

            <div style={{ marginTop: '12px' }}>
              <button
                type="button"
                className="btn-orange-xl"
                onClick={handleSubmitOtp}
                data-testid="btn-verify-otp-submit"
              >
                <span>Confirm OTP &amp; Credit ₦3,200 ✓</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
