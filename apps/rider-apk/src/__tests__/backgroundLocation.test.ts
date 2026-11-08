import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  BackgroundLocationService,
  BackgroundGeolocation,
} from '../services/backgroundLocation.service';
import type { Location as NativeLocation } from '@capacitor-community/background-geolocation';
import type { RiderLocationPing } from '@logistics/shared-types';
import capacitorConfig from '../../capacitor.config';

// Mock Capacitor native platform check & BackgroundGeolocation plugin with hoisted scope
const { mockBackgroundGeolocationPlugin } = vi.hoisted(() => ({
  mockBackgroundGeolocationPlugin: {
    addWatcher: vi.fn(),
    removeWatcher: vi.fn(),
    openSettings: vi.fn(),
  },
}));

vi.mock('@capacitor/core', async () => {
  const actual = await vi.importActual<any>('@capacitor/core');
  return {
    ...actual,
    Capacitor: {
      ...actual.Capacitor,
      isNativePlatform: () => true,
    },
    registerPlugin: (name: string) => {
      if (name === 'BackgroundGeolocation') {
        return mockBackgroundGeolocationPlugin;
      }
      return actual.registerPlugin(name);
    },
  };
});

describe('Stage 12: CapacitorJS Android Packaging & Background Geolocation Service', () => {
  let service: BackgroundLocationService;

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new BackgroundLocationService();
  });

  afterEach(async () => {
    await service.stopForegroundDeliveryTracking();
  });

  // SUITE 1: Coordinate Mapping, Speed Conversion (m/s -> km/h) & Fake GPS Detection
  describe('Suite 1: Coordinate Mapping, Speed Conversion & Fake GPS Detection', () => {
    it('converts speed from m/s to km/h and preserves accurate decimal coordinates', () => {
      const rawNativeLoc: NativeLocation = {
        latitude: 6.599721,
        longitude: 3.336412,
        bearing: 180,
        speed: 10.0, // 10 m/s = 36 km/h
        accuracy: 6.5,
        altitude: 40,
        altitudeAccuracy: 2,
        simulated: false,
        time: 1700000000000,
      };

      const ping = service.transformNativeLocation(
        rawNativeLoc,
        'order-123',
        'LGS-TRK-771',
        88
      );

      expect(ping.lat).toBe(6.599721);
      expect(ping.lng).toBe(3.336412);
      expect(ping.bearing).toBe(180);
      expect(ping.speed).toBe(36); // 10 * 3.6 = 36 km/h
      expect(ping.accuracy).toBe(6.5);
      expect(ping.batteryLevel).toBe(88);
      expect(ping.isMockLocation).toBe(false);
      expect(ping.timestamp).toBe(1700000000000);
      expect(ping.orderId).toBe('order-123');
      expect(ping.trackingCode).toBe('LGS-TRK-771');
    });

    it('detects Android simulated/mock location and flags isMockLocation: true', () => {
      const spoofedLoc: NativeLocation = {
        latitude: 6.5244,
        longitude: 3.3792,
        bearing: 45,
        speed: 5.5, // ~20 km/h
        accuracy: 1.0,
        altitude: null,
        altitudeAccuracy: null,
        simulated: true, // Mock Provider active (Fake GPS app)
        time: Date.now(),
      };

      const ping = service.transformNativeLocation(spoofedLoc);
      expect(ping.isMockLocation).toBe(true);
      expect(ping.speed).toBe(20); // Math.round(5.5 * 3.6)
    });
  });

  // SUITE 2: Foreground Watcher Lifecycle (Start on Accept -> Stop on Complete)
  describe('Suite 2: Foreground Watcher Lifecycle', () => {
    it('starts Android Foreground Service with sticky notification parameters and distance filter', async () => {
      const addWatcherSpy = vi
        .spyOn(BackgroundGeolocation, 'addWatcher')
        .mockResolvedValue('watcher-uuid-999');

      const watcherId = await service.startForegroundDeliveryTracking({
        orderId: 'order-999',
        trackingCode: 'LGS-TRK-999',
      });

      expect(watcherId).toBe('watcher-uuid-999');
      expect(service.getActiveWatcherId()).toBe('watcher-uuid-999');
      expect(service.isTracking()).toBe(true);

      expect(addWatcherSpy).toHaveBeenCalledTimes(1);
      expect(addWatcherSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          backgroundTitle: 'Active Delivery (LGS-TRK-999)',
          backgroundMessage: 'Streaming live GPS to customer — Keep service active',
          requestPermissions: true,
          stale: false,
          distanceFilter: 15,
        }),
        expect.any(Function)
      );
    });

    it('stops Android Foreground Service and clears watcher on delivery completion or offline toggle', async () => {
      vi.spyOn(BackgroundGeolocation, 'addWatcher').mockResolvedValue('watcher-to-stop');
      const removeWatcherSpy = vi
        .spyOn(BackgroundGeolocation, 'removeWatcher')
        .mockResolvedValue();

      await service.startForegroundDeliveryTracking({
        orderId: 'order-101',
        trackingCode: 'LGS-TRK-101',
      });

      expect(service.getActiveWatcherId()).toBe('watcher-to-stop');

      await service.stopForegroundDeliveryTracking();

      expect(removeWatcherSpy).toHaveBeenCalledWith({ id: 'watcher-to-stop' });
      expect(service.getActiveWatcherId()).toBeNull();
      expect(service.isTracking()).toBe(false);
    });
  });

  // SUITE 3: Socket-to-HTTP 3G Fallback Transmission
  describe('Suite 3: Socket-to-HTTP 3G Fallback Transmission', () => {
    it('transmits via WebSocket when socket is connected and acknowledges ping', async () => {
      const ping: RiderLocationPing = {
        lat: 6.5933,
        lng: 3.3421,
        bearing: 90,
        speed: 25,
        accuracy: 4.0,
        timestamp: Date.now(),
      };

      const mockSocket: any = {
        connected: true,
        emit: vi.fn((event: string, data: any, callback: Function) => {
          callback({ accepted: true });
        }),
      };

      const result = await service.transmitTelemetryPing(ping, mockSocket, 'token-123');

      expect(mockSocket.emit).toHaveBeenCalledWith('rider:location_ping', ping, expect.any(Function));
      expect(result.transport).toBe('socket');
      expect(result.success).toBe(true);
    });

    it('falls back to HTTP POST /api/v1/telemetry/ping when Socket.io is disconnected', async () => {
      const ping: RiderLocationPing = {
        lat: 6.5933,
        lng: 3.3421,
        bearing: 90,
        speed: 25,
        accuracy: 4.0,
        timestamp: Date.now(),
      };

      const mockSocket: any = {
        connected: false, // Disconnected socket
        emit: vi.fn(),
      };

      // Mock global fetch
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ accepted: true }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const result = await service.transmitTelemetryPing(
        ping,
        mockSocket,
        'jwt-auth-token-xyz',
        'http://localhost:4000'
      );

      expect(mockSocket.emit).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:4000/api/v1/telemetry/ping',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer jwt-auth-token-xyz',
          }),
          body: JSON.stringify(ping),
        })
      );
      expect(result.transport).toBe('http_fallback');
      expect(result.success).toBe(true);
    });
  });

  // SUITE 4: Capacitor Configuration & AndroidManifest.xml Integrity Check
  describe('Suite 4: Capacitor Configuration & AndroidManifest.xml Integrity Check', () => {
    it('verifies capacitor.config.ts has useLegacyBridge: true and androidScheme: https', () => {
      expect(capacitorConfig.appId).toBe('com.lagosexpress.rider');
      expect(capacitorConfig.appName).toBe('LagosExpress Rider');
      expect(capacitorConfig.webDir).toBe('dist');
      expect(capacitorConfig.server?.androidScheme).toBe('https');
      expect(capacitorConfig.android?.useLegacyBridge).toBe(true);
      expect(capacitorConfig.android?.allowMixedContent).toBe(true);
    });

    it('verifies AndroidManifest.xml declares all required foreground and location permissions', () => {
      const manifestPath = path.resolve(
        __dirname,
        '../../android/app/src/main/AndroidManifest.xml'
      );
      expect(fs.existsSync(manifestPath)).toBe(true);

      const manifestContent = fs.readFileSync(manifestPath, 'utf8');

      // Mandatory Android 12-15 location and foreground service permissions
      expect(manifestContent).toContain('android.permission.INTERNET');
      expect(manifestContent).toContain('android.permission.WAKE_LOCK');
      expect(manifestContent).toContain('android.permission.ACCESS_FINE_LOCATION');
      expect(manifestContent).toContain('android.permission.ACCESS_COARSE_LOCATION');
      expect(manifestContent).toContain('android.permission.ACCESS_BACKGROUND_LOCATION');
      expect(manifestContent).toContain('android.permission.FOREGROUND_SERVICE');
      expect(manifestContent).toContain('android.permission.FOREGROUND_SERVICE_LOCATION');
      expect(manifestContent).toContain('android.permission.POST_NOTIFICATIONS');
      expect(manifestContent).toContain('android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS');
      expect(manifestContent).toContain('foregroundServiceType="location"');
    });
  });
});
