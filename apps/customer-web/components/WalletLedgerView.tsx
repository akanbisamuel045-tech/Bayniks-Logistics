'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { formatNaira } from '@logistics/shared-types';
import {
  Zap,
  FileText,
  Landmark,
  CreditCard,
  Search,
  X,
  Bike,
  Check,
  MapPin,
  Crosshair,
  ArrowLeft,
  Plus,
  ChevronRight,
} from 'lucide-react';

export interface LinkedCard {
  id: string;
  brand: 'mastercard' | 'visa' | 'verve';
  cardHolder: string;
  last4: string;
  expiry: string;
  isDefault: boolean;
  theme: 'dark' | 'white';
}

export interface PaymentTransaction {
  id: string;
  title: string;
  route: string;
  amountKobo: number; // positive for credit/topup, negative for debit/fare
  type: 'fare' | 'topup';
  method: string;
  status: 'Completed' | 'Successful' | 'Pending';
  time: string;
  group: 'TODAY' | 'YESTERDAY' | 'EARLIER THIS MONTH';
  ref: string;
  baseFareKobo?: number;
  weightFareKobo?: number;
  vatKobo?: number;
  isDelivery?: boolean;
  waybillId?: string;
  pickupLandmark?: string;
  dropoffLandmark?: string;
}

export interface WalletLedgerViewProps {
  initialTab?: 'wallet' | 'history';
  initialBalanceKobo?: number;
  onBackClick?: () => void;
}

const DEFAULT_CARDS: LinkedCard[] = [
  {
    id: 'card-1',
    brand: 'mastercard',
    cardHolder: 'KAINUL STEVANO',
    last4: '4022',
    expiry: '09/27',
    isDefault: true,
    theme: 'dark',
  },
  {
    id: 'card-2',
    brand: 'visa',
    cardHolder: 'KAINUL STEVANO',
    last4: '8819',
    expiry: '11/28',
    isDefault: false,
    theme: 'white',
  },
];

const DEFAULT_TRANSACTIONS: PaymentTransaction[] = [
  {
    id: 'tx-1',
    title: 'Delivery Dispatch #BYN-LGS-847291',
    route: 'Sabo Yaba to Victoria Island Towers',
    amountKobo: -450000,
    type: 'fare',
    method: 'Bayniks Wallet',
    status: 'Completed',
    time: '11:20 AM',
    group: 'TODAY',
    ref: 'TXN-BYN-8840192',
    baseFareKobo: 350000,
    weightFareKobo: 70000,
    vatKobo: 30000,
    isDelivery: true,
    waybillId: '#BYN-LGS-847291',
    pickupLandmark: 'Opposite Ozone Cinemas, Yaba',
    dropoffLandmark: 'Beside Zenith Bank Head Office, VI',
  },
  {
    id: 'tx-2',
    title: 'Wallet Deposit via Paystack',
    route: 'Mastercard •••• 4022 via Paystack',
    amountKobo: 2000000,
    type: 'topup',
    method: 'Paystack Instant',
    status: 'Successful',
    time: '09:15 AM',
    group: 'TODAY',
    ref: 'PSTK-BYN-9920194',
    baseFareKobo: 2000000,
    weightFareKobo: 0,
    vatKobo: 0,
    isDelivery: false,
  },
  {
    id: 'tx-3',
    title: 'Delivery Dispatch #BYN-LGS-928474',
    route: 'Ikeja GRA to Marina Lagos Island',
    amountKobo: -380000,
    type: 'fare',
    method: 'Bayniks Wallet',
    status: 'Completed',
    time: '03:45 PM',
    group: 'YESTERDAY',
    ref: 'TXN-BYN-7738201',
    baseFareKobo: 300000,
    weightFareKobo: 50000,
    vatKobo: 30000,
    isDelivery: true,
    waybillId: '#BYN-LGS-928474',
    pickupLandmark: 'Beside Ikeja City Mall',
    dropoffLandmark: 'Near Marina Jetty Terminal',
  },
  {
    id: 'tx-4',
    title: 'Wallet Deposit via Monnify',
    route: 'Wema Dedicated Account Transfer',
    amountKobo: 1500000,
    type: 'topup',
    method: 'Virtual Account',
    status: 'Successful',
    time: '10:00 AM',
    group: 'YESTERDAY',
    ref: 'MNFY-BYN-4428190',
    baseFareKobo: 1500000,
    weightFareKobo: 0,
    vatKobo: 0,
    isDelivery: false,
  },
  {
    id: 'tx-5',
    title: 'Delivery Dispatch #BYN-LGS-338291',
    route: 'Surulere to Lekki Phase 1',
    amountKobo: -520000,
    type: 'fare',
    method: 'Bayniks Wallet',
    status: 'Completed',
    time: '02:10 PM',
    group: 'EARLIER THIS MONTH',
    ref: 'TXN-BYN-6629104',
    baseFareKobo: 420000,
    weightFareKobo: 70000,
    vatKobo: 30000,
    isDelivery: true,
    waybillId: '#BYN-LGS-338291',
    pickupLandmark: 'National Stadium Gate 3',
    dropoffLandmark: 'Admiralty Way roundabout',
  },
];

