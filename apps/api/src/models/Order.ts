import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import {
  OrderStatusSchema,
  OrderStopStatusSchema,
  PaymentMethodSchema,
  PaymentStatusSchema,
  VehicleTypeSchema,
  type OrderStatus,
  type OrderStopStatus,
  type PaymentMethod,
  type PaymentStatus,
  type VehicleType,
} from '@logistics/shared-types';

export interface IOrderStop {
  _id?: Types.ObjectId;
  sequenceNumber: number;
  recipientName: string;
  recipientPhone: string;
  dropoffAddress: string;
  dropoffLandmark: string;
  dropoffLocation: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  packageDescription: string;
  deliveryPin: string;
  proofOfDeliveryPhotoUrl?: string;
  status: OrderStopStatus;
  deliveredAt?: Date;
}

export interface IOrderMessage {
  _id?: Types.ObjectId;
  senderId?: Types.ObjectId;
  senderRole: 'rider' | 'customer' | 'system';
  senderName: string;
  text: string;
  createdAt: Date;
}

export interface IOrderIncident {
  _id?: Types.ObjectId;
  riderId: Types.ObjectId;
  incidentType: 'breakdown' | 'severe_weather' | 'customer_unreachable' | 'traffic_gridlock' | 'other';
  description: string;
  loggedAt: Date;
}

export interface IOrder extends Document {
  trackingCode: string;
  senderId: Types.ObjectId;
  riderId?: Types.ObjectId | null;
  status: OrderStatus;
  vehicleType: VehicleType;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  estimatedDistanceKm: number;
  totalFareKobo: number;
  platformCommissionKobo: number;
  riderEarningKobo: number;
  pickup: {
    address: string;
    landmark: string;
    location: {
      type: 'Point';
      coordinates: [number, number]; // [lng, lat] - Golden Rule 4
    };
    contactName: string;
    contactPhone: string;
    pickupPin: string;
  };
  stops: IOrderStop[];
  encodedRoutePolyline?: string;
  deliveredAt?: Date;
  payoutStatus?: 'pending' | 'settled';
  settledAt?: Date;
  messages: IOrderMessage[];
  incidents: IOrderIncident[];
  createdAt: Date;
  updatedAt: Date;
}

export const OrderStopSchema = new Schema<IOrderStop>(
  {
    sequenceNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    recipientName: {
      type: String,
      required: true,
      trim: true,
    },
    recipientPhone: {
      type: String,
      required: true,
      trim: true,
    },
    dropoffAddress: {
      type: String,
      required: true,
      trim: true,
    },
    dropoffLandmark: {
      type: String,
      required: true,
      trim: true,
    },
    dropoffLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number], // [lng, lat]
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
          message: 'Dropoff location coordinates must be [lng, lat]',
        },
      },
    },
    packageDescription: {
      type: String,
      required: true,
      trim: true,
    },
    deliveryPin: {
      type: String,
      required: true,
      match: /^\d{4}$/,
    },
    proofOfDeliveryPhotoUrl: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: OrderStopStatusSchema.options,
      default: 'pending',
      required: true,
    },
    deliveredAt: {
      type: Date,
    },
  },
  { _id: true }
);

export const OrderSchema = new Schema<IOrder>(
  {
    trackingCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    riderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: OrderStatusSchema.options,
      default: 'pending',
      index: true,
      required: true,
    },
    vehicleType: {
      type: String,
      enum: VehicleTypeSchema.options,
      required: true,
      default: 'bike',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: PaymentMethodSchema.options,
      required: true,
      default: 'wallet',
    },
    paymentStatus: {
      type: String,
      enum: PaymentStatusSchema.options,
      required: true,
      default: 'unpaid',
      index: true,
    },
    estimatedDistanceKm: {
      type: Number,
      required: true,
      min: 0,
    },
    totalFareKobo: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'totalFareKobo must be an integer (Golden Rule 6)',
      },
    },
    platformCommissionKobo: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'platformCommissionKobo must be an integer',
      },
    },
    riderEarningKobo: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'riderEarningKobo must be an integer',
      },
    },
    pickup: {
      address: { type: String, required: true, trim: true },
      landmark: { type: String, required: true, trim: true },
      location: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
          required: true,
        },
        coordinates: {
          type: [Number], // [lng, lat]
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
            message: 'Pickup coordinates must be [lng, lat]',
          },
        },
      },
      contactName: { type: String, required: true, trim: true },
      contactPhone: { type: String, required: true, trim: true },
      pickupPin: { type: String, required: true, match: /^\d{4}$/ },
    },
    stops: {
      type: [OrderStopSchema],
      validate: {
        validator: (stops: IOrderStop[]) => stops.length >= 1,
        message: 'Order must contain at least one delivery stop',
      },
    },
    encodedRoutePolyline: {
      type: String,
      trim: true,
      default: undefined,
    },
    deliveredAt: {
      type: Date,
    },
    payoutStatus: {
      type: String,
      enum: ['pending', 'settled'],
      default: 'pending',
    },
    settledAt: {
      type: Date,
    },
    messages: {
      type: [
        new Schema<IOrderMessage>(
          {
            senderId: { type: Schema.Types.ObjectId, ref: 'User' },
            senderRole: { type: String, enum: ['rider', 'customer', 'system'], required: true },
            senderName: { type: String, required: true },
            text: { type: String, required: true, trim: true, maxlength: 1000 },
            createdAt: { type: Date, default: Date.now },
          },
          { _id: true }
        ),
      ],
      default: [],
    },
    incidents: {
      type: [
        new Schema<IOrderIncident>(
          {
            riderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
            incidentType: {
              type: String,
              enum: ['breakdown', 'severe_weather', 'customer_unreachable', 'traffic_gridlock', 'other'],
              required: true,
            },
            description: { type: String, required: true, trim: true },
            loggedAt: { type: Date, default: Date.now },
          },
          { _id: true }
        ),
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index on pickup location for geospatial order search
OrderSchema.index({ 'pickup.location': '2dsphere' });

export const Order: Model<IOrder> =
  (mongoose.models.Order as Model<IOrder>) ||
  mongoose.model<IOrder>('Order', OrderSchema);

