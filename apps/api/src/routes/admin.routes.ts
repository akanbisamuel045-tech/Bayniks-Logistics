import { Router, Request, Response, NextFunction } from 'express';
import {
  AdminReassignOrderRequestSchema,
  AdminReviewKycRequestSchema,
} from '@logistics/shared-types';
import { requireAuth, requireRoles } from '../middleware/auth.middleware';
import { adminService, AdminOperationError } from '../services/admin.service';
import { RiderProfile } from '../models';

export const adminRouter = Router();

/**
 * GET /api/v1/admin/fleet/live
 * Protected: Super-Admin & Fleet Owners.
 * God's Eye real-time fleet snapshot. Scoped to fleetOwnerId for fleet owners,
 * unconstrained for Super-Admins.
 */
adminRouter.get(
  '/fleet/live',
  requireAuth,
  requireRoles('admin', 'fleet_owner'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await adminService.getGodsEyeFleetSnapshot({
        userId: req.user!.id,
        role: req.user!.role,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/orders/:orderId/reassign
 * Protected: Super-Admin only.
 * Performs atomic emergency mid-trip motorcycle order reassignment.
 */
adminRouter.post(
  '/orders/:orderId/reassign',
  requireAuth,
  requireRoles('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = AdminReassignOrderRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
        return;
      }

      const { orderId } = req.params;
      const { newRiderUserId, reason } = parsed.data;

      const result = await adminService.reassignActiveOrder({
        orderId: orderId!,
        newRiderUserId,
        reason,
        adminUserId: req.user!.id,
      });

      res.status(200).json({
        message: 'Order successfully reassigned to new rider',
        order: result.order,
        previousRiderId: result.previousRiderId,
        newRiderId: result.newRiderId,
      });
    } catch (err) {
      if (err instanceof AdminOperationError) {
        res.status(err.statusCode).json({
          error: err.message,
          code: err.code,
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/kyc/pending
 * Protected: Super-Admin only.
 * Lists all pending rider KYC applications.
 */
adminRouter.get(
  '/kyc/pending',
  requireAuth,
  requireRoles('admin'),
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const queue = await adminService.getPendingKycQueue();
      res.json({
        pendingCount: queue.length,
        riders: queue,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/admin/kyc/:riderProfileId
 * Protected: Super-Admin only.
 * 1-click KYC approval or rejection by Rider Profile ID.
 */
adminRouter.patch(
  '/kyc/:riderProfileId',
  requireAuth,
  requireRoles('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = AdminReviewKycRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
        return;
      }

      const { riderProfileId } = req.params;
      const { decision, rejectionReason } = parsed.data;

      const profile = await adminService.reviewRiderKyc({
        riderProfileId: riderProfileId!,
        decision,
        rejectionReason,
      });

      res.status(200).json({
        message: `Rider KYC status updated to '${profile.kycStatus}'`,
        profile,
      });
    } catch (err) {
      if (err instanceof AdminOperationError) {
        res.status(err.statusCode).json({
          error: err.message,
          code: err.code,
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/admin/riders/:riderUserId/kyc
 * Protected: Super-Admin only (Legacy/alternative route by rider user ID).
 */
adminRouter.patch(
  '/riders/:riderUserId/kyc',
  requireAuth,
  requireRoles('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { riderUserId } = req.params;
      const profile = await RiderProfile.findOne({ userId: riderUserId });
      if (!profile) {
        res.status(404).json({ error: 'Rider profile not found' });
        return;
      }

      const action = req.body.action || (req.body.decision === 'approved' ? 'approve' : 'reject');
      const decision = action === 'approve' ? 'approved' : 'rejected';
      const rejectionReason = req.body.reason || req.body.rejectionReason;

      const updated = await adminService.reviewRiderKyc({
        riderProfileId: profile._id.toString(),
        decision,
        rejectionReason,
      });

      res.status(200).json({
        message: `Rider KYC status updated to '${updated.kycStatus}'`,
        profile: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

