/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import { WalletPayoutCard } from '../components/payout/WalletPayoutCard';

describe('Stage 19: WalletPayoutCard UI & Automated Paystack Bank Payouts', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default global fetch mock
    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (url === '/api/v1/wallet/me') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              balanceKobo: 500000, // ₦5,000.00
              escrowLockedKobo: 150000, // ₦1,500.00
            }),
        });
      }

      if (url === '/api/v1/payout/banks') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              banks: [
                { id: 1, name: 'Guaranty Trust Bank (GTBank)', code: '058', slug: 'gtbank' },
                { id: 2, name: 'Access Bank', code: '044', slug: 'access-bank' },
                { id: 3, name: 'Zenith Bank', code: '057', slug: 'zenith-bank' },
              ],
            }),
        });
      }

      if (url === '/api/v1/wallet/payouts') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              payouts: [
                {
                  payoutId: 'PO-TEST-001',
                  bankCode: '058',
                  bankName: 'Guaranty Trust Bank',
                  accountNumber: '0123456789',
                  accountName: 'Babatunde Adeleke',
                  amountKobo: 300000,
                  status: 'success',
                  paystackTransferReference: 'TRF_test_success_999',
                  createdAt: Date.now() - 3600000,
                },
              ],
            }),
        });
      }

      if (url === '/api/v1/payout/resolve-account') {
        const body = JSON.parse(options?.body || '{}');
        if (body.accountNumber === '0123456789') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                accountNumber: '0123456789',
                accountName: 'Babatunde Adeleke',
              }),
          });
        }
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Could not resolve account name' }),
        });
      }

      if (url === '/api/v1/wallet/withdraw') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              message: 'Bank withdrawal initiated successfully',
              payout: {
                payoutId: 'PO-NEW-1234',
                bankCode: '058',
                accountNumber: '0123456789',
                amountKobo: 200000,
                status: 'processing',
                paystackTransferReference: 'TRF_new_ref_123',
              },
            }),
        });
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders available wallet balance and escrow locked banner', async () => {
    await act(async () => {
      render(
        <WalletPayoutCard initialBalanceKobo={500000} initialEscrowLockedKobo={150000} />
      );
    });

    expect(screen.getByText(/Available Wallet Balance/i)).toBeInTheDocument();
    // ₦5,000.00
    expect(screen.getByText(/5,000/i)).toBeInTheDocument();
    // Escrow indicator
    expect(screen.getByText(/In Delivery Escrow:/i)).toBeInTheDocument();
    expect(screen.getByText(/Withdraw Funds/i)).toBeInTheDocument();
  });

  it('renders recent bank payouts table with status badges', async () => {
    await act(async () => {
      render(<WalletPayoutCard initialBalanceKobo={500000} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Babatunde Adeleke')).toBeInTheDocument();
      expect(screen.getByText(/TRF_test_success_999/i)).toBeInTheDocument();
      expect(screen.getByText('success')).toBeInTheDocument();
    });
  });

  it('opens instant bank payout modal when Withdraw Funds button is clicked', async () => {
    await act(async () => {
      render(<WalletPayoutCard initialBalanceKobo={500000} />);
    });

    const withdrawBtn = screen.getByText(/Withdraw Funds/i);
    await act(async () => {
      fireEvent.click(withdrawBtn);
    });

    expect(screen.getByText(/Instant Bank Payout/i)).toBeInTheDocument();
    expect(screen.getByText(/Select Nigerian Bank/i)).toBeInTheDocument();
    expect(screen.getByText(/10-Digit NUBAN Account Number/i)).toBeInTheDocument();
    expect(screen.getByText(/Withdrawal Amount/i)).toBeInTheDocument();
  });

  it('resolves recipient name automatically upon typing 10 digits', async () => {
    await act(async () => {
      render(<WalletPayoutCard initialBalanceKobo={500000} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/Withdraw Funds/i));
    });

    const accountInput = screen.getByPlaceholderText(/e\.g\. 0123456789/i);
    await act(async () => {
      fireEvent.change(accountInput, { target: { value: '0123456789' } });
    });

    await waitFor(() => {
      expect(screen.getByText(/Recipient: Babatunde Adeleke/i)).toBeInTheDocument();
    });
  });

  it('calculates withdrawal amount using quick percentage chips (e.g. 50% = ₦2,500)', async () => {
    await act(async () => {
      render(<WalletPayoutCard initialBalanceKobo={500000} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/Withdraw Funds/i));
    });

    const fiftyPercentChip = screen.getByRole('button', { name: '50%' });
    await act(async () => {
      fireEvent.click(fiftyPercentChip);
    });

    const amountInput = screen.getByPlaceholderText('5,000') as HTMLInputElement;
    expect(amountInput.value).toBe('2500');
  });

  it('submits bank payout successfully and dispatches transfer', async () => {
    const handleSuccess = vi.fn();
    await act(async () => {
      render(<WalletPayoutCard initialBalanceKobo={500000} onPayoutSuccess={handleSuccess} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/Withdraw Funds/i));
    });

    const accountInput = screen.getByPlaceholderText(/e\.g\. 0123456789/i);
    await act(async () => {
      fireEvent.change(accountInput, { target: { value: '0123456789' } });
    });

    await waitFor(() => {
      expect(screen.getByText(/Recipient: Babatunde Adeleke/i)).toBeInTheDocument();
    });

    const amountInput = screen.getByPlaceholderText('5,000');
    await act(async () => {
      fireEvent.change(amountInput, { target: { value: '2000' } });
    });

    const submitBtn = screen.getByRole('button', { name: /Confirm & Disburse/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(screen.getByText(/Disbursement initiated!/i)).toBeInTheDocument();
      expect(handleSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          payoutId: 'PO-NEW-1234',
          amountKobo: 200000,
          status: 'processing',
        })
      );
    });
  });
});
