import React, { useState } from 'react';
import { X, CreditCard, ShieldCheck, CheckCircle2, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { playMissionAcceptChime, playKeypadChime } from '../../utils/audioChimes';

export interface VirtualDebtTopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalanceKobo: number;
  onTopUpSuccess: (amountKobo: number) => Promise<void>;
}

function formatKoboToNaira(kobo: number): string {
  const naira = Math.floor(Math.abs(kobo) / 100);
  return `₦${naira.toLocaleString('en-NG')}`;
}

export const VirtualDebtTopUpModal: React.FC<VirtualDebtTopUpModalProps> = ({
  isOpen,
  onClose,
  currentBalanceKobo,
  onTopUpSuccess,
}) => {
  const isNegative = currentBalanceKobo < 0;
  const currentDebtKobo = isNegative ? Math.abs(currentBalanceKobo) : 0;
  const fullDebtNaira = Math.max(1000, Math.ceil(currentDebtKobo / 100));

  const [topUpAmountNaira, setTopUpAmountNaira] = useState<number>(fullDebtNaira);
  const [customInput, setCustomInput] = useState<string>('');
  const [paymentChannel, setPaymentChannel] = useState<'card' | 'bank_transfer' | 'ussd'>('card');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSelectPreset = (naira: number) => {
    playKeypadChime();
    setTopUpAmountNaira(naira);
    setCustomInput('');
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setCustomInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      setTopUpAmountNaira(num);
    }
  };

  const handleExecutePayment = async () => {
    if (topUpAmountNaira < 500) return;
    setIsProcessing(true);
    playMissionAcceptChime();

    try {
      // Simulate/trigger Paystack payment processing delay
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await onTopUpSuccess(topUpAmountNaira * 100);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setIsProcessing(false);
        onClose();
      }, 1500);
    } catch {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="absolute inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-3 bg-black/60 backdrop-blur-sm animate-fadeIn"
      data-testid="virtual-debt-topup-modal"
    >
      <div className="relative w-full max-w-[390px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-neutral-200">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#1E1C1A] to-[#2B2724] px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF5722] flex items-center justify-center text-white shadow-md">
              <CreditCard size={16} strokeWidth={2.4} />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight">Top Up Rider Wallet</h2>
              <p className="text-[11px] text-zinc-300">Clear Commission Debt via Paystack</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label="Close Top-Up Modal"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Current Debt Banner */}
          <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">
                Current Debt Balance
              </span>
              <div className="text-base font-black text-neutral-900 mt-0.5 font-mono">
                {isNegative ? `-${formatKoboToNaira(currentDebtKobo)}` : '₦0.00 (No Debt)'}
              </div>
            </div>
            <span className="text-[10px] font-bold text-neutral-600 bg-neutral-200/80 px-2 py-0.5 rounded-full">
              ₦5,000 Lock Limit
            </span>
          </div>

          {/* Preset Buttons */}
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 block mb-1.5">
              Select Top-Up Amount
            </span>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              <button
                type="button"
                onClick={() => handleSelectPreset(fullDebtNaira)}
                className={`py-2 px-1 rounded-xl text-xs font-black border transition-all ${
                  topUpAmountNaira === fullDebtNaira && !customInput
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 bg-neutral-50 text-neutral-800 hover:bg-neutral-100'
                }`}
              >
                Clear Full
              </button>
              {[2000, 5000].map((naira) => (
                <button
                  key={naira}
                  type="button"
                  onClick={() => handleSelectPreset(naira)}
                  className={`py-2 rounded-xl text-xs font-black border transition-all ${
                    topUpAmountNaira === naira && !customInput
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-800 hover:bg-neutral-100'
                  }`}
                >
                  ₦{naira.toLocaleString('en-NG')}
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-neutral-500">₦</span>
              <input
                type="text"
                inputMode="numeric"
                value={customInput}
                onChange={handleCustomChange}
                placeholder="Enter custom top-up (Min ₦500)"
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 block mb-1.5">
              Payment Gateway Channel
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'card', label: 'Debit Card' },
                { id: 'bank_transfer', label: 'Bank Transfer' },
                { id: 'ussd', label: 'USSD' },
              ].map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentChannel(method.id as any)}
                  className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all ${
                    paymentChannel === method.id
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-extrabold'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          {/* Secure Badge */}
          <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1 border-t border-neutral-100">
            <div className="flex items-center gap-1.5 font-bold">
              <Lock size={13} className="text-emerald-600" />
              <span>Secured by Paystack PCI-DSS</span>
            </div>
            <span className="font-extrabold text-neutral-800">
              Total: ₦{topUpAmountNaira.toLocaleString('en-NG')}
            </span>
          </div>

          {/* Action Trigger */}
          <button
            type="button"
            disabled={isProcessing || topUpAmountNaira < 500}
            onClick={handleExecutePayment}
            className={`w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] ${
              isSuccess
                ? 'bg-emerald-600 text-white'
                : isProcessing
                ? 'bg-neutral-800 text-white cursor-wait'
                : 'bg-neutral-900 hover:bg-black text-white'
            }`}
            data-testid="btn-execute-topup"
          >
            {isSuccess ? (
              <>
                <CheckCircle2 size={16} strokeWidth={2.4} />
                <span>Debt Cleared! Account Active</span>
              </>
            ) : isProcessing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Processing Paystack Top-Up...</span>
              </>
            ) : (
              <>
                <span>Pay ₦{topUpAmountNaira.toLocaleString('en-NG')} via Paystack</span>
                <ArrowRight size={14} strokeWidth={2.4} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

