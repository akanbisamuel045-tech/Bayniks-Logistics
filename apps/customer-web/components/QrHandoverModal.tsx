'use client';

import React, { useState } from 'react';

export interface QrHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeOrder?: {
    trackingCode: string;
    pickupPin?: string;
    deliveryPin?: string;
    recipientName?: string;
  } | null;
}

export function QrHandoverModal({
  isOpen,
  onClose,
  activeOrder,
}: QrHandoverModalProps) {
  const [mode, setMode] = useState<'pass' | 'scanner'>('pass');
  const [scanResult, setScanResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const trackingCode = activeOrder?.trackingCode || 'LGS-847291';
  const pin = activeOrder?.deliveryPin || activeOrder?.pickupPin || '4921';
  const recipient = activeOrder?.recipientName || 'Recipient Verification';

  const handleSimulateScan = () => {
    setScanResult(`Verified Waybill: ${trackingCode} • PIN Accepted`);
    setTimeout(() => {
      setScanResult(null);
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-bayniks-cardDark border border-slate-800 rounded-3xl p-6 shadow-2xl text-center space-y-5 overflow-hidden">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-bayniks-surfaceDark text-slate-400 hover:text-white flex items-center justify-center transition-colors"
        >
          ✕
        </button>

        {/* Mode Toggle */}
        <div className="flex rounded-xl bg-bayniks-surfaceDark p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => setMode('pass')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'pass'
                ? 'bg-bayniks-orange text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Digital Handover Pass
          </button>
          <button
            type="button"
            onClick={() => setMode('scanner')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'scanner'
                ? 'bg-bayniks-orange text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Camera Scanner
          </button>
        </div>

        {mode === 'pass' ? (
          /* Recipient Handover Pass */
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-bayniks-orange">
                Secure Anti-Fraud Handover
              </span>
              <h3 className="text-base font-bold text-white tracking-tight">
                {trackingCode}
              </h3>
              <p className="text-xs text-slate-400">
                Present this QR code or 4-digit PIN to the motorcycle dispatch rider upon arrival.
              </p>
            </div>

            {/* Stylized QR Card with Bayniks Emblem */}
            <div className="relative w-48 h-48 mx-auto bg-white p-3 rounded-2xl shadow-xl flex items-center justify-center border-4 border-bayniks-orange/30">
              {/* Simulated SVG QR Matrix */}
              <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900 fill-current">
                {/* 3 Corner Positioning Boxes */}
                <rect x="5" y="5" width="26" height="26" fill="black" />
                <rect x="9" y="9" width="18" height="18" fill="white" />
                <rect x="13" y="13" width="10" height="10" fill="black" />

                <rect x="69" y="5" width="26" height="26" fill="black" />
                <rect x="73" y="9" width="18" height="18" fill="white" />
                <rect x="77" y="13" width="10" height="10" fill="black" />

                <rect x="5" y="69" width="26" height="26" fill="black" />
                <rect x="9" y="73" width="18" height="18" fill="white" />
                <rect x="13" y="77" width="10" height="10" fill="black" />

                {/* Data Matrix Bits */}
                <rect x="36" y="8" width="6" height="6" fill="black" />
                <rect x="46" y="8" width="6" height="6" fill="black" />
                <rect x="56" y="8" width="6" height="6" fill="black" />
                <rect x="36" y="18" width="6" height="6" fill="black" />
                <rect x="46" y="24" width="6" height="6" fill="black" />
                <rect x="8" y="36" width="6" height="6" fill="black" />
                <rect x="18" y="36" width="6" height="6" fill="black" />
                <rect x="28" y="44" width="6" height="6" fill="black" />
                <rect x="68" y="36" width="6" height="6" fill="black" />
                <rect x="80" y="44" width="6" height="6" fill="black" />
                <rect x="36" y="68" width="6" height="6" fill="black" />
                <rect x="48" y="76" width="6" height="6" fill="black" />
                <rect x="68" y="68" width="6" height="6" fill="black" />
                <rect x="78" y="78" width="6" height="6" fill="black" />
                <rect x="58" y="58" width="6" height="6" fill="black" />
              </svg>

              {/* Central Bayniks Lightning Emblem */}
              <div className="absolute inset-0 m-auto w-10 h-10 rounded-xl bg-bayniks-orange text-white flex items-center justify-center font-bold text-base shadow-lg border-2 border-white">
                ⚡
              </div>
            </div>

            {/* 4-Digit PIN Callout */}
            <div className="p-3 bg-bayniks-surfaceDark border border-slate-800 rounded-2xl">
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Authoritative 4-Digit Handover PIN
              </span>
              <div className="font-mono text-3xl font-extrabold tracking-widest text-bayniks-orange">
                {pin}
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">
                Assigned to: {recipient}
              </span>
            </div>
          </div>
        ) : (
          /* Live Scanner Viewfinder */
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-bayniks-orange">
                QR Scanner Viewport
              </span>
              <h3 className="text-base font-bold text-white tracking-tight">
                Scan Waybill or Handover QR
              </h3>
            </div>

            {/* Viewfinder box with laser sweep */}
            <div className="relative w-56 h-56 mx-auto bg-black rounded-2xl overflow-hidden border-2 border-bayniks-orange/40 flex items-center justify-center">
              {/* Corner brackets */}
              <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-bayniks-orange" />
              <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-bayniks-orange" />
              <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-bayniks-orange" />
              <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-bayniks-orange" />

              {/* Animated Laser Sweep */}
              <div className="scanner-laser" />

              <span className="text-xs text-slate-400 font-mono">
                Align QR inside reticle
              </span>
            </div>

            <button
              type="button"
              onClick={handleSimulateScan}
              className="w-full py-2.5 rounded-xl bg-bayniks-surfaceDark border border-slate-700 text-slate-200 text-xs font-semibold hover:border-bayniks-orange transition-all"
            >
              Simulate Instant Camera Scan
            </button>

            {scanResult && (
              <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-xs font-mono">
                ✓ {scanResult}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

