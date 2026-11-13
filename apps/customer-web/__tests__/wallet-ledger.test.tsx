import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { WalletLedgerView } from '../components/WalletLedgerView';
import { ThemeProvider } from '../components/ThemeProvider';

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Stage 12: Wallet & Payment History Ledger Suite', () => {
  beforeEach(() => {
    mockPush.mockClear();
    vi.clearAllMocks();
  });

  describe('1. Wallet & Linked Cards View', () => {
    it('renders delivery balance in formatted Naira (Integer Kobo)', () => {
      render(
        <ThemeProvider>
          <WalletLedgerView initialTab="wallet" initialBalanceKobo={4520000} />
        </ThemeProvider>
      );

      expect(screen.getByText(/Bayniks Delivery Balance/i)).toBeDefined();
      expect(screen.getByText(/₦45,200.00/i)).toBeDefined();
      expect(screen.getByText(/ACTIVE ESCROW/i)).toBeDefined();
    });

    it('increments balance when quick top-up chips are clicked', () => {
      render(
        <ThemeProvider>
          <WalletLedgerView initialTab="wallet" initialBalanceKobo={4520000} />
        </ThemeProvider>
      );

      const topup2k = screen.getByRole('button', { name: /\+₦2,000/i });
      fireEvent.click(topup2k);

      // 45,200 + 2,000 = 47,200
      expect(screen.getByText(/₦47,200.00/i)).toBeDefined();
      expect(screen.getByText(/Loaded \+₦2,000.00 into Bayniks Wallet!/i)).toBeDefined();
    });

    it('renders linked payment cards list with default badge', () => {
      render(
        <ThemeProvider>
          <WalletLedgerView initialTab="wallet" />
        </ThemeProvider>
      );

      expect(screen.getByText(/Linked Payment Cards/i)).toBeDefined();
      expect(screen.getByText(/•••• •••• •••• 4022/i)).toBeDefined();
      expect(screen.getByText(/•••• •••• •••• 8819/i)).toBeDefined();
      expect(screen.getByText(/^DEFAULT$/)).toBeDefined();
      expect(screen.getAllByText(/KAINUL STEVANO/i).length).toBe(2);
    });

    it('allows opening custom deposit modal, choosing Monnify virtual account, and submitting deposit', () => {
      render(
        <ThemeProvider>
          <WalletLedgerView initialTab="wallet" initialBalanceKobo={1000000} />
        </ThemeProvider>
      );

      const depositModalBtn = screen.getByRole('button', { name: /Custom Deposit \/ Monnify Virtual Account/i });
      fireEvent.click(depositModalBtn);

      expect(screen.getByText(/Top-Up Delivery Wallet/i)).toBeDefined();

      // Click Monnify Account channel
      const monnifyBtn = screen.getByRole('button', { name: /Monnify Account/i });
      fireEvent.click(monnifyBtn);

      expect(screen.getByText(/Wema Bank/i)).toBeDefined();
      expect(screen.getByText(/8291049281/i)).toBeDefined();

      // Submit deposit
      const submitDepositBtn = screen.getByRole('button', { name: /Top-Up ₦/i });
      fireEvent.click(submitDepositBtn);

      expect(screen.getByText(/Successfully deposited/i)).toBeDefined();
    });

    it('allows linking a new payment card via Add Card modal', () => {
      render(
        <ThemeProvider>
          <WalletLedgerView initialTab="wallet" />
        </ThemeProvider>
      );

      const addCardBtn = screen.getByRole('button', { name: /Add Card/i });
      fireEvent.click(addCardBtn);

      expect(screen.getByText(/Add Debit \/ Credit Card/i)).toBeDefined();

      const numberInput = screen.getByPlaceholderText(/5399 •••• •••• ••••/i);
      fireEvent.change(numberInput, { target: { value: '5399123456789901' } });

      const cvvInput = screen.getByPlaceholderText('CVV');
      fireEvent.change(cvvInput, { target: { value: '382' } });

      const linkBtn = screen.getByRole('button', { name: /Link Card via Paystack/i });
      fireEvent.click(linkBtn);

      expect(screen.getByText(/Linked MASTERCARD ending in •••• 9901!/i)).toBeDefined();
      expect(screen.getByText(/•••• •••• •••• 9901/i)).toBeDefined();
    });

    it('allows updating default card and removing a card', () => {
      render(
        <ThemeProvider>
          <WalletLedgerView initialTab="wallet" />
        </ThemeProvider>
      );

      const setDefaultBtns = screen.getAllByRole('button', { name: /Set as default/i });
      expect(setDefaultBtns.length).toBeGreaterThan(0);
      fireEvent.click(setDefaultBtns[0]!);
      expect(screen.getByText(/Default payment card updated/i)).toBeDefined();

      const removeBtns = screen.getAllByRole('button', { name: /Remove card/i });
      fireEvent.click(removeBtns[0]!);
      expect(screen.getByText(/Card removed from wallet/i)).toBeDefined();
    });
  });

  describe('2. Payment History & Transaction Ledger View', () => {
    it('switches to ledger tab and displays grouped transactions', () => {
      render(
        <ThemeProvider>
          <WalletLedgerView initialTab="wallet" />
        </ThemeProvider>
      );

      const ledgerTabBtn = screen.getByRole('button', { name: /Payment Ledger/i });
      fireEvent.click(ledgerTabBtn);

      expect(screen.getByText(/TODAY/i)).toBeDefined();
      expect(screen.getByText(/YESTERDAY/i)).toBeDefined();
      expect(screen.getByText(/Delivery Dispatch #BYN-LGS-847291/i)).toBeDefined();
      expect(screen.getByText(/Sabo Yaba to Victoria Island Towers/i)).toBeDefined();
    });

    it('filters ledger by transaction category (Deliveries vs Top-Ups)', () => {
      render(
        <ThemeProvider>
          <WalletLedgerView initialTab="history" />
        </ThemeProvider>
      );

      const topupFilterBtn = screen.getByRole('button', { name: /^Top-Ups/i });
      fireEvent.click(topupFilterBtn);

      expect(screen.getByText(/Wallet Deposit via Paystack/i)).toBeDefined();
      expect(screen.queryByText(/Delivery Dispatch #BYN-LGS-847291/i)).toBeNull();

      const deliveryFilterBtn = screen.getByRole('button', { name: /^Deliveries/i });
      fireEvent.click(deliveryFilterBtn);

      expect(screen.getByText(/Delivery Dispatch #BYN-LGS-847291/i)).toBeDefined();
      expect(screen.queryByText(/Wallet Deposit via Paystack/i)).toBeNull();
    });

    it('filters transactions by search query', () => {
      render(
        <ThemeProvider>
          <WalletLedgerView initialTab="history" />
        </ThemeProvider>
      );

      const searchInput = screen.getByPlaceholderText(/Search reference, waybill/i);
      fireEvent.change(searchInput, { target: { value: 'Marina' } });

      expect(screen.getByText(/Ikeja GRA to Marina Lagos Island/i)).toBeDefined();
      expect(screen.queryByText(/Sabo Yaba/i)).toBeNull();
    });

    it('opens itemized receipt drawer with fare breakdown and landmarks when transaction is clicked', () => {
      render(
        <ThemeProvider>
          <WalletLedgerView initialTab="history" />
        </ThemeProvider>
      );

      const txItem = screen.getByText(/Delivery Dispatch #BYN-LGS-847291/i);
      fireEvent.click(txItem);

      expect(screen.getByText(/TRANSACTION RECEIPT/i)).toBeDefined();
      expect(screen.getByText(/TXN-BYN-8840192/i)).toBeDefined();
      expect(screen.getByText(/Itemized Fare Breakdown/i)).toBeDefined();
      expect(screen.getByText(/Base Corridor Fare/i)).toBeDefined();
      expect(screen.getByText(/Weight Surcharge/i)).toBeDefined();
      expect(screen.getByText(/VAT \(7.5%\)/i)).toBeDefined();
      expect(screen.getByText(/Verified Landmarks/i)).toBeDefined();
      expect(screen.getByText(/Opposite Ozone Cinemas, Yaba/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /Share Receipt Link/i })).toBeDefined();
    });

    it('triggers statement download toast notification', () => {
      render(
        <ThemeProvider>
          <WalletLedgerView initialTab="history" />
        </ThemeProvider>
      );

      const statementBtn = screen.getByRole('button', { name: /Statement/i });
      fireEvent.click(statementBtn);

      expect(screen.getByText(/Monthly Statement \(October 2026\.pdf\) ready for export!/i)).toBeDefined();
    });
  });
});
