import { z } from 'zod';
import { KoboAmountSchema, SignedKoboAmountSchema } from './currency';

/**
 * Cash Debt Circuit Breaker Threshold: ₦5,000 = 500,000 Kobo
 * If a rider accumulates negative cash commission debt exceeding this limit,
 * they are immediately locked from going online and excluded from dispatch matching.
 */
export const MAX_CASH_DEBT_LIMIT_KOBO = 500_000;

/**
 * Top-up initialization schema (minimum ₦500.00 = 50,000 kobo).
 */
export const WalletTopupInitRequestSchema = z.object({
  amountKobo: KoboAmountSchema.refine(
    (val) => val >= 50000,
    'Minimum top-up is ₦500 (50,000 kobo)'
  ),
  callbackUrl: z.string().url().optional(),
});
export type WalletTopupInitRequest = z.infer<typeof WalletTopupInitRequestSchema>;

/**
 * Request to pay and lock escrow for an order using wallet balance.
 */
export const OrderEscrowPayRequestSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
});
export type OrderEscrowPayRequest = z.infer<typeof OrderEscrowPayRequestSchema>;

/**
 * Paystack webhook event structure validation.
 */
export const PaystackWebhookEventSchema = z.object({
  event: z.enum(['charge.success', 'transfer.success', 'transfer.failed', 'transfer.reversed']),
  data: z.object({
    reference: z.string().optional(),
    transfer_code: z.string().optional(),
    amount: z.number().int().positive('Webhook amount must be a positive integer in kobo'),
    status: z.string().optional(),
    reason: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
    customer: z
      .object({
        email: z.string().optional(),
        phone: z.string().optional(),
      })
      .optional(),
  }),
});
export type PaystackWebhookEvent = z.infer<typeof PaystackWebhookEventSchema>;

/**
 * Wallet summary response schema.
 */
export const WalletSummaryResponseSchema = z.object({
  balanceKobo: SignedKoboAmountSchema,
  escrowLockedKobo: KoboAmountSchema,
  isDebtLocked: z.boolean().default(false),
  paystackDedicatedAccountNumber: z.string().optional(),
  paystackBankName: z.string().optional(),
  recentTransactions: z.array(z.any()),
});
export type WalletSummaryResponse = z.infer<typeof WalletSummaryResponseSchema>;


