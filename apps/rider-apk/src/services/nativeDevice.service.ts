import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { PushNotifications } from '@capacitor/push-notifications';
import { Share } from '@capacitor/share';
import type { JobNewOffer } from '@logistics/shared-types';
import { compressPodPhotoUnder300KB, CompressedPhotoResult } from './imageCompressor.service';

export const DISPATCH_PUSH_CHANNEL_ID = 'bayniks_dispatch_alerts';

export interface RegisterPushOptions {
  onToken: (token: string, platform: 'android' | 'ios' | 'web') => Promise<void> | void;
  onJobOfferPush?: (offer: JobNewOffer) => void;
  onPushError?: (error: string) => void;
}

/**
 * Configures high-priority Android FCM channel (`bayniks_dispatch_alerts`), requests notification
 * permission, registers device token with backend, and forwards background offer pushes.
 */
export async function registerDispatchPushNotifications(
  options: RegisterPushOptions
): Promise<{ supported: boolean; registered: boolean }> {
  if (!Capacitor.isNativePlatform()) {
    return { supported: false, registered: false };
  }

  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt') {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== 'granted') {
      options.onPushError?.('Notification permission denied. Enable alerts in Android settings to hear background dispatch offers.');
      return { supported: true, registered: false };
    }

    if (Capacitor.getPlatform() === 'android') {
      await PushNotifications.createChannel({
        id: DISPATCH_PUSH_CHANNEL_ID,
        name: 'Bayniks Dispatch Job Offers',
        description: 'High-priority incoming courier delivery alerts',
        importance: 5,
        visibility: 1,
        vibration: true,
        sound: 'default',
      });
    }

    await PushNotifications.addListener('registration', (token) => {
      const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
      void options.onToken(token.value, platform);
    });

    await PushNotifications.addListener('registrationError', (err) => {
      options.onPushError?.(err.error || 'Push notification registration failed');
    });

    const parseOfferFromData = (data: Record<string, any> | undefined): JobNewOffer | null => {
      if (!data || !data.orderId) return null;
      return {
        orderId: String(data.orderId),
        trackingCode: String(data.trackingCode || 'LGS-PUSH'),
        pickupAddress: String(data.pickupAddress || 'Lagos Dispatch Pickup'),
        pickupLandmark: String(data.pickupLandmark || 'Tap to view pickup details'),
        estimatedDistanceKm: Number(data.estimatedDistanceKm || 3.5),
        riderEarningKobo: Number(data.riderEarningKobo || 150000),
        stopsCount: Number(data.stopsCount || 1),
        expiresAt: Number(data.expiresAt || Date.now() + 30000),
      };
    };

    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      const offer = parseOfferFromData(notification.data);
      if (offer && options.onJobOfferPush) {
        options.onJobOfferPush(offer);
      }
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const offer = parseOfferFromData(action.notification?.data);
      if (offer && options.onJobOfferPush) {
        options.onJobOfferPush(offer);
      }
    });

    await PushNotifications.register();
    return { supported: true, registered: true };
  } catch (err: any) {
    options.onPushError?.(err?.message || 'Push initialization failed');
    return { supported: true, registered: false };
  }
}

/**
 * Captures a real camera/gallery image via Capacitor Camera on Android/iOS native builds
 * and compresses it below 300KB using HTML5 Canvas. Returns null on standard web browsers so
 * callers fall back to `<input type="file" capture="environment">`.
 */
export async function captureNativeCameraPhoto(
  mode: 'camera' | 'prompt' = 'camera'
): Promise<CompressedPhotoResult | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  const perms = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
  if (perms.camera === 'denied' && perms.photos === 'denied') {
    throw new Error('Camera permission denied. Allow camera access in Android Settings.');
  }

  const captured = await Camera.getPhoto({
    quality: 82,
    allowEditing: false,
    resultType: CameraResultType.DataUrl,
    source: mode === 'camera' ? CameraSource.Camera : CameraSource.Prompt,
    correctOrientation: true,
    width: 1280,
  });

  if (!captured.dataUrl) {
    throw new Error('No photo returned from device camera');
  }

  return compressPodPhotoUnder300KB(captured.dataUrl);
}

/**
 * Shares a live public tracking link using native Android Share sheet, Web Share API,
 * or clipboard fallback.
 */
export async function shareLiveTripDetails(payload: {
  trackingCode: string;
  recipientName: string;
  pickupAddress: string;
  dropoffAddress: string;
}): Promise<{ method: 'capacitor' | 'web_share' | 'clipboard'; trackingUrl: string }> {
  const trackingUrl = `https://track.bayniks.ng/${encodeURIComponent(payload.trackingCode)}`;
  const shareText = `Bayniks Live Delivery (${payload.trackingCode}): En route for ${payload.recipientName} from ${payload.pickupAddress} to ${payload.dropoffAddress}. Track live: ${trackingUrl}`;

  if (Capacitor.isNativePlatform()) {
    await Share.share({
      title: `Bayniks Delivery ${payload.trackingCode}`,
      text: shareText,
      url: trackingUrl,
      dialogTitle: 'Share Live Delivery Tracking',
    });
    return { method: 'capacitor', trackingUrl };
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: `Bayniks Delivery ${payload.trackingCode}`,
        text: shareText,
        url: trackingUrl,
      });
      return { method: 'web_share', trackingUrl };
    } catch {
      // User dismissed share or share unavailable -> fallback to clipboard
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(shareText);
  }
  return { method: 'clipboard', trackingUrl };
}

/**
 * Normalizes Nigerian phone numbers to E.164 and triggers the native cellular dialer (`tel:`).
 */
export function initiateNativePhoneCall(rawPhone: string): string {
  const cleaned = rawPhone.replace(/[^\d+]/g, '');
  const e164 = cleaned.startsWith('+')
    ? cleaned
    : cleaned.startsWith('0')
    ? `+234${cleaned.slice(1)}`
    : `+${cleaned}`;

  const telUri = `tel:${e164}`;
  if (typeof window !== 'undefined' && !/jsdom/i.test(navigator.userAgent || '')) {
    try {
      const a = document.createElement('a');
      a.href = telUri;
      a.click();
    } catch {
      // Non-fatal in restricted frames
    }
  }
  return telUri;
}

