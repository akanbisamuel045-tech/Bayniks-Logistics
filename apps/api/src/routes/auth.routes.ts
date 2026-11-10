import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { User, Wallet } from '../models';
import { authService } from '../services/auth.service';
import { otpService } from '../services/otp.service';
import { requireAuth, requireRoles } from '../middleware/auth.middleware';
import { createRedisRateLimiter } from '../middleware/rateLimiter.middleware';
import {
  normalizeNigerianPhone,
  UserRoleSchema,
  type UserRole,
} from '@logistics/shared-types';

export const authRouter = Router();

/**
 * POST /api/v1/auth/register
 * Self-registers customer, vendor, rider, or fleet_owner with Nigerian phone normalization.
 * Atomically creates User + initial Wallet document in a MongoDB ACID transaction.
 */
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fullName, phone, email, password, role } = req.body;

    if (!fullName || !phone || !password || !role) {
      res.status(400).json({ error: 'fullName, phone, password, and role are required' });
      return;
    }

    // Prevent privilege escalation: Admin cannot be self-registered
    if (role === 'admin') {
      res.status(403).json({
        error: 'Privilege escalation rejected: Admin accounts cannot be self-registered via public API',
      });
      return;
    }

    if (!UserRoleSchema.options.includes(role)) {
      res.status(400).json({ error: `Invalid role. Allowed roles: ${UserRoleSchema.options.join(', ')}` });
      return;
    }

    // Normalize phone number to strict E.164 (+234...)
    let normalizedPhone: string;
    try {
      normalizedPhone = normalizeNigerianPhone(phone);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
      return;
    }

    // Check for existing user with normalized phone
    const existing = await User.findOne({ phone: normalizedPhone });
    if (existing) {
      res.status(409).json({ error: 'A user with this phone number already exists' });
      return;
    }

    const passwordHash = await authService.hashPassword(password);

    // MongoDB ACID Multi-Document Transaction: User + Wallet
    const session = await mongoose.startSession();
    let createdUser: any;

    try {
      await session.withTransaction(async () => {
        const [user] = await User.create(
          [
            {
              role,
              fullName,
              phone: normalizedPhone,
              email: email || undefined,
              passwordHash,
              isVerified: false,
            },
          ],
          { session }
        );
        createdUser = user;

        // Initialize user wallet with 0 Kobo balance
        await Wallet.create(
          [
            {
              userId: user!._id,
              balanceKobo: 0,
              escrowLockedKobo: 0,
            },
          ],
          { session }
        );
      });
    } finally {
      await session.endSession();
    }

    // Trigger initial 6-digit OTP to normalized phone
    await otpService.generateAndSaveOtp(normalizedPhone);

    res.status(201).json({
      message: 'User registered successfully. Please verify your phone with the 6-digit OTP sent.',
      user: {
        id: createdUser._id,
        fullName: createdUser.fullName,
        phone: createdUser.phone,
        role: createdUser.role,
        isVerified: createdUser.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/auth/request-otp
 * Generates and dispatches a new 6-digit OTP to a normalized Nigerian phone number.
 * Rate-limited via Redis sliding window to prevent SMS bombing.
 */
authRouter.post(
  '/request-otp',
  createRedisRateLimiter({ windowSeconds: 60, maxRequests: 5, keyPrefix: 'otp-req' }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { phone } = req.body;
      if (!phone) {
        res.status(400).json({ error: 'phone is required' });
        return;
      }

      let normalizedPhone: string;
      try {
        normalizedPhone = normalizeNigerianPhone(phone);
      } catch (err: any) {
        res.status(400).json({ error: err.message });
        return;
      }

      const user = await User.findOne({ phone: normalizedPhone });
      if (!user) {
        res.status(404).json({ error: 'No account registered with this phone number' });
        return;
      }

      await otpService.generateAndSaveOtp(normalizedPhone);
      res.status(200).json({
        message: 'Verification code sent successfully',
        phone: normalizedPhone,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/auth/verify-otp
 * Verifies 6-digit OTP against Redis, marks user as verified, and issues tokens.
 */
authRouter.post('/verify-otp', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      res.status(400).json({ error: 'phone and otp are required' });
      return;
    }

    let normalizedPhone: string;
    try {
      normalizedPhone = normalizeNigerianPhone(phone);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
      return;
    }

    const isValid = await otpService.verifyOtp(normalizedPhone, String(otp));
    if (!isValid) {
      res.status(400).json({ error: 'Invalid or expired verification code' });
      return;
    }

    const user = await User.findOneAndUpdate(
      { phone: normalizedPhone },
      { isVerified: true },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const tokens = await authService.createTokens({
      id: user._id.toString(),
      role: user.role,
      phone: user.phone,
      isVerified: true,
    });

    res.status(200).json({
      message: 'Phone number verified successfully',
      ...tokens,
      user: {
        id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        isVerified: true,
      },
    });
  } catch (error: any) {
    if (error.statusCode) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    next(error);
  }
});

/**
 * POST /api/v1/auth/login
 * Validates credentials and returns JWT access and refresh tokens.
 */
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      res.status(400).json({ error: 'phone and password are required' });
      return;
    }

    let normalizedPhone: string;
    try {
      normalizedPhone = normalizeNigerianPhone(phone);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
      return;
    }

    const user = await User.findOne({ phone: normalizedPhone });
    if (!user) {
      res.status(401).json({ error: 'Invalid phone or password' });
      return;
    }

    const isMatch = await authService.comparePassword(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid phone or password' });
      return;
    }

    const tokens = await authService.createTokens({
      id: user._id.toString(),
      role: user.role,
      phone: user.phone,
      isVerified: user.isVerified,
    });

    res.status(200).json({
      ...tokens,
      user: {
        id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/auth/refresh
 * Rotates refresh token in Redis and issues fresh tokens.
 */
authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: 'refreshToken is required' });
      return;
    }

    const result = await authService.refreshTokens(refreshToken);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(error.statusCode || 401).json({ error: error.message || 'Token refresh failed' });
  }
});

/**
 * POST /api/v1/auth/logout
 * Revokes refresh token in Redis.
 */
authRouter.post('/logout', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await authService.revokeRefreshToken(refreshToken);
    }
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/auth/me
 * Returns authenticated user details and wallet.
 */
authRouter.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user!.id).select('-passwordHash');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const wallet = await Wallet.findOne({ userId: user._id });

    res.status(200).json({
      user,
      wallet,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Role Probes for RBAC Verification
 */
authRouter.get(
  '/probe/rider',
  requireAuth,
  requireRoles('rider'),
  (req: Request, res: Response): void => {
    res.status(200).json({
      message: 'Access granted: Dispatch Rider area',
      userId: req.user!.id,
      role: req.user!.role,
    });
  }
);

authRouter.get(
  '/probe/admin',
  requireAuth,
  requireRoles('admin'),
  (req: Request, res: Response): void => {
    res.status(200).json({
      message: 'Access granted: Super Admin command center',
      userId: req.user!.id,
      role: req.user!.role,
    });
  }
);

