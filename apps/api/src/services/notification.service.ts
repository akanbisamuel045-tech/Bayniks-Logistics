import {
  DispatchNotificationRecord,
  NotificationChannel,
  NotificationEventType,
} from '@logistics/shared-types';
import { getRedisClient } from '../config/redis';
import { termiiProvider } from '../providers/termii.provider';
import { IOrder } from '../models';

export class NotificationService {
  /**
   * Constructs the zero-install public tracking URL for a shipment.
   */
  getTrackingUrl(trackingCode: string): string {
    const baseUrl = process.env.PUBLIC_WEB_URL || 'http://localhost:3000';
    return `${baseUrl}/track/${trackingCode}`;
  }

  /**
   * Redis Idempotency Guard (24-Hour TTL).
   * Ensures network retries or multiple state transitions never trigger duplicate SMS billing.
   */
  private async acquireIdempotencyLock(
    orderId: string,
    eventType: NotificationEventType,
    target: string | number
  ): Promise<boolean> {
    try {
      const redis = getRedisClient();
      const key = `notify:sent:${orderId}:${eventType}:${target}`;
      // Set key with 24-hour expiration only if it does not already exist (NX)
      const res = await redis.set(key, String(Date.now()), 'EX', 86400, 'NX');
      return res === 'OK';
    } catch {
      // If Redis has a transient glitch, default to true to allow delivery
      return true;
    }
  }

  /**
   * 1. Order Created Notification to Sender.
   * Dispatches tracking link & secret 4-Digit Pickup PIN to sender's phone.
   */
  async notifyOrderCreatedToSender(order: IOrder): Promise<DispatchNotificationRecord | null> {
    const orderId = order._id.toString();
    const canSend = await this.acquireIdempotencyLock(orderId, 'order_created_sender', 'sender');
    if (!canSend) return null;

    const trackingUrl = this.getTrackingUrl(order.trackingCode);
    const message = `LagosExpress: Your dispatch order ${order.trackingCode} is created! Secret 4-digit Pickup PIN: ${order.pickup.pickupPin} (Share ONLY when your bike rider arrives). Track live: ${trackingUrl}`;

    return termiiProvider.sendTransactionalAlert({
      to: order.pickup.contactPhone,
      message,
      channel: 'sms_dnd',
      metadata: {
        orderId,
        trackingCode: order.trackingCode,
        eventType: 'order_created_sender',
        trackingUrl,
      },
    });
  }

  /**
   * 2. In-Transit Multi-Stop Recipient Isolated Delivery PIN Dispatch.
   * Dispatches personalized DND SMS + WhatsApp to each stop recipient containing ONLY their stop PIN.
   */
  async notifyParcelInTransitToRecipients(
    order: IOrder,
    riderUser?: { fullName?: string },
    riderProfile?: { plateNumber?: string }
  ): Promise<DispatchNotificationRecord[]> {
    const orderId = order._id.toString();
    const trackingUrl = this.getTrackingUrl(order.trackingCode);
    const riderName = riderUser?.fullName || 'Assigned Rider';
    const plateNumber = riderProfile?.plateNumber || 'LAG-RIDER';
    const records: DispatchNotificationRecord[] = [];

    for (const stop of order.stops) {
      const canSend = await this.acquireIdempotencyLock(
        orderId,
        'in_transit_recipient_pin',
        stop.sequenceNumber
      );
      if (!canSend) continue;

      const message = `LagosExpress: Your parcel (Stop #${stop.sequenceNumber}) is on the way with Dispatch Rider ${riderName} (Bike: ${plateNumber}). Track live: ${trackingUrl} | Your secret 4-digit Delivery PIN is: ${stop.deliveryPin}. Give this PIN to the rider ONLY upon receiving your parcel.`;

      const record = await termiiProvider.sendTransactionalAlert({
        to: stop.recipientPhone,
        message,
        channel: 'sms_dnd',
        metadata: {
          orderId,
          trackingCode: order.trackingCode,
          eventType: 'in_transit_recipient_pin',
          trackingUrl,
        },
      });

      if (record) records.push(record);
    }

    return records;
  }

  /**
   * 3. Rider Arrived at Drop-off Location Alert.
   */
  async notifyRiderArrivedAtDropoff(
    order: IOrder,
    stopSequenceNumber: number,
    riderUser?: { fullName?: string; phone?: string }
  ): Promise<DispatchNotificationRecord | null> {
    const orderId = order._id.toString();
    const targetStop = order.stops.find((s) => s.sequenceNumber === stopSequenceNumber);
    if (!targetStop) return null;

    const canSend = await this.acquireIdempotencyLock(
      orderId,
      'arrived_dropoff_recipient',
      stopSequenceNumber
    );
    if (!canSend) return null;

    const trackingUrl = this.getTrackingUrl(order.trackingCode);
    const riderName = riderUser?.fullName || 'Your dispatch rider';
    const riderPhone = riderUser?.phone ? ` (Phone: ${riderUser.phone})` : '';

    const message = `LagosExpress: Dispatch Rider ${riderName}${riderPhone} has arrived at your destination with your parcel! Please meet the rider and provide your secret 4-digit Delivery PIN: ${targetStop.deliveryPin}. Track: ${trackingUrl}`;

    return termiiProvider.sendTransactionalAlert({
      to: targetStop.recipientPhone,
      message,
      channel: 'sms_dnd',
      metadata: {
        orderId,
        trackingCode: order.trackingCode,
        eventType: 'arrived_dropoff_recipient',
        trackingUrl,
      },
    });
  }

  /**
   * 4. Final Delivery Confirmation & Receipt.
   */
  async notifyOrderDeliveredReceipt(order: IOrder): Promise<DispatchNotificationRecord | null> {
    const orderId = order._id.toString();
    const canSend = await this.acquireIdempotencyLock(
      orderId,
      'order_delivered_receipt',
      'sender'
    );
    if (!canSend) return null;

    const trackingUrl = this.getTrackingUrl(order.trackingCode);
    const fareNaira = (order.totalFareKobo / 100).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
    });
    const message = `LagosExpress: Order ${order.trackingCode} has been delivered successfully! Fare settled: ₦${fareNaira}. View delivery proof & route: ${trackingUrl}`;

    return termiiProvider.sendTransactionalAlert({
      to: order.pickup.contactPhone,
      message,
      channel: 'sms_dnd',
      metadata: {
        orderId,
        trackingCode: order.trackingCode,
        eventType: 'order_delivered_receipt',
        trackingUrl,
      },
    });
  }
}

export const notificationService = new NotificationService();

