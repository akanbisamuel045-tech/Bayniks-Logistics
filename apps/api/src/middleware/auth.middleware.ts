import { Request, Response, NextFunction } from 'express';
import { authService, AuthUserPayload } from '../services/auth.service';
import type { UserRole } from '@logistics/shared-types';

// Augment Express Request interface with typed user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

/**
 * Middleware: Validates Bearer access token and attaches req.user.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Bearer token not provided' });
    return;
  }

  try {
    const payload = authService.verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      phone: payload.phone,
      isVerified: payload.isVerified,
    };
    next();
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Invalid or expired access token' });
  }
}

/**
 * Middleware: Requires phone number to be OTP verified.
 */
export function requireVerified(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!req.user.isVerified) {
    res.status(403).json({
      error: 'Account phone number is not verified. Please complete OTP verification.',
      code: 'PHONE_NOT_VERIFIED',
    });
    return;
  }

  next();
}

/**
 * Middleware: Enforces Role-Based Access Control (RBAC).
 */
export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: Requires one of roles: [${allowedRoles.join(', ')}]`,
        code: 'INSUFFICIENT_PERMISSIONS',
      });
      return;
    }

    next();
  };
}

