'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatNaira } from '@logistics/shared-types';
import { useTheme } from './ThemeProvider';
import { ThemeToggle } from './ThemeToggle';
import { NewShipmentData } from './NewShipmentForm';
import {
  ArrowLeft,
  AlertTriangle,
  Package,
  Zap,
  CreditCard,
  Landmark,
} from 'lucide-react';

export type PaymentMethodChoice = 'wallet_escrow' | 'card' | 'bank_transfer';

export interface CheckoutConfirmationViewProps {
  shipmentData?: NewShipmentData;
  walletBalanceKobo?: number;
  onBackClick?: () => void;
  onConfirmSuccess?: (orderResult: {
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
    shipmentData: NewShipmentData;
  }) => void;
}

const DEFAULT_SHIPMENT_DATA: NewShipmentData = {
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
  totalFareKobo: 470000, // ₦4,700.00
};

export function CheckoutConfirmationView({
  shipmentData = DEFAULT_SHIPMENT_DATA,
  walletBalanceKobo = 3425000, // ₦34,250.00
  onBackClick,
  onConfirmSuccess,
}: CheckoutConfirmationViewProps) {
  const router = useRouter();
  const { isDark } = useTheme();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodChoice>('wallet_escrow');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const isWalletSufficient = walletBalanceKobo >= shipmentData.totalFareKobo;

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      router.push('/shipment/new');
    }
  };

  const handleConfirmAndDispatch = () => {
    setSubmissionError(null);

    if (paymentMethod === 'wallet_escrow' && !isWalletSufficient) {
      setSubmissionError('Insufficient Bayniks Wallet balance. Please top up or select debit card.');
      return;
    }

    setIsSubmitting(true);

    // Simulate atomic MongoDB escrow hold + Redis nearest bike assignment
    setTimeout(() => {
      setIsSubmitting(false);

      const generatedWaybillId = `BYN-LGS-${Math.floor(100000 + Math.random() * 900000)}`;
      const generatedOtp = `${Math.floor(1000 + Math.random() * 9000)}`;
      const generatedRef = `TXN-BYN-${Date.now().toString().slice(-7)}`;

      const orderResult = {
        waybillId: generatedWaybillId,
        trackingCode: generatedWaybillId,
        handoverPin: generatedOtp,
        transactionRef: generatedRef,
        courierName: 'Tariq Danladi',
        courierRating: 4.95,
        courierPlate: 'LND-4912',
        courierVehicle: 'Bajaj Boxer 150cc',
        etaMinutes: 12,
        fareKobo: shipmentData.totalFareKobo,
        shipmentData,
      };

      try {
        sessionStorage.setItem('bayniks-last-dispatched-order', JSON.stringify(orderResult));
      } catch {}

      if (onConfirmSuccess) {
        onConfirmSuccess(orderResult);
      } else {
        router.push('/shipment/success');
      }
    }, 600);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-slate-50 text-slate-900">
      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between max-w-2xl w-full mx-auto shrink-0 border-b border-slate-200 bg-white">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back to new shipment"
          className="w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 bg-white text-slate-800 shadow-sm border border-slate-200 hover:bg-slate-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="text-sm font-extrabold tracking-tight text-slate-900">Review & Confirm Dispatch</h1>

        <div className="w-10" />
      </header>

      {/* Main Review Chassis */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-6 py-6 overflow-y-auto space-y-5">
        {submissionError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-medium">{submissionError}</span>
          </div>
        )}

        {/* 1. Route Specs Card */}
        <div className="p-5 rounded-3xl border space-y-4 bg-white border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-mono font-bold uppercase text-slate-500">
              Corridor Route Details
            </span>
            <span className="px-2 py-0.5 rounded-full bg-bayniks-orange/15 text-bayniks-orange text-[10px] font-mono font-bold">
              Lagos Metro SLA ~12m
            </span>
          </div>

          <div className="space-y-4">
            {/* Pickup */}
            <div className="flex items-start space-x-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 mt-1 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Pickup Location
                </span>
                <p className="text-xs font-extrabold text-slate-900 mt-0.5">
                  {shipmentData.pickupAddress}
                </p>
                <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                  <span className="text-bayniks-orange font-bold">Landmark:</span>{' '}
                  {shipmentData.pickupLandmark}
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Sender: {shipmentData.senderName} ({shipmentData.senderPhone})
                </p>
              </div>
            </div>

            {/* Drop-off */}
            <div className="flex items-start space-x-3">
              <span className="w-3 h-3 rounded-full bg-bayniks-orange ring-4 ring-bayniks-orange/20 mt-1 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Drop-off Destination
                </span>
                <p className="text-xs font-extrabold text-slate-900 mt-0.5">
                  {shipmentData.dropoffAddress}
                </p>
                <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                  <span className="text-bayniks-orange font-bold">Landmark:</span>{' '}
                  {shipmentData.dropoffLandmark}
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Recipient: {shipmentData.recipientName} ({shipmentData.recipientPhone})
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Package Specifications Card */}
        <div className="p-4 rounded-3xl border flex items-center justify-between bg-white border-slate-200 shadow-sm">
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-500 block">
              Item & Specifications
            </span>
            <div className="text-xs font-extrabold text-slate-900 mt-0.5">
              {shipmentData.packageDescription}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5 capitalize">
              Size: {shipmentData.packageSize} •{' '}
              {shipmentData.isFragile && 'Fragile • '}
              {shipmentData.isPriority && 'Priority SLA • '}
              {shipmentData.hasCargoCover && '₦500k Insured'}
            </div>
          </div>

          <div className="w-10 h-10 rounded-2xl bg-bayniks-orange/15 text-bayniks-orange flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* 3. Payment Method Choice */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono font-bold uppercase text-slate-500">
              Payment Method & Escrow
            </span>
            <span className="text-[11px] font-mono text-bayniks-orange font-bold">
              Atomic Multi-Doc Hold
            </span>
          </div>

          <div className="space-y-2.5">
            {/* Wallet Escrow Option */}
            <div
              onClick={() => setPaymentMethod('wallet_escrow')}
              className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                paymentMethod === 'wallet_escrow'
                  ? 'border-bayniks-orange bg-orange-50/50 ring-1 ring-bayniks-orange shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-bayniks-orange text-white flex items-center justify-center shadow-xs">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-900">
                    Bayniks Escrow Wallet
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                    Balance: {formatNaira(walletBalanceKobo)}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    isWalletSufficient
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {isWalletSufficient ? 'Available' : 'Insufficient'}
                </span>
              </div>
            </div>

            {/* Paystack Card Option */}
            <div
              onClick={() => setPaymentMethod('card')}
              className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                paymentMethod === 'card'
                  ? 'border-bayniks-orange bg-orange-50/50 ring-1 ring-bayniks-orange shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-900">
                    Paystack Debit Card
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                    Visa, Mastercard, Verve (Instant Tokenization)
                  </div>
                </div>
              </div>

              <span className="text-[10px] font-mono text-slate-400">Direct Pay</span>
            </div>

            {/* Bank Transfer Option */}
            <div
              onClick={() => setPaymentMethod('bank_transfer')}
              className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                paymentMethod === 'bank_transfer'
                  ? 'border-bayniks-orange bg-orange-50/50 ring-1 ring-bayniks-orange shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-900">
                    Direct Bank Transfer
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                    Instant Dedicated Virtual Account
                  </div>
                </div>
              </div>

              <span className="text-[10px] font-mono text-slate-400">Monnify / Paystack</span>
            </div>
          </div>
        </div>

        {/* 4. Total Fare Calculation Banner */}
        <div className="p-4 rounded-2xl bg-orange-50/80 border border-orange-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-500 block font-semibold">
              Total Escrow Fare
            </span>
            <div className="text-2xl font-mono font-black text-slate-900">
              {formatNaira(shipmentData.totalFareKobo)}
            </div>
          </div>

          <div className="text-right text-[11px] font-mono text-slate-500">
            <div>VAT & Insurance Included</div>
            <div className="text-emerald-700 font-bold">Held safely until 4-digit OTP</div>
          </div>
        </div>

        {/* Submit Dispatch Action */}
        <div className="pt-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirmAndDispatch}
            className="w-full py-4 px-6 bg-bayniks-orange hover:bg-bayniks-orangeDark text-white font-extrabold text-sm rounded-2xl shadow-bolt-glow active:scale-[0.98] transition flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>
              {isSubmitting
                ? 'Assigning Nearest Bike Courier...'
                : `Confirm & Lock Escrow (${formatNaira(shipmentData.totalFareKobo)})`}
            </span>
            <span>→</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-3 text-center text-[11px] font-mono text-slate-500 shrink-0 border-t border-slate-200 bg-white">
        Protected by Bayniks Anti-Fraud 4-Digit Handover PIN System
      </footer>
    </div>
  );
}

