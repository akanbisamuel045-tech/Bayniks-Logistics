import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { getRedisClient } from '../config/redis';
import type { UserRole } from '@logistics/shared-types';

dotenv.config();

export const JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_logistics_ng_2026';
export const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_logistics_ng_2026';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface AuthUserPayload {
  id: string;
  role: UserRole;
  phone: string;
  isVerified: boolean;
}

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  phone: string;
  isVerified: boolean;
}

export interface RefreshTokenPayload extends AccessTokenPayload {
  jti: string;
}

export class AuthService {
  /**
   * Hashes a plaintext password using bcrypt with salt.
   */
  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Compares candidate password against stored bcrypt hash.
   */
  async comparePassword(candidate: string, hash: string): Promise<boolean> {
    return bcrypt.compare(candidate, hash);
  }

  /**
   * Generates Access Token (15m) and Redis-backed Refresh Token (7d).
   */
  async createTokens(user: AuthUserPayload): Promise<{ accessToken: string; refreshToken: string }> {
    const redis = getRedisClient();
    const jti = crypto.randomUUID();

    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      role: user.role,
      phone: user.phone,
      isVerified: user.isVerified,
    };

    const accessToken = jwt.sign(accessPayload, JWT_ACCESS_SECRET, {
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });

    const refreshPayload: RefreshTokenPayload = {
      ...accessPayload,
      jti,
    };

    const refreshToken = jwt.sign(refreshPayload, JWT_REFRESH_SECRET, {
      expiresIn: REFRESH_TOKEN_TTL_SECONDS,
    });

    // Store active refresh token in Redis with 7-day TTL for revocation tracking
    const redisKey = `auth:refresh:${user.id}:${jti}`;
    await redis.set(redisKey, 'active', 'EX', REFRESH_TOKEN_TTL_SECONDS);

    return { accessToken, refreshToken };
  }

  /**
   * Verifies an access token and returns typed payload.
   */
  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      return jwt.verify(token, JWT_ACCESS_SECRET) as AccessTokenPayload;
    } catch {
      const error: any = new Error('Invalid or expired access token');
      error.statusCode = 401;
      throw error;
    }
  }

  /**
   * Rotates a refresh token: invalidates the old token in Redis and issues a fresh pair.
   */
  async refreshTokens(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string; user: AuthUserPayload }> {
    const redis = getRedisClient();

    let decoded: RefreshTokenPayload;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as RefreshTokenPayload;
    } catch {
      const error: any = new Error('Invalid or expired refresh token');
      error.statusCode = 401;
      throw error;
    }

    const { sub: userId, jti, role, phone, isVerified } = decoded;
    const oldRedisKey = `auth:refresh:${userId}:${jti}`;

    // Verify token has not been revoked
    const exists = await redis.get(oldRedisKey);
    if (!exists) {
      const error: any = new Error('Refresh token has been revoked or expired');
      error.statusCode = 401;
      throw error;
    }

    // Revoke old token
    await redis.del(oldRedisKey);

    const user: AuthUserPayload = { id: userId, role, phone, isVerified };
    const tokens = await this.createTokens(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user,
    };
  }

  /**
   * Revokes a refresh token in Redis upon logout.
   */
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as RefreshTokenPayload;
      const redis = getRedisClient();
      await redis.del(`auth:refresh:${decoded.sub}:${decoded.jti}`);
    } catch {
      // If token is already invalid, no-op
    }
  }
}

export const authService = new AuthService();

