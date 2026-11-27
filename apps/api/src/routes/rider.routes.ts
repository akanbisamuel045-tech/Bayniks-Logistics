import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { User, RiderProfile, Order, Wallet, PayoutTransaction } from '../models';
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
  MAX_CASH_DEBT_LIMIT_KOBO,
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
        // Debt Circuit Breaker Guard: Riders with excess debt cannot go online
        const wallet = await Wallet.findOne({ userId: req.user!.id });
        if (wallet && (wallet.isDebtLocked || wallet.balanceKobo <= -MAX_CASH_DEBT_LIMIT_KOBO)) {
          res.status(403).json({
            error: 'Cash debt limit reached (₦5,000 threshold). You cannot go online until debt is cleared.',
            code: 'DEBT_LOCKED',
            balanceKobo: wallet.balanceKobo,
            isDebtLocked: true,
          });
          return;
        }

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

      // 1. Fetch completed orders for today and rolling 28-day window for live analytics & history
      const fourWeeksAgo = new Date(startOfDay);
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 27);

      const [completedOrders, recentOrders, wallet, profile, recentPayouts, userRecord] =
        await Promise.all([
          Order.find({
            riderId: riderUserId,
            status: 'delivered',
            deliveredAt: { $gte: startOfDay },
          })
            .sort({ deliveredAt: -1 })
            .lean(),
          Order.find({
            riderId: riderUserId,
            createdAt: { $gte: fourWeeksAgo },
          })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean(),
          Wallet.findOne({ userId: riderUserId }).lean(),
          RiderProfile.findOne({ userId: riderUserId }).lean(),
          PayoutTransaction.find({ userId: riderUserId }).sort({ createdAt: -1 }).limit(10).lean(),
          User.findById(riderUserId).lean(),
        ]);

      const balanceKobo = wallet?.balanceKobo || 0;

      // 2. Compute today's metrics & settled trips
      let todayEarningsKobo = 0;
      let totalDistanceKm = 0;

      const settledTrips = completedOrders.map((o: any) => {
        const earning = o.riderEarningKobo || 0;
        todayEarningsKobo += earning;
        totalDistanceKm += o.estimatedDistanceKm || 0;

        return {
          id: o.trackingCode,
          orderId: o._id?.toString(),
          time: o.deliveredAt ? new Date(o.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Earlier',
          from: o.pickup?.landmark || o.pickup?.address || 'Pickup Point',
          to: o.stops?.[0]?.dropoffLandmark || o.stops?.[0]?.dropoffAddress || 'Destination',
          distanceKm: o.estimatedDistanceKm || 0,
          fareKobo: earning,
          tipKobo: 0,
        };
      });

      // 3. Build 4 rolling weekly chart buckets from live MongoDB orders
      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const orderedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const earningsPeriods: Array<{
        id: string;
        label: string;
        totalNaira: number;
        expensesNaira: number;
        netNaira: number;
        yMaxNaira: number;
        bars: Array<{ label: string; showTick: boolean; totalNaira: number; expensesNaira: number; netNaira: number }>;
      }> = [];
      const activityWeeks: Array<{
        id: string;
        label: string;
        totalCompletedTrips: number;
        totalIncomingTrips: number;
        totalHoursLabel: string;
        defaultSelectedDayIdx: number;
        days: Array<{ day: string; tripsCompleted: number; tripsTotal: number; hoursLabel: string; hoursMinutes: number }>;
      }> = [];

      const now = new Date();
      for (let w = 3; w >= 0; w--) {
        const weekEnd = new Date(now);
        weekEnd.setHours(23, 59, 59, 999);
        weekEnd.setDate(now.getDate() - w * 7);
        const weekStart = new Date(weekEnd);
        weekStart.setHours(0, 0, 0, 0);
        weekStart.setDate(weekEnd.getDate() - 6);

        const fmtMD = (d: Date) =>
          `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const fmtDM = (d: Date) =>
          `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;

        const weekOrders = recentOrders.filter((o: any) => {
          const ts = new Date(o.deliveredAt || o.createdAt).getTime();
          return ts >= weekStart.getTime() && ts <= weekEnd.getTime();
        });

        const dayMap = new Map<
          string,
          { totalNaira: number; expensesNaira: number; completed: number; total: number; mins: number }
        >();
        for (const dLabel of orderedDays) {
          dayMap.set(dLabel, { totalNaira: 0, expensesNaira: 0, completed: 0, total: 0, mins: 0 });
        }

        for (const o of weekOrders as any[]) {
          const dLabel = dayLabels[new Date(o.deliveredAt || o.createdAt).getDay()] || 'Mon';
          const bucket = dayMap.get(dLabel)!;
          bucket.total += 1;
          if (o.status === 'delivered') {
            bucket.completed += 1;
            const totalN = Math.round((o.totalFareKobo || 0) / 100);
            const feeN = Math.round((o.platformCommissionKobo || 0) / 100);
            bucket.totalNaira += totalN;
            bucket.expensesNaira += feeN;
            bucket.mins += Math.max(12, Math.round((o.estimatedDistanceKm || 2) * 3.5));
          }
        }

        const bars = orderedDays.map((dLabel) => {
          const b = dayMap.get(dLabel)!;
          return {
            label: dLabel,
            showTick: true,
            totalNaira: b.totalNaira,
            expensesNaira: b.expensesNaira,
            netNaira: Math.max(0, b.totalNaira - b.expensesNaira),
          };
        });

        const weekTotalNaira = bars.reduce((s, b) => s + b.totalNaira, 0);
        const weekExpensesNaira = bars.reduce((s, b) => s + b.expensesNaira, 0);
        const weekNetNaira = Math.max(0, weekTotalNaira - weekExpensesNaira);
        const maxBar = Math.max(10000, ...bars.map((b) => b.totalNaira));

        earningsPeriods.push({
          id: `live-w-${w}`,
          label: `${fmtMD(weekStart)} - ${fmtMD(weekEnd)}`,
          totalNaira: weekTotalNaira,
          expensesNaira: weekExpensesNaira,
          netNaira: weekNetNaira,
          yMaxNaira: Math.ceil(maxBar / 5000) * 5000,
          bars,
        });

        const totalMins = Array.from(dayMap.values()).reduce((s, b) => s + b.mins, 0);
        const hrs = Math.floor(totalMins / 60);
        const remMins = totalMins % 60;

        activityWeeks.push({
          id: `live-act-${w}`,
          label: `${fmtDM(weekStart)}-${fmtDM(weekEnd)}`,
          totalCompletedTrips: weekOrders.filter((o: any) => o.status === 'delivered').length,
          totalIncomingTrips: weekOrders.length,
          totalHoursLabel: `${hrs}h ${String(remMins).padStart(2, '0')}m`,
          defaultSelectedDayIdx: Math.max(0, orderedDays.indexOf(dayLabels[now.getDay()] || 'Mon')),
          days: orderedDays.map((dLabel) => {
            const b = dayMap.get(dLabel)!;
            return {
              day: dLabel,
              tripsCompleted: b.completed,
              tripsTotal: b.total,
              hoursLabel: `${Math.floor(b.mins / 60)}h ${String(b.mins % 60).padStart(2, '0')}m`,
              hoursMinutes: b.mins,
            };
          }),
        });
      }

      // 4. Build live trip history & inbox notifications
      const recentHistory = recentOrders.slice(0, 30).map((o: any) => ({
        orderId: o._id?.toString(),
        trackingCode: o.trackingCode,
        customerName: o.stops?.[0]?.recipientName || o.pickup?.contactName || 'Customer',
        pickupAddress: o.pickup?.address || 'Pickup Point',
        dropoffAddress: o.stops?.[0]?.dropoffAddress || 'Destination',
        distanceKm: o.estimatedDistanceKm || 0,
        earningKobo: o.riderEarningKobo || 0,
        totalFareKobo: o.totalFareKobo || 0,
        commissionKobo: o.platformCommissionKobo || 0,
        paymentMethod: o.paymentMethod || 'wallet',
        status: o.status,
        deliveredAt: (o.deliveredAt || o.createdAt || new Date()).toISOString(),
        pinUsed: o.stops?.[0]?.deliveryPin || '',
      }));

      const notifications: Array<{
        id: string;
        title: string;
        date: string;
        category: 'Safety' | 'Finances' | 'KYC' | 'Dispatch';
        body: string;
      }> = [];

      if (wallet?.isDebtLocked || balanceKobo <= -MAX_CASH_DEBT_LIMIT_KOBO) {
        notifications.push({
          id: 'notif-debt-lock',
          title: 'Cash Commission Debt Limit Reached',
          date: 'Action required',
          category: 'Finances',
          body: 'Clear your commission balance via Paystack to unlock new delivery requests.',
        });
      }

      if (profile) {
        notifications.push({
          id: `notif-kyc-${profile.kycStatus}`,
          title:
            profile.kycStatus === 'approved'
              ? 'Rider KYC Verification Approved'
              : profile.kycStatus === 'rejected'
              ? 'Rider KYC Update Required'
              : 'Rider KYC Under Review',
          date: 'Account',
          category: 'KYC',
          body:
            profile.kycStatus === 'approved'
              ? `Documents verified for ${profile.plateNumber}. You are cleared to receive dispatch offers.`
              : profile.kycRejectionReason || 'Your submitted courier documents are being reviewed.',
        });
      }

      for (const payout of recentPayouts.slice(0, 3) as any[]) {
        notifications.push({
          id: `notif-payout-${payout._id}`,
          title: `Bank Payout ${payout.status === 'success' ? 'Completed' : payout.status}`,
          date: new Date(payout.createdAt).toLocaleDateString('en-NG'),
          category: 'Finances',
          body: `₦${Math.round((payout.amountKobo || 0) / 100).toLocaleString('en-NG')} transfer to ${payout.bankName || 'registered bank'}.`,
        });
      }

      const resolvedBank = profile?.bankDetails?.accountNumber
        ? profile.bankDetails
        : {
            bankCode: '058',
            bankName: 'Guaranty Trust Bank (GTB)',
            accountNumber: '0123****89',
            accountName: userRecord?.fullName || req.user?.phone || 'Verified Courier',
          };

      const resolvedVehicles =
        profile?.vehicles && profile.vehicles.length > 0
          ? profile.vehicles
          : profile
          ? [
              {
                id: 'veh-primary',
                plate: profile.plateNumber,
                description: `Bayniks ${profile.vehicleType} dispatch`,
                isActive: true,
              },
            ]
          : [];

      res.status(200).json({
        todayEarningsKobo,
        walletBalanceKobo: balanceKobo,
        isDebtLocked: Boolean(wallet?.isDebtLocked || balanceKobo <= -MAX_CASH_DEBT_LIMIT_KOBO),
        tripsCompletedToday: completedOrders.length,
        onTimeSlaPercent: 99.4,
        distanceCoveredKm: Number(totalDistanceKm.toFixed(1)),
        bankDetails: resolvedBank,
        homeDepot: profile?.homeDepot || 'Yaba Central',
        plateNumber: profile?.plateNumber || '',
        vehicles: resolvedVehicles,
        savedAddresses: profile?.savedAddresses || [],
        preferences: profile?.preferences || {
          autoConfirm: true,
          preferredMapEngine: 'google',
          dispatchRadiusKm: 2,
          defaultNavApp: 'google',
        },
        settledTrips,
        earningsPeriods,
        activityWeeks,
        recentHistory,
        notifications,
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
 * PATCH /api/v1/riders/preferences
 * Protected: Rider role required.
 * Persists rider contact profile, home depot, Paystack payout bank details,
 * vehicles, saved Home/Favourite addresses, and dispatch preferences.
 */
riderRouter.patch(
  '/preferences',
  requireAuth,
  requireRoles('rider'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const riderUserId = req.user!.id;
      const {
        fullName,
        email,
        homeDepot,
        bankDetails,
        vehicles,
        savedAddresses,
        preferences,
      } = req.body || {};

      if (typeof fullName === 'string' || typeof email === 'string') {
        const userUpdate: Record<string, string> = {};
        if (typeof fullName === 'string' && fullName.trim()) {
          userUpdate.fullName = fullName.trim();
        }
        if (typeof email === 'string' && email.trim()) {
          userUpdate.email = email.trim().toLowerCase();
        }
        if (Object.keys(userUpdate).length > 0) {
          await User.findByIdAndUpdate(riderUserId, { $set: userUpdate });
        }
      }

      const profileUpdate: Record<string, unknown> = {};
      if (typeof homeDepot === 'string' && homeDepot.trim()) {
        profileUpdate.homeDepot = homeDepot.trim();
      }
      if (bankDetails && typeof bankDetails === 'object') {
        profileUpdate.bankDetails = {
          bankCode: String(bankDetails.bankCode || '058'),
          bankName: String(bankDetails.bankName || 'Guaranty Trust Bank'),
          accountNumber: String(bankDetails.accountNumber || ''),
          accountName: String(bankDetails.accountName || ''),
        };
      }
      if (Array.isArray(vehicles)) {
        const cleanVehicles = vehicles
          .filter((v) => v && v.plate)
          .map((v) => ({
            id: String(v.id || `veh-${Date.now()}`),
            plate: String(v.plate).trim().toUpperCase(),
            description: String(v.description || '').trim(),
            isActive: Boolean(v.isActive),
          }));
        profileUpdate.vehicles = cleanVehicles;
        const activeVeh = cleanVehicles.find((v) => v.isActive) || cleanVehicles[0];
        if (activeVeh) {
          profileUpdate.plateNumber = activeVeh.plate;
        }
      }
      if (Array.isArray(savedAddresses)) {
        profileUpdate.savedAddresses = savedAddresses
          .filter((a) => a && a.address)
          .map((a) => ({
            id: String(a.id || `addr-${Date.now()}`),
            label: String(a.label || 'Saved Place').trim(),
            address: String(a.address).trim(),
            lat: Number(a.lat || 6.5244),
            lng: Number(a.lng || 3.3792),
          }));
      }
      if (preferences && typeof preferences === 'object') {
        profileUpdate.preferences = {
          autoConfirm: Boolean(preferences.autoConfirm ?? true),
          preferredMapEngine: preferences.preferredMapEngine === 'maplibre' ? 'maplibre' : 'google',
          dispatchRadiusKm: Math.min(25, Math.max(1, Number(preferences.dispatchRadiusKm || 2))),
          defaultNavApp: preferences.defaultNavApp === 'waze' ? 'waze' : 'google',
        };
      }

      const updatedProfile = await RiderProfile.findOneAndUpdate(
        { userId: riderUserId },
        { $set: profileUpdate },
        { new: true }
      ).lean();

      res.status(200).json({
        message: 'Rider preferences and settings saved',
        profile: updatedProfile,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/riders/notifications
 * Protected: Rider role required.
 * Returns live operational notifications (KYC status, debt lock, payouts).
 */
riderRouter.get(
  '/notifications',
  requireAuth,
  requireRoles('rider'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const riderUserId = req.user!.id;
      const [profile, wallet, recentPayouts] = await Promise.all([
        RiderProfile.findOne({ userId: riderUserId }).lean(),
        Wallet.findOne({ userId: riderUserId }).lean(),
        PayoutTransaction.find({ userId: riderUserId }).sort({ createdAt: -1 }).limit(10).lean(),
      ]);

      const notifications: Array<{
        id: string;
        title: string;
        date: string;
        category: string;
        body: string;
      }> = [];

      const balanceKobo = wallet?.balanceKobo || 0;
      if (wallet?.isDebtLocked || balanceKobo <= -MAX_CASH_DEBT_LIMIT_KOBO) {
        notifications.push({
          id: 'notif-debt-lock',
          title: 'Cash Commission Debt Limit Reached',
          date: 'Action required',
          category: 'Finances',
          body: 'Your commission ledger reached the ₦5,000 debt cap. Top up via Paystack to unlock dispatch.',
        });
      }

      if (profile) {
        notifications.push({
          id: `notif-kyc-${profile.kycStatus}`,
          title:
            profile.kycStatus === 'approved'
              ? 'Rider KYC Verification Approved'
              : 'Rider KYC Status Update',
          date: 'Account',
          category: 'KYC',
          body:
            profile.kycStatus === 'approved'
              ? `Documents verified for ${profile.plateNumber}. Ready for dispatch.`
              : profile.kycRejectionReason || 'Your KYC review is currently in progress.',
        });
      }

      for (const p of recentPayouts as any[]) {
        notifications.push({
          id: `notif-payout-${p._id}`,
          title: `Bank Payout ${p.status === 'success' ? 'Processed' : p.status}`,
          date: new Date(p.createdAt).toLocaleDateString('en-NG'),
          category: 'Finances',
          body: `₦${Math.round((p.amountKobo || 0) / 100).toLocaleString('en-NG')} transfer to ${p.bankName || 'registered bank'}.`,
        });
      }

      res.status(200).json({ notifications });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/riders/scheduled-orders
 * Protected: Rider role required.
 * Lists upcoming scheduled or searching orders matching the rider vehicle class.
 */
riderRouter.get(
  '/scheduled-orders',
  requireAuth,
  requireRoles('rider'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const profile = await RiderProfile.findOne({ userId: req.user!.id }).lean();
      const vehicleType = profile?.vehicleType || 'bike';

      const orders = await Order.find({
        vehicleType,
        status: 'searching_rider',
        riderId: null,
        scheduledFor: { $ne: null },
      })
        .sort({ scheduledFor: 1 })
        .limit(20)
        .lean();

      res.status(200).json({
        orders: orders.map((o: any) => ({
          orderId: o._id.toString(),
          trackingCode: o.trackingCode,
          pickupAddress: o.pickup?.address || 'Pickup Point',
          dropoffAddress: o.stops?.[0]?.dropoffAddress || 'Destination',
          estimatedDistanceKm: o.estimatedDistanceKm || 0,
          riderEarningKobo: o.riderEarningKobo || 0,
          scheduledFor: o.scheduledFor ? new Date(o.scheduledFor).toISOString() : null,
        })),
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

