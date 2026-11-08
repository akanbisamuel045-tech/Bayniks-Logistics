import mongoose from 'mongoose';
import {
  LatLng,
  VehicleType,
  toGeoJsonPoint,
  fromGeoJsonPoint,
  DispatchMatchResult,
  JobNewOffer,
  TrackingUpdate,
  encodeGooglePolyline,
} from '@logistics/shared-types';
import { getRedisClient } from '../config/redis';
import { Order, RiderProfile, User, IOrder } from '../models';
import {
  emitJobOfferToRider,
  emitToTrackingRoom,
  emitOrderStatusToCustomer,
} from '../socket/socket.gateway';
import { walletService } from './wallet.service';
import { telemetryService } from './telemetry.service';
import { notificationService } from './notification.service';

export class DispatchError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode = 400, code = 'DISPATCH_ERROR') {
    super(message);
    this.name = 'DispatchError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class DispatchService {
  private activeTimers = new Map<string, NodeJS.Timeout>();

  /**
   * Finds nearest available dispatch riders within a given radius.
   * Primary Fast Path: Redis GEOSEARCH on `riders:available:locations`.
   * Fallback Path: MongoDB `$nearSphere` 2dsphere index on `RiderProfile.lastLocation`.
   */
  async findNearestAvailableRiders(
    pickupLatLng: LatLng,
    vehicleType: VehicleType,
    radiusMeters: number,
    excludedRiderIds: string[] = []
  ): Promise<string[]> {
    const redis = getRedisClient();

    // 1. Primary Fast Path: Redis GEOSEARCH
    // Golden Rule 4: strictly <lng> <lat> coordinate ordering
    let redisRiderIds: string[] = [];
    try {
      const candidates = await redis.geosearch(
        'riders:available:locations',
        'FROMLONLAT',
        pickupLatLng.lng,
        pickupLatLng.lat,
        'BYRADIUS',
        radiusMeters,
        'm',
        'ASC',
        'COUNT',
        10
      );
      if (Array.isArray(candidates)) {
        redisRiderIds = candidates.map((id) => String(id));
      }
    } catch {
      // Redis GEOSEARCH error fallback
    }

    if (redisRiderIds.length > 0) {
      const candidateIds = redisRiderIds.filter((id) => !excludedRiderIds.includes(id));
      if (candidateIds.length > 0) {
        const objectIds = candidateIds
          .filter((id) => mongoose.isValidObjectId(id))
          .map((id) => new mongoose.Types.ObjectId(id));

        const validProfiles = await RiderProfile.find({
          userId: { $in: objectIds },
          kycStatus: 'approved',
          status: 'available',
          vehicleType,
        }).lean();

        const validUserIdsSet = new Set(validProfiles.map((p) => p.userId.toString()));
        // Maintain proximity sort order from Redis GEOSEARCH
        const matched = candidateIds.filter((id) => validUserIdsSet.has(id));
        if (matched.length > 0) {
          return matched;
        }
      }
    }

    // 2. Fallback Path: MongoDB $nearSphere index query
    const excludedObjectIds = excludedRiderIds
      .filter((id) => mongoose.isValidObjectId(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const fallbackProfiles = await RiderProfile.find({
      kycStatus: 'approved',
      status: 'available',
      vehicleType,
      userId: { $nin: excludedObjectIds },
      lastLocation: {
        $nearSphere: {
          $geometry: toGeoJsonPoint(pickupLatLng),
          $maxDistance: radiusMeters,
        },
      },
    })
      .limit(5)
      .lean();

    return fallbackProfiles.map((p) => p.userId.toString());
  }

  /**
   * Matches and dispatches an order to up to 3 closest available riders with a 30s offer countdown.
   * Features expanding search radius: 3000m (3km) -> 6000m (6km).
   */
  async dispatchOrderToNearestRiders(orderId: string): Promise<DispatchMatchResult> {
    const order = await Order.findById(orderId);
    if (!order || order.status !== 'searching_rider' || order.riderId) {
      return {
        matched: false,
        orderId,
        trackingCode: order?.trackingCode ?? '',
        offeredRiderIds: [],
        radiusMetersUsed: 0,
        reason: 'ORDER_NOT_SEARCHING',
      };
    }

    const redis = getRedisClient();
    const declinedRiderIds = await redis.smembers(`dispatch:declined:${orderId}`);
    const pickupLatLng = fromGeoJsonPoint(order.pickup.location as any);

    // Expanding Radius Search: 3km -> 6km
    let radiusMetersUsed = 3000;
    let candidateRiderIds = await this.findNearestAvailableRiders(
      pickupLatLng,
      order.vehicleType,
      3000,
      declinedRiderIds
    );

    if (candidateRiderIds.length === 0) {
      radiusMetersUsed = 6000;
      candidateRiderIds = await this.findNearestAvailableRiders(
        pickupLatLng,
        order.vehicleType,
        6000,
        declinedRiderIds
      );
    }

    if (candidateRiderIds.length === 0) {
      return {
        matched: false,
        orderId,
        trackingCode: order.trackingCode,
        offeredRiderIds: [],
        radiusMetersUsed,
        reason: 'NO_RIDERS_AVAILABLE',
      };
    }

    // Select top 3 closest riders
    const selectedRiderIds = candidateRiderIds.slice(0, 3);
    const expiresAt = Date.now() + 30000; // 30 seconds

    // Store active offer wave in Redis
    await redis.set(
      `dispatch:offers:${orderId}`,
      JSON.stringify({ riderIds: selectedRiderIds, expiresAt }),
      'EX',
      45 // Buffer TTL
    );

    // Broadcast job:new_offer over Socket.io
    const offerPayload: JobNewOffer = {
      orderId,
      trackingCode: order.trackingCode,
      pickupAddress: order.pickup.address,
      pickupLandmark: order.pickup.landmark,
      estimatedDistanceKm: order.estimatedDistanceKm,
      riderEarningKobo: order.riderEarningKobo,
      stopsCount: order.stops.length,
      expiresAt,
    };

    for (const riderUserId of selectedRiderIds) {
      try {
        emitJobOfferToRider(riderUserId, offerPayload);
      } catch {
        // Socket may not be active in headless unit test setups
      }
    }

    // Schedule 30-second offer timeout
    this.scheduleOfferTimeout(orderId, selectedRiderIds, 30000);

    return {
      matched: true,
      orderId,
      trackingCode: order.trackingCode,
      offeredRiderIds: selectedRiderIds,
      radiusMetersUsed,
      expiresAt,
    };
  }

  /**
   * Concurrency-safe atomic job acceptance with Redis SET NX distributed lock and MongoDB transaction.
   */
  async acceptOrderOffer(riderUserId: string, orderId: string): Promise<Record<string, any>> {
    const redis = getRedisClient();
    const lockKey = `lock:order:${orderId}`;

    // 1. Critical Concurrency Lock: Redis SET NX with 10s TTL
    const lockAcquired = await redis.set(lockKey, riderUserId, 'PX', 10000, 'NX');
    if (!lockAcquired) {
      throw new DispatchError(
        'Order is currently locked by another rider',
        409,
        'ORDER_LOCKED_BY_ANOTHER_RIDER'
      );
    }

    let updatedOrder: IOrder | null = null;
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        // Atomically update Order ONLY if status is still 'searching_rider' and riderId is null
        updatedOrder = await Order.findOneAndUpdate(
          {
            _id: orderId,
            status: 'searching_rider',
            riderId: null,
          },
          {
            $set: {
              riderId: new mongoose.Types.ObjectId(riderUserId),
              status: 'rider_assigned',
            },
          },
          { new: true, session }
        );

        if (!updatedOrder) {
          throw new DispatchError(
            'Order has already been assigned or is no longer available',
            409,
            'ORDER_ALREADY_ASSIGNED'
          );
        }

        // Atomically update RiderProfile to busy
        const updatedProfile = await RiderProfile.findOneAndUpdate(
          {
            userId: new mongoose.Types.ObjectId(riderUserId),
            status: 'available',
          },
          {
            $set: { status: 'busy' },
          },
          { new: true, session }
        );

        if (!updatedProfile) {
          throw new DispatchError(
            'Rider is not available to accept jobs',
            409,
            'RIDER_NOT_AVAILABLE'
          );
        }
      });
    } finally {
      await session.endSession();
    }

