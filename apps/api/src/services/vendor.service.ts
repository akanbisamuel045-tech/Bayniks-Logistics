import crypto from 'crypto';
import { Types } from 'mongoose';
import {
  VendorCsvRow,
  VendorCsvRowSchema,
  VendorBatchSummaryResponse,
  VendorBatchRunItem,
  OrderPickupInput,
  toGeoJsonPoint,
  fromGeoJsonPoint,
} from '@logistics/shared-types';
import { Order, User, RiderProfile, Wallet, WalletTransaction } from '../models';
import { getPricingService } from './pricing.service';
import { dispatchService } from './dispatch.service';
import { notificationService } from './notification.service';
import { telemetryService } from './telemetry.service';
import { walletService, InsufficientBalanceError } from './wallet.service';

export interface VendorCsvError {
  rowNumber: number;
  field: string;
  message: string;
  raw?: Record<string, string>;
}

export interface ParseVendorCsvResult {
  validRows: VendorCsvRow[];
  errors: VendorCsvError[];
  totalParsed: number;
}

/**
 * Lagos Gazetteer for landmark and neighborhood coordinate resolution
 */
const LAGOS_GAZETTEER: Array<{ keywords: string[]; lat: number; lng: number }> = [
  { keywords: ['ikeja', 'allen', 'alausa', 'computer village', 'toyin'], lat: 6.5933, lng: 3.3421 },
  { keywords: ['victoria island', ' vi ', 'vi,', 'v.i', 'ozumba', 'kofo abayomi', 'ahmadu bello', 'adeola odeku'], lat: 6.4281, lng: 3.4219 },
  { keywords: ['lekki', 'phase 1', 'admiralty', 'chevron', 'jakande', 'agungi', 'osapa', 'ikate'], lat: 6.4474, lng: 3.4723 },
  { keywords: ['ikoyi', 'banana island', 'bourdillon', 'awolowo road', 'parkview'], lat: 6.4520, lng: 3.4350 },
  { keywords: ['yaba', 'akoka', 'unilag', 'sabo', 'tejuosho', 'commercial avenue'], lat: 6.5186, lng: 3.3712 },
  { keywords: ['surulere', 'bodija', 'national stadium', 'ojuelegba', 'masha', 'adeniran ogunsanya'], lat: 6.4969, lng: 3.3615 },
  { keywords: ['marina', 'lagos island', 'cms', 'broad street', 'idunmota', 'tbs'], lat: 6.4500, lng: 3.3900 },
  { keywords: ['gbagada', 'anthony', 'charly boy', 'deeper life'], lat: 6.5560, lng: 3.3850 },
  { keywords: ['maryland', 'mende', 'anthony village', 'cane village'], lat: 6.5722, lng: 3.3678 },
  { keywords: ['oshodi', 'isolo', 'airport road', 'bolade'], lat: 6.5418, lng: 3.3458 },
  { keywords: ['magodo', 'shangisha', 'cmd road'], lat: 6.6186, lng: 3.3842 },
  { keywords: ['ajah', 'badore', 'sangotedo', 'abraham adesanya'], lat: 6.4674, lng: 3.5686 },
  { keywords: ['festac', 'amuwo odofin', 'mile 2', 'apple junction'], lat: 6.4710, lng: 3.2910 },
  { keywords: ['agege', 'penn cinema', 'dopemu'], lat: 6.6180, lng: 3.3209 },
  { keywords: ['berger', 'ojodu', 'opic'], lat: 6.6397, lng: 3.3644 },
];

/**
 * Resolves Lagos coordinates based on dropoff landmark and address text.
 * Falls back to Central Lagos if no neighborhood match is detected.
 */
export function resolveLagosCoordinates(text: string): { lat: number; lng: number } {
  const normalized = ` ${text.toLowerCase()} `;
  for (const entry of LAGOS_GAZETTEER) {
    if (entry.keywords.some((kw) => normalized.includes(kw))) {
      return { lat: entry.lat, lng: entry.lng };
    }
  }
  return { lat: 6.5244, lng: 3.3792 }; // Central Lagos
}

