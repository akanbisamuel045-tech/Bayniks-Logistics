import { registerPlugin, Capacitor } from '@capacitor/core';
import type {
  BackgroundGeolocationPlugin,
  Location as NativeLocation,
  CallbackError,
} from '@capacitor-community/background-geolocation';
import type { RiderLocationPing } from '@logistics/shared-types';
import type { Socket } from 'socket.io-client';
import { offlineTelemetryQueue } from './offlineTelemetryQueue.service';

export const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>(
  'BackgroundGeolocation'
);

export interface ForegroundTrackingOptions {
  orderId: string;
  trackingCode: string;
  authToken?: string | null;
  socket?: Socket | null;
  apiBaseUrl?: string;
  onLocation?: (ping: RiderLocationPing) => void;
  onError?: (error: any) => void;
}

export interface TelemetryTransmissionResult {
  transport: 'socket' | 'http_fallback' | 'offline_queue' | 'simulated';
  success: boolean;
  error?: string;
  queuedCount?: number;
}

export class BackgroundLocationService {
  private activeWatcherId: string | null = null;
  private browserWatchId: number | null = null;
  private currentOptions: ForegroundTrackingOptions | null = null;

  /**
   * Transforms raw native Android/iOS location into standardized RiderLocationPing.
   * Speed converted from m/s to km/h (speed * 3.6).
   * Flagged if Android mock provider / fake GPS was used.
   */
  public transformNativeLocation(
    loc: NativeLocation,
    orderId?: string,
    trackingCode?: string,
    batteryLevel = 90
  ): RiderLocationPing {
    const speedMs = loc.speed ?? 0;
    const speedKmh = Math.max(0, Math.round(speedMs * 3.6));

    return {
      lat: Number(loc.latitude.toFixed(6)),
      lng: Number(loc.longitude.toFixed(6)),
      bearing: Math.round(loc.bearing ?? 0),
      speed: speedKmh,
      accuracy: Math.max(0.1, Number((loc.accuracy ?? 5).toFixed(1))),
      batteryLevel,
      isMockLocation: Boolean(loc.simulated),
      timestamp: loc.time ?? Date.now(),
      orderId,
      trackingCode,
    };
  }

  /**
   * Transmits location ping via primary Socket.io connection.
   * If socket is disconnected, absent, or fails within 3000ms, automatically falls back to HTTP POST /api/v1/telemetry/ping.
   */
  public async transmitTelemetryPing(
    ping: RiderLocationPing,
    socket?: Socket | null,
    authToken?: string | null,
    apiBaseUrl = ''
  ): Promise<TelemetryTransmissionResult> {
    // 0. Offline Check: If device is fully offline, enqueue immediately to IndexedDB
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      const queuedCount = await offlineTelemetryQueue.enqueueOfflinePing(ping);
      return {
        transport: 'offline_queue',
        success: true,
        queuedCount,
      };
    }

    // 1. Primary Fast Path: Real-Time WebSocket (rider:location_ping)
    if (socket && socket.connected) {
      try {
        const socketSuccess = await Promise.race<boolean>([
          new Promise((resolve) => {
            socket.emit('rider:location_ping', ping, (ack?: { accepted?: boolean; ok?: boolean }) => {
              if (ack && (ack.accepted || ack.ok)) {
                resolve(true);
              } else {
                resolve(false);
              }
            });
          }),
          new Promise((resolve) => setTimeout(() => resolve(false), 3000)), // 3s timeout for 3G jitter
        ]);

        if (socketSuccess) {
          return { transport: 'socket', success: true };
        }
      } catch {
        // Fall through to HTTP fallback
      }
    }

    // 2. Secondary Path: Resilient HTTP Fallback (POST /api/v1/telemetry/ping)
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const res = await fetch(`${apiBaseUrl}/api/v1/telemetry/ping`, {
        method: 'POST',
        headers,
        body: JSON.stringify(ping),
      });

      if (res.ok) {
        return { transport: 'http_fallback', success: true };
      }
    } catch {
      // Fall through to offline queue
    }

    // 3. Fallback to Offline IndexedDB Queue if both Socket and HTTP failed
    const queuedCount = await offlineTelemetryQueue.enqueueOfflinePing(ping);
    return {
      transport: 'offline_queue',
      success: false,
      error: 'Network unavailable; queued in IndexedDB',
      queuedCount,
    };
  }

  /**
   * Starts persistent Android Foreground Geolocation Service with sticky notification.
   */
  public async startForegroundDeliveryTracking(options: ForegroundTrackingOptions): Promise<string> {
    this.currentOptions = options;

    // Check if running on native Capacitor platform
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      try {
        const watcherId = await BackgroundGeolocation.addWatcher(
          {
            backgroundTitle: `Active Delivery (${options.trackingCode})`,
            backgroundMessage: 'Streaming live GPS to customer — Keep service active',
            requestPermissions: true,
            stale: false,
            distanceFilter: 15, // 15 meters filter for battery efficiency
          },
          async (location?: NativeLocation, error?: CallbackError) => {
            if (error) {
              options.onError?.(error);
              return;
            }
            if (location) {
              const ping = this.transformNativeLocation(
                location,
                options.orderId,
                options.trackingCode
              );
              options.onLocation?.(ping);
              await this.transmitTelemetryPing(
                ping,
                options.socket,
                options.authToken,
                options.apiBaseUrl
              );
            }
          }
        );

        this.activeWatcherId = watcherId;
        return watcherId;
      } catch (err) {
        options.onError?.(err);
        // Fall back to web geolocation
      }
    }

    // Browser Web Geolocation Fallback
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      this.browserWatchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const simulatedNative: NativeLocation = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            altitudeAccuracy: pos.coords.altitudeAccuracy,
            simulated: false,
            bearing: pos.coords.heading,
            speed: pos.coords.speed,
            time: pos.timestamp,
          };
          const ping = this.transformNativeLocation(
            simulatedNative,
            options.orderId,
            options.trackingCode
          );
          options.onLocation?.(ping);
          await this.transmitTelemetryPing(
            ping,
            options.socket,
            options.authToken,
            options.apiBaseUrl
          );
        },
        (err) => options.onError?.(err),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
      this.activeWatcherId = 'browser-watch-' + this.browserWatchId;
      return this.activeWatcherId;
    }

    this.activeWatcherId = 'simulated-watcher';
    return this.activeWatcherId;
  }

  /**
   * Stops persistent foreground tracking and dismisses Android notification.
   */
  public async stopForegroundDeliveryTracking(): Promise<void> {
    if (this.activeWatcherId) {
      if (Capacitor.isNativePlatform() && !this.activeWatcherId.startsWith('browser-')) {
        try {
          await BackgroundGeolocation.removeWatcher({ id: this.activeWatcherId });
        } catch {
          // Ignore removal errors
        }
      }
      this.activeWatcherId = null;
    }

    if (this.browserWatchId !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(this.browserWatchId);
      this.browserWatchId = null;
    }

    this.currentOptions = null;
  }

  public getActiveWatcherId(): string | null {
    return this.activeWatcherId;
  }

  public isTracking(): boolean {
    return this.activeWatcherId !== null;
  }
}

export const backgroundLocationService = new BackgroundLocationService();

