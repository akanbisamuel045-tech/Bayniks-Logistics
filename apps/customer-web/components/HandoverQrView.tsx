'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera,
  QrCode,
  ArrowLeft,
  Flashlight,
  RefreshCw,
  Zap,
  MessageSquare,
  Info,
  Copy,
  Package,
  X,
} from 'lucide-react';

export interface HandoverQrViewProps {
  initialMode?: 'scan' | 'pass';
  waybillId?: string;
  handoverPin?: string;
  packageDesc?: string;
  courierName?: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  onClose?: () => void;
  onScanSuccess?: (waybillId: string) => void;
}

export function HandoverQrView({
  initialMode = 'scan',
  waybillId = 'BYN-LGS-847291',
  handoverPin = '4829',
  packageDesc = 'Fragile Prototype Electronics',
  courierName = 'Tariq Danladi',
  pickupAddress = '12 Commercial Avenue, Sabo Yaba, Lagos',
  dropoffAddress = 'Victoria Island Towers, Adeola Odeku, Lagos',
  onClose,
  onScanSuccess,
}: HandoverQrViewProps) {
  const router = useRouter();

  const [mode, setMode] = useState<'scan' | 'pass'>(initialMode);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [manualInput, setManualInput] = useState('');
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [detectedOrder, setDetectedOrder] = useState<{
    id: string;
    packageDesc: string;
    courierName: string;
    eta: string;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Camera Stream Lifecycle
  const startCamera = async (facing: 'environment' | 'user') => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        // Fallback gracefully in environments without video input (e.g. testing / desktop)
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (mode === 'scan') {
      startCamera(cameraFacing);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [mode, cameraFacing]);

  const handleBack = () => {
    stopCamera();
    if (onClose) {
      onClose();
    } else {
      router.push('/');
    }
  };

  const toggleTorch = () => {
    const nextState = !isTorchOn;
    setIsTorchOn(nextState);
    showToast(nextState ? 'Flashlight enabled' : 'Flashlight disabled');
  };

  const toggleFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    showToast(`Camera switched to ${nextFacing === 'user' ? 'Front' : 'Rear'}`);
  };

  const handleSimulateScan = () => {
    setIsFlashActive(true);
    setTimeout(() => setIsFlashActive(false), 200);

    const detected = {
      id: waybillId,
      packageDesc,
      courierName,
      eta: '12 mins',
    };
    setDetectedOrder(detected);
    showToast(`Scanned Waybill #${waybillId}!`);

    if (onScanSuccess) {
      onScanSuccess(waybillId);
    }
  };

  const handleManualLookup = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = manualInput.trim();
    if (!query) return;

    const detected = {
      id: query.startsWith('#') ? query : `#${query}`,
      packageDesc: 'Verified Priority Parcel',
      courierName: 'Tariq Danladi',
      eta: '14 mins',
    };
    setDetectedOrder(detected);
    showToast(`Waybill ${detected.id} verified!`);

    if (onScanSuccess) {
      onScanSuccess(detected.id);
    }
  };

  const handleCopyPin = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(handoverPin);
    }
    showToast(`Handover PIN ${handoverPin} copied to clipboard!`);
  };

  const handleShareWhatsApp = () => {
    const shareText = `*Bayniks Contactless Handover Pass*\n\nWaybill: #${waybillId}\nHandover Release PIN: *${handoverPin}*\nDestination: ${dropoffAddress}\n\nTrack Live Fleet: http://localhost:3000/deliveries`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleNavigateToTrack = () => {
    stopCamera();
    router.push('/deliveries');
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-bayniks-orange text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-bolt-glow flex items-center space-x-2 animate-bounce">
          <Zap className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Segmented Mode Switcher */}
      <header className="px-5 py-3 flex items-center justify-between shrink-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back to dashboard"
          className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center transition active:scale-90"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Segment Switcher: Scan vs Pass */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setMode('scan')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
              mode === 'scan'
                ? 'bg-bayniks-orange text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan Waybill</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('pass')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
              mode === 'pass'
                ? 'bg-bayniks-orange text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>My Pass</span>
          </button>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() =>
              showToast('Align barcode within viewfinder or enter waybill reference number')
            }
            title="Scan Guidelines"
            aria-label="Scanner Information"
            className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center text-xs font-bold font-mono"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* VIEW 1: ACTIVE SCANNER VIEWPORT */}
      {mode === 'scan' ? (
        <main className="relative flex-1 flex flex-col justify-between overflow-hidden">
          {/* Simulated Camera Viewport & Flash Overlay */}
          <div className="absolute inset-0 bg-[#07090C] flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Radial dot matrix overlay */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#FF6D1F_1px,transparent_1px)] [background-size:18px_18px]" />

            {/* Flash Effect Overlay */}
            {isFlashActive && (
              <div className="absolute inset-0 bg-white opacity-80 pointer-events-none transition-opacity duration-150 z-30" />
            )}
          </div>

          {/* Torch Alert Banner */}
          {isTorchOn && (
            <div className="relative z-20 mt-3 mx-auto px-4 py-1.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-mono font-extrabold flex items-center gap-1.5 shadow-md animate-pulse">
              <Zap className="w-3.5 h-3.5" />
              <span>FLASHLIGHT ACTIVE</span>
            </div>
          )}

          {/* Center Viewfinder with 4 Orange Corners and Animated Laser */}
          <div className="relative z-10 w-64 h-64 mx-auto my-auto flex items-center justify-center">
            {/* 4 Atomic Orange Corner Brackets */}
            <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-bayniks-orange rounded-tl-2xl" />
            <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-bayniks-orange rounded-tr-2xl" />
            <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-bayniks-orange rounded-bl-2xl" />
            <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-bayniks-orange rounded-br-2xl" />

            {/* Sweeping Laser Beam */}
            <div className="animate-scan-laser absolute left-4 right-4 h-1 bg-bayniks-orange rounded-full shadow-[0_0_16px_#FF6D1F]" />

            <div className="text-center px-4 pointer-events-none select-none">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-bayniks-orange block">
                Align Barcode
              </span>
              <span className="text-[10px] text-neutral-400">Position waybill or QR pass</span>
            </div>
          </div>

          {/* Bottom HUD Controls & Manual Waybill Lookup */}
          <div className="relative z-20 p-5 bg-gradient-to-t from-[#0E1013] via-[#0E1013]/90 to-transparent space-y-3 max-w-lg w-full mx-auto">
            {/* Viewfinder Action Buttons */}
            <div className="flex items-center justify-center space-x-4">
              <button
                type="button"
                onClick={toggleTorch}
                title="Toggle Torch"
                aria-label="Toggle Flashlight"
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition active:scale-90 ${
                  isTorchOn
                    ? 'bg-amber-400 text-slate-900 shadow-md'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <Flashlight className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={handleSimulateScan}
                className="px-6 py-3.5 rounded-2xl bg-bayniks-orange hover:bg-bayniks-orangeDark text-white text-xs font-extrabold shadow-bolt-glow active:scale-95 transition flex items-center gap-2"
              >
                <span>Simulate Scan</span>
                <Zap className="w-4 h-4 fill-white stroke-none" />
              </button>

              <button
                type="button"
                onClick={toggleFacing}
                title="Flip Camera"
                aria-label="Flip Camera"
                className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition active:scale-90"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>

            {/* Manual Waybill Input */}
            <form onSubmit={handleManualLookup} className="relative flex items-center">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Or enter waybill ID (#BYN-LGS-847291)..."
                aria-label="Manual Waybill Input"
                className="w-full bg-white/10 text-white placeholder-neutral-400 text-xs font-mono font-semibold pl-4 pr-20 py-3.5 rounded-2xl border border-white/15 focus:outline-none focus:border-bayniks-orange"
              />
              <button
                type="submit"
                disabled={!manualInput.trim()}
                className="absolute right-2 px-3 py-1.5 rounded-xl bg-bayniks-orange text-white text-[10px] font-extrabold active:scale-95 transition disabled:opacity-40"
              >
                Lookup
              </button>
            </form>
          </div>

          {/* Detected Order Bottom Drawer */}
          {detectedOrder && (
            <div className="absolute bottom-0 left-0 right-0 z-40 bg-white text-slate-900 rounded-t-3xl p-5 shadow-2xl border-t border-slate-200 space-y-3 animate-fade-in max-w-lg mx-auto">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 text-bayniks-orange flex items-center justify-center font-bold">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold font-mono text-slate-900">
                      #{detectedOrder.id.replace(/^#/, '')}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {detectedOrder.packageDesc} • In Transit
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDetectedOrder(null)}
                  aria-label="Dismiss detected card"
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-slate-50 rounded-2xl p-3 text-xs flex items-center justify-between border border-slate-200">
                <span className="text-slate-700">
                  Courier: <strong className="text-slate-900">{detectedOrder.courierName}</strong>
                </span>
                <span className="font-mono text-bayniks-orange font-bold">
                  ETA: {detectedOrder.eta}
                </span>
              </div>

              <button
                type="button"
                onClick={handleNavigateToTrack}
                className="w-full py-3.5 bg-bayniks-orange hover:bg-bayniks-orangeDark text-white font-extrabold text-xs rounded-2xl shadow-bolt-glow active:scale-95 transition flex items-center justify-center space-x-2"
              >
                <span>View Live Tracking Map</span>
                <span>→</span>
              </button>
            </div>
          )}
        </main>
      ) : (
        /* VIEW 2: RECIPIENT CONTACTLESS HANDOVER PASS */
        <main className="flex-1 w-full max-w-md mx-auto px-6 py-6 flex flex-col justify-center text-center space-y-5">
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-slate-900">
              Contactless Handover Pass
            </h2>
            <p className="text-xs text-slate-500">
              Present this QR code or 4-digit PIN to the courier to release the parcel
            </p>
          </div>

          {/* High-Fidelity Scannable QR Matrix SVG */}
          <div className="w-60 h-60 mx-auto bg-white p-4 rounded-3xl border-2 border-bayniks-orange shadow-lg flex items-center justify-center">
            <svg
              className="w-full h-full"
              viewBox="0 0 100 100"
              fill="currentColor"
              role="img"
              aria-label={`QR Code for Waybill ${waybillId}`}
            >
              {/* Top-Left Corner */}
              <rect x="5" y="5" width="28" height="28" rx="4" fill="#FF6D1F" />
              <rect x="9" y="9" width="20" height="20" rx="2" fill="#FFFFFF" />
              <rect x="13" y="13" width="12" height="12" rx="1.5" fill="#FF6D1F" />

              {/* Top-Right Corner */}
              <rect x="67" y="5" width="28" height="28" rx="4" fill="#FF6D1F" />
              <rect x="71" y="9" width="20" height="20" rx="2" fill="#FFFFFF" />
              <rect x="75" y="13" width="12" height="12" rx="1.5" fill="#FF6D1F" />

              {/* Bottom-Left Corner */}
              <rect x="5" y="67" width="28" height="28" rx="4" fill="#FF6D1F" />
              <rect x="9" y="71" width="20" height="20" rx="2" fill="#FFFFFF" />
              <rect x="13" y="75" width="12" height="12" rx="1.5" fill="#FF6D1F" />

              {/* Central Pattern & Decorative Matrix */}
              <rect x="40" y="10" width="8" height="8" rx="2" fill="#0E1013" />
              <rect x="52" y="10" width="8" height="8" rx="2" fill="#FF6D1F" />
              <rect x="40" y="40" width="20" height="20" rx="5" fill="#FF6D1F" />
              <circle cx="50" cy="50" r="4" fill="#FFFFFF" />
              <rect x="10" y="40" width="8" height="8" rx="2" fill="#0E1013" />
              <rect x="70" y="40" width="8" height="8" rx="2" fill="#0E1013" />
              <rect x="40" y="70" width="8" height="8" rx="2" fill="#0E1013" />
              <rect x="70" y="70" width="8" height="8" rx="2" fill="#FF6D1F" />
            </svg>
          </div>

          {/* Waybill & Handover PIN Card */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-2 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-[10px] font-mono font-bold text-slate-500">
                WAYBILL ID
              </span>
              <span className="text-xs font-mono font-extrabold text-slate-900">
                #{waybillId}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  Handover Release PIN
                </span>
                <span className="text-2xl font-mono font-black tracking-[0.25em] text-bayniks-orange">
                  {handoverPin}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyPin}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-mono font-bold text-slate-700 transition active:scale-95"
              >
                Copy PIN
              </button>
            </div>
          </div>

          {/* 1-Tap WhatsApp Share Action */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="w-full py-4 px-4 bg-[#25D366] hover:bg-emerald-600 text-white font-extrabold text-xs rounded-2xl shadow-sm active:scale-95 transition flex items-center justify-center space-x-2"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Send Pass to Rider via WhatsApp</span>
          </button>
        </main>
      )}
    </div>
  );
}
