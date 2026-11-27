import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import {
  VehicleTypeSchema,
  RiderStatusSchema,
  KycStatusSchema,
  type VehicleType,
  type RiderStatus,
  type KycStatus,
} from '@logistics/shared-types';

export interface IRiderVehicle {
  id: string;
  plate: string;
  description: string;
  isActive: boolean;
}

export interface IRiderSavedAddress {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
}

export interface IRiderProfile extends Document {
  userId: Types.ObjectId;
  fleetOwnerId?: Types.ObjectId | null;
  vehicleType: VehicleType;
  plateNumber: string;
  ridersCardNumber: string;
  ridersCardDocumentUrl: string;
  vehiclePhotoUrl?: string;
  kycStatus: KycStatus;
  kycRejectionReason?: string | null;
  status: RiderStatus;
  rating: number;
  homeDepot?: string;
  bankDetails?: {
    bankCode: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  vehicles?: IRiderVehicle[];
  savedAddresses?: IRiderSavedAddress[];
  preferences?: {
    autoConfirm: boolean;
    preferredMapEngine: 'google' | 'maplibre';
    dispatchRadiusKm: number;
    defaultNavApp: 'google' | 'waze';
  };
  lastLocation: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude] - Golden Rule 4
  };
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const RiderProfileSchema = new Schema<IRiderProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    fleetOwnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    vehicleType: {
      type: String,
      enum: VehicleTypeSchema.options,
      required: true,
      default: 'bike',
    },
    plateNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    ridersCardNumber: {
      type: String,
      required: true,
      trim: true,
    },
    ridersCardDocumentUrl: {
      type: String,
      required: true,
      trim: true,
    },
    vehiclePhotoUrl: {
      type: String,
      trim: true,
      default: undefined,
    },
    kycStatus: {
      type: String,
      enum: KycStatusSchema.options,
      default: 'pending_review',
      index: true,
    },
    kycRejectionReason: {
      type: String,
      default: null,
      trim: true,
    },
    status: {
      type: String,
      enum: RiderStatusSchema.options,
      default: 'offline',
      index: true,
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 1.0,
      max: 5.0,
    },
    lastLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [3.3792, 6.5244], // Default Lagos coordinate
        required: true,
        validate: {
          validator: (coords: number[]) => {
            return (
              coords.length === 2 &&
              coords[0]! >= -180 &&
              coords[0]! <= 180 &&
              coords[1]! >= -90 &&
              coords[1]! <= 90
            );
          },
          message: 'Coordinates must be valid [longitude, latitude] adhering to Golden Rule 4',
        },
      },
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    homeDepot: {
      type: String,
      trim: true,
      default: 'Yaba Central',
    },
    bankDetails: {
      bankCode: { type: String, trim: true, default: '058' },
      bankName: { type: String, trim: true, default: 'Guaranty Trust Bank (GTB)' },
      accountNumber: { type: String, trim: true, default: '' },
      accountName: { type: String, trim: true, default: '' },
    },
    vehicles: {
      type: [
        {
          id: { type: String, required: true },
          plate: { type: String, required: true, uppercase: true, trim: true },
          description: { type: String, required: true, trim: true },
          isActive: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    savedAddresses: {
      type: [
        {
          id: { type: String, required: true },
          label: { type: String, required: true, trim: true },
          address: { type: String, required: true, trim: true },
          lat: { type: Number, required: true },
          lng: { type: Number, required: true },
        },
      ],
      default: [],
    },
    preferences: {
      autoConfirm: { type: Boolean, default: true },
      preferredMapEngine: { type: String, enum: ['google', 'maplibre'], default: 'google' },
      dispatchRadiusKm: { type: Number, default: 2, min: 1, max: 25 },
      defaultNavApp: { type: String, enum: ['google', 'waze'], default: 'google' },
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for radius / $nearSphere dispatch queries
RiderProfileSchema.index({ lastLocation: '2dsphere' });

export const RiderProfile: Model<IRiderProfile> =
  (mongoose.models.RiderProfile as Model<IRiderProfile>) ||
  mongoose.model<IRiderProfile>('RiderProfile', RiderProfileSchema);
