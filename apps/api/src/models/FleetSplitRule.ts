import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IFleetSplitRule extends Document {
  fleetOwnerId: Types.ObjectId;
  riderUserId: Types.ObjectId;
  riderSharePercent: number;
  fleetOwnerSharePercent: number;
  createdAt: Date;
  updatedAt: Date;
}

export const FleetSplitRuleSchema = new Schema<IFleetSplitRule>(
  {
    fleetOwnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    riderUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    riderSharePercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 70,
    },
    fleetOwnerSharePercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 30,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure one split rule per rider-fleet owner pair
FleetSplitRuleSchema.index({ fleetOwnerId: 1, riderUserId: 1 }, { unique: true });

export const FleetSplitRule: Model<IFleetSplitRule> =
  (mongoose.models.FleetSplitRule as Model<IFleetSplitRule>) ||
  mongoose.model<IFleetSplitRule>('FleetSplitRule', FleetSplitRuleSchema);