    // Clear active timeout handle
    this.clearOrderTimer(orderId);

    // 2. Post-Transaction State Updates (Redis)
    await redis.zrem('riders:available:locations', riderUserId);

    if (updatedOrder) {
      const orderDoc: IOrder = updatedOrder;
      await redis.hset(
        `rider:telemetry:${riderUserId}`,
        'activeOrderId',
        orderId,
        'trackingCode',
        orderDoc.trackingCode
      );

      // Clean up offer and release lock
      await redis.del(`dispatch:offers:${orderId}`);
      await redis.del(lockKey);

      // Broadcast real-time notifications
      const trackingUpdate: TrackingUpdate = {
        trackingCode: orderDoc.trackingCode,
        riderId: riderUserId,
        lat: fromGeoJsonPoint(orderDoc.pickup.location as any).lat,
        lng: fromGeoJsonPoint(orderDoc.pickup.location as any).lng,
        bearing: 0,
        speed: 0,
        status: 'rider_assigned',
        updatedAt: Date.now(),
      };

      try {
        emitToTrackingRoom(orderDoc.trackingCode, trackingUpdate);
        emitOrderStatusToCustomer(orderDoc.senderId.toString(), {
          orderId,
          status: 'rider_assigned',
          trackingCode: orderDoc.trackingCode,
          riderId: riderUserId,
        });
      } catch {
        // Socket may not be active in headless setups
      }

      // 3. Return sanitized order for rider: REDACT pickupPin and deliveryPins!
      return this.sanitizeOrderForRider(orderDoc);
    }

