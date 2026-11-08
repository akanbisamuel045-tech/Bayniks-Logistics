import dotenv from 'dotenv';
import {
  DispatchNotificationRecord,
  NotificationChannel,
  NotificationEventType,
  normalizeNigerianPhone,
} from '@logistics/shared-types';

dotenv.config();

export interface SendSmsPayload {
  to: string;
  message: string;
  channel?: 'generic' | 'dnd' | 'whatsapp';
}

export interface SentSmsRecord {
  to: string;
  otp: string;
  timestamp: number;
}

// In-memory test store for sent OTPs in test/dev environment
export const mockSentOtps: SentSmsRecord[] = [];

// In-memory test store for transactional logistics alerts
export const mockSentNotifications: DispatchNotificationRecord[] = [];

export function clearMockNotifications(): void {
  mockSentNotifications.length = 0;
  mockSentOtps.length = 0;
}

export function getNotificationsForOrder(trackingCode: string): DispatchNotificationRecord[] {
  return mockSentNotifications.filter((n) => n.trackingCode === trackingCode);
}

export class TermiiProvider {
  private apiKey: string;
  private senderId: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.TERMII_API_KEY || '';
    this.senderId = process.env.TERMII_SENDER_ID || 'LogisticsNG';
    this.baseUrl = process.env.TERMII_BASE_URL || 'https://api.ng.termii.com';
  }

  /**
   * Sends 6-digit OTP SMS/WhatsApp to a Nigerian phone number.
   * In test/dev mode or when API key is unconfigured, operates deterministically in mock mode.
   */
  async sendOtpSms(to: string, otp: string): Promise<boolean> {
    const isTestOrDev =
      process.env.NODE_ENV === 'test' ||
      process.env.NODE_ENV === 'development' ||
      !this.apiKey;

    const message = `Your Dispatch logistics verification code is: ${otp}. Valid for 5 minutes. Do not share.`;

    if (isTestOrDev) {
      mockSentOtps.push({ to, otp, timestamp: Date.now() });
      if (process.env.NODE_ENV !== 'test') {
        console.log(`[Termii Mock SMS] To: ${to} | OTP: ${otp} | Message: "${message}"`);
      }
      return true;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          from: this.senderId,
          sms: message,
          type: 'plain',
          channel: 'dnd', // Termii DND channel ensures delivery to all Nigerian networks (MTN, Airtel, Glo, 9mobile)
          api_key: this.apiKey,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Termii Provider Error] Status: ${response.status} - ${errorText}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[Termii Provider Network Error]', error);
      return false;
    }
  }

  /**
   * Dispatches transactional logistics notifications (Zero-Install Tracking link & PIN alerts)
   * across Nigerian telcos via Termii DND SMS or WhatsApp route.
   */
  async sendTransactionalAlert(params: {
    to: string;
    message: string;
    channel?: NotificationChannel;
    metadata?: {
      orderId?: string;
      trackingCode?: string;
      eventType?: NotificationEventType;
      trackingUrl?: string;
    };
  }): Promise<DispatchNotificationRecord | null> {
    let normalizedPhone: string;
    try {
      normalizedPhone = normalizeNigerianPhone(params.to);
    } catch {
      normalizedPhone = params.to;
    }

    const channel: NotificationChannel = params.channel || 'sms_dnd';
    const trackingCode = (params.metadata?.trackingCode || 'LGS-000000') as any;
    const trackingUrl =
      params.metadata?.trackingUrl ||
      `${process.env.PUBLIC_WEB_URL || 'http://localhost:3000'}/track/${trackingCode}`;

    const record: DispatchNotificationRecord = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      orderId: params.metadata?.orderId || 'unknown',
      trackingCode,
      eventType: params.metadata?.eventType || 'order_created_sender',
      channel,
      recipientPhone: normalizedPhone,
      message: params.message,
      trackingUrl,
      sentAt: Date.now(),
    };

    const isTestOrDev =
      process.env.NODE_ENV === 'test' ||
      process.env.NODE_ENV === 'development' ||
      !this.apiKey;

    if (isTestOrDev) {
      mockSentNotifications.push(record);
      if (process.env.NODE_ENV !== 'test') {
        console.log(
          `[Termii Mock Alert] [${channel.toUpperCase()}] To: ${normalizedPhone} | Msg: "${params.message}"`
        );
      }
      return record;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: normalizedPhone,
          from: this.senderId,
          sms: params.message,
          type: 'plain',
          channel: channel === 'whatsapp' ? 'whatsapp' : 'dnd',
          api_key: this.apiKey,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Termii Alert Error] Status: ${response.status} - ${errorText}`);
        return null;
      }

      mockSentNotifications.push(record);
      return record;
    } catch (error) {
      console.error('[Termii Alert Network Error]', error);
      return null;
    }
  }
}

export const termiiProvider = new TermiiProvider();

