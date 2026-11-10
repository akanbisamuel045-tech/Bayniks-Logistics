import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import {
  CreateOrderRequestSchema,
  TrackingCodeSchema,
  toGeoJsonPoint,
  fromGeoJsonPoint,
  OrderStatus,
  PaymentStatus,
} from '@logistics/shared-types';
import { Order, User, RiderProfile } from '../models';
import { requireAuth, requireVerified, requireRoles } from '../middleware/auth.middleware';
import { getPricingService } from '../services/pricing.service';
import { telemetryService } from '../services/telemetry.service';
import { dispatchService } from '../services/dispatch.service';
import { notificationService } from '../services/notification.service';
import { createRedisRateLimiter } from '../middleware/rateLimiter.middleware';
import { getNotificationsForOrder } from '../providers/termii.provider';

export const orderRouter = Router();

/**
 * Generates unique tracking code in format LGS-XXXXXX.
 */
async function generateUniqueTrackingCode(): Promise<string> {
  for (let attempts = 0; attempts < 10; attempts++) {
    const codeNumber = crypto.randomInt(100000, 999999);
    const code = `LGS-${codeNumber}`;
    const exists = await Order.exists({ trackingCode: code });
    if (!exists) {
      return code;
    }
  }
  return `LGS-${Date.now().toString().slice(-6)}`;
}

/**
 * Generates cryptographically random 4-digit PIN string (e.g. "4921").
 */
function generate4DigitPin(): string {
  return crypto.randomInt(1000, 10000).toString();
}

/**
 * POST /api/v1/orders
 * Protected: Customer, Vendor, or Admin.
 * Creates a new single or multi-stop order with server-computed authoritative pricing.
 */
