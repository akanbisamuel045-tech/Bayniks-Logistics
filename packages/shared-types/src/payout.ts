import { z } from 'zod';
import { KoboAmountSchema } from './currency';

/**
 * Paystack Transfer Recipient Request.
 */
export const BankTransferRequestSchema = z.object({
  recipientCode: z.string().min(1, 'Paystack recipient code is required'),
  amountKobo: KoboAmountSchema,
  reason: z.string().min(3).max(150),
});
export type BankTransferRequest = z.infer<typeof BankTransferRequestSchema>;

/**
 * Fleet Owner revenue sharing split rule for an assigned rider.
 * Determines the partition of the 80% net rider pool between Rider and Fleet Owner.
 */
export const FleetSplitRuleSchema = z.object({
  fleetOwnerId: z.string().min(1),
  riderUserId: z.string().min(1),
  riderSharePercent: z.number().min(0).max(100).default(70),
  fleetOwnerSharePercent: z.number().min(0).max(100).default(30),
});
export type FleetSplitRule = z.infer<typeof FleetSplitRuleSchema>;

/**
 * Record of a bank payout / disbursement transaction.
 */
export const PayoutTransactionRecordSchema = z.object({
  payoutId: z.string(),
  userId: z.string(),
  bankCode: z.string(),
  bankName: z.string().optional(),
  accountNumber: z.string().regex(/^\d{10}$/, 'NUBAN account number must be 10 digits'),
  accountName: z.string().optional(),
  amountKobo: KoboAmountSchema,
  status: z.enum(['pending', 'processing', 'success', 'failed']),
  recipientCode: z.string().optional(),
  paystackTransferReference: z.string().optional(),
  createdAt: z.number(),
});
export type PayoutTransactionRecord = z.infer<typeof PayoutTransactionRecordSchema>;

/**
 * Rider or Fleet Owner bank withdrawal request payload.
 */
export const WithdrawalRequestSchema = z.object({
  accountNumber: z.string().regex(/^\d{10}$/, 'Account number must be exactly 10 digits'),
  bankCode: z.string().min(2).max(10),
  accountName: z.string().min(2, 'Account name must be at least 2 characters'),
  amountKobo: KoboAmountSchema.refine(
    (val) => val >= 50000,
    'Minimum withdrawal is ₦500 (50,000 kobo)'
  ),
  reason: z.string().max(150).optional(),
});
export type WithdrawalRequest = z.infer<typeof WithdrawalRequestSchema>;

/**
 * Account name lookup request.
 */
export const BankResolveRequestSchema = z.object({
  accountNumber: z.string().regex(/^\d{10}$/, 'Account number must be 10 digits'),
  bankCode: z.string().min(2).max(10),
});
export type BankResolveRequest = z.infer<typeof BankResolveRequestSchema>;

/**
 * Account name lookup response.
 */
export const BankResolveResponseSchema = z.object({
  accountNumber: z.string(),
  accountName: z.string(),
  bankCode: z.string(),
});
export type BankResolveResponse = z.infer<typeof BankResolveResponseSchema>;

/**
 * Nigerian commercial / microfinance bank entity.
 */
export const NigerianBankSchema = z.object({
  name: z.string(),
  code: z.string(),
  slug: z.string().optional(),
});
export type NigerianBank = z.infer<typeof NigerianBankSchema>;

/**
 * Result of order split settlement breakdown.
 */
export const OrderSplitSettlementResultSchema = z.object({
  orderId: z.string(),
  grossFareKobo: KoboAmountSchema,
  platformCommissionKobo: KoboAmountSchema,
  riderEarningsKobo: KoboAmountSchema,
  fleetOwnerEarningsKobo: KoboAmountSchema,
  fleetOwnerId: z.string().nullable().optional(),
  settledAt: z.number(),
});
export type OrderSplitSettlementResult = z.infer<typeof OrderSplitSettlementResultSchema>;
