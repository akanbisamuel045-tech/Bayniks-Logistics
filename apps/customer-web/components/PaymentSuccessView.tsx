'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatNaira } from '@logistics/shared-types';
import { useTheme } from './ThemeProvider';
import { ThemeToggle } from './ThemeToggle';
import { NewShipmentData } from './NewShipmentForm';
import {
  Zap,
  CheckCircle2,
  Check,
  Copy,
  MessageSquare,
  Star,
} from 'lucide-react';

export interface OrderSuccessPayload {
  waybillId: string;
  trackingCode: string;
  handoverPin: string;
  transactionRef: string;
  courierName: string;
  courierRating: number;
  courierPlate: string;
  courierVehicle: string;
  etaMinutes: number;
  fareKobo: number;
  shipmentData?: NewShipmentData;
}

export interface PaymentSuccessViewProps {
  orderResult?: OrderSuccessPayload;
  onTrackOrder?: (waybillId: string) => void;
  onDashboardClick?: () => void;
}

const DEFAULT_SUCCESS_ORDER: OrderSuccessPayload = {
  waybillId: 'BYN-LGS-847291',
  trackingCode: 'BYN-LGS-847291',
  handoverPin: '4829',
  transactionRef: 'TXN-BYN-8492019',
  courierName: 'Tariq Danladi',
  courierRating: 4.95,
  courierPlate: 'LND-4912',
  courierVehicle: 'Bajaj Boxer 150cc',
  etaMinutes: 12,
  fareKobo: 470000,
  shipmentData: {
    senderName: 'Kainul Designs',
    senderPhone: '+2348123456789',
    pickupAddress: '12 Commercial Avenue, Sabo, Yaba, Lagos',
    pickupLandmark: 'Opposite Ozone Cinemas, Yaba',
    recipientName: 'Michael Chen',
    recipientPhone: '+2349018821100',
    dropoffAddress: 'Victoria Island Towers, Plot 4, Adeola Odeku, Lagos',
    dropoffLandmark: 'Beside Zenith Bank Head Office',
    deliveryNotes: 'Leave with ground floor security if not at desk',
    packageDescription: 'Design documents & tech prototype',
    packageSize: 'medium',
    isFragile: true,
    isPriority: false,
    hasCargoCover: true,
    totalFareKobo: 470000,
  },
};

