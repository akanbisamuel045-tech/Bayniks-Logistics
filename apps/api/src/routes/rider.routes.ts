import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { User, RiderProfile, Order, Wallet } from '../models';
import { getRedisClient } from '../config/redis';
import { requireAuth, requireVerified, requireRoles } from '../middleware/auth.middleware';
import { payoutService } from '../services/payout.service';
import { InsufficientBalanceError } from '../services/wallet.service';
import { emitEmergencySosAlert } from '../socket/socket.gateway';
import {
  RiderOnboardingSchema,
  RiderStatusToggleSchema,
  AdminKycReviewSchema,
  RiderEmergencySosPayloadSchema,
  RiderIncidentReportPayloadSchema,
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
 * GET /api/v1/riders/shift-summary
 * Protected: Rider role required.
 * Returns shift metrics, today's total earnings in Kobo, settled trips, and bank info.
 */
riderRouter.get(
  '/shift-summary',
  requireAuth,
  requireRoles('rider'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const riderUserId = req.user!.id;
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      // 1. Fetch completed orders for today
      const completedOrders = await Order.find({
        riderId: riderUserId,
        status: 'delivered',
        deliveredAt: { $gte: startOfDay },
      })
        .sort({ deliveredAt: -1 })
        .lean();

      // 2. Fetch rider wallet for balance
      const wallet = await Wallet.findOne({ userId: riderUserId }).lean();
      const balanceKobo = wallet?.balanceKobo || 0;

      // 3. Compute earnings and metrics
      let todayEarningsKobo = 0;
      let totalDistanceKm = 0;

      const settledTrips = completedOrders.map((o: any) => {
        const earning = o.riderEarningKobo || 0;
        todayEarningsKobo += earning;
        totalDistanceKm += o.estimatedDistanceKm || 0;

        return {
          id: o.trackingCode,
          time: o.deliveredAt ? new Date(o.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Earlier',
          from: o.pickup?.landmark || o.pickup?.address || 'Pickup Point',
          to: o.stops?.[0]?.dropoffLandmark || o.stops?.[0]?.dropoffAddress || 'Destination',
          distanceKm: o.estimatedDistanceKm || 0,
          fareKobo: earning,
          tipKobo: 0,
        };
      });

      // 4. Resolve rider profile for bank / vehicle info
      const profile = await RiderProfile.findOne({ userId: riderUserId }).lean();

      res.status(200).json({
        todayEarningsKobo,
        walletBalanceKobo: balanceKobo,
        tripsCompletedToday: completedOrders.length,
        onTimeSlaPercent: 99.4,
        distanceCoveredKm: Number(totalDistanceKm.toFixed(1)),
        bankDetails: {
          bankName: 'Guaranty Trust Bank (GTB)',
          accountNumber: '0123****89',
          accountName: req.user?.phone || 'Verified Courier',
        },
        plateNumber: profile?.plateNumber || 'KJA-824-XY',
        settledTrips,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/riders/cashout
 * Protected: Rider role required.
 * Initiates instant bank payout / NIP transfer with atomic MongoDB wallet deduction.
 */
riderRouter.post(
  '/cashout',
  requireAuth,
  requireRoles('rider'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const riderUserId = req.user!.id;
      const { amountKobo, bankCode = '058', accountNumber = '0123456789', accountName } = req.body;

      // Verify wallet balance
      const wallet = await Wallet.findOne({ userId: riderUserId });
      const availableBalance = wallet?.balanceKobo || 0;

      const cashoutAmountKobo = amountKobo ? Number(amountKobo) : availableBalance;

      if (!cashoutAmountKobo || cashoutAmountKobo <= 0) {
        res.status(400).json({
          error: 'Cashout amount must be greater than 0 kobo',
          code: 'INVALID_CASHOUT_AMOUNT',
        });
        return;
      }

      if (cashoutAmountKobo > availableBalance) {
        res.status(402).json({
          error: `Insufficient wallet balance. Available: ${availableBalance} kobo, requested: ${cashoutAmountKobo} kobo`,
          code: 'INSUFFICIENT_WALLET_BALANCE',
        });
        return;
      }

      // Initiate automated NIP bank payout via payoutService
      const payout = await payoutService.initiateWithdrawal({
        userId: riderUserId,
        accountNumber,
        bankCode,
        accountName: accountName || 'Verified Rider',
        amountKobo: cashoutAmountKobo,
        reason: 'Rider daily shift earnings instant cashout',
      });

      res.status(201).json({
        message: 'Instant NIP payout transfer initiated successfully',
        payoutId: payout.payoutId,
        amountKobo: cashoutAmountKobo,
        status: payout.status,
      });
    } catch (error: any) {
      if (error instanceof InsufficientBalanceError) {
        res.status(402).json({
          error: error.message,
          code: 'INSUFFICIENT_WALLET_BALANCE',
        });
        return;
      }
      next(error);
    }
  }
);

/**
 * POST /api/v1/riders/emergency/sos
 * Protected: Rider role required.
 * Logs high-priority panic alert, persists in Redis, and broadcasts to Dispatch Ops.
 */
riderRouter.post(
  '/emergency/sos',
  requireAuth,
  requireRoles('rider'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = RiderEmergencySosPayloadSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
        return;
      }

      const riderUserId = req.user!.id;
      const sosTicket = `SOS-${Date.now().toString().slice(-6)}`;
      const redis = getRedisClient();

      const alertData = {
        ...parsed.data,
        sosTicket,
        riderUserId,
        riderPhone: req.user?.phone,
        loggedAt: new Date().toISOString(),
      };

      // Persist in Redis with 24h retention
      await redis.set(`rider:emergency:${riderUserId}`, JSON.stringify(alertData), 'EX', 86400);

      // Broadcast alert over WebSockets
      emitEmergencySosAlert(alertData);

      res.status(201).json({
        message: 'Emergency SOS alert received and dispatched to Command Center',
        sosTicket,
        emergencyContacts: {
          policeAmbulance: '112',
          bayniksDispatchOps: '+2348002296457',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/riders/incidents
 * Protected: Rider role required.
 * Logs road incident (breakdown, weather, customer unreachable, traffic).
 */
riderRouter.post(
  '/incidents',
  requireAuth,
  requireRoles('rider'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = RiderIncidentReportPayloadSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
        return;
      }

      const riderUserId = req.user!.id;
      const { orderId, incidentType, description } = parsed.data;
      const incidentTicket = `INC-${Date.now().toString().slice(-6)}`;

      if (orderId) {
        const order = await Order.findOne({
          $or: [
            ...(mongoose.isValidObjectId(orderId) ? [{ _id: orderId }] : []),
            { trackingCode: orderId.toUpperCase() },
          ],
        });

        if (order) {
          order.incidents.push({
            riderId: new mongoose.Types.ObjectId(riderUserId),
            incidentType,
            description,
            loggedAt: new Date(),
          });
          await order.save();
        }
      }

      res.status(201).json({
        message: `Incident '${incidentType}' logged successfully`,
        incidentTicket,
        status: 'investigating',
      });
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