export function WalletLedgerView({
  initialTab = 'wallet',
  initialBalanceKobo = 4520000, // ₦45,200.00
  onBackClick,
}: WalletLedgerViewProps) {
  const router = useRouter();

  // Primary State
  const [activeTab, setActiveTab] = useState<'wallet' | 'history'>(initialTab);
  const [balanceKobo, setBalanceKobo] = useState<number>(initialBalanceKobo);
  const [cards, setCards] = useState<LinkedCard[]>(DEFAULT_CARDS);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>(DEFAULT_TRANSACTIONS);

  // History Filters
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'fare' | 'topup'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<PaymentTransaction | null>(null);

  // New Card Form State
  const [newCardHolder, setNewCardHolder] = useState('Kainul Stevano');
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardExpiry, setNewCardExpiry] = useState('08/28');
  const [newCardCvv, setNewCardCvv] = useState('');
  const [newCardIsDefault, setNewCardIsDefault] = useState(true);

  // Deposit Form State
  const [depositAmountNaira, setDepositAmountNaira] = useState('10000');
  const [depositChannel, setDepositChannel] = useState<'card' | 'virtual_account' | 'bank_transfer'>('card');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3200);
  };

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      router.push('/');
    }
  };

  // Quick Top-up handler
  const handleQuickTopUp = (amountNaira: number) => {
    const addKobo = amountNaira * 100;
    const newBal = balanceKobo + addKobo;
    setBalanceKobo(newBal);

    const newTx: PaymentTransaction = {
      id: `tx-${Date.now()}`,
      title: 'Wallet Deposit via Paystack',
      route: 'Quick Top-Up Direct',
      amountKobo: addKobo,
      type: 'topup',
      method: 'Paystack Instant',
      status: 'Successful',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      group: 'TODAY',
      ref: `PSTK-BYN-${Math.floor(1000000 + Math.random() * 9000000)}`,
      baseFareKobo: addKobo,
      weightFareKobo: 0,
      vatKobo: 0,
      isDelivery: false,
    };

    setTransactions((prev) => [newTx, ...prev]);
    showToast(`Loaded +${formatNaira(addKobo)} into Bayniks Wallet!`);
  };

  // Custom Deposit Submit
  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseInt(depositAmountNaira.replace(/\D/g, ''), 10) || 0;
    if (amountNum < 500) {
      showToast('Minimum deposit is ₦500');
      return;
    }

    const addKobo = amountNum * 100;
    setBalanceKobo((prev) => prev + addKobo);

    const channelTitle =
      depositChannel === 'card'
        ? 'Paystack Card'
        : depositChannel === 'virtual_account'
        ? 'Monnify Virtual Account'
        : 'Bank Transfer';

    const newTx: PaymentTransaction = {
      id: `tx-${Date.now()}`,
      title: `Deposit via ${channelTitle}`,
      route: depositChannel === 'virtual_account' ? 'Wema Dedicated Account Transfer' : 'Direct Electronic Settlement',
      amountKobo: addKobo,
      type: 'topup',
      method: channelTitle,
      status: 'Successful',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      group: 'TODAY',
      ref: `DEP-BYN-${Math.floor(1000000 + Math.random() * 9000000)}`,
      baseFareKobo: addKobo,
      weightFareKobo: 0,
      vatKobo: 0,
      isDelivery: false,
    };

    setTransactions((prev) => [newTx, ...prev]);
    setIsDepositOpen(false);
    showToast(`Successfully deposited +${formatNaira(addKobo)} via ${channelTitle}!`);
  };

  // Detect card brand
  const detectedBrand = useMemo<'mastercard' | 'visa' | 'verve'>(() => {
    const raw = newCardNumber.replace(/\D/g, '');
    if (raw.startsWith('4')) return 'visa';
    if (raw.startsWith('506') || raw.startsWith('6500') || raw.startsWith('507')) return 'verve';
    return 'mastercard';
  }, [newCardNumber]);

  // Format card number with spaces
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let digits = e.target.value.replace(/\D/g, '').substring(0, 16);
    let formatted = '';
    for (let i = 0; i < digits.length; i += 4) {
      if (i > 0) formatted += ' ';
      formatted += digits.substring(i, i + 4);
    }
    setNewCardNumber(formatted);
  };

  // Add Card Submit
  const handleAddCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = newCardNumber.replace(/\D/g, '');
    if (raw.length < 16) {
      showToast('Please enter a valid 16-digit card number');
      return;
    }

    const last4 = raw.substring(raw.length - 4);
    const newCard: LinkedCard = {
      id: `card-${Date.now()}`,
      brand: detectedBrand,
      cardHolder: newCardHolder.trim().toUpperCase() || 'BAYNIKS CUSTOMER',
      last4,
      expiry: newCardExpiry.trim() || '12/28',
      isDefault: newCardIsDefault,
      theme: cards.length % 2 === 0 ? 'dark' : 'white',
    };

    setCards((prev) => {
      let updated = newCardIsDefault ? prev.map((c) => ({ ...c, isDefault: false })) : [...prev];
      return [newCard, ...updated];
    });

    setIsAddCardOpen(false);
    setNewCardNumber('');
    showToast(`Linked ${detectedBrand.toUpperCase()} ending in •••• ${last4}!`);
  };

  // Set Default Card
  const handleSetDefaultCard = (id: string) => {
    setCards((prev) => prev.map((c) => ({ ...c, isDefault: c.id === id })));
    showToast('Default payment card updated');
  };

  // Delete Card
  const handleDeleteCard = (id: string) => {
    setCards((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (remaining.length > 0 && !remaining.some((c) => c.isDefault) && remaining[0]) {
        remaining[0].isDefault = true;
      }
      return remaining;
    });
    showToast('Card removed from wallet');
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (categoryFilter !== 'all' && tx.type !== categoryFilter) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = tx.title.toLowerCase().includes(q);
        const matchesRoute = tx.route.toLowerCase().includes(q);
        const matchesRef = tx.ref.toLowerCase().includes(q);
        const matchesWaybill = tx.waybillId ? tx.waybillId.toLowerCase().includes(q) : false;
        if (!matchesTitle && !matchesRoute && !matchesRef && !matchesWaybill) return false;
      }
      return true;
    });
  }, [transactions, categoryFilter, searchQuery]);

  const transactionGroups = ['TODAY', 'YESTERDAY', 'EARLIER THIS MONTH'] as const;

  // Share Receipt
  const handleShareReceipt = (tx: PaymentTransaction) => {
    const text = `Bayniks Payment Receipt ${tx.ref}: ${tx.title} (${formatNaira(Math.abs(tx.amountKobo))})`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`${text}\nWaybill: ${tx.waybillId || 'N/A'}`);
      showToast(`Copied receipt link (${tx.ref}) to clipboard!`);
    } else {
      showToast(`Receipt ${tx.ref} generated!`);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-slate-50 text-slate-900 font-sans">
      {/* Top Header */}
      <header className="px-5 py-3.5 flex items-center justify-between max-w-md w-full mx-auto shrink-0 border-b border-slate-200 bg-white">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back to dashboard"
          className="w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 bg-slate-100 text-slate-800 hover:bg-slate-200"
        >
          <span className="text-base select-none">←</span>
        </button>

        <div className="text-center">
          <h1 className="text-sm font-extrabold text-slate-900 tracking-tight">
            {activeTab === 'wallet' ? 'Wallet & Cards' : 'Payment Ledger'}
          </h1>
          <span className="text-[10px] font-mono text-slate-500 font-bold block">
            {activeTab === 'wallet' ? `${cards.length} Linked Cards` : `${filteredTransactions.length} Transactions`}
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => showToast('Monthly Statement (October 2026.pdf) ready for export!')}
            className="text-xs font-extrabold text-bayniks-orange hover:underline px-2 py-1"
          >
            Statement
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-md mx-auto px-5 py-4 space-y-4 overflow-y-auto">
        {/* Tab Switcher Pills */}
        <div className="p-1 rounded-2xl flex items-center border bg-slate-200/80 border-slate-300">
          <button
            type="button"
            onClick={() => setActiveTab('wallet')}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'wallet'
                ? 'bg-bayniks-orange text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Bayniks Wallet</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-bayniks-orange text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Payment Ledger</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: WALLET & LINKED CARDS                                              */}
        {/* ========================================================================= */}
        {activeTab === 'wallet' && (
          <div className="space-y-4">
            {/* High-Contrast Mini Wallet Card */}
            <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 rounded-[28px] p-5 text-white shadow-xl border border-orange-400 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-100">
                  Bayniks Delivery Balance
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-white/20 text-white border border-white/30">
                  ACTIVE ESCROW
                </span>
              </div>

              <h2 className="text-3xl font-black font-mono mt-1 text-white tracking-tight">
                {formatNaira(balanceKobo)}
              </h2>

              <p className="text-[11px] text-orange-100 font-medium mt-1">
                Zero-fee instant deductions for express bike and van dispatch.
              </p>

              {/* Quick Top-Up Chips */}
              <div className="flex items-center space-x-2 mt-4 pt-3 border-t border-white/20">
                <button
                  type="button"
                  onClick={() => handleQuickTopUp(2000)}
                  className="flex-1 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold border border-white/20 transition active:scale-95"
                >
                  +₦2,000
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTopUp(5000)}
                  className="flex-1 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold border border-white/20 transition active:scale-95"
                >
                  +₦5,000
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTopUp(10000)}
                  className="flex-1 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold border border-white/20 transition active:scale-95"
                >
                  +₦10,000
                </button>
              </div>

              {/* Custom Deposit CTA */}
              <button
                type="button"
                onClick={() => setIsDepositOpen(true)}
                className="w-full mt-3 py-2.5 rounded-xl bg-white text-bayniks-orange text-xs font-black shadow-sm flex items-center justify-center space-x-1.5 transition active:scale-95"
              >
                <Landmark className="w-4 h-4 text-bayniks-orange" />
                <span>Custom Deposit / Monnify Virtual Account</span>
              </button>
            </div>

            {/* Linked Cards Section Header */}
            <div className="flex items-center justify-between px-1 pt-1">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-400">
                Linked Payment Cards
              </h3>
              <button
                type="button"
                onClick={() => setIsAddCardOpen(true)}
                className="text-xs font-extrabold text-bayniks-orange hover:underline flex items-center space-x-1"
              >
                <span className="w-5 h-5 rounded-full bg-bayniks-orange text-white flex items-center justify-center text-[10px] font-black">
                  +
                </span>
                <span>Add Card</span>
              </button>
            </div>

            {/* Linked Cards List */}
            <div className="space-y-3">
              {cards.map((card) => {
                const isCardDark = card.theme === 'dark';
                return (
                  <div
                    key={card.id}
                    className={`rounded-3xl p-5 border relative overflow-hidden transition shadow-sm ${
                      isCardDark
                        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white border-slate-700'
                        : 'bg-white text-slate-900 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      {/* Chip simulation */}
                      <div className="w-9 h-6 rounded-md bg-amber-400/80 border border-amber-300 flex items-center justify-center">
                        <span className="text-[8px] font-mono text-amber-900 font-bold">CHIP</span>
                      </div>

                      {/* Brand badge */}
                      <div className="flex items-center space-x-1.5">
                        {card.isDefault && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            DEFAULT
                          </span>
                        )}
                        <span className="text-xs font-black uppercase font-mono tracking-wider">
                          {card.brand === 'mastercard' && 'Mastercard'}
                          {card.brand === 'visa' && 'VISA'}
                          {card.brand === 'verve' && 'VERVE'}
                        </span>
                      </div>
                    </div>

                    <div className="text-base font-mono font-extrabold tracking-widest mb-3">
                      •••• •••• •••• {card.last4}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/40">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Cardholder</span>
                        <span className="font-extrabold uppercase font-mono text-[11px]">{card.cardHolder}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block text-right">Expires</span>
                        <span className="font-extrabold font-mono text-[11px]">{card.expiry}</span>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="mt-3 pt-2.5 flex items-center justify-between border-t border-slate-200/40 text-xs">
                      {!card.isDefault ? (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultCard(card.id)}
                          className="text-[11px] font-bold text-bayniks-orange hover:underline"
                        >
                          Set as default
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Primary payment method</span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteCard(card.id)}
                        className="text-[11px] font-bold text-rose-500 hover:text-rose-600 transition"
                      >
                        Remove card
                      </button>
                    </div>
                  </div>
                );
              })}

              {cards.length === 0 && (
                <div className="py-8 text-center rounded-3xl border p-5 bg-white border-slate-200">
                  <CreditCard className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <h4 className="text-xs font-bold text-slate-900">No cards saved</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Link a debit card for seamless 1-tap dispatch.</p>
                </div>
              )}
            </div>

            {/* Quick Ledger Preview Link */}
            <div className="p-4 rounded-3xl border flex items-center justify-between bg-white border-slate-200">
              <div>
                <h4 className="text-xs font-extrabold text-slate-900">Recent Transactions</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {transactions.length} recorded payments and wallet deposits
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className="px-3 py-1.5 rounded-xl bg-bayniks-orange text-white text-xs font-bold transition active:scale-95 inline-flex items-center gap-1"
              >
                <span>View Ledger</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: PAYMENT HISTORY & ITEMIZED LEDGER                                  */}
        {/* ========================================================================= */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reference, waybill (#BYN-...), or route..."
                className="w-full text-xs font-semibold pl-9 pr-8 py-2.5 rounded-2xl border transition focus:outline-none focus:ring-1 focus:ring-bayniks-orange bg-white text-slate-900 border-slate-200 placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-extrabold transition shrink-0 ${
                  categoryFilter === 'all'
                    ? 'bg-bayniks-orange text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                All ({transactions.length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('fare')}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-extrabold transition shrink-0 ${
                  categoryFilter === 'fare'
                    ? 'bg-bayniks-orange text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                Deliveries ({transactions.filter((t) => t.type === 'fare').length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('topup')}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-extrabold transition shrink-0 ${
                  categoryFilter === 'topup'
                    ? 'bg-bayniks-orange text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                Top-Ups ({transactions.filter((t) => t.type === 'topup').length})
              </button>
            </div>

            {/* Itemized Groups */}
            <div className="space-y-4">
              {transactionGroups.map((groupName) => {
                const groupItems = filteredTransactions.filter((tx) => tx.group === groupName);
                if (groupItems.length === 0) return null;

                return (
                  <div key={groupName} className="space-y-2">
                    <span className="text-[10px] font-mono font-extrabold text-slate-400 tracking-wider block px-1">
                      {groupName}
                    </span>

                    <div className="rounded-3xl border divide-y overflow-hidden shadow-sm bg-white border-slate-200 divide-slate-100">
                      {groupItems.map((item) => {
                        const isCredit = item.amountKobo > 0;
                        return (
                          <div
                            key={item.id}
                            onClick={() => setActiveReceipt(item)}
                            className="p-3.5 transition flex items-center justify-between cursor-pointer group hover:bg-slate-50"
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              {/* Icon Badge */}
                              <div
                                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                                  isCredit
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                    : 'bg-orange-50 text-bayniks-orange border-orange-200'
                                }`}
                              >
                                {isCredit ? (
                                  <span className="text-base font-bold">↓</span>
                                ) : (
                                  <Bike className="w-5 h-5 text-bayniks-orange" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <h4 className="text-xs font-extrabold truncate transition group-hover:text-bayniks-orange text-slate-900">
                                  {item.title}
                                </h4>
                                <p className="text-[10px] text-slate-500 truncate mt-0.5">{item.route}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className="text-[9px] font-mono font-bold text-slate-400">{item.time}</span>
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-200">
                                    {item.method}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0 ml-3">
                              <span
                                className={`text-xs font-mono font-extrabold block ${
                                  isCredit ? 'text-emerald-600' : 'text-slate-900'
                                }`}
                              >
                                {isCredit ? '+' : ''}
                                {formatNaira(Math.abs(item.amountKobo))}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 mt-0.5 inline-flex items-center gap-0.5">
                                <span>{item.status}</span>
                                <ChevronRight className="w-2.5 h-2.5" />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {filteredTransactions.length === 0 && (
                <div className="py-12 text-center rounded-3xl border p-6 bg-white border-slate-200">
                  <div className="w-12 h-12 rounded-full bg-orange-50 text-bayniks-orange mx-auto flex items-center justify-center mb-3">
                    <CreditCard className="w-6 h-6 text-bayniks-orange" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">No transactions found</h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Try adjusting your search query or switching the category filter.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD PAYMENT CARD DRAWER                                          */}
      {/* ========================================================================= */}
      {isAddCardOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end transition-opacity">
          <div className="flex-1" onClick={() => setIsAddCardOpen(false)} />
          <div className="rounded-t-[36px] max-h-[90%] flex flex-col overflow-hidden shadow-2xl p-5 space-y-4 max-w-md w-full mx-auto bg-white text-slate-900">
            <div className="pt-1 pb-1 flex justify-center">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Add Debit / Credit Card</h3>
                <p className="text-[11px] text-slate-500 font-medium">Link with Paystack 256-bit encryption</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCardOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCardSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-800">Cardholder Name</label>
                <input
                  type="text"
                  required
                  value={newCardHolder}
                  onChange={(e) => setNewCardHolder(e.target.value)}
                  placeholder="e.g. Kainul Stevano"
                  className="w-full text-xs font-semibold px-4 py-3 rounded-2xl border uppercase tracking-wider bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-bayniks-orange focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-800">Card Number</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    maxLength={19}
                    value={newCardNumber}
                    onChange={handleCardNumberChange}
                    placeholder="5399 •••• •••• ••••"
                    className="w-full text-xs font-mono font-bold pl-4 pr-16 py-3 rounded-2xl border bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-bayniks-orange focus:outline-none"
                  />
                  <div className="absolute right-3.5">
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-bayniks-orange text-white font-mono uppercase">
                      {detectedBrand}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="newCardExpiryInput" className="block text-xs font-bold mb-1 text-slate-800">Expiry Date</label>
                  <input
                    id="newCardExpiryInput"
                    type="text"
                    required
                    maxLength={5}
                    value={newCardExpiry}
                    onChange={(e) => setNewCardExpiry(e.target.value)}
                    placeholder="MM/YY"
                    className="w-full text-xs font-mono font-bold px-4 py-3 rounded-2xl border bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-bayniks-orange focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="newCardCvvInput" className="block text-xs font-bold mb-1 text-slate-800">CVV</label>
                  <input
                    id="newCardCvvInput"
                    type="password"
                    required
                    maxLength={4}
                    value={newCardCvv}
                    onChange={(e) => setNewCardCvv(e.target.value)}
                    placeholder="CVV"
                    className="w-full text-xs font-mono font-bold px-4 py-3 rounded-2xl border bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-bayniks-orange focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="defaultCardCheckbox"
                  checked={newCardIsDefault}
                  onChange={(e) => setNewCardIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-bayniks-orange focus:ring-bayniks-orange accent-bayniks-orange"
                />
                <label htmlFor="defaultCardCheckbox" className="text-xs font-bold">
                  Set as default card for checkout
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-bayniks-orange text-white text-xs font-extrabold shadow-lg shadow-bayniks-orange/30 hover:bg-orange-600 transition active:scale-95"
              >
                Link Card via Paystack
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CUSTOM DEPOSIT / VIRTUAL ACCOUNT DRAWER                         */}
      {/* ========================================================================= */}
      {isDepositOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex flex-col justify-end transition-opacity">
          <div className="flex-1" onClick={() => setIsDepositOpen(false)} />
          <div className="rounded-t-[36px] max-h-[92%] flex flex-col overflow-hidden shadow-2xl p-5 space-y-4 max-w-md w-full mx-auto bg-white text-slate-900 border-t border-slate-200">
            <div className="pt-1 pb-1 flex justify-center">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Top-Up Delivery Wallet</h3>
                <p className="text-[11px] text-slate-500 font-medium">Instant escrow credit via Nigerian gateways</p>
              </div>
              <button
                type="button"
                onClick={() => setIsDepositOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Top-Up Amount (₦)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 font-mono font-bold text-bayniks-orange text-base">₦</span>
                  <input
                    type="number"
                    min="500"
                    step="500"
                    required
                    value={depositAmountNaira}
                    onChange={(e) => setDepositAmountNaira(e.target.value)}
                    className="w-full text-base font-mono font-black pl-9 pr-4 py-3.5 rounded-2xl border bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-bayniks-orange"
                  />
                </div>
              </div>

              {/* Amount preset chips */}
              <div className="flex items-center space-x-2">
                {[5000, 10000, 20000, 50000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDepositAmountNaira(String(amt))}
                    className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold border transition ${
                      depositAmountNaira === String(amt)
                        ? 'bg-bayniks-orange text-white border-bayniks-orange shadow-sm'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    ₦{amt.toLocaleString()}
                  </button>
                ))}
              </div>

              {/* Channel Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Funding Method</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDepositChannel('card')}
                    className={`p-3 rounded-2xl border text-center transition ${
                      depositChannel === 'card'
                        ? 'border-bayniks-orange bg-orange-50 text-bayniks-orange font-extrabold ring-1 ring-bayniks-orange'
                        : 'bg-slate-50 border-slate-200 text-slate-700 font-medium hover:bg-white'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 mx-auto mb-1 text-bayniks-orange" />
                    <span className="text-[10px] block leading-tight">Paystack Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDepositChannel('virtual_account')}
                    className={`p-3 rounded-2xl border text-center transition ${
                      depositChannel === 'virtual_account'
                        ? 'border-bayniks-orange bg-orange-50 text-bayniks-orange font-extrabold ring-1 ring-bayniks-orange'
                        : 'bg-slate-50 border-slate-200 text-slate-700 font-medium hover:bg-white'
                    }`}
                  >
                    <Landmark className="w-5 h-5 mx-auto mb-1 text-bayniks-orange" />
                    <span className="text-[10px] block leading-tight">Monnify Account</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDepositChannel('bank_transfer')}
                    className={`p-3 rounded-2xl border text-center transition ${
                      depositChannel === 'bank_transfer'
                        ? 'border-bayniks-orange bg-orange-50 text-bayniks-orange font-extrabold ring-1 ring-bayniks-orange'
                        : 'bg-slate-50 border-slate-200 text-slate-700 font-medium hover:bg-white'
                    }`}
                  >
                    <Zap className="w-5 h-5 mx-auto mb-1 text-bayniks-orange" />
                    <span className="text-[10px] block leading-tight">Bank Transfer</span>
                  </button>
                </div>
              </div>

              {/* Monnify Virtual Account details */}
              {depositChannel === 'virtual_account' && (
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Bank Name</span>
                    <span className="font-extrabold text-slate-900">Wema Bank</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Account Number</span>
                    <span className="font-mono font-black text-bayniks-orange">8291049281</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Account Name</span>
                    <span className="font-bold text-slate-900">Bayniks / Kainul Stevano</span>
                  </div>
                  <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                    Transfers to this dedicated number credit your wallet within 10 seconds.
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-bayniks-orange text-white text-xs font-extrabold shadow-sm hover:bg-orange-600 transition active:scale-95"
              >
                Top-Up {formatNaira((parseInt(depositAmountNaira.replace(/\D/g, ''), 10) || 0) * 100)}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ITEMIZED RECEIPT / INVOICE DRAWER                                */}
      {/* ========================================================================= */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex flex-col justify-end transition-opacity">
          <div className="flex-1" onClick={() => setActiveReceipt(null)} />
          <div className="rounded-t-[36px] max-h-[92%] flex flex-col overflow-hidden shadow-2xl p-5 space-y-4 max-w-md w-full mx-auto bg-white text-slate-900 border-t border-slate-200">
            <div className="pt-1 pb-1 flex justify-center">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-sm font-extrabold font-mono uppercase tracking-wider text-slate-900">
                  Transaction Receipt
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveReceipt(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto max-h-[70vh]">
              {/* Status & Amount Card */}
              <div className="rounded-3xl p-5 text-center space-y-2 border bg-slate-50 border-slate-200 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center font-black text-lg">
                  <Check className="w-6 h-6 text-emerald-600" />
                </div>
                <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                  PAYMENT SUCCESSFUL
                </span>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">
                    {activeReceipt.amountKobo > 0 ? 'Amount Credited' : 'Total Debited'}
                  </span>
                  <h2 className="text-3xl font-mono font-black mt-0.5 text-slate-900">
                    {activeReceipt.amountKobo > 0 ? '+' : ''}
                    {formatNaira(Math.abs(activeReceipt.amountKobo))}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {activeReceipt.title} • {activeReceipt.route}
                </p>
              </div>

              {/* Specs Card */}
              <div className="rounded-3xl p-4 border border-slate-200 bg-white shadow-sm space-y-2 text-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <span className="font-extrabold uppercase text-[10px] text-slate-500">Reference ID</span>
                  <span className="font-mono font-bold text-slate-900">{activeReceipt.ref}</span>
                </div>
                {activeReceipt.waybillId && (
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                    <span className="font-extrabold uppercase text-[10px] text-slate-500">Waybill ID</span>
                    <span className="font-mono font-bold text-bayniks-orange">{activeReceipt.waybillId}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <span className="font-extrabold uppercase text-[10px] text-slate-500">Date &amp; Time</span>
                  <span className="font-medium text-slate-700">
                    {activeReceipt.group === 'TODAY' ? 'Today' : activeReceipt.group}, {activeReceipt.time}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <span className="font-extrabold uppercase text-[10px] text-slate-500">Payment Channel</span>
                  <span className="font-bold text-slate-900 flex items-center space-x-1.5">
                    <Zap className="w-3.5 h-3.5 text-bayniks-orange" />
                    <span>{activeReceipt.method}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-extrabold uppercase text-[10px] text-slate-500">Status</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <span>{activeReceipt.status}</span>
                    <Check className="w-3 h-3 text-emerald-600" />
                  </span>
                </div>
              </div>

              {/* Itemized Fare Breakdown (if delivery) */}
              {activeReceipt.isDelivery && (
                <div className="bg-slate-50 border border-slate-200 text-slate-900 rounded-3xl p-4 shadow-sm space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Itemized Fare Breakdown</span>
                    <span className="text-[10px] font-mono text-bayniks-orange font-bold">LAGOS STANDARD</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Base Corridor Fare</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatNaira(activeReceipt.baseFareKobo || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Weight Surcharge</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatNaira(activeReceipt.weightFareKobo || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">VAT (7.5%)</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatNaira(activeReceipt.vatKobo || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 font-black text-sm">
                      <span className="text-slate-900">Total Settled</span>
                      <span className="font-mono text-bayniks-orange">
                        {formatNaira(Math.abs(activeReceipt.amountKobo))}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Landmark summary */}
              {activeReceipt.pickupLandmark && (
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Verified Landmarks</div>
                  <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-bayniks-orange shrink-0" />
                    <span>Pickup: {activeReceipt.pickupLandmark}</span>
                  </div>
                  {activeReceipt.dropoffLandmark && (
                    <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                      <Crosshair className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Dropoff: {activeReceipt.dropoffLandmark}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleShareReceipt(activeReceipt)}
                  className="w-full py-3 rounded-2xl bg-bayniks-orange text-white text-xs font-extrabold shadow-sm hover:bg-orange-600 transition active:scale-95"
                >
                  Share Receipt Link
                </button>

                {activeReceipt.isDelivery && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveReceipt(null);
                      router.push('/deliveries');
                    }}
                    className="w-full py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-100 text-xs font-bold transition active:scale-95 shadow-xs"
                  >
                    Track Waybill #{activeReceipt.waybillId?.replace(/^#/, '')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 max-w-sm w-full px-4 animate-bounce">
          <div className="bg-white text-slate-900 px-4 py-3 rounded-2xl shadow-2xl border border-slate-200 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-bayniks-orange" />
              <span>{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-slate-700 text-xs ml-3"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
