import React, { useState, useEffect } from 'react';
import { compressPodPhotoUnder300KB, CompressedPhotoResult } from '../services/imageCompressor.service';
import { Camera, ShieldCheck, CheckCircle2, AlertTriangle, X, RefreshCw } from 'lucide-react';

export interface PinVerificationModalProps {
  isOpen: boolean;
  mode: 'pickup' | 'dropoff';
  stopSequenceNumber?: number;
  recipientName?: string;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmitPickupPin: (pin: string) => Promise<void>;
  onSubmitDeliveryPinAndPod: (pin: string, photoDataUrl: string, byteSize: number) => Promise<void>;
}

export const PinVerificationModal: React.FC<PinVerificationModalProps> = ({
  isOpen,
  mode,
  stopSequenceNumber = 1,
  recipientName = 'Recipient',
  isSubmitting = false,
  errorMessage = null,
  onClose,
  onSubmitPickupPin,
  onSubmitDeliveryPinAndPod,
}) => {
  const [pinDigits, setPinDigits] = useState<string[]>([]);
  const [compressedPhoto, setCompressedPhoto] = useState<CompressedPhotoResult | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Reset PIN digits, photo, and error messages whenever modal opens or mode changes
  useEffect(() => {
    if (isOpen) {
      setPinDigits([]);
      setCompressedPhoto(null);
      setPhotoError(null);
    }
  }, [isOpen, mode]);

  const handleClose = () => {
    setPinDigits([]);
    setCompressedPhoto(null);
    setPhotoError(null);
    onClose();
  };

  if (!isOpen) return null;

  const currentPin = pinDigits.join('');

  const handleKeyPress = (digit: string) => {
    if (pinDigits.length < 4 && !isSubmitting) {
      setPinDigits([...pinDigits, digit]);
    }
  };

  const handleBackspace = () => {
    if (pinDigits.length > 0 && !isSubmitting) {
      setPinDigits(pinDigits.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (!isSubmitting) {
      setPinDigits([]);
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    setPhotoError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const rawDataUrl = event.target?.result as string;
        const compressed = await compressPodPhotoUnder300KB(rawDataUrl);
        setCompressedPhoto(compressed);
      } catch (err: any) {
        setPhotoError(err.message || 'Image compression failed');
      } finally {
        setIsCompressing(false);
      }
    };
    reader.onerror = () => {
      setPhotoError('Failed to read image file');
      setIsCompressing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (currentPin.length !== 4) return;

    if (mode === 'pickup') {
      await onSubmitPickupPin(currentPin);
    } else {
      if (!compressedPhoto) {
        setPhotoError('Proof of Delivery photo is required before completing delivery');
        return;
      }
      await onSubmitDeliveryPinAndPod(currentPin, compressedPhoto.dataUrl, compressedPhoto.byteSize);
    }
    // Clean up internal state on submit
    setPinDigits([]);
    setCompressedPhoto(null);
    setPhotoError(null);
  };

  const isSubmitDisabled =
    isSubmitting ||
    currentPin.length !== 4 ||
    (mode === 'dropoff' && !compressedPhoto) ||
    isCompressing;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#16181D] border-t-2 sm:border-2 border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto hide-scrollbar text-white">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#FF6D1F]">
              {mode === 'pickup' ? 'ANTI-FRAUD PICKUP VERIFICATION' : `STOP #${stopSequenceNumber} PROOF OF DELIVERY`}
            </span>
            <h2 className="text-lg font-black text-white">
              {mode === 'pickup' ? 'Enter 4-Digit Sender PIN' : `Verify PIN & Photo for ${recipientName}`}
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close verification modal"
            className="w-10 h-10 rounded-full bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center font-bold text-base transition-colors active:scale-95"
          >
            <X className="w-5 h-5 text-black bg-white rounded-full p-0.5" />
          </button>
        </div>

        {/* Error Banner */}
        {(errorMessage || photoError) && (
          <div className="bg-red-950/80 border border-red-500/80 p-3 rounded-xl flex items-start gap-2 text-xs text-red-200">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="font-semibold">{errorMessage || photoError}</span>
          </div>
        )}

        {/* Dropoff Photo POD Upload Section */}
        {mode === 'dropoff' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-[#FF6D1F]" />
                <span>Proof of Delivery Photo (&lt;300KB)</span>
              </span>
              {compressedPhoto && (
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Compressed: {Math.round(compressedPhoto.byteSize / 1024)} KB ✓
                </span>
              )}
            </div>

            {compressedPhoto ? (
              <div className="relative rounded-xl overflow-hidden border border-zinc-700 h-28 bg-black flex items-center justify-center">
                <img
                  src={compressedPhoto.dataUrl}
                  alt="POD Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setCompressedPhoto(null)}
                  className="absolute top-2 right-2 px-2.5 py-1 bg-black/80 hover:bg-black text-white text-[10px] font-bold rounded-lg border border-zinc-600 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retake Photo</span>
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-zinc-700 hover:border-[#FF6D1F] rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-zinc-950/60 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoSelect}
                  disabled={isCompressing || isSubmitting}
                />
                <Camera className="w-7 h-7 text-[#FF6D1F]" />
                <span className="text-xs font-bold text-[#FF6D1F] uppercase">
                  {isCompressing ? 'Compressing Image (<300KB)...' : 'Snap or Upload Package Photo'}
                </span>
                <span className="text-[10px] text-zinc-500">
                  Optimized for fast 3G upload (Max 1024px, JPEG)
                </span>
              </label>
            )}
          </div>
        )}

        {/* 4-Digit PIN Boxes */}
        <div className="flex justify-center gap-3 py-2">
          {[0, 1, 2, 3].map((idx) => {
            const digit = pinDigits[idx];
            const isFilled = digit !== undefined;
            return (
              <div
                key={idx}
                className={`w-14 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl font-mono font-black transition-all ${
                  isFilled
                    ? 'border-[#FF6D1F] bg-orange-950/40 text-[#FF6D1F] shadow-lg shadow-orange-500/10 scale-105'
                    : 'border-zinc-800 bg-zinc-900/80 text-zinc-600'
                }`}
              >
                {digit || '•'}
              </div>
            );
          })}
        </div>

        {/* Large Tactile 0-9 Motorcycle Glove Keypad */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              disabled={isSubmitting || pinDigits.length >= 4}
              className="h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-white font-mono font-black text-xl hover:bg-zinc-800 active:bg-[#FF6D1F] active:text-black transition-all active:scale-95 shadow-md flex items-center justify-center select-none"
            >
              {digit}
            </button>
          ))}

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleClear}
            disabled={isSubmitting || pinDigits.length === 0}
            className="h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold text-xs uppercase hover:bg-zinc-800 active:scale-95 transition-all flex items-center justify-center select-none"
          >
            Clear
          </button>

          {/* Zero Button */}
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            disabled={isSubmitting || pinDigits.length >= 4}
            className="h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-white font-mono font-black text-xl hover:bg-zinc-800 active:bg-[#FF6D1F] active:text-black transition-all active:scale-95 shadow-md flex items-center justify-center select-none"
          >
            0
          </button>

          {/* Backspace Button */}
          <button
            type="button"
            onClick={handleBackspace}
            disabled={isSubmitting || pinDigits.length === 0}
            className="h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-[#FF6D1F] font-black text-lg hover:bg-zinc-800 active:scale-95 transition-all flex items-center justify-center select-none"
          >
            ⌫
          </button>
        </div>

        {/* Submit Action Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          className={`w-full py-4 rounded-2xl font-black text-base uppercase tracking-wider transition-all flex items-center justify-center shadow-xl ${
            isSubmitDisabled
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              : mode === 'pickup'
              ? 'bg-[#FF6D1F] hover:bg-orange-600 text-white shadow-orange-500/30 active:scale-98'
              : 'bg-emerald-400 hover:bg-emerald-300 text-black shadow-emerald-500/30 active:scale-98'
          }`}
        >
          {isSubmitting
            ? 'VERIFYING WITH FLEET SERVER...'
            : mode === 'pickup'
            ? 'VERIFY PIN • START TRIP'
            : 'CONFIRM POD • COMPLETE DELIVERY'}
        </button>
      </div>
    </div>
  );
};
