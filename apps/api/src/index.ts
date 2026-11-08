import http from 'http';
import {
  RiderLocationPingSchema,
  toGeoJsonPoint,
  nairaToKobo,
  formatNaira,
  TrackingCodeSchema,
  type RiderLocationPing,
  type GeoJsonPoint,
} from '@logistics/shared-types';
import { createApp } from './app';
import { connectMongo } from './config/db';
import { getRedisClient } from './config/redis';
import { initSocketGateway } from './socket/socket.gateway';

export function processTelemetryPing(rawPayload: unknown): {
  validPing: RiderLocationPing;
  geoJson: GeoJsonPoint;
} {
  const validPing = RiderLocationPingSchema.parse(rawPayload);
  const geoJson = toGeoJsonPoint({ lat: validPing.lat, lng: validPing.lng });
  return { validPing, geoJson };
}

export function sampleBootstrap(): void {
  const sampleTracking = TrackingCodeSchema.parse('LGS-849201');
  const sampleKobo = nairaToKobo(2500); // ₦2,500.00 -> 250000 kobo
  const formattedFare = formatNaira(sampleKobo);

  const samplePing = {
    orderId: 'ord_sample_001',
    lat: 6.5244,
    lng: 3.3792,
    bearing: 45,
    speed: 18.5,
    accuracy: 4.2,
    batteryLevel: 92,
    timestamp: Date.now(),
  };

  const { validPing, geoJson } = processTelemetryPing(samplePing);

  console.log(`[API Engine Initialized]`);
  console.log(`Tracking Code Sample: ${sampleTracking}`);
  console.log(`Fare: ${formattedFare} (${sampleKobo} kobo)`);
  console.log(`Rider Ping: Lat=${validPing.lat}, Lng=${validPing.lng}`);
  console.log(
    `GeoJSON Point (Golden Rule 4 [lng, lat]): [${geoJson.coordinates[0]}, ${geoJson.coordinates[1]}]`
  );
}

export async function startServer(port: number = Number(process.env.PORT) || 4000) {
  await connectMongo();
  getRedisClient();

  const app = createApp();
  const server = http.createServer(app);
  const io = initSocketGateway(server);

  await new Promise<void>((resolve) => {
    server.listen(port, () => {
      console.log(`[Logistics API] HTTP Server & Socket.io Gateway listening on port ${port}`);
      resolve();
    });
  });

  return { server, io };
}

export * from './app';
export * from './config/db';
export * from './config/redis';
export * from './models';
export * from './services/auth.service';
export * from './services/otp.service';
export * from './services/wallet.service';
export * from './providers/termii.provider';
export * from './providers/storage.provider';
export * from './providers/paystack.provider';
export * from './middleware/auth.middleware';
export * from './routes/rider.routes';
export * from './routes/pricing.routes';
export * from './routes/order.routes';
export * from './routes/wallet.routes';
export * from './socket/socket.gateway';

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  sampleBootstrap();
}
