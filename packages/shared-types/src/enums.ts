import { z } from 'zod';

export const UserRoleSchema = z.enum([
  'customer',
  'vendor',
  'rider',
  'fleet_owner',
  'admin',
]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const VehicleTypeSchema = z.enum(['bike', 'van', 'truck']);
export type VehicleType = z.infer<typeof VehicleTypeSchema>;

export const RiderStatusSchema = z.enum(['offline', 'available', 'busy']);
export type RiderStatus = z.infer<typeof RiderStatusSchema>;

export const KycStatusSchema = z.enum([
  'pending',
  'pending_review',
  'approved',
  'rejected',
]);
export type KycStatus = z.infer<typeof KycStatusSchema>;

export const OrderStatusSchema = z.enum([
  'pending',
  'searching_rider',
  'rider_assigned',
  'arrived_pickup',
  'in_transit',
  'arrived_dropoff',
  'delivered',
  'cancelled',
  'disputed',
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const OrderStopStatusSchema = z.enum([
  'pending',
  'en_route',
  'delivered',
  'failed',
]);
export type OrderStopStatus = z.infer<typeof OrderStopStatusSchema>;

export const PaymentMethodSchema = z.enum([
  'wallet',
  'card_bank',
  'pay_on_pickup',
  'pay_on_delivery',
]);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const PaymentStatusSchema = z.enum(['unpaid', 'paid', 'refunded']);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const WalletTransactionTypeSchema = z.enum([
  'credit',
  'debit',
  'escrow_hold',
  'escrow_release',
  'payout',
]);
export type WalletTransactionType = z.infer<typeof WalletTransactionTypeSchema>;

export const TransactionStatusSchema = z.enum([
  'pending',
  'success',
  'failed',
]);
export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;
