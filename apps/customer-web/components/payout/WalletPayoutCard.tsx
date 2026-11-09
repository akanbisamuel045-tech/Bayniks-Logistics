'use client';

import React, { useState, useEffect } from 'react';
import { formatNaira, nairaToKobo, koboToNaira, NigerianBank } from '@logistics/shared-types';

export interface PayoutItem {
  payoutId: string;
  bankCode: string;
  bankName?: string;
  accountNumber: string;
  accountName?: string;
  amountKobo: number;
  status: 'pending' | 'processing' | 'success' | 'failed';
  recipientCode?: string;
  paystackTransferReference?: string;
  createdAt: number;
}

export interface WalletPayoutCardProps {
  initialBalanceKobo?: number;
  initialEscrowLockedKobo?: number;
  onPayoutSuccess?: (payout: PayoutItem) => void;
}

const DEFAULT_NIGERIAN_BANKS: NigerianBank[] = [
  { name: 'Access Bank', code: '044', slug: 'access-bank' },
  { name: 'Guaranty Trust Bank (GTBank)', code: '058', slug: 'gtbank' },
  { name: 'Zenith Bank', code: '057', slug: 'zenith-bank' },
  { name: 'United Bank for Africa (UBA)', code: '033', slug: 'uba' },
  { name: 'First Bank of Nigeria', code: '011', slug: 'first-bank' },
  { name: 'Kuda Bank', code: '090267', slug: 'kuda-bank' },
  { name: 'OPay', code: '099999', slug: 'opay' },
  { name: 'Moniepoint Microfinance Bank', code: '090405', slug: 'moniepoint' },
  { name: 'Stanbic IBTC Bank', code: '039', slug: 'stanbic-ibtc' },
  { name: 'Sterling Bank', code: '232', slug: 'sterling-bank' },
];

