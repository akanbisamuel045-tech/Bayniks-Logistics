import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import {
  WalletTransactionTypeSchema,
  TransactionStatusSchema,
  type WalletTransactionType,
  type TransactionStatus,
} from '@logistics/shared-types';

export interface IWallet extends Document {
  userId: Types.ObjectId;
  balanceKobo: number;
  escrowLockedKobo: number;
  paystackDedicatedAccountNumber?: string;
  paystackBankName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const WalletSchema = new Schema<IWallet>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    balanceKobo: {
      type: Number,
      default: 0,
      min: [0, 'Balance cannot be negative'],
      required: true,
      validate: {
        validator: Number.isInteger,
        message: 'balanceKobo must be an integer (Golden Rule 6)',
      },
    },
    escrowLockedKobo: {
      type: Number,
      default: 0,
      min: [0, 'Escrow locked balance cannot be negative'],
      required: true,
      validate: {
        validator: Number.isInteger,
        message: 'escrowLockedKobo must be an integer',
      },
    },
    paystackDedicatedAccountNumber: {
      type: String,
      trim: true,
    },
    paystackBankName: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Wallet: Model<IWallet> =
  (mongoose.models.Wallet as Model<IWallet>) ||
  mongoose.model<IWallet>('Wallet', WalletSchema);

export interface IWalletTransaction extends Document {
  walletUserId: Types.ObjectId;
  orderId?: Types.ObjectId | null;
  type: WalletTransactionType;
  amountKobo: number;
  reference: string;
  status: TransactionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export const WalletTransactionSchema = new Schema<IWalletTransaction>(
  {
    walletUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: WalletTransactionTypeSchema.options,
      required: true,
    },
    amountKobo: {
      type: Number,
      required: true,
      min: [1, 'Transaction amount must be at least 1 kobo'],
      validate: {
        validator: Number.isInteger,
        message: 'amountKobo must be an integer',
      },
    },
    reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    status: {
      type: String,
      enum: TransactionStatusSchema.options,
      default: 'pending',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const WalletTransaction: Model<IWalletTransaction> =
  (mongoose.models.WalletTransaction as Model<IWalletTransaction>) ||
  mongoose.model<IWalletTransaction>('WalletTransaction', WalletTransactionSchema);

