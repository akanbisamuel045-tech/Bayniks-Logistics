import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IPayoutTransaction extends Document {
  payoutId: string;
  userId: Types.ObjectId;
  bankCode: string;
  bankName?: string;
  accountNumber: string;
  accountName?: string;
  amountKobo: number;
  status: 'pending' | 'processing' | 'success' | 'failed';
  recipientCode?: string;
  transferCode?: string;
  paystackTransferReference?: string;
  failureReason?: string;
  refundedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const PayoutTransactionSchema = new Schema<IPayoutTransaction>(
  {
    payoutId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    bankCode: {
      type: String,
      required: true,
      trim: true,
    },
    bankName: {
      type: String,
      trim: true,
    },
    accountNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    accountName: {
      type: String,
      trim: true,
    },
    amountKobo: {
      type: Number,
      required: true,
      min: [100, 'Minimum payout amount is 100 kobo (₦1.00)'],
      validate: {
        validator: Number.isInteger,
        message: 'amountKobo must be an integer (Golden Rule 6)',
      },
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'success', 'failed'],
      default: 'pending',
      index: true,
    },
    recipientCode: {
      type: String,
      trim: true,
    },
    transferCode: {
      type: String,
      trim: true,
    },
    paystackTransferReference: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    failureReason: {
      type: String,
      trim: true,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const PayoutTransaction: Model<IPayoutTransaction> =
  (mongoose.models.PayoutTransaction as Model<IPayoutTransaction>) ||
  mongoose.model<IPayoutTransaction>('PayoutTransaction', PayoutTransactionSchema);