orderRouter.post(
  '/',
  requireAuth,
  requireVerified,
  requireRoles('customer', 'vendor', 'admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = CreateOrderRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
        return;
      }

      const { vehicleType, paymentMethod, pickup, stops } = parsed.data;

      // 1. Authoritative Server-Side Pricing & Route Calculation
      const pricingService = getPricingService();
      const pricingEstimate = await pricingService.calculateEstimate({
        vehicleType,
        pickup: {
          address: pickup.address,
          landmark: pickup.landmark,
          location: pickup.location,
        },
        stops: stops.map((s) => ({
          address: s.dropoffAddress,
          landmark: s.dropoffLandmark,
          location: s.dropoffLocation,
        })),
      });

      // 2. Generate Tracking Code & PINs
      const trackingCode = await generateUniqueTrackingCode();
      const pickupPin = generate4DigitPin();

      // 3. Status determination based on payment method
      const isPayOnDeliveryOrPickup =
        paymentMethod === 'pay_on_pickup' || paymentMethod === 'pay_on_delivery';

      const initialStatus: OrderStatus = isPayOnDeliveryOrPickup
        ? 'searching_rider'
        : 'pending';
      const initialPaymentStatus: PaymentStatus = 'unpaid';

      // 4. Create Order document with strict GeoJSON [lng, lat] coordinate ordering (Golden Rule 4)
      const order = new Order({
        trackingCode,
        senderId: req.user!.id,
        vehicleType,
        paymentMethod,
        paymentStatus: initialPaymentStatus,
        status: initialStatus,
        estimatedDistanceKm: pricingEstimate.estimatedDistanceKm,
        totalFareKobo: pricingEstimate.totalFareKobo,
        platformCommissionKobo: pricingEstimate.platformCommissionKobo,
        riderEarningKobo: pricingEstimate.riderEarningKobo,
        pickup: {
          address: pickup.address,
          landmark: pickup.landmark,
          location: toGeoJsonPoint(pickup.location), // [lng, lat]
          contactName: pickup.contactName,
          contactPhone: pickup.contactPhone,
          pickupPin,
        },
        stops: stops.map((stop, index) => ({
          sequenceNumber: index + 1,
          recipientName: stop.recipientName,
          recipientPhone: stop.recipientPhone,
          dropoffAddress: stop.dropoffAddress,
          dropoffLandmark: stop.dropoffLandmark,
          dropoffLocation: toGeoJsonPoint(stop.dropoffLocation), // [lng, lat]
          packageDescription: stop.packageDescription,
          deliveryPin: generate4DigitPin(),
          status: 'pending',
        })),
        encodedRoutePolyline: pricingEstimate.encodedPolyline,
      });

      await order.save();

      // Automatically trigger nearest-rider dispatch if order is searching for rider
      if (order.status === 'searching_rider') {
        dispatchService.dispatchOrderToNearestRiders(order._id.toString()).catch(() => {});
      }

      // Dispatches transactional creation alert with Pickup PIN to sender (SMS DND & WhatsApp)
      try {
        await notificationService.notifyOrderCreatedToSender(order);
      } catch (err) {
        console.error('[NotificationService] Failed to send order creation alert:', err);
      }

      // Return created order details including PINs for the sender
      res.status(201).json({
        message: 'Order created successfully',
        order: {
          _id: order._id,
          trackingCode: order.trackingCode,
          status: order.status,
          vehicleType: order.vehicleType,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          estimatedDistanceKm: order.estimatedDistanceKm,
          totalFareKobo: order.totalFareKobo,
          platformCommissionKobo: order.platformCommissionKobo,
          riderEarningKobo: order.riderEarningKobo,
          pickup: {
            address: order.pickup.address,
            landmark: order.pickup.landmark,
            location: fromGeoJsonPoint(order.pickup.location as any),
            contactName: order.pickup.contactName,
            contactPhone: order.pickup.contactPhone,
            pickupPin: order.pickup.pickupPin,
          },
          stops: order.stops.map((s) => ({
            _id: s._id,
            sequenceNumber: s.sequenceNumber,
            recipientName: s.recipientName,
            recipientPhone: s.recipientPhone,
            dropoffAddress: s.dropoffAddress,
            dropoffLandmark: s.dropoffLandmark,
            dropoffLocation: fromGeoJsonPoint(s.dropoffLocation as any),
            packageDescription: s.packageDescription,
            deliveryPin: s.deliveryPin,
            status: s.status,
          })),
          encodedRoutePolyline: order.encodedRoutePolyline,
          createdAt: order.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/orders/track/:trackingCode
 * Public tracking endpoint: Sanitizes response by redacting pickupPin and deliveryPins.
 */
orderRouter.get(
  '/track/:trackingCode',
  createRedisRateLimiter({ windowSeconds: 60, maxRequests: 60, keyPrefix: 'track' }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedCode = TrackingCodeSchema.safeParse(req.params.trackingCode?.toUpperCase());
      if (!parsedCode.success) {
        res.status(400).json({
          error: 'Invalid tracking code format',
          code: 'INVALID_TRACKING_CODE',
        });
        return;
      }

      const order = await Order.findOne({ trackingCode: parsedCode.data }).lean();
      if (!order) {
        res.status(404).json({
          error: 'Order not found',
          code: 'ORDER_NOT_FOUND',
        });
        return;
      }

      // Check if rider is assigned and retrieve profile & live telemetry
      let assignedRider:
        | {
            fullName: string;
            phone: string;
            vehicleType: any;
            plateNumber: string;
            rating: number;
          }
        | undefined;

      let liveTelemetry:
        | { lat: number; lng: number; bearing: number; speed: number; updatedAt: number }
        | undefined;

      if (order.riderId) {
        const [riderUser, riderProfile, live] = await Promise.all([
          User.findById(order.riderId).lean(),
          RiderProfile.findOne({ userId: order.riderId }).lean(),
          telemetryService.getRiderLiveTelemetry(order.riderId.toString()),
        ]);

        if (riderUser) {
          assignedRider = {
            fullName: riderUser.fullName,
            phone: riderUser.phone,
            vehicleType: (riderProfile?.vehicleType as any) || order.vehicleType,
            plateNumber: riderProfile?.plateNumber || 'LAG-RIDER',
            rating: riderProfile?.rating || 4.9,
          };
        }

        if (live) {
          liveTelemetry = {
            lat: live.lat,
            lng: live.lng,
            bearing: live.bearing,
            speed: live.speed,
            updatedAt: live.updatedAt,
          };
        } else if (riderProfile?.lastLocation) {
          const loc = fromGeoJsonPoint(riderProfile.lastLocation as any);
          liveTelemetry = {
            lat: loc.lat,
            lng: loc.lng,
            bearing: 0,
            speed: 0,
            updatedAt: riderProfile.lastSeenAt ? new Date(riderProfile.lastSeenAt).getTime() : Date.now(),
          };
        }
      }

      // Sanitize: Redact pickupPin and deliveryPins
      const sanitizedTracking = {
        trackingCode: order.trackingCode,
        status: order.status,
        vehicleType: order.vehicleType,
        estimatedDistanceKm: order.estimatedDistanceKm,
        totalFareKobo: order.totalFareKobo,
        riderId: order.riderId ? order.riderId.toString() : undefined,
        assignedRider,
        liveTelemetry,
        pickup: {
          address: order.pickup.address,
          landmark: order.pickup.landmark,
          location: fromGeoJsonPoint(order.pickup.location as any),
          contactName: order.pickup.contactName,
        },
        stops: order.stops.map((s: any) => ({
          _id: s._id,
          sequenceNumber: s.sequenceNumber,
          recipientName: s.recipientName,
          dropoffAddress: s.dropoffAddress,
          dropoffLandmark: s.dropoffLandmark,
          dropoffLocation: fromGeoJsonPoint(s.dropoffLocation as any),
          packageDescription: s.packageDescription,
          status: s.status,
          deliveredAt: s.deliveredAt,
        })),
        encodedRoutePolyline: order.encodedRoutePolyline,
        createdAt: order.createdAt,
      };

      res.status(200).json(sanitizedTracking);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/orders/track/:trackingCode/notifications
 * Returns list of mock or logged transactional notifications dispatched for this order.
 */
orderRouter.get(
  '/track/:trackingCode/notifications',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedCode = TrackingCodeSchema.safeParse(req.params.trackingCode?.toUpperCase());
      if (!parsedCode.success) {
        res.status(400).json({
          error: 'Invalid tracking code format',
          code: 'INVALID_TRACKING_CODE',
        });
        return;
      }

      const notifications = getNotificationsForOrder(parsedCode.data);
      res.status(200).json({
        ok: true,
        trackingCode: parsedCode.data,
        notifications,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/orders/my-orders
 * Protected: Returns list of orders created by the authenticated user with complete PINs.
 */
orderRouter.get(
  '/my-orders',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orders = await Order.find({ senderId: req.user!.id })
        .sort({ createdAt: -1 })
        .lean();

      const formattedOrders = orders.map((order: any) => ({
        _id: order._id,
        trackingCode: order.trackingCode,
        status: order.status,
        vehicleType: order.vehicleType,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        estimatedDistanceKm: order.estimatedDistanceKm,
        totalFareKobo: order.totalFareKobo,
        platformCommissionKobo: order.platformCommissionKobo,
        riderEarningKobo: order.riderEarningKobo,
        pickup: {
          address: order.pickup.address,
          landmark: order.pickup.landmark,
          location: fromGeoJsonPoint(order.pickup.location as any),
          contactName: order.pickup.contactName,
          contactPhone: order.pickup.contactPhone,
          pickupPin: order.pickup.pickupPin,
        },
        stops: order.stops.map((s: any) => ({
          _id: s._id,
          sequenceNumber: s.sequenceNumber,
          recipientName: s.recipientName,
          recipientPhone: s.recipientPhone,
          dropoffAddress: s.dropoffAddress,
          dropoffLandmark: s.dropoffLandmark,
          dropoffLocation: fromGeoJsonPoint(s.dropoffLocation as any),
          packageDescription: s.packageDescription,
          deliveryPin: s.deliveryPin,
          status: s.status,
          deliveredAt: s.deliveredAt,
        })),
        encodedRoutePolyline: order.encodedRoutePolyline,
        createdAt: order.createdAt,
      }));

      res.status(200).json({ orders: formattedOrders });
    } catch (error) {
      next(error);
    }
  }
);

