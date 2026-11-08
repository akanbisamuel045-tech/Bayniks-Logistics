import { Router, Request, Response, NextFunction } from 'express';
import {
  DispatchOfferRespondSchema,
  OrderStatusTransitionSchema,
  VerifyPickupPinRequestSchema,
  VerifyStopDeliveryRequestSchema,
} from '@logistics/shared-types';
import { requireAuth, requireVerified, requireRoles } from '../middleware/auth.middleware';
import { dispatchService } from '../services/dispatch.service';
import { Order } from '../models';

export const dispatchRouter = Router();

/**
 * GET /api/v1/dispatch/active-order
 * Retrieves the currently active order for the authenticated dispatch rider.
 * Protected: Rider role required.
 */
dispatchRouter.get(
  '/active-order',
  requireAuth,
  requireRoles('rider'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const riderUserId = req.user!.id;
      const activeOrder = await dispatchService.getActiveOrderByRider(riderUserId);
      res.status(200).json({
        ok: true,
        order: activeOrder,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/v1/dispatch/orders/:orderId/state
 * Advances the active order lifecycle state.
 * Protected: Verified rider required.
 */
dispatchRouter.patch(
  '/orders/:orderId/state',
  requireAuth,
  requireVerified,
  requireRoles('rider'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orderId } = req.params;
      const parsed = OrderStatusTransitionSchema.safeParse({
        ...req.body,
        orderId: req.body?.orderId || orderId,
      });

      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
        return;
      }

      const riderUserId = req.user!.id;
      const { status, stopSequenceNumber } = parsed.data;

      const updatedOrder = await dispatchService.transitionOrderState(
        riderUserId,
        orderId!,
        status,
        stopSequenceNumber
      );

      res.status(200).json({
        ok: true,
        order: updatedOrder,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/dispatch/orders/:orderId/verify-pickup
 * Verifies the 4-digit pickup PIN supplied by the sender and advances trip to in_transit.
 * Protected: Verified rider required.
 */
dispatchRouter.post(
  '/orders/:orderId/verify-pickup',
  requireAuth,
  requireVerified,
  requireRoles('rider'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orderId } = req.params;
      const parsed = VerifyPickupPinRequestSchema.safeParse({
        ...req.body,
        orderId: req.body?.orderId || orderId,
      });

      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
        return;
      }

      const riderUserId = req.user!.id;
      const updatedOrder = await dispatchService.verifyPickupPinAndStartTransit(
        riderUserId,
        orderId!,
        parsed.data.pickupPin
      );

      res.status(200).json({
        ok: true,
        order: updatedOrder,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/dispatch/orders/:orderId/verify-delivery
 * Verifies the 4-digit delivery PIN and client-compressed photo POD for a stop.
 * Protected: Verified rider required.
 */
dispatchRouter.post(
  '/orders/:orderId/verify-delivery',
  requireAuth,
  requireVerified,
  requireRoles('rider'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orderId } = req.params;
      const parsed = VerifyStopDeliveryRequestSchema.safeParse({
        ...req.body,
        orderId: req.body?.orderId || orderId,
      });

      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
        return;
      }

      const riderUserId = req.user!.id;
      const updatedOrder = await dispatchService.verifyStopDeliveryPinAndComplete(
        riderUserId,
        {
          orderId: orderId!,
          stopSequenceNumber: parsed.data.stopSequenceNumber,
          deliveryPin: parsed.data.deliveryPin,
          proofOfDeliveryBase64OrUrl: parsed.data.proofOfDeliveryBase64OrUrl,
          byteSize: parsed.data.byteSize,
        }
      );

      res.status(200).json({
        ok: true,
        order: updatedOrder,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/dispatch/trigger/:orderId
 * Manually triggers or re-triggers nearest-rider geospatial dispatch for an order.
 */
dispatchRouter.post(
  '/trigger/:orderId',
  requireAuth,
  requireVerified,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orderId } = req.params;
      const order = await Order.findById(orderId);
      if (!order) {
        res.status(404).json({ error: 'Order not found', code: 'ORDER_NOT_FOUND' });
        return;
      }

      // Check ownership or admin privileges
      const isOwner = order.senderId.toString() === req.user!.id;
      const isPrivileged = ['admin', 'vendor', 'fleet_owner'].includes(req.user!.role);
      if (!isOwner && !isPrivileged) {
        res.status(403).json({ error: 'Unauthorized to dispatch this order', code: 'FORBIDDEN' });
        return;
      }

      const matchResult = await dispatchService.dispatchOrderToNearestRiders(orderId!);
      res.status(200).json({
        ok: true,
        result: matchResult,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/dispatch/respond
 * Rider responds to a job offer (accept or decline).
 * Protected: Rider role required.
 */
dispatchRouter.post(
  '/respond',
  requireAuth,
  requireVerified,
  requireRoles('rider'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = DispatchOfferRespondSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
        return;
      }

      const riderUserId = req.user!.id;
      const { orderId, action } = parsed.data;

      if (action === 'accept') {
        const sanitizedOrder = await dispatchService.acceptOrderOffer(riderUserId, orderId);
        res.status(200).json({
          ok: true,
          action: 'accept',
          order: sanitizedOrder,
        });
      } else {
        const declineResult = await dispatchService.declineOrderOffer(riderUserId, orderId);
        res.status(200).json({
          action: 'decline',
          ...declineResult,
        });
      }
    } catch (error) {
      next(error);
    }
  }
);
