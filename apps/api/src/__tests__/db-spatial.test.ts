import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { connectMongo, disconnectMongo } from '../config/db';
import { getRedisClient, closeRedis } from '../config/redis';
import { User, RiderProfile, Wallet, WalletTransaction } from '../models';
import { toGeoJsonPoint } from '@logistics/shared-types';

describe('Stage 2: Database Connection, ACID Transactions & Geospatial Invariants', () => {
  const redis = getRedisClient();

  beforeAll(async () => {
    await connectMongo();
    await User.syncIndexes();
    await RiderProfile.syncIndexes();
    await Wallet.syncIndexes();
  });

  afterAll(async () => {
    await disconnectMongo();
    await closeRedis();
  });

  it('1. verifies MongoDB connection and executes a multi-document ACID transaction (session.withTransaction)', async () => {
    const session = await mongoose.startSession();
    let createdUserId: mongoose.Types.ObjectId | null = null;
    let createdWalletId: mongoose.Types.ObjectId | null = null;

    try {
      await session.withTransaction(async () => {
        const [user] = await User.create(
          [
            {
              role: 'customer',
              fullName: 'Amina Bello',
              phone: `+23480200${Date.now().toString().slice(-6)}`,
              passwordHash: 'hash_test_pw',
              isVerified: true,
            },
          ],
          { session }
        );
        createdUserId = user!._id;

        const [wallet] = await Wallet.create(
          [
            {
              userId: user!._id,
              balanceKobo: 500000, // ₦5,000.00
              escrowLockedKobo: 0,
            },
          ],
          { session }
        );
        createdWalletId = wallet!._id;

        await WalletTransaction.create(
          [
            {
              walletUserId: user!._id,
              type: 'credit',
              amountKobo: 500000,
              reference: `REF-ACID-INIT-${Date.now()}`,
              status: 'success',
            },
          ],
          { session }
        );
      });
    } finally {
      await session.endSession();
    }

    expect(createdUserId).not.toBeNull();
    expect(createdWalletId).not.toBeNull();

    const verifiedWallet = await Wallet.findById(createdWalletId);
    expect(verifiedWallet).not.toBeNull();
    expect(verifiedWallet?.balanceKobo).toBe(500000);
  });

  it('2. verifies 2dsphere index query with $nearSphere returning results sorted from nearest to furthest', async () => {
    const testRiderUserA = await User.create({
      role: 'rider',
      fullName: 'Rider Close (Computer Village)',
      phone: `+23480301${Date.now().toString().slice(-6)}`,
      passwordHash: 'hash_close',
      isVerified: true,
    });

    const testRiderUserB = await User.create({
      role: 'rider',
      fullName: 'Rider Further (Allen Avenue)',
      phone: `+23480302${Date.now().toString().slice(-6)}`,
      passwordHash: 'hash_further',
      isVerified: true,
    });

    // Close rider: Ikeja Computer Village (~489m from Ikeja Under Bridge)
    const closeProfile = await RiderProfile.create({
      userId: testRiderUserA._id,
      vehicleType: 'bike',
      plateNumber: `KJA-TST-${Date.now().toString().slice(-4)}A`,
      ridersCardNumber: 'CARD-TST-01',
      ridersCardDocumentUrl: 'https://storage.dispatch.ng/docs/sample-close.pdf',
      kycStatus: 'approved',
      status: 'available',
      lastLocation: toGeoJsonPoint({ lat: 6.5997, lng: 3.3364 }), // [3.3364, 6.5997]
    });

    // Further rider: Allen Avenue (~1643m from Ikeja Under Bridge)
    const furtherProfile = await RiderProfile.create({
      userId: testRiderUserB._id,
      vehicleType: 'bike',
      plateNumber: `KJA-TST-${Date.now().toString().slice(-4)}B`,
      ridersCardNumber: 'CARD-TST-02',
      ridersCardDocumentUrl: 'https://storage.dispatch.ng/docs/sample-further.pdf',
      kycStatus: 'approved',
      status: 'available',
      lastLocation: toGeoJsonPoint({ lat: 6.6018, lng: 3.3515 }), // [3.3515, 6.6018]
    });

    // Query from Ikeja Under Bridge: lat: 6.5956, lng: 3.3380 -> GeoJSON [3.3380, 6.5956]
    const results = await RiderProfile.find({
      _id: { $in: [closeProfile._id, furtherProfile._id] },
      lastLocation: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [3.3380, 6.5956], // [longitude, latitude]
          },
          $maxDistance: 3000,
        },
      },
    });

    expect(results.length).toBe(2);
    // Index sorting test: Close rider MUST be at index 0, Further rider at index 1
    expect(results[0]?._id.toString()).toBe(closeProfile._id.toString());
    expect(results[1]?._id.toString()).toBe(furtherProfile._id.toString());
  });

  it('3. verifies coordinate law compliance by rejecting out-of-range or inverted coordinates', async () => {
    const user = await User.create({
      role: 'rider',
      fullName: 'Invalid Coord Rider',
      phone: `+23480399${Date.now().toString().slice(-6)}`,
      passwordHash: 'hash_bad',
      isVerified: true,
    });

    // Attempting coordinates where longitude is out of bounds (> 180 or < -180)
    const invalidProfile = new RiderProfile({
      userId: user._id,
      vehicleType: 'bike',
      plateNumber: `INV-${Date.now().toString().slice(-4)}`,
      ridersCardNumber: 'CARD-INV',
      ridersCardDocumentUrl: 'https://storage.dispatch.ng/docs/sample-inv.pdf',
      kycStatus: 'pending_review',
      status: 'available',
      lastLocation: {
        type: 'Point',
        coordinates: [195.0, 6.5244], // Inverted or out of range
      },
    });

    await expect(invalidProfile.save()).rejects.toThrow();
  });

  it('4. verifies Redis GEOADD and GEOSEARCH returns nearest riders matching coordinate ordering [lng, lat]', async () => {
    const geoKey = `test:riders:geo:${Date.now()}`;
    const riderCloseId = 'rider_test_close';
    const riderFarId = 'rider_test_far';

    // GEOADD key <lng> <lat> <member> - CRITICAL RULE 4: Longitude first
    await redis.geoadd(geoKey, 3.3364, 6.5997, riderCloseId); // ~489m
    await redis.geoadd(geoKey, 3.3515, 6.6018, riderFarId);   // ~1643m

    // GEOSEARCH key FROMLONLAT <lng> <lat> BYRADIUS <radius> M WITHDIST ASC
    const searchResults = (await redis.call(
      'GEOSEARCH',
      geoKey,
      'FROMLONLAT',
      3.3380,
      6.5956,
      'BYRADIUS',
      3000,
      'M',
      'WITHDIST',
      'ASC'
    )) as Array<[string, string]>;

    expect(searchResults.length).toBe(2);
    expect(searchResults[0]![0]).toBe(riderCloseId);
    expect(parseFloat(searchResults[0]![1])).toBeLessThan(600); // ~489m

    expect(searchResults[1]![0]).toBe(riderFarId);
    expect(parseFloat(searchResults[1]![1])).toBeGreaterThan(1500); // ~1643m

    // Clean up
    await redis.del(geoKey);
  });

  it('5. verifies atomic wallet balance deduction with { balanceKobo: { $gte: amount } }', async () => {
    const user = await User.create({
      role: 'customer',
      fullName: 'Wallet Tester',
      phone: `+23480444${Date.now().toString().slice(-6)}`,
      passwordHash: 'hash_wal',
      isVerified: true,
    });

    const initialBalanceKobo = 200000; // ₦2,000.00
    const wallet = await Wallet.create({
      userId: user._id,
      balanceKobo: initialBalanceKobo,
      escrowLockedKobo: 0,
    });

    const deductAmountKobo = 150000; // ₦1,500.00

    // Atomic deduction with conditional balance check
    const updatedWallet = await Wallet.findOneAndUpdate(
      {
        _id: wallet._id,
        balanceKobo: { $gte: deductAmountKobo },
      },
      {
        $inc: {
          balanceKobo: -deductAmountKobo,
          escrowLockedKobo: deductAmountKobo,
        },
      },
      { new: true }
    );

    expect(updatedWallet).not.toBeNull();
    expect(updatedWallet?.balanceKobo).toBe(50000); // ₦500.00 remaining
    expect(updatedWallet?.escrowLockedKobo).toBe(150000); // ₦1,500.00 in escrow

    // Second deduction attempt with amount (100,000 kobo) greater than current balance (50,000 kobo)
    const failedDeduction = await Wallet.findOneAndUpdate(
      {
        _id: wallet._id,
        balanceKobo: { $gte: 100000 },
      },
      {
        $inc: {
          balanceKobo: -100000,
          escrowLockedKobo: 100000,
        },
      },
      { new: true }
    );

    // Atomic guard prevented overdraft!
    expect(failedDeduction).toBeNull();

    // Verify balance was unchanged
    const finalWallet = await Wallet.findById(wallet._id);
    expect(finalWallet?.balanceKobo).toBe(50000);
  });
});

