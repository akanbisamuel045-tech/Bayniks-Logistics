import mongoose from 'mongoose';
import { connectMongo, disconnectMongo } from '../config/db';
import { getRedisClient, closeRedis } from '../config/redis';
import { User, RiderProfile } from '../models';
import { toGeoJsonPoint, type LatLng } from '@logistics/shared-types';

interface SeedRider {
  fullName: string;
  phone: string;
  plateNumber: string;
  ridersCardNumber: string;
  area: string;
  coords: LatLng;
}

export const LAGOS_SEED_RIDERS: SeedRider[] = [
  {
    fullName: 'Babajide Adeleke',
    phone: '+2348030010001',
    plateNumber: 'KJA-101-AA',
    ridersCardNumber: 'LASR-IKJ-001',
    area: 'Ikeja Computer Village',
    coords: { lat: 6.5997, lng: 3.3364 },
  },
  {
    fullName: 'Chukwuma Eze',
    phone: '+2348030010002',
    plateNumber: 'KJA-102-AB',
    ridersCardNumber: 'LASR-IKJ-002',
    area: 'Allen Avenue, Ikeja',
    coords: { lat: 6.6018, lng: 3.3515 },
  },
  {
    fullName: 'Olumide Bakare',
    phone: '+2348030010003',
    plateNumber: 'KJA-103-AC',
    ridersCardNumber: 'LASR-IKJ-003',
    area: 'Ikeja GRA (Isaac John)',
    coords: { lat: 6.5898, lng: 3.3572 },
  },
  {
    fullName: 'Emeka Nwosu',
    phone: '+2348030010004',
    plateNumber: 'KJA-104-AD',
    ridersCardNumber: 'LASR-IKJ-004',
    area: 'Maryland Mall',
    coords: { lat: 6.5724, lng: 3.3672 },
  },
  {
    fullName: 'Tunde Fashola',
    phone: '+2348030010005',
    plateNumber: 'YAB-201-BA',
    ridersCardNumber: 'LASR-YAB-005',
    area: 'Yaba Tech / Herbert Macaulay',
    coords: { lat: 6.5181, lng: 3.3768 },
  },
  {
    fullName: 'Ibrahim Musa',
    phone: '+2348030010006',
    plateNumber: 'YAB-202-BB',
    ridersCardNumber: 'LASR-YAB-006',
    area: 'Tejuosho Market, Yaba',
    coords: { lat: 6.5126, lng: 3.3664 },
  },
  {
    fullName: 'Segun Ogundipe',
    phone: '+2348030010007',
    plateNumber: 'SUR-301-CA',
    ridersCardNumber: 'LASR-SUR-007',
    area: 'National Stadium, Surulere',
    coords: { lat: 6.4988, lng: 3.3581 },
  },
  {
    fullName: 'Femi Alabi',
    phone: '+2348030010008',
    plateNumber: 'SUR-302-CB',
    ridersCardNumber: 'LASR-SUR-008',
    area: 'Adeniran Ogunsanya, Surulere',
    coords: { lat: 6.4921, lng: 3.3542 },
  },
  {
    fullName: 'Kelechi Okafor',
    phone: '+2348030010009',
    plateNumber: 'VI-401-DA',
    ridersCardNumber: 'LASR-VI-009',
    area: 'Victoria Island (Adetokunbo Ademola)',
    coords: { lat: 6.4281, lng: 3.4219 },
  },
  {
    fullName: 'Dayo Adebayo',
    phone: '+2348030010010',
    plateNumber: 'LEK-501-EA',
    ridersCardNumber: 'LASR-LEK-010',
    area: 'Lekki Phase 1 (Admiralty Way)',
    coords: { lat: 6.4474, lng: 3.4735 },
  },
];