export function PaymentSuccessView({
  orderResult = DEFAULT_SUCCESS_ORDER,
  onTrackOrder,
  onDashboardClick,
}: PaymentSuccessViewProps) {
  const router = useRouter();
  const { isDark } = useTheme();

  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyOtp = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(orderResult.handoverPin);
    }
    setCopied(true);
    showToast(`Copied Handover PIN: ${orderResult.handoverPin}`);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Bayniks Delivery Handover Pass\nWaybill: #${orderResult.waybillId}\nRecipient: ${orderResult.shipmentData?.recipientName || 'Customer'}\nDestination: ${orderResult.shipmentData?.dropoffAddress || 'Lagos'}\nHandover PIN: ${orderResult.handoverPin}\n\nTrack Live: https://bayniks.com/track/${orderResult.waybillId}`
    );
    if (typeof window !== 'undefined') {
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
  };

  const handleTrack = () => {
    if (onTrackOrder) {
      onTrackOrder(orderResult.waybillId);
    } else {
      router.push(`/track/${orderResult.waybillId}`);
    }
  };

  const handleDashboard = () => {
    if (onDashboardClick) {
      onDashboardClick();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-slate-50 text-slate-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-bayniks-orange text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-bolt-glow flex items-center space-x-2 animate-bounce">
          <Zap className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between max-w-xl w-full mx-auto shrink-0 border-b border-slate-200 bg-white">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-bayniks-orange text-white font-mono font-bold flex items-center justify-center shadow-bolt-glow text-sm">
            <Zap className="w-4 h-4" />
          </div>
          <span className="font-mono font-extrabold text-sm tracking-wider text-slate-900">BAYNIKS</span>
        </div>

        <div className="w-8" />
      </header>

      {/* Main Celebration Chassis */}
      <main className="flex-1 w-full max-w-xl mx-auto px-6 py-6 overflow-y-auto space-y-6 text-center">
        {/* Animated Checkmark Circle */}
        <div className="w-20 h-20 rounded-full bg-orange-100 border-2 border-bayniks-orange mx-auto flex items-center justify-center text-bayniks-orange shadow-sm transform transition hover:scale-105">
          <CheckCircle2 className="w-10 h-10 text-bayniks-orange" />
        </div>

        <div>
          <span className="px-3.5 py-1 rounded-full bg-orange-50 text-bayniks-orange font-mono text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center space-x-1.5 border border-orange-200">
            <span className="w-1.5 h-1.5 rounded-full bg-bayniks-orange animate-ping" />
            <span>COURIER DISPATCHED • REDIS GEO-MATCHED</span>
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-2.5 text-slate-900">
            Payment Confirmed!
          </h1>
          <p className="text-3xl sm:text-4xl font-mono font-black text-bayniks-orange mt-1">
            {formatNaira(orderResult.fareKobo)}
          </p>
          <p className="text-[11px] font-mono text-slate-500 mt-1">
            Reference: {orderResult.transactionRef}
          </p>
        </div>

        {/* Handover OTP Verification Card */}
        <div className="rounded-3xl p-5 border text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm bg-white border-slate-200">
          <div>
            <span className="text-[10px] uppercase font-mono font-bold text-slate-500 block tracking-wider">
              Handover Verification PIN / OTP
            </span>
            <div className="font-mono text-3xl font-black text-slate-900 tracking-[0.25em] mt-1">
              {orderResult.handoverPin}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Give this 4-digit PIN to the courier upon delivery
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleCopyOtp}
              className="px-4 py-2.5 rounded-xl bg-bayniks-orange text-white text-xs font-extrabold shadow-bolt-glow active:scale-95 transition flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy PIN'}</span>
            </button>
            <button
              type="button"
              onClick={handleWhatsAppShare}
              title="Share Pass via WhatsApp"
              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center space-x-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="text-[11px]">WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Itemized Order & Route Summary */}
        <div className="rounded-3xl p-5 border text-left space-y-3.5 bg-white border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-slate-500 font-mono font-bold uppercase text-[10px]">
              Waybill Tracking ID
            </span>
            <span className="font-mono font-extrabold text-slate-900 text-xs">
              #{orderResult.waybillId}
            </span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-slate-500 font-mono font-bold uppercase text-[10px]">
              Assigned Motorcycle Courier
            </span>
            <span className="font-bold text-slate-900 text-xs flex items-center gap-1">
              <span>{orderResult.courierName}</span>
              <span className="inline-flex items-center gap-0.5 text-bayniks-orange">
                <Star className="w-3 h-3 fill-bayniks-orange text-bayniks-orange" />
                <span>{orderResult.courierRating}</span>
              </span>
              <span>({orderResult.courierPlate})</span>
            </span>
          </div>

          {/* Explicitly rendered Pickup & Dropoff elements with landmarks */}
          <div className="space-y-2.5 text-xs">
            <div>
              <span className="text-slate-500 font-mono uppercase text-[10px] block">
                Pickup Address & Landmark
              </span>
              <div id="paySuccessPickupDisplay" className="font-medium text-slate-900 mt-0.5">
                {orderResult.shipmentData?.pickupAddress || '12 Commercial Avenue, Sabo, Yaba'}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Landmark: {orderResult.shipmentData?.pickupLandmark || 'Opposite Ozone Cinemas'}
              </div>
            </div>

            <div>
              <span className="text-slate-500 font-mono uppercase text-[10px] block">
                Drop-off Destination & Landmark
              </span>
              <div id="paySuccessDropoffDisplay" className="font-medium text-slate-900 mt-0.5">
                {orderResult.shipmentData?.dropoffAddress || 'Victoria Island Towers, Adeola Odeku'}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Landmark: {orderResult.shipmentData?.dropoffLandmark || 'Beside Zenith Bank Head Office'}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleTrack}
            className="w-full py-4 px-6 bg-bayniks-orange hover:bg-bayniks-orangeDark text-white font-extrabold text-sm rounded-2xl shadow-bolt-glow active:scale-[0.98] transition flex items-center justify-center space-x-2"
          >
            <span>Track Live Courier on Radar</span>
            <span>→</span>
          </button>

          <button
            type="button"
            onClick={handleDashboard}
            className="w-full py-3.5 px-6 rounded-2xl font-bold text-xs transition border bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            Return to Dispatch Dashboard
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] font-mono text-slate-500 shrink-0 border-t border-slate-200 bg-white">
        Escrow Protected by Bayniks Logistics • ₦500k Cargo Insurance Active
      </footer>
    </div>
  );
}

