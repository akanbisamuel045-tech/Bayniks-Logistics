// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { Capacitor } from '@capacitor/core';

const pushMocks = vi.hoisted(() => {
  const listeners: Record<string, (arg: any) => void> = {};
  return {
    listeners,
    checkPermissions: vi.fn(),
    requestPermissions: vi.fn(),
    createChannel: vi.fn(),
    addListener: vi.fn(async (event: string, cb: (arg: any) => void) => {
      listeners[event] = cb;
      return { remove: async () => {} };
    }),
    register: vi.fn(),
  };
});

const cameraMocks = vi.hoisted(() => ({
  requestPermissions: vi.fn(),
  getPhoto: vi.fn(),
}));

const shareMocks = vi.hoisted(() => ({
  share: vi.fn(),
}));

vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: pushMocks,
}));

vi.mock('@capacitor/camera', () => ({
  Camera: cameraMocks,
  CameraResultType: { Uri: 'uri', Base64: 'base64', DataUrl: 'dataUrl' },
  CameraSource: { Prompt: 'PROMPT', Camera: 'CAMERA', Photos: 'PHOTOS' },
}));

vi.mock('@capacitor/share', () => ({
  Share: shareMocks,
}));

import {
  DISPATCH_PUSH_CHANNEL_ID,
  captureNativeCameraPhoto,
  initiateNativePhoneCall,
  registerDispatchPushNotifications,
  shareLiveTripDetails,
} from '../services/nativeDevice.service';
import { useRiderStore } from '../store/riderStore';
import { PinVerificationModal } from '../components/PinVerificationModal';

describe('Feature 3: Native Android Capacitor & Device Integrations', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    useRiderStore.setState({
      authToken: 'jwt-native-rider',
      simulationMode: false,
      fcmToken: null,
      pushStatus: 'idle',
    });
  });

  it('registers high-priority FCM push channel, uploads token to /api/v1/riders/push-token, and forwards job offer push', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');

    pushMocks.checkPermissions.mockResolvedValue({ receive: 'prompt' });
    pushMocks.requestPermissions.mockResolvedValue({ receive: 'granted' });
    pushMocks.createChannel.mockResolvedValue(undefined);
    pushMocks.register.mockImplementation(async () => {
      pushMocks.listeners['registration']?.({ value: 'fcm-token-android-889900' });
    });

    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }) as any);
    global.fetch = fetchMock as any;

    const receivedOffers: any[] = [];
    const res = await registerDispatchPushNotifications({
      onToken: (token, platform) =>
        useRiderStore.getState().registerPushToken(token, platform, 'http://127.0.0.1:4000'),
      onJobOfferPush: (offer) => receivedOffers.push(offer),
    });

    expect(res.registered).toBe(true);
    expect(pushMocks.createChannel).toHaveBeenCalledWith(
      expect.objectContaining({ id: DISPATCH_PUSH_CHANNEL_ID, importance: 5 })
    );
    expect(useRiderStore.getState().fcmToken).toBe('fcm-token-android-889900');
    expect(useRiderStore.getState().pushStatus).toBe('registered');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:4000/api/v1/riders/push-token',
      expect.objectContaining({ method: 'POST' })
    );

    pushMocks.listeners['pushNotificationReceived']?.({
      data: {
        orderId: 'ord-push-1',
        trackingCode: 'LGS-PUSH-1',
        pickupAddress: 'Ikeja City Mall',
        riderEarningKobo: 220000,
      },
    });
    expect(receivedOffers[0]?.trackingCode).toBe('LGS-PUSH-1');
  });

  it('captures native camera photo via @capacitor/camera and compresses under 300KB', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    cameraMocks.requestPermissions.mockResolvedValue({ camera: 'granted', photos: 'granted' });
    cameraMocks.getPhoto.mockResolvedValue({
      dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/',
      format: 'jpeg',
    });

    const compressed = await captureNativeCameraPhoto('camera');
    expect(compressed).not.toBeNull();
    expect(compressed!.byteSize).toBeLessThanOrEqual(300 * 1024);

    // Works seamlessly inside PinVerificationModal Dropoff POD upload
    render(
      <PinVerificationModal
        isOpen={true}
        mode="dropoff"
        onClose={() => {}}
        onSubmitPickupPin={async () => {}}
        onSubmitDeliveryPinAndPod={async () => {}}
      />
    );
    await act(async () => {
      fireEvent.click(screen.getByText(/Snap or Upload Package Photo/i));
    });
    expect(screen.getByTestId('pod-photo-compressed-badge')).toBeDefined();
  });

  it('shares live delivery link via Capacitor Share natively or clipboard fallback on web', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    shareMocks.share.mockResolvedValue({});

    const nativeRes = await shareLiveTripDetails({
      trackingCode: 'LGS-555111',
      recipientName: 'Ebi',
      pickupAddress: 'Ikeja',
      dropoffAddress: 'VI',
    });
    expect(nativeRes.method).toBe('capacitor');
    expect(shareMocks.share).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://track.bayniks.ng/LGS-555111' })
    );

    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    const webRes = await shareLiveTripDetails({
      trackingCode: 'LGS-555111',
      recipientName: 'Ebi',
      pickupAddress: 'Ikeja',
      dropoffAddress: 'VI',
    });
    expect(webRes.method).toBe('clipboard');
    expect(writeText).toHaveBeenCalled();
  });

  it('normalizes local Nigerian phone numbers into E.164 tel: URI for native dialer', () => {
    expect(initiateNativePhoneCall('0803 444 5566')).toBe('tel:+2348034445566');
    expect(initiateNativePhoneCall('+234 803 444 5566')).toBe('tel:+2348034445566');
  });
});