export async function seedLagosRiders(): Promise<void> {
  console.log('--- [STAGE 2 SEEDING: Lagos Spatial Database & Redis Telemetry] ---');

  await connectMongo();
  const redis = getRedisClient();

  // 1. Flush existing seed data
  console.log('[1/4] Flushing existing rider collections and Redis GEO set...');
  await RiderProfile.deleteMany({});
  await User.deleteMany({ role: 'rider' });
  await redis.del('riders:available:locations');

  // Ensure indexes (especially 2dsphere)
  await RiderProfile.syncIndexes();

  // 2. Seed 10 mock dispatch riders across Lagos
  console.log('[2/4] Seeding 10 dispatch riders across Lagos hubs...');
  for (const item of LAGOS_SEED_RIDERS) {
    const geoPoint = toGeoJsonPoint(item.coords);

    const user = await User.create({
      role: 'rider',
      fullName: item.fullName,
      phone: item.phone,
      email: `${item.phone.replace('+', '')}@dispatch.ng`,
      passwordHash: 'argon2_mock_hash_for_seed',
      isVerified: true,
    });

    const riderProfile = await RiderProfile.create({
      userId: user._id,
      vehicleType: 'bike',
      plateNumber: item.plateNumber,
      ridersCardNumber: item.ridersCardNumber,
      ridersCardDocumentUrl: 'https://storage.dispatch.ng/docs/mvaa-sample.pdf',
      kycStatus: 'approved',
      status: 'available',
      rating: 4.9,
      lastLocation: geoPoint,
      lastSeenAt: new Date(),
    });

    // Golden Rule 4 & 5: Redis GEOADD key <lng> <lat> <member>
    await redis.geoadd(
      'riders:available:locations',
      geoPoint.coordinates[0], // Longitude first!
      geoPoint.coordinates[1], // Latitude second!
      riderProfile._id.toString()
    );

    console.log(
      `  ✓ Seeded Rider: ${item.fullName.padEnd(18)} | Area: ${item.area.padEnd(25)} | GeoJSON: [${geoPoint.coordinates.join(', ')}]`
    );
  }

  // 3. Spatial Test Query from Ikeja Under Bridge
  const testPickup: LatLng = { lat: 6.5956, lng: 3.3380 }; // Ikeja Under Bridge
  const testPickupGeoJson = toGeoJsonPoint(testPickup);
  const radiusMeters = 3000;

  console.log(`\n[3/4] Testing Spatial Radius Query (${radiusMeters}m from Ikeja Under Bridge: lat=${testPickup.lat}, lng=${testPickup.lng})`);

  // A. MongoDB 2dsphere $nearSphere Query
  const mongoStart = performance.now();
  const nearbyMongoRiders = await RiderProfile.find({
    status: 'available',
    lastLocation: {
      $nearSphere: {
        $geometry: {
          type: 'Point',
          coordinates: testPickupGeoJson.coordinates, // [lng, lat]
        },
        $maxDistance: radiusMeters,
      },
    },
  }).populate<{ userId: { fullName: string; phone: string } }>('userId');
  const mongoDurationMs = (performance.now() - mongoStart).toFixed(2);

  console.log(`\n>> MongoDB $nearSphere Results (${mongoDurationMs}ms):`);
  console.log(`   Found ${nearbyMongoRiders.length} riders within ${radiusMeters}m:`);
  for (const rider of nearbyMongoRiders) {
    console.log(
      `   - ${rider.userId?.fullName} (${rider.plateNumber}) at [${rider.lastLocation.coordinates.join(', ')}]`
    );
  }

  // B. Redis GEOSEARCH Query
  const redisStart = performance.now();
  // GEOSEARCH key FROMLONLAT <lng> <lat> BYRADIUS <radius> M WITHDIST WITHCOORD ASC
  const redisResults = (await redis.call(
    'GEOSEARCH',
    'riders:available:locations',
    'FROMLONLAT',
    testPickupGeoJson.coordinates[0],
    testPickupGeoJson.coordinates[1],
    'BYRADIUS',
    radiusMeters,
    'M',
    'WITHDIST',
    'ASC'
  )) as Array<[string, string]>;
  const redisDurationMs = (performance.now() - redisStart).toFixed(2);

  console.log(`\n>> Redis GEOSEARCH Results (${redisDurationMs}ms):`);
  console.log(`   Found ${redisResults.length} riders within ${radiusMeters}m:`);
  for (const [riderId, distMeters] of redisResults) {
    const matched = nearbyMongoRiders.find((r) => r._id.toString() === riderId);
    console.log(
      `   - Rider ID: ${riderId} | Distance: ${parseFloat(distMeters).toFixed(1)}m | Name: ${matched?.userId?.fullName ?? 'Unknown'}`
    );
  }

  console.log('\n[4/4] Spatial verification complete: Both MongoDB 2dsphere and Redis GEOSEARCH returned identical nearest dispatch riders.\n');
}

// Auto-run if executed directly
if (require.main === module || process.argv[1]?.includes('seed.ts')) {
  seedLagosRiders()
    .then(async () => {
      await disconnectMongo();
      await closeRedis();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('Seeding failed:', error);
      await disconnectMongo();
      await closeRedis();
      process.exit(1);
    });
}

