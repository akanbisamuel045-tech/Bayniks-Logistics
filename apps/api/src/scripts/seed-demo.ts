import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import { connectMongo, disconnectMongo } from '../config/db';
import { getRedisClient, closeRedis } from '../config/redis';
import {
  User,
  RiderProfile,
  Order,
  Wallet,
  FleetSplitRule,
  PayoutTransaction,
} from '../models';
import { AuthService } from '../services/auth.service';
import { toGeoJsonPoint } from '@logistics/shared-types';

dotenv.config();

export const DEMO_PASSWORD = 'BayniksPass2026!';

export interface SeededDemoResult {
  users: {
    admin: any;
    fleetOwner: any;
    vendor: any;
    customer: any;
    riderTariq: any;
    riderUsman: any;
    riderChinedu: any;
  };
  orders: {
    liveOrder: any;
    doneOrder: any;
  };
  tokens: {
    admin: string;
    fleetOwner: string;
    vendor: string;
    customer: string;
    riderTariq: string;
  };
}

/**
 * Seeds a complete, idempotent Lagos ecosystem for demo and testing.
 * Safe to run multiple times without duplicate key errors.
 */
export async function seedDemoEcosystem(options?: {
  closeConnections?: boolean;
}): Promise<SeededDemoResult> {
  const authService = new AuthService();
  const passwordHash = await authService.hashPassword(DEMO_PASSWORD);

  // 1. Ensure DB & Redis Connections
  await connectMongo();
  const redis = getRedisClient();

  // -------------------------------------------------------------
  // 2. Seed Users Idempotently
  // -------------------------------------------------------------
  async function upsertUser(data: {
    fullName: string;
    email: string;
    phone: string;
    role: 'admin' | 'fleet_owner' | 'vendor' | 'customer' | 'rider';
  }) {
    let user = await User.findOne({ phone: data.phone });
    if (!user) {
      user = await User.findOne({ email: data.email });
    }

    if (user) {
      user.fullName = data.fullName;
      user.email = data.email;
      user.role = data.role;
      user.passwordHash = passwordHash;
      user.isVerified = true;
      await user.save();
    } else {
      user = await User.create({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        role: data.role,
        passwordHash,
        isVerified: true,
      });
    }
    return user;
  }

  // A. Super-Admin
  const adminUser = await upsertUser({
    fullName: 'Super Admin (Command Center)',
    email: 'admin@bayniks.com',
    phone: '+2348000000001',
    role: 'admin',
  });

  // B. Fleet Owner
  const fleetOwnerUser = await upsertUser({
    fullName: 'Alhaji Musa Danbaba (Lagos Fleet Group)',
    email: 'fleet@bayniks.com',
    phone: '+2348000000002',
    role: 'fleet_owner',
  });

  // C. Business Vendor
  const vendorUser = await upsertUser({
    fullName: 'Kemi Balogun (Balogun Market Hub)',
    email: 'vendor@bayniks.com',
    phone: '+2348000000003',
    role: 'vendor',
  });

  // D. Customer
  const customerUser = await upsertUser({
    fullName: 'Kainul West (Lagos Dispatch Client)',
    email: 'kainul@bayniks.com',
    phone: '+2348123456789',
    role: 'customer',
  });

  // E. 3 Dispatch Riders
  const tariqUser = await upsertUser({
    fullName: 'Tariq Danladi',
    email: 'tariq.danladi@bayniks.com',
    phone: '+2348031124490',
    role: 'rider',
  });

  const usmanUser = await upsertUser({
    fullName: 'Usman Bello',
    email: 'usman.bello@bayniks.com',
    phone: '+2348032225501',
    role: 'rider',
  });

  const chineduUser = await upsertUser({
    fullName: 'Chinedu Okafor',
    email: 'chinedu.okafor@bayniks.com',
    phone: '+2348033336612',
    role: 'rider',
  });

  // -------------------------------------------------------------
  // 3. Seed / Synchronize Wallets Idempotently
  // -------------------------------------------------------------
  async function upsertWallet(userId: Types.ObjectId, balanceKobo: number) {
    let wallet = await Wallet.findOne({ userId });
    if (wallet) {
      wallet.balanceKobo = balanceKobo;
      wallet.escrowLockedKobo = 0;
      await wallet.save();
    } else {
      wallet = await Wallet.create({
        userId,
        balanceKobo,
        escrowLockedKobo: 0,
        paystackBankName: 'Guaranty Trust Bank',
        paystackDedicatedAccountNumber: '0123456789',
      });
    }
    return wallet;
  }

  await upsertWallet(adminUser._id, 0);
  await upsertWallet(fleetOwnerUser._id, 12000000); // ₦120,000
  await upsertWallet(vendorUser._id, 8500000);     // ₦85,000
  await upsertWallet(customerUser._id, 4520000);   // ₦45,200
  await upsertWallet(tariqUser._id, 3500000);      // ₦35,000
  await upsertWallet(usmanUser._id, 1500000);      // ₦15,000
  await upsertWallet(chineduUser._id, 0);          // ₦0

  // -------------------------------------------------------------
  // 4. Seed / Synchronize Rider Profiles & Fleet Split Rules
  // -------------------------------------------------------------
  // Rider 1: Tariq Danladi (Busy, Fleet-Linked 70/30, on Third Mainland Bridge)
  let tariqProfile = await RiderProfile.findOne({ userId: tariqUser._id });
  if (tariqProfile) {
    tariqProfile.vehicleType = 'bike';
    tariqProfile.plateNumber = 'KJA-491-AA';
    tariqProfile.ridersCardNumber = 'LASR-KJA-491';
    tariqProfile.ridersCardDocumentUrl = 'https://cdn.bayniks.com/docs/lasr-kja-491.pdf';
    tariqProfile.kycStatus = 'approved';
    tariqProfile.status = 'busy';
    tariqProfile.fleetOwnerId = fleetOwnerUser._id;
    tariqProfile.rating = 4.92;
    tariqProfile.lastLocation = { type: 'Point', coordinates: [3.3892, 6.5085] }; // Third Mainland Bridge
    tariqProfile.lastSeenAt = new Date();
    await tariqProfile.save();
  } else {
    tariqProfile = await RiderProfile.create({
      userId: tariqUser._id,
      vehicleType: 'bike',
      plateNumber: 'KJA-491-AA',
      ridersCardNumber: 'LASR-KJA-491',
      ridersCardDocumentUrl: 'https://cdn.bayniks.com/docs/lasr-kja-491.pdf',
      kycStatus: 'approved',
      status: 'busy',
      fleetOwnerId: fleetOwnerUser._id,
      rating: 4.92,
      lastLocation: { type: 'Point', coordinates: [3.3892, 6.5085] },
      lastSeenAt: new Date(),
    });
  }

  // 70/30 Fleet Owner Split Rule
  let splitRule = await FleetSplitRule.findOne({
    fleetOwnerId: fleetOwnerUser._id,
    riderUserId: tariqUser._id,
  });
  if (splitRule) {
    splitRule.riderSharePercent = 70;
    splitRule.fleetOwnerSharePercent = 30;
    await splitRule.save();
  } else {
    await FleetSplitRule.create({
      fleetOwnerId: fleetOwnerUser._id,
      riderUserId: tariqUser._id,
      riderSharePercent: 70,
      fleetOwnerSharePercent: 30,
    });
  }

  // Rider 2: Usman Bello (Available at Ikeja City Mall)
  let usmanProfile = await RiderProfile.findOne({ userId: usmanUser._id });
  if (usmanProfile) {
    usmanProfile.vehicleType = 'bike';
    usmanProfile.plateNumber = 'LND-310-BB';
    usmanProfile.ridersCardNumber = 'LASR-LND-310';
    usmanProfile.ridersCardDocumentUrl = 'https://cdn.bayniks.com/docs/lasr-lnd-310.pdf';
    usmanProfile.kycStatus = 'approved';
    usmanProfile.status = 'available';
    usmanProfile.fleetOwnerId = null;
    usmanProfile.rating = 4.88;
    usmanProfile.lastLocation = { type: 'Point', coordinates: [3.3515, 6.6018] }; // Ikeja City Mall
    usmanProfile.lastSeenAt = new Date();
    await usmanProfile.save();
  } else {
    usmanProfile = await RiderProfile.create({
      userId: usmanUser._id,
      vehicleType: 'bike',
      plateNumber: 'LND-310-BB',
      ridersCardNumber: 'LASR-LND-310',
      ridersCardDocumentUrl: 'https://cdn.bayniks.com/docs/lasr-lnd-310.pdf',
      kycStatus: 'approved',
      status: 'available',
      fleetOwnerId: null,
      rating: 4.88,
      lastLocation: { type: 'Point', coordinates: [3.3515, 6.6018] },
      lastSeenAt: new Date(),
    });
  }

  // Rider 3: Chinedu Okafor (Pending KYC for Admin 1-Click Verification)
  let chineduProfile = await RiderProfile.findOne({ userId: chineduUser._id });
  if (chineduProfile) {
    chineduProfile.vehicleType = 'bike';
    chineduProfile.plateNumber = 'MUS-882-XY';
    chineduProfile.ridersCardNumber = 'LASR-MUS-882';
    chineduProfile.ridersCardDocumentUrl = 'https://cdn.bayniks.com/docs/lasr-mus-882.pdf';
    chineduProfile.kycStatus = 'pending';
    chineduProfile.status = 'offline';
    chineduProfile.fleetOwnerId = null;
    chineduProfile.rating = 5.0;
    chineduProfile.lastLocation = { type: 'Point', coordinates: [3.3792, 6.5244] };
    chineduProfile.lastSeenAt = new Date();
    await chineduProfile.save();
  } else {
    chineduProfile = await RiderProfile.create({
      userId: chineduUser._id,
      vehicleType: 'bike',
      plateNumber: 'MUS-882-XY',
      ridersCardNumber: 'LASR-MUS-882',
      ridersCardDocumentUrl: 'https://cdn.bayniks.com/docs/lasr-mus-882.pdf',
      kycStatus: 'pending',
      status: 'offline',
      fleetOwnerId: null,
      rating: 5.0,
      lastLocation: { type: 'Point', coordinates: [3.3792, 6.5244] },
      lastSeenAt: new Date(),
    });
  }

  // -------------------------------------------------------------
  // 5. Seed Orders (BYN-LIVE01 & BYN-DONE02)
  // -------------------------------------------------------------
  // Order 1: Active In-Transit Order (BYN-LIVE01)
  let liveOrder = await Order.findOne({ trackingCode: 'BYN-LIVE01' });
  const liveOrderPayload = {
    trackingCode: 'BYN-LIVE01',
    senderId: customerUser._id,
    riderId: tariqUser._id,
    status: 'in_transit',
    vehicleType: 'bike',
    paymentMethod: 'wallet',
    paymentStatus: 'paid',
    estimatedDistanceKm: 14.2,
    totalFareKobo: 350000,
    platformCommissionKobo: 70000,
    riderEarningKobo: 280000,
    payoutStatus: 'pending',
    pickup: {
      address: 'Commercial Avenue, Sabo Yaba, Lagos',
      landmark: 'E-Center / Ozone Cinemas',
      location: { type: 'Point' as const, coordinates: [3.3768, 6.5181] as [number, number] },
      contactName: 'Kainul West',
      contactPhone: '+2348123456789',
      pickupPin: '4829',
    },
    stops: [
      {
        sequenceNumber: 1,
        recipientName: 'Dr. Folake Adeyemi',
        recipientPhone: '+2348029988776',
        dropoffAddress: 'Victoria Island Towers, Adeola Odeku St, VI, Lagos',
        dropoffLandmark: 'Opposite Eko Hotel Roundabout',
        dropoffLocation: { type: 'Point' as const, coordinates: [3.4246, 6.4281] as [number, number] },
        packageDescription: 'Confidential Legal Documents & Hardware Token',
        deliveryPin: '7391',
        status: 'pending' as const,
      },
    ],
    encodedRoutePolyline: 'q_`iF~js|U_ulLnnqC_mqNvxq`@_olLvnqC',
  };

  if (liveOrder) {
    Object.assign(liveOrder, liveOrderPayload);
    await liveOrder.save();
  } else {
    liveOrder = await Order.create(liveOrderPayload);
  }

  // Order 2: Completed & Settled Order (BYN-DONE02)
  let doneOrder = await Order.findOne({ trackingCode: 'BYN-DONE02' });
  const deliveredTime = new Date(Date.now() - 3600000 * 2);
  const doneOrderPayload = {
    trackingCode: 'BYN-DONE02',
    senderId: vendorUser._id,
    riderId: tariqUser._id,
    status: 'delivered',
    vehicleType: 'bike',
    paymentMethod: 'wallet',
    paymentStatus: 'paid',
    estimatedDistanceKm: 8.5,
    totalFareKobo: 250000,
    platformCommissionKobo: 50000,
    riderEarningKobo: 200000,
    payoutStatus: 'settled',
    deliveredAt: deliveredTime,
    settledAt: deliveredTime,
    pickup: {
      address: 'Balogun Market, Lagos Island',
      landmark: 'Beside Mandilas Building',
      location: { type: 'Point' as const, coordinates: [3.3886, 6.4531] as [number, number] },
      contactName: 'Kemi Balogun',
      contactPhone: '+2348000000003',
      pickupPin: '1122',
    },
    stops: [
      {
        sequenceNumber: 1,
        recipientName: 'Bisi Akande',
        recipientPhone: '+2348099881122',
        dropoffAddress: 'Admiralty Way, Lekki Phase 1, Lagos',
        dropoffLandmark: 'Beside Filmhouse Cinemas',
        dropoffLocation: { type: 'Point' as const, coordinates: [3.4735, 6.4474] as [number, number] },
        packageDescription: 'Aso-Ebi Fabrics & Accessories (2 Bundles)',
        deliveryPin: '5566',
        status: 'delivered' as const,
        deliveredAt: deliveredTime,
        proofOfDeliveryPhotoUrl: 'https://cdn.bayniks.com/pod/byn-done02-pod.jpg',
      },
    ],
    encodedRoutePolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
  };

  if (doneOrder) {
    Object.assign(doneOrder, doneOrderPayload);
    await doneOrder.save();
  } else {
    doneOrder = await Order.create(doneOrderPayload);
  }

  // Seed Settled Payout Records for Tariq & Fleet Owner
  let tariqPayout = await PayoutTransaction.findOne({ payoutId: 'PAYOUT-DONE02-TARIQ' });
  if (!tariqPayout) {
    await PayoutTransaction.create({
      payoutId: 'PAYOUT-DONE02-TARIQ',
      userId: tariqUser._id,
      bankCode: '058',
      bankName: 'Guaranty Trust Bank',
      accountNumber: '0123456789',
      accountName: 'Tariq Danladi',
      amountKobo: 140000, // 70% of 200,000 = ₦1,400.00
      status: 'success',
      transferCode: 'TRF_demo_payout_tariq',
      paystackTransferReference: 'ref_demo_tariq_001',
    });
  }

  let fleetPayout = await PayoutTransaction.findOne({ payoutId: 'PAYOUT-DONE02-FLEET' });
  if (!fleetPayout) {
    await PayoutTransaction.create({
      payoutId: 'PAYOUT-DONE02-FLEET',
      userId: fleetOwnerUser._id,
      bankCode: '058',
      bankName: 'Guaranty Trust Bank',
      accountNumber: '0987654321',
      accountName: 'Alhaji Musa Danbaba',
      amountKobo: 60000, // 30% of 200,000 = ₦600.00
      status: 'success',
      transferCode: 'TRF_demo_payout_fleet',
      paystackTransferReference: 'ref_demo_fleet_001',
    });
  }

  // -------------------------------------------------------------
  // 6. Redis Telemetry & Geospatial Ingestion
  // -------------------------------------------------------------
  const now = Date.now();
  const pipeline = redis.pipeline();

  // A. Tariq Danladi: Live in-transit on Third Mainland Bridge
  // (lat: 6.5085, lng: 3.3892, heading 135 deg, 48.5 km/h)
  const tariqKey = `rider:telemetry:${tariqUser._id}`;
  pipeline.hset(tariqKey, {
    lat: '6.5085',
    lng: '3.3892',
    bearing: '135',
    speed: '48.5',
    accuracy: '8.2',
    batteryLevel: '89',
    activeOrderId: liveOrder._id.toString(),
    trackingCode: 'BYN-LIVE01',
    updatedAt: String(now),
    lastPingTimestamp: String(now),
  });
  pipeline.expire(tariqKey, 86400); // 24-hr persistence for demo testing
  pipeline.zrem('riders:available:locations', tariqUser._id.toString()); // Busy rider removed from pool

  // Route breadcrumbs on Third Mainland Bridge
  const breadcrumbsKey = `order:route_points:${liveOrder._id}`;
  pipeline.del(breadcrumbsKey);
  pipeline.rpush(
    breadcrumbsKey,
    JSON.stringify({ lat: 6.5181, lng: 3.3768, ts: now - 300000 }),
    JSON.stringify({ lat: 6.5135, lng: 3.3820, ts: now - 180000 }),
    JSON.stringify({ lat: 6.5085, lng: 3.3892, ts: now - 30000 })
  );
  pipeline.expire(breadcrumbsKey, 86400);

  // B. Usman Bello: Available at Ikeja City Mall
  // GOLDEN RULE 4: Redis geoadd strictly requires [lng, lat] coordinate order
  pipeline.geoadd('riders:available:locations', 3.3515, 6.6018, usmanUser._id.toString());
  const usmanKey = `rider:telemetry:${usmanUser._id}`;
  pipeline.hset(usmanKey, {
    lat: '6.6018',
    lng: '3.3515',
    bearing: '0',
    speed: '0',
    accuracy: '5',
    updatedAt: String(now),
    lastPingTimestamp: String(now),
  });
  pipeline.expire(usmanKey, 86400);

  await pipeline.exec();

  // -------------------------------------------------------------
  // 7. Generate Ready-to-Use JWT Tokens
  // -------------------------------------------------------------
  const [adminTokens, fleetTokens, vendorTokens, customerTokens, tariqTokens] =
    await Promise.all([
      authService.createTokens({
        id: adminUser._id.toString(),
        role: 'admin',
        phone: adminUser.phone,
        isVerified: true,
      }),
      authService.createTokens({
        id: fleetOwnerUser._id.toString(),
        role: 'fleet_owner',
        phone: fleetOwnerUser.phone,
        isVerified: true,
      }),
      authService.createTokens({
        id: vendorUser._id.toString(),
        role: 'vendor',
        phone: vendorUser.phone,
        isVerified: true,
      }),
      authService.createTokens({
        id: customerUser._id.toString(),
        role: 'customer',
        phone: customerUser.phone,
        isVerified: true,
      }),
      authService.createTokens({
        id: tariqUser._id.toString(),
        role: 'rider',
        phone: tariqUser.phone,
        isVerified: true,
      }),
    ]);

  const result: SeededDemoResult = {
    users: {
      admin: adminUser,
      fleetOwner: fleetOwnerUser,
      vendor: vendorUser,
      customer: customerUser,
      riderTariq: tariqUser,
      riderUsman: usmanUser,
      riderChinedu: chineduUser,
    },
    orders: {
      liveOrder,
      doneOrder,
    },
    tokens: {
      admin: adminTokens.accessToken,
      fleetOwner: fleetTokens.accessToken,
      vendor: vendorTokens.accessToken,
      customer: customerTokens.accessToken,
      riderTariq: tariqTokens.accessToken,
    },
  };

  // Close connections if requested (e.g. standalone CLI run)
  if (options?.closeConnections) {
    await closeRedis();
    await disconnectMongo();
  }

  return result;
}

