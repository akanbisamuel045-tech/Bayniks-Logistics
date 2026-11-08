import {
  RiderLocationPing,
  TelemetryIngestResult,
  LiveTelemetry,
  TrackingUpdate,
  getTrackingRoom,
  SOCKET_EVENTS,
} from '@logistics/shared-types';
import { getRedisClient } from '../config/redis';
import { emitToTrackingRoom, emitToAdminFleet } from '../socket/socket.gateway';

/**
 * Calculates Haversine distance in meters between two coordinates.
 */
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export class TelemetryService {
  /**
   * Ingests a high-frequency (5s) live GPS ping from a rider.
   *
   * STRICT GOLDEN RULE 5 COMPLIANCE:
   * ZERO MongoDB database writes are executed during live telemetry ingestion.
   * All coordinates are buffered strictly in Redis RAM (Hash, GEO Set, List).
   */
  async ingestRiderPing(riderUserId: string, ping: RiderLocationPing): Promise<TelemetryIngestResult> {
    const now = Date.now();

    // 1. Anti-Jitter & Signal Quality Filters
    if (ping.accuracy > 50) {
      return {
        accepted: false,
        reason: 'LOW_GPS_ACCURACY',
        updatedAt: now,
      };
    }

    if (ping.speed > 140) {
      return {
        accepted: false,
        reason: 'ERRATIC_SPEED_JUMP',
        updatedAt: now,
      };
    }

    if (ping.isMockLocation === true) {
      return {
        accepted: false,
        reason: 'MOCK_LOCATION_DETECTED',
        updatedAt: now,
      };
    }

    const redis = getRedisClient();
    const telemetryKey = `rider:telemetry:${riderUserId}`;

    // Read previous telemetry hash to check out-of-order timestamp, breadcrumb throttle and fallback trackingCode
    const prevData = await redis.hgetall(telemetryKey);
    const pingTimestamp = ping.timestamp || now;
    const prevLastPingTimestamp = Number(prevData?.lastPingTimestamp || prevData?.updatedAt || 0);

    // CRITICAL OUT-OF-ORDER GUARD:
    // If incoming offline-queued ping has a timestamp older than the latest live position in Redis:
    // 1. DO NOT overwrite live Redis Hash (prevents customer live bike marker from jumping back in time).
    // 2. DO NOT broadcast stale tracking:update over Socket.io.
    // 3. DO append the historical coordinate to order:route_points:<orderId> so the final trip polyline has no gaps.
    if (prevLastPingTimestamp > 0 && pingTimestamp < prevLastPingTimestamp) {
      if (ping.orderId) {
        const breadcrumbPoint = JSON.stringify({
          lat: ping.lat,
          lng: ping.lng,
          ts: pingTimestamp,
        });
        await redis.rpush(`order:route_points:${ping.orderId}`, breadcrumbPoint);
        await redis.expire(`order:route_points:${ping.orderId}`, 86400);
      }

      return {
        accepted: true,
        reason: 'HISTORICAL_PING_BUFFERED',
        updatedAt: now,
      };
    }

    const lastBreadcrumbAt = Number(prevData?.lastBreadcrumbAt || 0);
    const lastLat = Number(prevData?.lastBreadcrumbLat || 0);
    const lastLng = Number(prevData?.lastBreadcrumbLng || 0);

    const pipeline = redis.pipeline();

    // 2. Redis Key 1: rider:telemetry:<riderUserId> (Hash with 60s TTL)
    const hashPayload: Record<string, string> = {
      lat: String(ping.lat),
      lng: String(ping.lng),
      bearing: String(ping.bearing),
      speed: String(ping.speed),
      accuracy: String(ping.accuracy),
      batteryLevel: ping.batteryLevel !== undefined ? String(ping.batteryLevel) : '',
      activeOrderId: ping.orderId ?? '',
      trackingCode: ping.trackingCode ?? prevData?.trackingCode ?? '',
      updatedAt: String(now),
      lastPingTimestamp: String(pingTimestamp),
    };

    // 3. Redis Key 2: riders:available:locations (GEO Set)
    // GOLDEN RULE 4: Redis GEOADD strictly requires <lng> <lat> coordinate order
    if (!ping.orderId) {
      // Idle / available rider
      pipeline.geoadd('riders:available:locations', ping.lng, ping.lat, riderUserId);
    } else {
      // Busy on an active delivery order -> remove from available pool
      pipeline.zrem('riders:available:locations', riderUserId);
    }

    // 4. Redis Key 3: order:route_points:<orderId> (Route Breadcrumb History)
    let shouldRecordBreadcrumb = false;
    if (ping.orderId) {
      const timeSinceLastBreadcrumb = now - lastBreadcrumbAt;
      const distanceMovedMeters = lastBreadcrumbAt > 0
        ? calculateDistanceMeters(lastLat, lastLng, ping.lat, ping.lng)
        : 999;

      // Throttle: record once every 15s or when moved >= 25 meters
      if (lastBreadcrumbAt === 0 || timeSinceLastBreadcrumb >= 15000 || distanceMovedMeters >= 25) {
        shouldRecordBreadcrumb = true;
        const breadcrumbPoint = JSON.stringify({
          lat: ping.lat,
          lng: ping.lng,
          ts: ping.timestamp || now,
        });
        pipeline.rpush(`order:route_points:${ping.orderId}`, breadcrumbPoint);
        pipeline.expire(`order:route_points:${ping.orderId}`, 86400); // 24-hour TTL

        hashPayload.lastBreadcrumbAt = String(now);
        hashPayload.lastBreadcrumbLat = String(ping.lat);
        hashPayload.lastBreadcrumbLng = String(ping.lng);
      }
    }

    pipeline.hset(telemetryKey, hashPayload);
    pipeline.expire(telemetryKey, 60);

    await pipeline.exec();

    // 5. Real-Time Socket Broadcast (< 50ms)
    const resolvedTrackingCode = ping.trackingCode || prevData?.trackingCode;
    let broadcastedRoom: string | undefined;

    if (resolvedTrackingCode) {
      broadcastedRoom = getTrackingRoom(resolvedTrackingCode);
      const updatePayload: TrackingUpdate = {
        trackingCode: resolvedTrackingCode,
        riderId: riderUserId,
        lat: ping.lat,
        lng: ping.lng,
        bearing: ping.bearing,
        speed: ping.speed,
        status: 'in_transit',
        updatedAt: now,
      };

      try {
        emitToTrackingRoom(resolvedTrackingCode, updatePayload);
        emitToAdminFleet(SOCKET_EVENTS.TRACKING_UPDATE, updatePayload);
      } catch {
        // Socket may not be initialized in headless test environments
      }
    }

    return {
      accepted: true,
      broadcastedToRoom: broadcastedRoom,
      updatedAt: now,
    };
  }

  /**
   * Ingests a batch of offline-queued GPS pings after network reconnection.
   * Sorts pings chronologically by timestamp ascending before ingestion.
   */
  async ingestRiderBatchPings(
    riderUserId: string,
    pings: RiderLocationPing[]
  ): Promise<TelemetryIngestResult[]> {
    const sortedPings = [...pings].sort((a, b) => a.timestamp - b.timestamp);
    const results: TelemetryIngestResult[] = [];

    for (const ping of sortedPings) {
      const res = await this.ingestRiderPing(riderUserId, ping);
      results.push(res);
    }

    return results;
  }

  /**
   * Retrieves the live telemetry snapshot of a rider from Redis RAM.
   */
  async getRiderLiveTelemetry(riderUserId: string): Promise<LiveTelemetry | null> {
    const redis = getRedisClient();
    const data = await redis.hgetall(`rider:telemetry:${riderUserId}`);

    if (!data || !data.lat || !data.lng) {
      return null;
    }

    return {
      lat: Number(data.lat),
      lng: Number(data.lng),
      bearing: Number(data.bearing || 0),
      speed: Number(data.speed || 0),
      accuracy: data.accuracy ? Number(data.accuracy) : undefined,
      batteryLevel: data.batteryLevel ? Number(data.batteryLevel) : undefined,
      activeOrderId: data.activeOrderId || undefined,
      trackingCode: data.trackingCode || undefined,
      updatedAt: Number(data.updatedAt || 0),
    };
  }

  /**
   * Retrieves recorded route breadcrumbs for an order from Redis List.
   */
  async getOrderRouteBreadcrumbs(orderId: string): Promise<Array<{ lat: number; lng: number; ts: number }>> {
    const redis = getRedisClient();
    const rawList = await redis.lrange(`order:route_points:${orderId}`, 0, -1);

    return rawList.map((item) => {
      try {
        return JSON.parse(item);
      } catch {
        return { lat: 0, lng: 0, ts: 0 };
      }
    });
  }

  /**
   * Cleans up telemetry keys for a rider (used in tests and logouts).
   */
  async clearRiderTelemetry(riderUserId: string): Promise<void> {
    const redis = getRedisClient();
    await redis.del(`rider:telemetry:${riderUserId}`);
    await redis.zrem('riders:available:locations', riderUserId);
  }
}

let telemetryServiceInstance: TelemetryService | null = null;

export function getTelemetryService(): TelemetryService {
  if (!telemetryServiceInstance) {
    telemetryServiceInstance = new TelemetryService();
  }
  return telemetryServiceInstance;
}

export const telemetryService = getTelemetryService();