    throw new DispatchError('Failed to accept order', 500, 'DISPATCH_ERROR');
  }

  /**
   * Handles rider declining a dispatch offer.
   * Tracks decline in Redis and immediately triggers next-wave dispatch if all current riders declined.
   */
  async declineOrderOffer(riderUserId: string, orderId: string): Promise<{ ok: boolean; declined: boolean }> {
    const redis = getRedisClient();

    // 1. Add rider to declined set with 1-hour expiration
    await redis.sadd(`dispatch:declined:${orderId}`, riderUserId);
    await redis.expire(`dispatch:declined:${orderId}`, 3600);

    // 2. Check remaining riders in active offer wave
    const rawOffers = await redis.get(`dispatch:offers:${orderId}`);
    if (rawOffers) {
      try {
        const offerData = JSON.parse(rawOffers);
        const remainingRiders: string[] = (offerData.riderIds || []).filter((id: string) => id !== riderUserId);

        if (remainingRiders.length === 0) {
          // All offered riders have declined -> clear timer and re-dispatch next wave immediately
          this.clearOrderTimer(orderId);
          await this.dispatchOrderToNearestRiders(orderId);
        } else {
          await redis.set(
            `dispatch:offers:${orderId}`,
            JSON.stringify({ riderIds: remainingRiders, expiresAt: offerData.expiresAt }),
            'KEEPTTL'
          );
        }
      } catch {
        // Ignore JSON parse errors
      }
    }

    return { ok: true, declined: true };
  }

  /**
   * Sanitizes order details returned to dispatch rider.
   * ANTI-FRAUD REQUIREMENT: Strictly redacts pickupPin and deliveryPins.
   */
  public sanitizeOrderForRider(order: IOrder): Record<string, any> {
    return {
      _id: order._id,
      trackingCode: order.trackingCode,
      status: order.status,
      vehicleType: order.vehicleType,
      paymentMethod: order.paymentMethod,
      totalFareKobo: order.totalFareKobo,
      riderEarningKobo: order.riderEarningKobo,
      estimatedDistanceKm: order.estimatedDistanceKm,
      pickup: {
        address: order.pickup.address,
        landmark: order.pickup.landmark,
        location: fromGeoJsonPoint(order.pickup.location as any),
        contactName: order.pickup.contactName,
        contactPhone: order.pickup.contactPhone,
        // pickupPin is INTENTIONALLY omitted / redacted
      },
      stops: order.stops.map((s) => ({
        sequenceNumber: s.sequenceNumber,
        recipientName: s.recipientName,
        recipientPhone: s.recipientPhone,
        dropoffAddress: s.dropoffAddress,
        dropoffLandmark: s.dropoffLandmark,
        dropoffLocation: fromGeoJsonPoint(s.dropoffLocation as any),
        packageDescription: s.packageDescription,
        status: s.status,
        // deliveryPin is INTENTIONALLY omitted / redacted
      })),
      encodedRoutePolyline: order.encodedRoutePolyline,
    };
  }

  /**
   * Schedules a 30-second offer timeout. If the order is unassigned when the timer triggers,
   * the offered riders are marked as timed-out and the next closest riders are searched.
   */
  private scheduleOfferTimeout(orderId: string, offeredRiders: string[], timeoutMs: number): void {
    this.clearOrderTimer(orderId);

    const timer = setTimeout(async () => {
      try {
        const order = await Order.findById(orderId);
        if (order && order.status === 'searching_rider' && !order.riderId) {
          const redis = getRedisClient();
          if (offeredRiders.length > 0) {
            await redis.sadd(`dispatch:declined:${orderId}`, ...offeredRiders);
          }
          await this.dispatchOrderToNearestRiders(orderId);
        }
      } catch {
        // Ignore timeout background error
      } finally {
        this.activeTimers.delete(orderId);
      }
    }, timeoutMs);

    timer.unref(); // Ensures timer does not block node process or test runner from exiting
    this.activeTimers.set(orderId, timer);
  }

  private clearOrderTimer(orderId: string): void {
    if (this.activeTimers.has(orderId)) {
      clearTimeout(this.activeTimers.get(orderId)!);
      this.activeTimers.delete(orderId);
    }
  }

  /**
   * Clears all active timers during test teardown.
   */
  public clearAllTimers(): void {
    for (const [orderId, timer] of this.activeTimers.entries()) {
      clearTimeout(timer);
    }
    this.activeTimers.clear();
  }

  /**
   * Retrieves the currently active order for an assigned dispatch rider.
   */
  async getActiveOrderByRider(riderUserId: string): Promise<Record<string, any> | null> {
    const order = await Order.findOne({
      riderId: new mongoose.Types.ObjectId(riderUserId),
      status: { $in: ['rider_assigned', 'arrived_pickup', 'in_transit', 'arrived_dropoff'] },
    });

    if (!order) {
      return null;
    }

    return this.sanitizeOrderForRider(order);
  }

  /**
   * Validates and executes sequential order lifecycle state transitions triggered by the rider.
   * State Machine: rider_assigned -> arrived_pickup -> in_transit -> arrived_dropoff.
   */
  async transitionOrderState(
    riderUserId: string,
    orderId: string,
    targetStatus: 'arrived_pickup' | 'in_transit' | 'arrived_dropoff',
    stopSequenceNumber?: number
  ): Promise<Record<string, any>> {
    const order = await Order.findOne({
      _id: orderId,
      riderId: new mongoose.Types.ObjectId(riderUserId),
    });

    if (!order) {
      throw new DispatchError('Active order not found for this rider', 404, 'ORDER_NOT_FOUND');
    }

    // State machine sequence validation
    const allowedTransitions: Record<string, string[]> = {
      rider_assigned: ['arrived_pickup'],
      arrived_pickup: ['in_transit'],
      in_transit: ['arrived_dropoff'],
      arrived_dropoff: ['in_transit', 'arrived_dropoff'], // multi-stop progressions
    };

    const validNextStates = allowedTransitions[order.status] || [];
    if (!validNextStates.includes(targetStatus)) {
      throw new DispatchError(
        `Cannot transition order from '${order.status}' to '${targetStatus}'. Sequential transition required: rider_assigned -> arrived_pickup -> in_transit -> arrived_dropoff`,
        400,
        'INVALID_STATE_TRANSITION'
      );
    }

    order.status = targetStatus;

    if (stopSequenceNumber !== undefined) {
      const targetStop = order.stops.find((s) => s.sequenceNumber === stopSequenceNumber);
      if (targetStop && targetStatus === 'in_transit') {
        targetStop.status = 'en_route';
      }
    }

    await order.save();

    // Stage 16: Notify recipient when rider arrives at dropoff location
    if (targetStatus === 'arrived_dropoff') {
      try {
        const riderUser = await User.findById(riderUserId).select('fullName phone').lean();
        await notificationService.notifyRiderArrivedAtDropoff(
          order,
          stopSequenceNumber || 1,
          riderUser || undefined
        );
      } catch (err) {
        console.error('[NotificationService] Failed to notify rider arrival at dropoff:', err);
      }
    }

    // Broadcast tracking update to subscribers
    const trackingUpdate: TrackingUpdate = {
      trackingCode: order.trackingCode,
      riderId: riderUserId,
      lat: fromGeoJsonPoint(order.pickup.location as any).lat,
      lng: fromGeoJsonPoint(order.pickup.location as any).lng,
      bearing: 0,
      speed: 0,
      status: order.status,
      updatedAt: Date.now(),
    };

    try {
      emitToTrackingRoom(order.trackingCode, trackingUpdate);
      emitOrderStatusToCustomer(order.senderId.toString(), {
        orderId,
        status: order.status,
        trackingCode: order.trackingCode,
        riderId: riderUserId,
        stopSequenceNumber,
      });
    } catch {
      // Sockets may be inactive in unit test setups
    }

    return this.sanitizeOrderForRider(order);
  }

  // ==========================================
  // STAGE 15: ANTI-FRAUD PIN & DELIVERY ENGINE
  // ==========================================

  private getPinAttemptsKey(orderId: string, phaseOrStop: string): string {
    return `pin:attempts:${orderId}:${phaseOrStop}`;
  }

  private async checkPinLimit(orderId: string, phaseOrStop: string): Promise<void> {
    const redis = getRedisClient();
    const key = this.getPinAttemptsKey(orderId, phaseOrStop);
    const count = await redis.get(key);
    if (count && Number(count) >= 5) {
      throw new DispatchError(
        'Maximum 5 PIN verification attempts exceeded. Please contact dispatch support.',
        429,
        'PIN_ATTEMPTS_EXCEEDED'
      );
    }
  }

  private async incrementPinAttempts(orderId: string, phaseOrStop: string): Promise<void> {
    const redis = getRedisClient();
    const key = this.getPinAttemptsKey(orderId, phaseOrStop);
    const newCount = await redis.incr(key);
    if (newCount === 1) {
      await redis.expire(key, 900); // 15-minute TTL
    }
  }

  private async clearPinAttempts(orderId: string, phaseOrStop: string): Promise<void> {
    const redis = getRedisClient();
    const key = this.getPinAttemptsKey(orderId, phaseOrStop);
    await redis.del(key);
  }

  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  /**
   * Verifies the 4-digit pickup PIN provided by the sender at pickup location.
   * If mismatched 5 times, triggers 429 lockout in Redis.
   * On success, transitions order to in_transit and broadcasts real-time tracking update.
   */
  async verifyPickupPinAndStartTransit(
    riderUserId: string,
    orderId: string,
    pickupPin: string
  ): Promise<Record<string, any>> {
    await this.checkPinLimit(orderId, 'pickup');

    const order = await Order.findOne({
      _id: orderId,
      riderId: new mongoose.Types.ObjectId(riderUserId),
    });

    if (!order) {
      throw new DispatchError('Active order not found for this rider', 404, 'ORDER_NOT_FOUND');
    }

    if (!['arrived_pickup', 'rider_assigned'].includes(order.status)) {
      throw new DispatchError(
        `Cannot verify pickup PIN for order in status '${order.status}'. Rider must be at pickup location.`,
        400,
        'INVALID_STATE_FOR_PICKUP'
      );
    }

    if (!this.constantTimeCompare(order.pickup.pickupPin, pickupPin)) {
      await this.incrementPinAttempts(orderId, 'pickup');
      const redis = getRedisClient();
      const currentAttempts = await redis.get(this.getPinAttemptsKey(orderId, 'pickup'));
      if (currentAttempts && Number(currentAttempts) >= 5) {
        throw new DispatchError(
          'Maximum 5 PIN verification attempts exceeded. Please contact dispatch support.',
          429,
          'PIN_ATTEMPTS_EXCEEDED'
        );
      }
      throw new DispatchError(
        'Invalid 4-digit pickup PIN provided by sender',
        400,
        'INVALID_PICKUP_PIN'
      );
    }

    // PIN is valid: clear lockout attempt counter
    await this.clearPinAttempts(orderId, 'pickup');
    order.status = 'in_transit';

    // Mark first pending stop as en_route
    if (order.stops.length > 0 && order.stops[0]!.status === 'pending') {
      order.stops[0]!.status = 'en_route';
    }

    await order.save();

    // Stage 16: Dispatches secret delivery PINs to stop recipients upon pickup
    try {
      const [riderUser, riderProfile] = await Promise.all([
        User.findById(riderUserId).select('fullName phone').lean(),
        RiderProfile.findOne({ userId: riderUserId }).select('plateNumber').lean(),
      ]);
      await notificationService.notifyParcelInTransitToRecipients(
        order,
        riderUser || undefined,
        riderProfile || undefined
      );
    } catch (err) {
      console.error('[NotificationService] Failed to dispatch in-transit recipient PINs:', err);
    }

    // Broadcast tracking update
    const pickupLoc = fromGeoJsonPoint(order.pickup.location as any);
    const trackingUpdate: TrackingUpdate = {
      trackingCode: order.trackingCode,
      riderId: riderUserId,
      lat: pickupLoc.lat,
      lng: pickupLoc.lng,
      bearing: 0,
      speed: 0,
      status: 'in_transit',
      updatedAt: Date.now(),
    };

    try {
      emitToTrackingRoom(order.trackingCode, trackingUpdate);
      emitOrderStatusToCustomer(order.senderId.toString(), {
        orderId,
        status: 'in_transit',
        trackingCode: order.trackingCode,
        riderId: riderUserId,
      });
    } catch {
      // Sockets may be inactive in unit tests
    }

    return this.sanitizeOrderForRider(order);
  }

  /**
   * Verifies the 4-digit delivery PIN and client-compressed photo POD for a stop.
   * If all stops are delivered:
   * 1. Encodes accumulated GPS breadcrumbs into compact Google Polyline and archives to MongoDB (Golden Rule 5).
   * 2. Atomically releases wallet escrow to rider balance (Golden Rule 6).
   * 3. Returns rider to available pool in Redis RAM.
   */
  async verifyStopDeliveryPinAndComplete(
    riderUserId: string,
    params: {
      orderId: string;
      stopSequenceNumber: number;
      deliveryPin: string;
      proofOfDeliveryBase64OrUrl: string;
      byteSize?: number;
    }
  ): Promise<Record<string, any>> {
    // 1. Strict POD Image Size Guard (<300KB)
    if (params.byteSize && params.byteSize > 307200) {
      throw new DispatchError(
        'POD image must be compressed below 300KB (307,200 bytes) for 3G networks',
        400,
        'POD_IMAGE_TOO_LARGE'
      );
    }

    if (params.proofOfDeliveryBase64OrUrl.startsWith('data:')) {
      const base64Data = params.proofOfDeliveryBase64OrUrl.split(',')[1] || '';
      const approxBytes = Math.ceil((base64Data.length * 3) / 4);
      if (approxBytes > 307200) {
        throw new DispatchError(
          'POD image must be compressed below 300KB (307,200 bytes) for 3G networks',
          400,
          'POD_IMAGE_TOO_LARGE'
        );
      }
    }

    const phaseKey = `stop:${params.stopSequenceNumber}`;
    await this.checkPinLimit(params.orderId, phaseKey);

    const order = await Order.findOne({
      _id: params.orderId,
      riderId: new mongoose.Types.ObjectId(riderUserId),
    });

    if (!order) {
      throw new DispatchError('Active order not found for this rider', 404, 'ORDER_NOT_FOUND');
    }

    const targetStop = order.stops.find((s) => s.sequenceNumber === params.stopSequenceNumber);
    if (!targetStop) {
      throw new DispatchError(`Stop #${params.stopSequenceNumber} not found`, 404, 'STOP_NOT_FOUND');
    }

    if (targetStop.status === 'delivered') {
      throw new DispatchError(
        `Stop #${params.stopSequenceNumber} has already been marked as delivered`,
        400,
        'STOP_ALREADY_DELIVERED'
      );
    }

    // 2. PIN Validation with Lockout
    if (!this.constantTimeCompare(targetStop.deliveryPin, params.deliveryPin)) {
      await this.incrementPinAttempts(params.orderId, phaseKey);
      const redis = getRedisClient();
      const currentAttempts = await redis.get(this.getPinAttemptsKey(params.orderId, phaseKey));
      if (currentAttempts && Number(currentAttempts) >= 5) {
        throw new DispatchError(
          'Maximum 5 PIN verification attempts exceeded. Please contact dispatch support.',
          429,
          'PIN_ATTEMPTS_EXCEEDED'
        );
      }
      throw new DispatchError(
        'Invalid 4-digit delivery PIN provided by recipient',
        400,
        'INVALID_DELIVERY_PIN'
      );
    }

    // PIN is valid: clear lockout attempt counter
    await this.clearPinAttempts(params.orderId, phaseKey);

    targetStop.status = 'delivered';
    targetStop.deliveredAt = new Date();
    targetStop.proofOfDeliveryPhotoUrl = params.proofOfDeliveryBase64OrUrl;

    const remainingPendingStops = order.stops.filter((s) => s.status !== 'delivered');

    // CASE A: More stops remain pending in multi-stop trip
    if (remainingPendingStops.length > 0) {
      order.status = 'in_transit';
      remainingPendingStops[0]!.status = 'en_route';
      await order.save();

      const stopLoc = fromGeoJsonPoint(targetStop.dropoffLocation as any);
      try {
        emitToTrackingRoom(order.trackingCode, {
          trackingCode: order.trackingCode,
          riderId: riderUserId,
          lat: stopLoc.lat,
          lng: stopLoc.lng,
          bearing: 0,
          speed: 0,
          status: 'in_transit',
          updatedAt: Date.now(),
        });
        emitOrderStatusToCustomer(order.senderId.toString(), {
          orderId: params.orderId,
          status: 'in_transit',
          trackingCode: order.trackingCode,
          riderId: riderUserId,
          completedStopSequence: params.stopSequenceNumber,
        });
      } catch {
        // Sockets inactive in test runners
      }

      return this.sanitizeOrderForRider(order);
    }

    // CASE B: ALL STOPS DELIVERED (FINAL STOP COMPLETION)

    // 1. Deferred Route Polyline Archival (Golden Rule 5)
    const breadcrumbs = await telemetryService.getOrderRouteBreadcrumbs(order._id.toString());
    if (breadcrumbs.length > 0) {
      order.encodedRoutePolyline = encodeGooglePolyline(
        breadcrumbs.map((b) => ({ lat: b.lat, lng: b.lng }))
      );
    }
    order.status = 'delivered';
    await order.save();

    // Stage 16: Final Delivery Confirmation & Receipt Alert to Sender
    try {
      await notificationService.notifyOrderDeliveredReceipt(order);
    } catch (err) {
      console.error('[NotificationService] Failed to dispatch order delivered receipt:', err);
    }

    // 2. Atomic Wallet Escrow Settlement / COD Accounting (Golden Rule 6)
    if (order.paymentMethod === 'wallet' || order.paymentMethod === 'card_bank') {
      if (order.paymentStatus === 'paid') {
        await walletService.releaseOrderEscrowToRider({ orderId: order._id.toString() });
      }
    } else if (order.paymentMethod === 'pay_on_pickup' || order.paymentMethod === 'pay_on_delivery') {
      order.paymentStatus = 'paid';
      await order.save();
    }

    // 3. Rider Return to Available Pool
    const finalStop = order.stops[order.stops.length - 1]!;
    const finalLoc = fromGeoJsonPoint(finalStop.dropoffLocation as any);

    await RiderProfile.findOneAndUpdate(
      { userId: order.riderId },
      {
        status: 'available',
        lastLocation: finalStop.dropoffLocation,
        lastSeenAt: new Date(),
      }
    );

    const redis = getRedisClient();
    // Golden Rule 4: [lng, lat]
    await redis.geoadd(
      'riders:available:locations',
      finalLoc.lng,
      finalLoc.lat,
      riderUserId
    );

    // Clean up temporary order Redis keys
    await redis.del(`order:route_points:${order._id}`);
    await redis.del(`dispatch:declined:${order._id}`);
    await redis.del(`dispatch:offers:${order._id}`);
    await redis.del(`lock:order:${order._id}`);
    await redis.del(`pin:attempts:${order._id}:pickup`);
    for (const s of order.stops) {
      await redis.del(`pin:attempts:${order._id}:stop:${s.sequenceNumber}`);
    }

    // 4. Final Tracking Broadcast
    try {
      emitToTrackingRoom(order.trackingCode, {
        trackingCode: order.trackingCode,
        riderId: riderUserId,
        lat: finalLoc.lat,
        lng: finalLoc.lng,
        bearing: 0,
        speed: 0,
        status: 'delivered',
        updatedAt: Date.now(),
      });
      emitOrderStatusToCustomer(order.senderId.toString(), {
        orderId: params.orderId,
        status: 'delivered',
        trackingCode: order.trackingCode,
        riderId: riderUserId,
      });
    } catch {
      // Sockets inactive in test runners
    }

    return this.sanitizeOrderForRider(order);
  }
}

let dispatchServiceInstance: DispatchService | null = null;

export function getDispatchService(): DispatchService {
  if (!dispatchServiceInstance) {
    dispatchServiceInstance = new DispatchService();
  }
  return dispatchServiceInstance;
}

export const dispatchService = getDispatchService();

