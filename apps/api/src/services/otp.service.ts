import crypto from 'crypto';
import { getRedisClient } from '../config/redis';
import { termiiProvider, mockSentOtps } from '../providers/termii.provider';
import { normalizeNigerianPhone } from '@logistics/shared-types';

export const OTP_TTL_SECONDS = 300; // 5 minutes
export const MAX_OTP_ATTEMPTS = 5;

export class OtpService {
  /**
   * Hashes an OTP using SHA-256 for secure Redis storage.
   */
  private hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  /**
   * Generates a 6-digit numeric OTP, saves it in Redis, and dispatches via Termii.
   */
  async generateAndSaveOtp(phone: string): Promise<string> {
    const normalizedPhone = normalizeNigerianPhone(phone);
    const redis = getRedisClient();

    // Generate secure 6-digit OTP (100000 - 999999)
    const otp = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = this.hashOtp(otp);

    const otpKey = `auth:otp:${normalizedPhone}`;
    const attemptsKey = `auth:otp:attempts:${normalizedPhone}`;

    // Store in Redis with 5-minute TTL
    await redis.set(otpKey, hashedOtp, 'EX', OTP_TTL_SECONDS);
    // Reset failed attempts counter
    await redis.set(attemptsKey, 0, 'EX', OTP_TTL_SECONDS);

    // Send SMS via Termii
    await termiiProvider.sendOtpSms(normalizedPhone, otp);

    return otp;
  }

  /**
   * Verifies candidate OTP against Redis hash with brute-force rate-limiting.
   * Throws 429 Too Many Requests if failed attempts >= 5.
   */
  async verifyOtp(phone: string, candidateOtp: string): Promise<boolean> {
    const normalizedPhone = normalizeNigerianPhone(phone);
    const redis = getRedisClient();

    const otpKey = `auth:otp:${normalizedPhone}`;
    const attemptsKey = `auth:otp:attempts:${normalizedPhone}`;

    // 1. Check current attempts count
    const attempts = parseInt((await redis.get(attemptsKey)) || '0', 10);
    if (attempts >= MAX_OTP_ATTEMPTS) {
      // Invalidate OTP immediately to prevent further brute-forcing
      await redis.del(otpKey);
      const error: any = new Error(
        'Too many failed attempts. This OTP has been invalidated for security. Please request a new code.'
      );
      error.statusCode = 429;
      throw error;
    }

    // 2. Fetch stored hashed OTP
    const storedHashedOtp = await redis.get(otpKey);
    if (!storedHashedOtp) {
      return false;
    }

    // 3. Verify candidate hash
    const candidateHash = this.hashOtp(candidateOtp.trim());
    if (candidateHash === storedHashedOtp) {
      // Correct OTP: Clean up Redis keys
      await redis.del(otpKey, attemptsKey);
      return true;
    }

    // 4. Incorrect OTP: increment attempt counter
    const newAttempts = await redis.incr(attemptsKey);
    if (newAttempts >= MAX_OTP_ATTEMPTS) {
      await redis.del(otpKey);
      const error: any = new Error(
        'Too many failed attempts. This OTP has been invalidated for security. Please request a new code.'
      );
      error.statusCode = 429;
      throw error;
    }

    return false;
  }

  /**
   * Helper for tests to retrieve mock sent OTP for a given phone number.
   */
  getLatestMockOtp(phone: string): string | undefined {
    const normalized = normalizeNigerianPhone(phone);
    const matching = mockSentOtps.filter((m) => m.to === normalized);
    return matching[matching.length - 1]?.otp;
  }
}

export const otpService = new OtpService();