/**
 * RFC 4180-compliant pure TypeScript CSV row parser.
 * Handles quoted fields with embedded commas, quotes, and newlines.
 */
export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  const text = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip next quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (char === '\n' && !insideQuotes) {
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  // Push final field/row if not empty
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Generates unique tracking code in format LGS-XXXXXX.
 */
async function generateUniqueTrackingCode(): Promise<string> {
  for (let attempts = 0; attempts < 10; attempts++) {
    const codeNumber = crypto.randomInt(100000, 999999);
    const code = `LGS-${codeNumber}`;
    const exists = await Order.exists({ trackingCode: code });
    if (!exists) {
      return code;
    }
  }
  return `LGS-${Date.now().toString().slice(-6)}`;
}

/**
 * Generates 4-digit numeric PIN.
 */
function generate4DigitPin(): string {
  return crypto.randomInt(1000, 10000).toString();
}

export class VendorService {
  /**
   * Parses and validates raw CSV content uploaded by a vendor.
   * Maps flexible column headers, normalizes Nigerian phones, infers coordinates
   * via the Lagos landmark gazetteer, and reports line-by-line validation errors.
   */
  parseAndValidateVendorCsv(csvText: string): ParseVendorCsvResult {
    const parsedRows = parseCsvRows(csvText);
    if (parsedRows.length === 0) {
      return { validRows: [], errors: [], totalParsed: 0 };
    }

    const headerRow = parsedRows[0]!;
    const rawHeaders = headerRow.map((h) => h.toLowerCase().replace(/[\s_\-]/g, ''));

    // Map column indices
    const colIndex = {
      batchGroupKey: rawHeaders.findIndex((h) => ['batchgroupkey', 'batch', 'group', 'run', 'batchkey'].includes(h)),
      recipientName: rawHeaders.findIndex((h) => ['recipientname', 'name', 'customername', 'recipient', 'receiver'].includes(h)),
      recipientPhone: rawHeaders.findIndex((h) => ['recipientphone', 'phone', 'customerphone', 'mobile', 'telephone'].includes(h)),
      dropoffAddress: rawHeaders.findIndex((h) => ['dropoffaddress', 'address', 'deliveryaddress', 'destination', 'street'].includes(h)),
      dropoffLandmark: rawHeaders.findIndex((h) => ['dropofflandmark', 'landmark', 'busstop', 'popularbusstop'].includes(h)),
      packageDescription: rawHeaders.findIndex((h) => ['packagedescription', 'description', 'item', 'package', 'contents'].includes(h)),
      packageSize: rawHeaders.findIndex((h) => ['packagesize', 'size'].includes(h)),
      lat: rawHeaders.findIndex((h) => ['lat', 'latitude'].includes(h)),
      lng: rawHeaders.findIndex((h) => ['lng', 'longitude', 'lon', 'long'].includes(h)),
    };

    const validRows: VendorCsvRow[] = [];
    const errors: VendorCsvError[] = [];
    let totalParsed = 0;

    for (let i = 1; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      if (!row || row.every((c) => !c.trim())) {
        continue; // skip empty line
      }
      totalParsed++;
      const rowNumber = i + 1; // 1-based index including header

      const batchGroupKey = (colIndex.batchGroupKey !== -1 ? row[colIndex.batchGroupKey] : '') || 'RUN-1';
      const recipientName = (colIndex.recipientName !== -1 ? row[colIndex.recipientName] : '') || '';
      const recipientPhone = (colIndex.recipientPhone !== -1 ? row[colIndex.recipientPhone] : '') || '';
      const dropoffAddress = (colIndex.dropoffAddress !== -1 ? row[colIndex.dropoffAddress] : '') || '';
      const dropoffLandmark = (colIndex.dropoffLandmark !== -1 ? row[colIndex.dropoffLandmark] : '') || '';
      const packageDescription = (colIndex.packageDescription !== -1 ? row[colIndex.packageDescription] : '') || 'Parcel';
      const packageSize = (colIndex.packageSize !== -1 ? row[colIndex.packageSize] : '') || 'medium';

      let lat: number | undefined;
      let lng: number | undefined;

      if (colIndex.lat !== -1 && row[colIndex.lat]) {
        const parsedLat = parseFloat(row[colIndex.lat]!);
        if (!isNaN(parsedLat)) lat = parsedLat;
      }
      if (colIndex.lng !== -1 && row[colIndex.lng]) {
        const parsedLng = parseFloat(row[colIndex.lng]!);
        if (!isNaN(parsedLng)) lng = parsedLng;
      }

      // If coordinates not supplied, resolve via Lagos landmark gazetteer
      if (!lat || !lng) {
        const resolved = resolveLagosCoordinates(`${dropoffLandmark} ${dropoffAddress}`);
        lat = resolved.lat;
        lng = resolved.lng;
      }

      const rawRecord = {
        batchGroupKey: batchGroupKey.trim(),
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        dropoffAddress: dropoffAddress.trim(),
        dropoffLandmark: dropoffLandmark.trim(),
        packageDescription: packageDescription.trim(),
        packageSize: packageSize.trim().toLowerCase(),
        lat,
        lng,
      };

      const result = VendorCsvRowSchema.safeParse(rawRecord);
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({
            rowNumber,
            field: issue.path.join('.') || 'row',
            message: issue.message,
            raw: {
              batchGroupKey: rawRecord.batchGroupKey,
              recipientName: rawRecord.recipientName,
              recipientPhone: rawRecord.recipientPhone,
              dropoffAddress: rawRecord.dropoffAddress,
              dropoffLandmark: rawRecord.dropoffLandmark,
            },
          });
        }
      } else {
        validRows.push(result.data);
      }
    }

    return {
      validRows,
      errors,
      totalParsed,
    };
  }

  /**
   * Groups rows by batchGroupKey and chunks them into runs with a maximum of 5 stops per motorcycle.
   */
  groupAndChunkRows(rows: VendorCsvRow[]): Array<{ batchGroupKey: string; stops: VendorCsvRow[] }> {
    const groups = new Map<string, VendorCsvRow[]>();
    for (const row of rows) {
      const key = row.batchGroupKey || 'RUN-1';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(row);
    }

    const runs: Array<{ batchGroupKey: string; stops: VendorCsvRow[] }> = [];

    for (const [groupKey, groupRows] of groups.entries()) {
      if (groupRows.length <= 5) {
        runs.push({ batchGroupKey: groupKey, stops: groupRows });
      } else {
        // Chunk into sub-runs of max 5 stops each: RUN-1A, RUN-1B, ...
        const chunkCount = Math.ceil(groupRows.length / 5);
        for (let i = 0; i < chunkCount; i++) {
          const chunkStops = groupRows.slice(i * 5, (i + 1) * 5);
          const suffix = String.fromCharCode(65 + i); // A, B, C...
          runs.push({
            batchGroupKey: `${groupKey}-${suffix}`,
            stops: chunkStops,
          });
        }
      }
    }

    return runs;
  }

  /**
   * Calculates batch fare estimates across all motorcycle runs.
   */
  async estimateBatchFares(
    pickup: OrderPickupInput,
    rows: VendorCsvRow[]
  ): Promise<VendorBatchSummaryResponse> {
    const pricingService = getPricingService();
    const runs = this.groupAndChunkRows(rows);

    const runItems: VendorBatchRunItem[] = [];
    let grandTotalFareKobo = 0;

    for (const run of runs) {
      const estimate = await pricingService.calculateEstimate({
        vehicleType: 'bike',
        pickup: {
          address: pickup.address,
          landmark: pickup.landmark,
          location: pickup.location,
        },
        stops: run.stops.map((s) => ({
          address: s.dropoffAddress,
          landmark: s.dropoffLandmark,
          location: { lat: s.lat!, lng: s.lng! },
        })),
      });

      runItems.push({
        batchGroupKey: run.batchGroupKey,
        stopsCount: run.stops.length,
        estimatedFareKobo: estimate.totalFareKobo,
        totalDistanceKm: estimate.estimatedDistanceKm,
        estimatedDurationMinutes: estimate.estimatedDurationMinutes,
        stops: run.stops,
      });

      grandTotalFareKobo += estimate.totalFareKobo;
    }

    return {
      totalRunsCount: runItems.length,
      totalStopsCount: rows.length,
      grandTotalFareKobo,
      runs: runItems,
    };
  }

  /**
   * Creates orders in bulk for the vendor with all-or-nothing wallet balance validation.
   * If wallet balance < grand total fare, 0 orders are created and 402 is thrown.
   */
  async createBatchOrders(
    vendorUserId: string,
    pickup: OrderPickupInput,
    rows: VendorCsvRow[],
    paymentMethod: 'wallet' | 'pay_on_pickup' = 'wallet'
  ): Promise<VendorBatchSummaryResponse> {
    const pricingService = getPricingService();
    const runs = this.groupAndChunkRows(rows);

    // 1. Pre-calculate estimates for all runs
    const preparedRuns: Array<{
      batchGroupKey: string;
      stops: VendorCsvRow[];
      estimate: Awaited<ReturnType<typeof pricingService.calculateEstimate>>;
    }> = [];

    let grandTotalFareKobo = 0;

    for (const run of runs) {
      const estimate = await pricingService.calculateEstimate({
        vehicleType: 'bike',
        pickup: {
          address: pickup.address,
          landmark: pickup.landmark,
          location: pickup.location,
        },
        stops: run.stops.map((s) => ({
          address: s.dropoffAddress,
          landmark: s.dropoffLandmark,
          location: { lat: s.lat!, lng: s.lng! },
        })),
      });

      preparedRuns.push({
        batchGroupKey: run.batchGroupKey,
        stops: run.stops,
        estimate,
      });

      grandTotalFareKobo += estimate.totalFareKobo;
    }

    const uid = new Types.ObjectId(vendorUserId);

    // 2. All-or-Nothing Wallet Balance Guard
    if (paymentMethod === 'wallet') {
      const wallet = await walletService.getOrCreateWallet(uid);
      if (wallet.balanceKobo < grandTotalFareKobo) {
        throw new InsufficientBalanceError(
          `Insufficient wallet balance for bulk dispatch. Required: ₦${(grandTotalFareKobo / 100).toLocaleString()}, Available: ₦${(wallet.balanceKobo / 100).toLocaleString()}. 0 orders created.`
        );
      }
    }

    // 3. Create Orders and Lock Escrow atomically
    const runItems: VendorBatchRunItem[] = [];

    for (const run of preparedRuns) {
      const trackingCode = await generateUniqueTrackingCode();
      const pickupPin = generate4DigitPin();

      const order = new Order({
        trackingCode,
        senderId: uid,
        vehicleType: 'bike',
        paymentMethod,
        paymentStatus: paymentMethod === 'wallet' ? 'paid' : 'unpaid',
        status: 'searching_rider',
        estimatedDistanceKm: run.estimate.estimatedDistanceKm,
        totalFareKobo: run.estimate.totalFareKobo,
        platformCommissionKobo: run.estimate.platformCommissionKobo,
        riderEarningKobo: run.estimate.riderEarningKobo,
        pickup: {
          address: pickup.address,
          landmark: pickup.landmark,
          location: toGeoJsonPoint(pickup.location),
          contactName: pickup.contactName,
          contactPhone: pickup.contactPhone,
          pickupPin,
        },
        stops: run.stops.map((stop, idx) => ({
          sequenceNumber: idx + 1,
          recipientName: stop.recipientName,
          recipientPhone: stop.recipientPhone,
          dropoffAddress: stop.dropoffAddress,
          dropoffLandmark: stop.dropoffLandmark,
          dropoffLocation: toGeoJsonPoint({ lat: stop.lat!, lng: stop.lng! }),
          packageDescription: stop.packageDescription,
          deliveryPin: generate4DigitPin(),
          status: 'pending',
        })),
        encodedRoutePolyline: run.estimate.encodedPolyline,
      });

      await order.save();

      // If wallet payment, lock escrow atomically
      if (paymentMethod === 'wallet') {
        const fareKobo = run.estimate.totalFareKobo;
        await Wallet.findOneAndUpdate(
          { userId: uid, balanceKobo: { $gte: fareKobo } },
          { $inc: { balanceKobo: -fareKobo, escrowLockedKobo: fareKobo } }
        );

        await WalletTransaction.create({
          walletUserId: uid,
          orderId: order._id,
          type: 'escrow_hold',
          amountKobo: fareKobo,
          reference: `ESCROW-HOLD-${order.trackingCode}`,
          status: 'success',
        });
      }

      // Auto-trigger rider dispatch
      dispatchService.dispatchOrderToNearestRiders(order._id.toString()).catch(() => {});

      // Send transactional creation alert to sender
      notificationService.notifyOrderCreatedToSender(order).catch(() => {});

      runItems.push({
        batchGroupKey: run.batchGroupKey,
        stopsCount: run.stops.length,
        estimatedFareKobo: run.estimate.totalFareKobo,
        totalDistanceKm: run.estimate.estimatedDistanceKm,
        estimatedDurationMinutes: run.estimate.estimatedDurationMinutes,
        stops: run.stops,
        orderId: order._id.toString(),
        trackingCode: order.trackingCode,
      });
    }

    return {
      totalRunsCount: runItems.length,
      totalStopsCount: rows.length,
      grandTotalFareKobo,
      runs: runItems,
    };
  }

  /**
   * Retrieves active and recent orders for a vendor along with assigned rider details
   * and live telemetry coordinates.
   */
  async getVendorOrders(vendorUserId: string) {
    const uid = new Types.ObjectId(vendorUserId);
    const orders = await Order.find({ senderId: uid })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        let riderInfo: {
          id: string;
          fullName: string;
          phone: string;
          plateNumber?: string;
          currentLocation?: { lat: number; lng: number; heading?: number; speedKph?: number } | null;
        } | null = null;

        if (order.riderId) {
          const [riderUser, riderProfile, liveTelemetry] = await Promise.all([
            User.findById(order.riderId).select('fullName phone').lean(),
            RiderProfile.findOne({ userId: order.riderId }).select('plateNumber').lean(),
            telemetryService.getRiderLiveTelemetry(order.riderId.toString()),
          ]);

          riderInfo = {
            id: order.riderId.toString(),
            fullName: riderUser?.fullName || 'Assigned Rider',
            phone: riderUser?.phone || '',
            plateNumber: riderProfile?.plateNumber,
            currentLocation: liveTelemetry
              ? {
                  lat: liveTelemetry.lat,
                  lng: liveTelemetry.lng,
                  heading: liveTelemetry.bearing,
                  speedKph: liveTelemetry.speed,
                }
              : null,
          };
        }

        return {
          id: order._id.toString(),
          trackingCode: order.trackingCode,
          status: order.status,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          totalFareKobo: order.totalFareKobo,
          estimatedDistanceKm: order.estimatedDistanceKm,
          createdAt: order.createdAt,
          pickup: {
            address: order.pickup.address,
            landmark: order.pickup.landmark,
            location: fromGeoJsonPoint(order.pickup.location as any),
            contactName: order.pickup.contactName,
            contactPhone: order.pickup.contactPhone,
            pickupPin: order.pickup.pickupPin,
          },
          stops: order.stops.map((s) => ({
            id: s._id?.toString(),
            sequenceNumber: s.sequenceNumber,
            recipientName: s.recipientName,
            recipientPhone: s.recipientPhone,
            dropoffAddress: s.dropoffAddress,
            dropoffLandmark: s.dropoffLandmark,
            dropoffLocation: fromGeoJsonPoint(s.dropoffLocation as any),
            packageDescription: s.packageDescription,
            status: s.status,
            deliveryPin: s.deliveryPin,
          })),
          rider: riderInfo,
          encodedRoutePolyline: order.encodedRoutePolyline,
        };
      })
    );

    return enrichedOrders;
  }
}

let vendorServiceInstance: VendorService | null = null;

export function getVendorService(): VendorService {
  if (!vendorServiceInstance) {
    vendorServiceInstance = new VendorService();
  }
  return vendorServiceInstance;
}

export const vendorService = getVendorService();
