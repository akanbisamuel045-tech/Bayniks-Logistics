import { z } from 'zod';
import { NigerianPhoneSchema, TrackingCodeSchema } from './validation';

/**
 * Supported notification dispatch channels.
 * sms_dnd uses Termii DND route to bypass Nigerian telco Do-Not-Disturb filters.
 */
export const NotificationChannelSchema = z.enum(['sms_dnd', 'whatsapp']);
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;

/**
 * Transactional logistics notification event types.
 */
export const NotificationEventTypeSchema = z.enum([
  'order_created_sender',
  'rider_assigned_sender',
  'in_transit_recipient_pin',
  'arrived_dropoff_recipient',
  'order_delivered_receipt',
]);
export type NotificationEventType = z.infer<typeof NotificationEventTypeSchema>;

/**
 * Record schema representing a dispatched SMS / WhatsApp notification.
 */
export const DispatchNotificationRecordSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  trackingCode: TrackingCodeSchema,
  eventType: NotificationEventTypeSchema,
  channel: NotificationChannelSchema,
  recipientPhone: NigerianPhoneSchema,
  message: z.string().min(5),
  trackingUrl: z.string().url(),
  sentAt: z.number().int().positive(),
});
export type DispatchNotificationRecord = z.infer<typeof DispatchNotificationRecordSchema>;

