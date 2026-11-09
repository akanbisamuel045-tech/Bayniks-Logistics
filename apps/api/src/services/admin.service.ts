import mongoose, { Types } from 'mongoose';
import {
  FleetBikeTelemetryItem,
  AdminFleetOverviewResponse,
  fromGeoJsonPoint,
  toGeoJsonPoint,
} from '@logistics/shared-types';
import { User, RiderProfile, Order, IOrder, IRiderProfile } from '../models';
import { getRedisClient } from '../config/redis';
import {
  emitToTrackingRoom,
  emitOrderStatusToCustomer,
  emitToAdminFleet,
} from '../socket/socket.gateway';

export class AdminOperationError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'ADMIN_OPERATION_ERROR') {
    super(message);
    this.name = 'AdminOperationError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class AdminService {
  /**
   * Retrieves God's Eye real-time fleet snapshot.
   * If requester is 'fleet_owner', scopes results to their motorcycles.
   * If requester is 'admin', returns the entire fleet across Lagos.
   */
  async getGodsEyeFleetSnapshot(requesterUser: {
    userId: string;
    role: string;
  }): Promise<AdminFleetOverviewResponse> {
    const filter: Record<string, any> = {};
    if (requesterUser.role === 'fleet_owner') {
      filter.fleetOwnerId = new Types.ObjectId(requesterUser.userId);
    }

    const [profiles, pendingKycCount] = await Promise.all([
      RiderProfile.find(filter)
        .populate('userId', 'fullName phone email isVerified')
        .sort({ updatedAt: -1 })
        .lean(),
      RiderProfile.countDocuments({
        ...filter,
        kycStatus: { $in: ['pending', 'pending_review'] },
      }),
    ]);

    const redis = getRedisClient();

    let onlineCount = 0;
    let busyCount = 0;
    let mockLocationFlaggedCount = 0;

    const bikes: FleetBikeTelemetryItem[] = await Promise.all(
      profiles.map(async (profile) => {
        const riderUserId = profile.userId ? ((profile.userId as any)._id || profile.userId).toString() : '';
        const userDoc = (profile.userId as any) || {};

        const telemetryKey = `rider:telemetry:${riderUserId}`;
        const telemetry = await redis.hgetall(telemetryKey);

        let lat: number;
        let lng: number;
        let bearing = 0;
        let speed = 0;
        let isMockLocation = false;
        let activeOrderId: string | null = null;
        let activeTrackingCode: string | null = null;
        let updatedAt = profile.lastSeenAt ? new Date(profile.lastSeenAt).getTime() : Date.now();

        if (telemetry && telemetry.lat && telemetry.lng) {
          lat = Number(telemetry.lat);
          lng = Number(telemetry.lng);
          bearing = Number(telemetry.bearing || 0);
          speed = Number(telemetry.speed || 0);
          isMockLocation = telemetry.isMockLocation === 'true';
          activeOrderId = telemetry.activeOrderId || null;
          activeTrackingCode = telemetry.trackingCode || null;
          updatedAt = Number(telemetry.updatedAt || Date.now());
        } else {
          // Golden Rule 4 Fallback: profile.lastLocation.coordinates is [lng, lat]
          const coords = profile.lastLocation?.coordinates || [3.3792, 6.5244];
          lng = coords[0];
          lat = coords[1];
        }

        if (profile.status === 'busy') {
          busyCount++;
        }
        if (profile.status === 'available' || profile.status === 'busy') {
          onlineCount++;
        }
        if (isMockLocation) {
          mockLocationFlaggedCount++;
        }

        return {
          riderUserId,
          fullName: userDoc.fullName || 'Dispatch Rider',
          phone: userDoc.phone || '+2348000000000',
          plateNumber: profile.plateNumber,
          status: profile.status as 'offline' | 'available' | 'busy',
          kycStatus: profile.kycStatus as 'pending' | 'approved' | 'rejected',
          fleetOwnerId: profile.fleetOwnerId ? profile.fleetOwnerId.toString() : null,
          lat,
          lng,
          bearing,
          speed,
          isMockLocation,
          activeOrderId,
          activeTrackingCode,
          updatedAt,
        };
      })
    );

    return {
      onlineCount,
      busyCount,
      mockLocationFlaggedCount,
      pendingKycCount,
      bikes,
    };
  }

