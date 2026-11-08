import mongoose, { Schema, Document, Model } from 'mongoose';
import { UserRoleSchema, type UserRole } from '@logistics/shared-types';

export interface IUser extends Document {
  role: UserRole;
  fullName: string;
  phone: string;
  email?: string;
  passwordHash: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = new Schema<IUser>(
  {
    role: {
      type: String,
      enum: UserRoleSchema.options,
      required: true,
      default: 'customer',
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Nigerian E.164 phone number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', UserSchema);