/**
 * Prints the Interactive Login & Testing Cheat Sheet Table.
 */
export function printCheatSheetTable(result: SeededDemoResult) {
  console.log('\n' + '='.repeat(100));
  console.log('                 BAYNIKS LOGISTICS - INTERACTIVE DEMO SEEDER (LAGOS HUB)                 ');
  console.log('='.repeat(100));
  console.log(
    `${'Role'.padEnd(14)} | ${'Login Email / Phone'.padEnd(32)} | ${'Password'.padEnd(18)} | ${'Wallet'.padEnd(12)} | ${'Direct Portal URL'}`
  );
  console.log('-'.repeat(100));
  console.log(
    `${'Super-Admin'.padEnd(14)} | ${'admin@bayniks.com'.padEnd(32)} | ${DEMO_PASSWORD.padEnd(18)} | ${'N/A'.padEnd(12)} | http://localhost:3000/admin`
  );
  console.log(
    `${''.padEnd(14)} | ${'+2348000000001'.padEnd(32)} | ${''.padEnd(18)} | ${''.padEnd(12)} |`
  );
  console.log(
    `${'Fleet Owner'.padEnd(14)} | ${'fleet@bayniks.com'.padEnd(32)} | ${DEMO_PASSWORD.padEnd(18)} | ${'₦120,000.00'.padEnd(12)} | http://localhost:3000/admin`
  );
  console.log(
    `${''.padEnd(14)} | ${'+2348000000002'.padEnd(32)} | ${''.padEnd(18)} | ${''.padEnd(12)} |`
  );
  console.log(
    `${'Vendor'.padEnd(14)} | ${'vendor@bayniks.com'.padEnd(32)} | ${DEMO_PASSWORD.padEnd(18)} | ${'₦85,000.00'.padEnd(12)} | http://localhost:3000/vendor`
  );
  console.log(
    `${''.padEnd(14)} | ${'+2348000000003'.padEnd(32)} | ${''.padEnd(18)} | ${''.padEnd(12)} |`
  );
  console.log(
    `${'Customer'.padEnd(14)} | ${'kainul@bayniks.com'.padEnd(32)} | ${DEMO_PASSWORD.padEnd(18)} | ${'₦45,200.00'.padEnd(12)} | http://localhost:3000`
  );
  console.log(
    `${''.padEnd(14)} | ${'+2348123456789'.padEnd(32)} | ${''.padEnd(18)} | ${''.padEnd(12)} |`
  );
  console.log('-'.repeat(100));
  console.log(
    `${'Rider (Busy)'.padEnd(14)} | ${'tariq.danladi@bayniks.com'.padEnd(32)} | ${DEMO_PASSWORD.padEnd(18)} | ${'₦35,000.00'.padEnd(12)} | http://localhost:5173`
  );
  console.log(
    `${''.padEnd(14)} | +2348031124490 (Plate: KJA-491-AA | 70/30 Fleet Linked | Live on 3rd Mainland)`
  );
  console.log(
    `${'Rider (Avail)'.padEnd(14)} | ${'usman.bello@bayniks.com'.padEnd(32)} | ${DEMO_PASSWORD.padEnd(18)} | ${'₦15,000.00'.padEnd(12)} | http://localhost:5173`
  );
  console.log(
    `${''.padEnd(14)} | +2348032225501 (Plate: LND-310-BB | Available at Ikeja City Mall)`
  );
  console.log(
    `${'Rider (KYC)'.padEnd(14)} | ${'chinedu.okafor@bayniks.com'.padEnd(32)} | ${DEMO_PASSWORD.padEnd(18)} | ${'₦0.00'.padEnd(12)} | http://localhost:5173`
  );
  console.log(
    `${''.padEnd(14)} | +2348033336612 (Plate: MUS-882-XY | KYC Status: Pending -> Ready to Approve)`
  );
  console.log('-'.repeat(100));
  console.log('⚡ ACTIVE LIVE TRACKING LINK:');
  console.log('   URL: http://localhost:3000/track/BYN-LIVE01');
  console.log('   Pickup PIN: 4829  |  Delivery PIN: 7391 (Redacted from public tracking payload)');
  console.log('   Live GPS: Streaming live on Third Mainland Bridge towards Victoria Island');
  console.log('-'.repeat(100));
  console.log('✓ COMPLETED ORDER (SETTLED 80/20 PAYOUT):');
  console.log('   Tracking Code: BYN-DONE02');
  console.log('   Delivered: Balogun Market -> Admiralty Way, Lekki');
  console.log('='.repeat(100) + '\n');
}

// Self-executing runner when executed from terminal
if (process.argv[1]?.includes('seed-demo')) {
  seedDemoEcosystem({ closeConnections: true })
    .then((result) => {
      printCheatSheetTable(result);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal Demo Seeding Error:', err);
      process.exit(1);
    });
}