  /**
   * Performs an atomic mid-trip emergency order reassignment from an active rider
   * to a verified available replacement rider.
   */
  async reassignActiveOrder(params: {
    orderId: string;
    newRiderUserId: string;
    reason?: string;
    adminUserId: string;
  }): Promise<{ order: IOrder; previousRiderId: string | null; newRiderId: string }> {
    const { orderId, newRiderUserId, reason = 'Motorcycle breakdown / emergency reassignment' } = params;

    if (!Types.ObjectId.isValid(orderId)) {
      throw new AdminOperationError('Invalid orderId format', 400, 'INVALID_ORDER_ID');
    }
    if (!Types.ObjectId.isValid(newRiderUserId)) {
      throw new AdminOperationError('Invalid newRiderUserId format', 400, 'INVALID_RIDER_ID');
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw new AdminOperationError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    // Verify order is in an active delivery state
    const activeStatuses = ['rider_assigned', 'arrived_pickup', 'in_transit', 'arrived_dropoff'];
    if (!activeStatuses.includes(order.status)) {
      throw new AdminOperationError(
        `Order with status '${order.status}' cannot be reassigned mid-trip`,
        400,
        'ORDER_NOT_REASSIGNABLE'
      );
    }

    const previousRiderId = order.riderId ? order.riderId.toString() : null;

    // Check replacement rider qualifications
    const newRiderProfile = await RiderProfile.findOne({ userId: new Types.ObjectId(newRiderUserId) });
    if (!newRiderProfile) {
      throw new AdminOperationError('Replacement rider profile not found', 404, 'RIDER_NOT_FOUND');
    }
    if (newRiderProfile.kycStatus !== 'approved') {
      throw new AdminOperationError(
        'Replacement rider KYC documentation is not approved',
        400,
        'RIDER_NOT_APPROVED'
      );
    }
    if (newRiderProfile.status !== 'available') {
      throw new AdminOperationError(
        `Replacement rider is currently '${newRiderProfile.status}', must be 'available'`,
        400,
        'RIDER_NOT_AVAILABLE'
      );
    }

    // Golden Rule 6: Atomic Multi-Document ACID Transaction
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // 1. Release previous rider if assigned
        if (previousRiderId) {
          await RiderProfile.findOneAndUpdate(
            { userId: new Types.ObjectId(previousRiderId) },
            { status: 'available' },
            { session }
          );
        }

        // 2. Lock replacement rider to busy
        await RiderProfile.findOneAndUpdate(
          { userId: new Types.ObjectId(newRiderUserId) },
          { status: 'busy' },
          { session }
        );

        // 3. Update order rider assignment, strictly preserving all completed stop states and PINs
        order.riderId = new Types.ObjectId(newRiderUserId);
        await order.save({ session });
      });
    } finally {
      await session.endSession();
    }

    // Synchronize Redis state outside transaction
    const redis = getRedisClient();

    // Remove new rider from available dispatch pool and assign active order in telemetry hash
    await redis.zrem('riders:available:locations', newRiderUserId);
    await redis.hset(
      `rider:telemetry:${newRiderUserId}`,
      'activeOrderId',
      order._id.toString(),
      'trackingCode',
      order.trackingCode
    );

    // Free previous rider in Redis
    if (previousRiderId) {
      await redis.hdel(`rider:telemetry:${previousRiderId}`, 'activeOrderId', 'trackingCode');
      const prevProfile = await RiderProfile.findOne({ userId: new Types.ObjectId(previousRiderId) });
      if (prevProfile?.lastLocation?.coordinates) {
        await redis.geoadd(
          'riders:available:locations',
          prevProfile.lastLocation.coordinates[0],
          prevProfile.lastLocation.coordinates[1],
          previousRiderId
        );
      }
    }

    // Live Socket.io updates to customer tracking screen & admin fleet radar
    const newTelemetry = await redis.hgetall(`rider:telemetry:${newRiderUserId}`);
    const coords = newTelemetry?.lat && newTelemetry?.lng
      ? { lat: Number(newTelemetry.lat), lng: Number(newTelemetry.lng) }
      : fromGeoJsonPoint(newRiderProfile.lastLocation as any);

    try {
      emitToTrackingRoom(order.trackingCode, {
        trackingCode: order.trackingCode,
        riderId: newRiderUserId,
        lat: coords.lat,
        lng: coords.lng,
        bearing: Number(newTelemetry?.bearing || 0),
        speed: Number(newTelemetry?.speed || 0),
        status: order.status,
        updatedAt: Date.now(),
      });

      emitOrderStatusToCustomer(order.senderId.toString(), {
        orderId: order._id.toString(),
        trackingCode: order.trackingCode,
        status: order.status,
        reassigned: true,
        previousRiderId,
        newRiderId: newRiderUserId,
        reason,
      });

      emitToAdminFleet('admin:order_reassigned', {
        orderId: order._id.toString(),
        trackingCode: order.trackingCode,
        previousRiderId,
        newRiderId: newRiderUserId,
        reason,
        timestamp: Date.now(),
      });
    } catch {
      // Non-blocking socket emission in test environments
    }

    return {
      order,
      previousRiderId,
      newRiderId: newRiderUserId,
    };
  }

  /**
   * Retrieves pending rider KYC applications for admin verification.
   */
  async getPendingKycQueue(): Promise<any[]> {
    const pendingProfiles = await RiderProfile.find({ kycStatus: { $in: ['pending', 'pending_review'] } })
      .populate('userId', 'fullName phone email isVerified')
      .sort({ createdAt: -1 })
      .lean();

    return pendingProfiles.map((p) => {
      const user = (p.userId as any) || {};
      return {
        id: p._id.toString(),
        riderUserId: user._id?.toString() || p.userId?.toString(),
        fullName: user.fullName || 'Rider Applicant',
        phone: user.phone || '',
        email: user.email || '',
        plateNumber: p.plateNumber,
        ridersCardNumber: p.ridersCardNumber,
        ridersCardDocumentUrl: p.ridersCardDocumentUrl,
        vehiclePhotoUrl: p.vehiclePhotoUrl,
        kycStatus: p.kycStatus,
        createdAt: p.createdAt,
      };
    });
  }

  /**
   * Reviews and approves or rejects a rider's KYC documentation.
   */
  async reviewRiderKyc(params: {
    riderProfileId: string;
    decision: 'approved' | 'rejected';
    rejectionReason?: string;
  }): Promise<IRiderProfile> {
    const { riderProfileId, decision, rejectionReason } = params;

    if (!Types.ObjectId.isValid(riderProfileId)) {
      throw new AdminOperationError('Invalid riderProfileId format', 400, 'INVALID_PROFILE_ID');
    }

    const profile = await RiderProfile.findById(riderProfileId);
    if (!profile) {
      throw new AdminOperationError('Rider profile not found', 404, 'PROFILE_NOT_FOUND');
    }

    const redis = getRedisClient();

    if (decision === 'approved') {
      profile.kycStatus = 'approved';
      profile.kycRejectionReason = null;

      // If already available, index in Redis available pool
      if (profile.status === 'available' && profile.lastLocation?.coordinates) {
        await redis.geoadd(
          'riders:available:locations',
          profile.lastLocation.coordinates[0],
          profile.lastLocation.coordinates[1],
          profile.userId.toString()
        );
      }
    } else {
      profile.kycStatus = 'rejected';
      profile.kycRejectionReason = rejectionReason || 'Documentation failed verification';
      profile.status = 'offline';
      await redis.zrem('riders:available:locations', profile.userId.toString());
    }

    await profile.save();
    return profile;
  }
}

let adminServiceInstance: AdminService | null = null;

export function getAdminService(): AdminService {
  if (!adminServiceInstance) {
    adminServiceInstance = new AdminService();
  }
  return adminServiceInstance;
}

export const adminService = getAdminService();
