import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { User, RiderProfile } from '../models';
import { getRedisClient } from '../config/redis';
import { requireAuth, requireVerified, requireRoles } from '../middleware/auth.middleware';
import {
  RiderOnboardingSchema,
  RiderStatusToggleSchema,
  AdminKycReviewSchema,
  toGeoJsonPoint,
  normalizeNigerianPhone,
} from '@logistics/shared-types';

export const riderRouter = Router();
export const fleetRouter = Router();
export const adminRiderRouter = Router();

/**
 * POST /api/v1/riders/onboard
 * Protected: Rider role required.
 * Submits vehicle info, plate number, and KYC permit document.
 */
riderRouter.post(
  '/onboard',
  requireAuth,
  requireVerified,
  requireRoles('rider'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = RiderOnboardingSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
        return;
      }

      const {
        vehicleType,
        plateNumber,
        ridersCardNumber,
        ridersCardDocumentUrl,
        vehiclePhotoUrl,
        fleetInviteCodeOrPhone,
      } = parsed.data;

      // 1. Check if plate number is already registered to another rider
      const existingPlate = await RiderProfile.findOne({
        plateNumber,
        userId: { $ne: req.user!.id },
      });
      if (existingPlate) {
        res.status(409).json({
          error: `Plate number '${plateNumber}' is already registered to another rider`,
          code: 'DUPLICATE_PLATE_NUMBER',
        });
        return;
      }

      // 2. Resolve optional Fleet Owner linking
      let fleetOwnerId: mongoose.Types.ObjectId | null = null;
      if (fleetInviteCodeOrPhone) {
        let normalizedFleetPhone: string | null = null;
        try {
          normalizedFleetPhone = normalizeNigerianPhone(fleetInviteCodeOrPhone);
        } catch {
          // not a phone, treat as code if needed
        }

        const fleetOwner = await User.findOne({
          $or: [
            ...(normalizedFleetPhone ? [{ phone: normalizedFleetPhone }] : []),
            { _id: mongoose.isValidObjectId(fleetInviteCodeOrPhone) ? fleetInviteCodeOrPhone : undefined },
          ],
          role: 'fleet_owner',
        });

        if (!fleetOwner) {
          res.status(404).json({
            error: 'Fleet owner with provided identifier not found',
            code: 'FLEET_OWNER_NOT_FOUND',
          });
          return;
        }

        fleetOwnerId = fleetOwner._id as mongoose.Types.ObjectId;
      }

      // 3. Upsert RiderProfile (resets to pending_review if previously rejected)
      const profile = await RiderProfile.findOneAndUpdate(
        { userId: req.user!.id },
        {
          userId: req.user!.id,
          vehicleType,
          plateNumber,
          ridersCardNumber,
          ridersCardDocumentUrl,
          vehiclePhotoUrl,
          fleetOwnerId,
          kycStatus: 'pending_review',
          kycRejectionReason: null,
          status: 'offline',
          lastSeenAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      res.status(201).json({
        message: 'Rider onboarded successfully. Documents submitted for KYC review.',
        profile,
      });
    } catch (error: any) {
      if (error.code === 11000) {
        res.status(409).json({
          error: 'Plate number is already registered in the system',
          code: 'DUPLICATE_PLATE_NUMBER',
        });
        return;
      }
      next(error);
    }
  }
);

/**
 * GET /api/v1/riders/me
 * Protected: Rider role required.
 * Returns rider's profile and fleet status.
 */
riderRouter.get(
  '/me',
  requireAuth,
  requireRoles('rider'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const profile = await RiderProfile.findOne({ userId: req.user!.id }).populate(
        'fleetOwnerId',
        'fullName phone email'
      );

      if (!profile) {
        res.status(404).json({
          error: 'Rider profile not found. Please complete onboarding.',
          code: 'PROFILE_NOT_FOUND',
        });
        return;
      }

      res.status(200).json({
        user: req.user,
        profile,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/v1/riders/status
 * Protected: Rider role required.
 * Allows toggling between 'offline' and 'available'.
 * CRITICAL GUARD: Only approved KYC riders can go available.
 */
riderRouter.patch(
  '/status',
  requireAuth,
  requireRoles('rider'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = RiderStatusToggleSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
        return;
      }

      const { status, lat, lng } = parsed.data;
      const profile = await RiderProfile.findOne({ userId: req.user!.id });

      if (!profile) {
        res.status(404).json({ error: 'Rider profile not found. Please onboard first.' });
        return;
      }

      const redis = getRedisClient();

      if (status === 'available') {
        // KYC Approval Guard: Riders cannot go online without approval
        if (profile.kycStatus !== 'approved') {
          res.status(403).json({
            error: 'KYC not approved. You cannot go online until your documents are verified.',
            code: 'KYC_NOT_APPROVED',
            currentKycStatus: profile.kycStatus,
          });
          return;
        }

        // Convert { lat, lng } -> GeoJSON [lng, lat] (Golden Rule 4)
        const geoPoint = toGeoJsonPoint({ lat, lng });

        profile.status = 'available';
        profile.lastLocation = geoPoint;
        profile.lastSeenAt = new Date();
        await profile.save();

        // Sync with Redis geospatial index: GEOADD key <lng> <lat> <member>
        await redis.geoadd(
          'riders:available:locations',
          geoPoint.coordinates[0], // Longitude
          geoPoint.coordinates[1], // Latitude
          req.user!.id
        );

        res.status(200).json({
          message: 'Status updated to available',
          status: 'available',
          lastLocation: profile.lastLocation,
        });
        return;
      }

      if (status === 'offline') {
        profile.status = 'offline';
        profile.lastSeenAt = new Date();
        await profile.save();

        // Remove from Redis active dispatch set
        await redis.zrem('riders:available:locations', req.user!.id);

        res.status(200).json({
          message: 'Status updated to offline',
          status: 'offline',
        });
        return;
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/v1/admin/riders/:riderUserId/kyc
 * Protected: Admin role required.
 * Approves or rejects rider KYC.
 */
adminRiderRouter.patch(
  '/riders/:riderUserId/kyc',
  requireAuth,
  requireRoles('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = AdminKycReviewSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
        return;
      }

      const { riderUserId } = req.params;
      if (!riderUserId) {
        res.status(400).json({ error: 'riderUserId parameter is required' });
        return;
      }

      const { action, reason } = parsed.data;

      const profile = await RiderProfile.findOne({ userId: riderUserId });
      if (!profile) {
        res.status(404).json({ error: 'Rider profile not found' });
        return;
      }

      const redis = getRedisClient();

      if (action === 'approve') {
        profile.kycStatus = 'approved';
        profile.kycRejectionReason = null;
      } else {
        profile.kycStatus = 'rejected';
        profile.kycRejectionReason = reason || 'Documentation failed verification';
        profile.status = 'offline';
        // Remove from active dispatch set
        await redis.zrem('riders:available:locations', riderUserId);
      }

      await profile.save();

      res.status(200).json({
        message: `Rider KYC status updated to '${profile.kycStatus}'`,
        profile,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/fleet/riders
 * Protected: Fleet Owner role required.
 * Lists all riders associated with this fleet owner.
 */
fleetRouter.get(
  '/riders',
  requireAuth,
  requireVerified,
  requireRoles('fleet_owner'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const riders = await RiderProfile.find({ fleetOwnerId: req.user!.id })
        .populate('userId', 'fullName phone email isVerified')
        .sort({ createdAt: -1 });

      res.status(200).json({
        fleetOwnerId: req.user!.id,
        count: riders.length,
        riders,
      });
    } catch (error) {
      next(error);
    }
  }
);