export function WalletPayoutCard({
  initialBalanceKobo = 0,
  initialEscrowLockedKobo = 0,
  onPayoutSuccess,
}: WalletPayoutCardProps) {
  const [balanceKobo, setBalanceKobo] = useState<number>(initialBalanceKobo);
  const [escrowLockedKobo, setEscrowLockedKobo] = useState<number>(initialEscrowLockedKobo);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  // Bank Form States
  const [banks, setBanks] = useState<NigerianBank[]>(DEFAULT_NIGERIAN_BANKS);
  const [selectedBankCode, setSelectedBankCode] = useState<string>('058');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [isResolvingAccount, setIsResolvingAccount] = useState<boolean>(false);
  const [accountResolveError, setAccountResolveError] = useState<string | null>(null);

  const [withdrawNaira, setWithdrawNaira] = useState<string>('');
  const [reason, setReason] = useState<string>('Earnings disbursement');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Payout history
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Fetch banks & current wallet data on mount
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const token =
          typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
            ? window.localStorage.getItem('auth_token')
            : null;

        // Fetch wallet details
        const walletRes = await fetch('/api/v1/wallet/me', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (walletRes.ok) {
          const wData = await walletRes.json();
          if (typeof wData.balanceKobo === 'number') {
            setBalanceKobo(wData.balanceKobo);
          }
          if (typeof wData.escrowLockedKobo === 'number') {
            setEscrowLockedKobo(wData.escrowLockedKobo);
          }
        }

        // Fetch supported Nigerian banks
        const banksRes = await fetch('/api/v1/payout/banks');
        if (banksRes.ok) {
          const bData = await banksRes.json();
          if (Array.isArray(bData.banks) && bData.banks.length > 0) {
            setBanks(bData.banks);
          }
        }

        // Fetch recent payouts
        setIsLoadingHistory(true);
        const payoutRes = await fetch('/api/v1/wallet/payouts', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (payoutRes.ok) {
          const pData = await payoutRes.json();
          if (Array.isArray(pData.payouts)) {
            setPayouts(pData.payouts);
          }
        }
      } catch (err) {
        console.error('[WalletPayoutCard] Error fetching data:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    }

    fetchInitialData();
  }, []);

  // Auto-resolve account name when 10 digits are typed and a bank is selected
  useEffect(() => {
    const trimmedAcct = accountNumber.trim();
    if (trimmedAcct.length === 10 && /^\d{10}$/.test(trimmedAcct) && selectedBankCode) {
      let isCurrent = true;
      setIsResolvingAccount(true);
      setAccountResolveError(null);
      setAccountName('');

      fetch('/api/v1/payout/resolve-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountNumber: trimmedAcct,
          bankCode: selectedBankCode,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (!isCurrent) return;
          if (data.accountName) {
            setAccountName(data.accountName);
          } else {
            setAccountResolveError(data.error || 'Could not verify recipient bank account');
          }
        })
        .catch(() => {
          if (isCurrent) {
            setAccountResolveError('Bank network timeout. Please verify details manually.');
          }
        })
        .finally(() => {
          if (isCurrent) setIsResolvingAccount(false);
        });

      return () => {
        isCurrent = false;
      };
    } else {
      setAccountName('');
      setAccountResolveError(null);
    }
  }, [accountNumber, selectedBankCode]);

  // Quick percentage calculation chips
  const handleQuickPercent = (pct: number) => {
    const amountKobo = Math.floor(balanceKobo * (pct / 100));
    setWithdrawNaira(koboToNaira(amountKobo).toString());
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const nairaNum = parseFloat(withdrawNaira);
    if (!Number.isFinite(nairaNum) || nairaNum < 500) {
      setErrorMessage('Minimum withdrawal is ₦500.00');
      return;
    }

    const amountKobo = nairaToKobo(nairaNum);
    if (amountKobo > balanceKobo) {
      setErrorMessage(`Insufficient wallet balance. You have ${formatNaira(balanceKobo)} available.`);
      return;
    }

    if (!accountNumber || accountNumber.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit NUBAN account number');
      return;
    }

    const resolvedName = accountName || 'Verified Account Holder';

    setIsSubmitting(true);
    try {
      const token =
        typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
          ? window.localStorage.getItem('auth_token')
          : null;

      const res = await fetch('/api/v1/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          accountNumber,
          bankCode: selectedBankCode,
          accountName: resolvedName,
          amountKobo,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Withdrawal failed');
      }

      // Update state
      const newBalance = Math.max(0, balanceKobo - amountKobo);
      setBalanceKobo(newBalance);
      setSuccessMessage(
        `Disbursement initiated! Reference: ${data.payout.paystackTransferReference || data.payout.payoutId}`
      );

      const newPayoutItem: PayoutItem = {
        payoutId: data.payout.payoutId,
        bankCode: data.payout.bankCode,
        bankName: banks.find((b) => b.code === selectedBankCode)?.name,
        accountNumber,
        accountName: resolvedName,
        amountKobo,
        status: data.payout.status || 'processing',
        paystackTransferReference: data.payout.paystackTransferReference,
        createdAt: Date.now(),
      };

      setPayouts((prev) => [newPayoutItem, ...prev]);

      if (onPayoutSuccess) {
        onPayoutSuccess(newPayoutItem);
      }

      // Reset modal inputs after brief delay
      setTimeout(() => {
        setIsWithdrawModalOpen(false);
        setWithdrawNaira('');
        setSuccessMessage(null);
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing bank withdrawal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-bayniks-cardDark border border-bayniks-surfaceDark rounded-2xl p-6 shadow-xl text-white">
      {/* Wallet Balance Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-bayniks-surfaceDark">
        <div>
          <span className="text-xs uppercase tracking-wider text-bayniks-grayMid font-mono font-semibold">
            Available Wallet Balance
          </span>
          <div className="text-3xl md:text-4xl font-extrabold text-white mt-1 font-mono tracking-tight">
            {formatNaira(balanceKobo)}
          </div>
          {escrowLockedKobo > 0 && (
            <div className="text-xs text-bayniks-orangeAccent font-mono mt-1 flex items-center gap-1.5">
              <span>🔒 In Delivery Escrow:</span>
              <span className="font-semibold">{formatNaira(escrowLockedKobo)}</span>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            setIsWithdrawModalOpen(true);
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          disabled={balanceKobo < 50000}
          className={`px-6 py-3 rounded-xl font-bold text-sm tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 ${
            balanceKobo >= 50000
              ? 'bg-bayniks-orange hover:bg-bayniks-orangeDark text-white shadow-bayniks-orange/20 cursor-pointer active:scale-95'
              : 'bg-bayniks-surfaceDark text-bayniks-grayMid cursor-not-allowed border border-white/5'
          }`}
        >
          <span>⚡ Withdraw Funds</span>
        </button>
      </div>

      {/* Withdrawal Modal */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-bayniks-cardDark border border-bayniks-orange/40 rounded-2xl p-6 shadow-2xl relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-bayniks-surfaceDark">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-bayniks-orange/20 border border-bayniks-orange/30 flex items-center justify-center text-bayniks-orange text-lg">
                  🏦
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">Instant Bank Payout</h3>
                  <p className="text-xs text-bayniks-grayMid">Disbursed directly via Paystack Transfer API</p>
                </div>
              </div>
              <button
                onClick={() => setIsWithdrawModalOpen(false)}
                className="text-bayniks-grayMid hover:text-white text-xl p-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Error & Success Messages */}
            {errorMessage && (
              <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-mono">
                ⚠️ {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-mono">
                ✓ {successMessage}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleWithdrawSubmit} className="mt-4 space-y-4">
              {/* Bank Selection */}
              <div>
                <label className="block text-xs font-semibold text-bayniks-grayMid uppercase tracking-wider mb-1.5">
                  Select Nigerian Bank
                </label>
                <select
                  value={selectedBankCode}
                  onChange={(e) => setSelectedBankCode(e.target.value)}
                  className="w-full bg-bayniks-surfaceDark border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-bayniks-orange"
                >
                  {banks.map((b) => (
                    <option key={b.code} value={b.code} className="bg-bayniks-cardDark text-white">
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 10-Digit NUBAN Account Number */}
              <div>
                <label className="block text-xs font-semibold text-bayniks-grayMid uppercase tracking-wider mb-1.5">
                  10-Digit NUBAN Account Number
                </label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="e.g. 0123456789"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-bayniks-surfaceDark border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono tracking-wider focus:outline-none focus:border-bayniks-orange"
                  required
                />

                {/* Account Name Resolution State */}
                <div className="mt-1.5 min-h-[20px]">
                  {isResolvingAccount && (
                    <span className="text-xs text-bayniks-orangeAccent animate-pulse flex items-center gap-1">
                      <span className="inline-block animate-spin">⏳</span> Verifying account with NIBSS / Paystack...
                    </span>
                  )}
                  {accountName && !isResolvingAccount && (
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 font-mono">
                      ✓ Recipient: {accountName}
                    </span>
                  )}
                  {accountResolveError && !isResolvingAccount && (
                    <span className="text-xs text-rose-400 flex items-center gap-1 font-mono">
                      ✕ {accountResolveError}
                    </span>
                  )}
                </div>
              </div>

              {/* Withdrawal Amount (₦) */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-bayniks-grayMid uppercase tracking-wider">
                    Withdrawal Amount (₦)
                  </label>
                  <span className="text-xs text-bayniks-grayMid font-mono">
                    Max: {formatNaira(balanceKobo)}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-mono text-bayniks-grayMid">₦</span>
                  <input
                    type="number"
                    min="500"
                    step="100"
                    placeholder="5,000"
                    value={withdrawNaira}
                    onChange={(e) => setWithdrawNaira(e.target.value)}
                    className="w-full bg-bayniks-surfaceDark border border-white/10 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-bayniks-orange"
                    required
                  />
                </div>

                {/* Quick % Chips */}
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleQuickPercent(pct)}
                      className="px-2 py-1.5 rounded-lg bg-bayniks-surfaceDark hover:bg-white/10 text-xs font-mono font-medium text-bayniks-grayMid hover:text-white border border-white/5 transition"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Transfer Note */}
              <div>
                <label className="block text-xs font-semibold text-bayniks-grayMid uppercase tracking-wider mb-1.5">
                  Transfer Note (Optional)
                </label>
                <input
                  type="text"
                  maxLength={150}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-bayniks-surfaceDark border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-bayniks-orange"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-bayniks-surfaceDark">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-bayniks-grayMid hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !accountNumber || accountNumber.length !== 10}
                  className="px-5 py-2.5 rounded-xl bg-bayniks-orange hover:bg-bayniks-orangeDark text-white text-xs font-bold tracking-wide transition shadow-lg shadow-bayniks-orange/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <span className="inline-block animate-spin">⏳</span> Disbursing...
                    </>
                  ) : (
                    'Confirm & Disburse'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payouts History Table */}
      <div className="mt-8">
        <h4 className="text-sm font-bold text-white mb-4 tracking-wide flex items-center justify-between">
          <span>Recent Bank Payouts</span>
          <span className="text-xs text-bayniks-grayMid font-mono font-normal">
            {payouts.length} recorded
          </span>
        </h4>

        {isLoadingHistory ? (
          <div className="p-8 text-center text-xs text-bayniks-grayMid font-mono">
            Loading payout records...
          </div>
        ) : payouts.length === 0 ? (
          <div className="p-6 text-center bg-bayniks-surfaceDark/40 rounded-xl border border-white/5 text-xs text-bayniks-grayMid">
            No bank payouts recorded yet. Your completed withdrawals will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-bayniks-grayMid">
              <thead className="bg-bayniks-surfaceDark text-white uppercase text-[10px] tracking-wider font-mono">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-lg">Date</th>
                  <th className="py-2.5 px-3">Bank & Account</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Reference</th>
                  <th className="py-2.5 px-3 rounded-r-lg">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {payouts.map((p) => {
                  const statusColors = {
                    success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                    processing: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                    pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                    failed: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
                  }[p.status] || 'bg-white/10 text-white border-white/10';

                  return (
                    <tr key={p.payoutId} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 px-3 text-white">
                        {new Date(p.createdAt).toLocaleDateString('en-NG', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-3 text-white">
                        <div className="font-semibold">{p.accountName || 'Account Holder'}</div>
                        <div className="text-[11px] text-bayniks-grayMid">
                          {p.bankName || `Bank ${p.bankCode}`} • {p.accountNumber}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold text-white">
                        {formatNaira(p.amountKobo)}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-bayniks-grayMid">
                        {p.paystackTransferReference || p.payoutId}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${statusColors}`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
