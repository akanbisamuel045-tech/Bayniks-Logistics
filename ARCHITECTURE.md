# ARCHITECTURE.md — Nigerian Real-Time Logistics Platform (MongoDB + Redis Edition)

## 1. Project Overview & Core Mission
You are building a production-grade, on-demand Nigerian logistics and dispatch platform (modeled after **Bolt Send** and **GIG Logistics / GIGGo**). 
The core differentiator of this platform is **uninterrupted, sub-second live GPS tracking** of dispatch riders from pickup to final drop-off, accessible to recipients via a zero-install public web link (`https://domain.com/track/[tracking_code]`).

To overcome mobile browser background-location killing on Android devices (Infinix, Tecno, Xiaomi, Samsung), the architecture uses a **Hybrid Web + CapacitorJS APK Monorepo**:
1. **Customer, Vendor & Admin Portals:** Responsive Next.js Web Application.
2. **Dispatch Rider Application:** React + Vite Single Page Application (SPA) compiled into a native Android `.apk` via **CapacitorJS** with an active Android Foreground Geolocation Service.
3. **Backend API & Real-Time Engine:** Node.js (NestJS or Fastify) + Mongoose (MongoDB ODM) + Socket.io (with Redis Pub/Sub Adapter) + BullMQ background workers.
4. **Database & Geospatial Layer:** **MongoDB 7 (Replica Set enabled)** with **`2dsphere` GeoJSON indexes** for persistent records and spatial queries + **Redis 7** (`GEOADD` / `GEOSEARCH` / Hashes) for high-frequency live rider telemetry.

---

## 2. Strict Agent Execution Protocol (THE GOLDEN RULES)
You MUST obey these operational rules at all times:

1. **Stage-Gate Execution Only:** This project is divided into **22 strict stages**. You are FORBIDDEN from writing code for Stage $N+1$ until Stage $N$ has completed all four phases: **BUILD -> TEST -> DEBUG -> VERIFY**.
2. **Zero Placeholder / Mock Code in Final Stage Output:** Never leave `// TODO: implement later` or fake stub returns inside a completed stage. Every stage must be fully functional, typed, and tested.
3. **Terminal Verification Proof Required:** At the end of every stage, you must run the build (`npm run build`), typecheck (`npm run typecheck`), and stage-specific automated test suite in the terminal. If any test or typecheck fails, you must autonomously debug and re-run until the terminal output is 100% green before asking the user to proceed.
4. **GeoJSON Coordinate Ordering Law (CRITICAL):**
   - **MongoDB GeoJSON (`{ type: "Point", coordinates: [lng, lat] }`)** and **Redis (`GEOADD`, `GEOSEARCH`)** strictly require **`[longitude, latitude]`** order.
   - **Google Maps / Mapbox UI** and **Capacitor Geolocation** use **`(latitude, longitude)`** order.
   - Always use explicit named object properties (`{ lat: number, lng: number }`) across API payloads and Socket events, and convert to `[lng, lat]` strictly inside the MongoDB Mongoose/Redis repository layer.
5. **Database Write Protection:** NEVER write live 5-second rider GPS pings directly to MongoDB. All live coordinates MUST go to Redis RAM (`GEOADD` + Redis Hash + Redis List). MongoDB only receives the compressed `encodedRoutePolyline` when the order status transitions to `delivered`.
6. **Financial Precision & Atomic MongoDB Transactions:** 
   - Store all monetary values in **Integer Kobo** (e.g., `₦1,500.00` = `150000` kobo) or Mongoose `Decimal128` to avoid floating-point errors.
   - Use **MongoDB Multi-Document Transactions (`session.withTransaction()`)** and atomic operators (`$inc` with balance condition `{ balanceKobo: { $gte: amountKobo } }`) for all wallet deductions, escrow holds, and rider payouts. Every Paystack/Monnify webhook handler must be 100% idempotent.

---

## 3. Monorepo Directory Structure
Maintain this exact Turborepo workspace layout:

```text
.
├── ARCHITECTURE.md                 # This master constitution file
├── docker-compose.yml              # Local MongoDB 7 (Replica Set rs0) + Redis 7 containers
├── package.json                    # Root Turborepo scripts
├── turbo.json                      # Pipeline configuration
├── apps/
│   ├── api/                        # Node.js (NestJS/Fastify) + Mongoose + Socket.io + BullMQ
│   ├── customer-web/               # Next.js (App Router) + Tailwind CSS (Customer, Vendor & Admin UI)
│   └── rider-apk/                  # React + Vite + Tailwind + CapacitorJS (Android APK for Riders)
└── packages/
    ├── shared-types/               # Zod schemas, TypeScript interfaces, Socket event contracts
    ├── ui/                         # Shared Tailwind components & map utilities
    └── config/                     # Shared ESLint, TypeScript (tsconfig), and Prettier configs
```

---

## 4. Technical Stack & Nigerian Localizations
- **Language:** TypeScript 5.x (Strict mode enabled: `"strict": true`, `"noImplicitAny": true` across all workspaces).
- **Database ODM:** Mongoose 8.x with strict TypeScript schema inference. Local Docker MongoDB MUST run with `--replSet rs0` so ACID transactions (`session.startTransaction()`) work locally just like MongoDB Atlas in production.
- **Phone Number Standard:** Normalize all Nigerian phone numbers to E.164 format (`+2348031234567`) using `libphonenumber-js` before saving or querying.
- **Addressing Reality:** Every pickup and drop-off subdocument MUST include a `landmark` field (e.g., "Opposite Yellow Gate, beside Mama Put") alongside the GeoJSON coordinates, reflecting real-world Nigerian navigation.
- **Anti-Fraud Security:**
  - Every pickup requires a 4-digit `pickupPin` before the rider can transition the order to `in_transit`.
  - Every embedded drop-off stop requires a 4-digit `deliveryPin` (sent to the recipient via Termii SMS/WhatsApp) plus a compressed Proof-of-Delivery photo (<300KB) before marking `delivered` and releasing escrow funds.
- **CapacitorJS Android Rules (`apps/rider-apk`):**
  - Must compile to a static `dist/` folder.
  - `capacitor.config.ts` must set `android.useLegacyBridge: true` to prevent Android WebView pausing background timers after 5 minutes.
  - Must use `@capacitor-community/background-geolocation` with an active Android Foreground Notification (`FOREGROUND_SERVICE`) and offline IndexedDB coordinate queueing for dead network zones.

---

## 5. Core MongoDB Collections & Redis Contracts
### 5.1 MongoDB Mongoose Schemas (`apps/api/src/models`)

#### User Collection (`users`)
- `_id`: ObjectId
- `role`: `'customer' | 'vendor' | 'rider' | 'fleet_owner' | 'admin'`
- `fullName`: String (required)
- `phone`: String (unique index, E.164 `+234...`)
- `email`: String (sparse unique index)
- `passwordHash`: String
- `isVerified`: Boolean (default `false`)
- `createdAt`, `updatedAt`: Date

#### RiderProfile Collection (`rider_profiles`)
- `userId`: ObjectId (ref: User, unique index)
- `fleetOwnerId`: ObjectId (ref: User, default `null`, indexed)
- `vehicleType`: `'bike' | 'van' | 'truck'`
- `plateNumber`: String (unique index)
- `ridersCardNumber`: String (Lagos State Riders Card / MVAA permit)
- `kycStatus`: `'pending_review' | 'approved' | 'rejected'`
- `status`: `'offline' | 'available' | 'busy'` (indexed)
- `rating`: Number (default `5.0`)
- `lastLocation`: `{ type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: [Number] }` (`2dsphere` index — `[longitude, latitude]`)
- `lastSeenAt`: Date

#### Order Collection (`orders`) — Embeds Multi-Stop Subdocuments
- `_id`: ObjectId
- `trackingCode`: String (unique index, e.g., `"LGS-849201"`)
- `senderId`: ObjectId (ref: User, indexed)
- `riderId`: ObjectId (ref: User, default `null`, indexed)
- `status`: `'pending' | 'searching_rider' | 'rider_assigned' | 'arrived_pickup' | 'in_transit' | 'arrived_dropoff' | 'delivered' | 'cancelled' | 'disputed'` (indexed)
- `paymentMethod`: `'wallet' | 'card_bank' | 'pay_on_pickup' | 'pay_on_delivery'`
- `paymentStatus`: `'unpaid' | 'paid' | 'refunded'`
- `estimatedDistanceKm`: Number
- `totalFareKobo`: Number (Integer Kobo)
- `platformCommissionKobo`: Number
- `riderEarningKobo`: Number
- `pickup`:
  - `address`: String
  - `landmark`: String
  - `location`: `{ type: 'Point', coordinates: [Number, Number] }` (`2dsphere` index — `[lng, lat]`)
  - `contactName`: String
  - `contactPhone`: String
  - `pickupPin`: String (4 digits)
- `stops`: Array of Embedded OrderStop Subdocuments:
  - `_id`: ObjectId
  - `sequenceNumber`: Number (1, 2, 3...)
  - `recipientName`: String
  - `recipientPhone`: String
  - `dropoffAddress`: String
  - `dropoffLandmark`: String
  - `dropoffLocation`: `{ type: 'Point', coordinates: [Number, Number] }` (`[lng, lat]`)
  - `packageDescription`: String
  - `deliveryPin`: String (4 digits)
  - `proofOfDeliveryPhotoUrl`: String
  - `status`: `'pending' | 'en_route' | 'delivered' | 'failed'`
  - `deliveredAt`: Date
- `encodedRoutePolyline`: String (Populated ONLY when order finishes)
- `deliveredAt`: Date
- `createdAt`, `updatedAt`: Date

#### Wallet Collection (`wallets`)
- `userId`: ObjectId (ref: User, unique index)
- `balanceKobo`: Number (default 0, min 0)
- `escrowLockedKobo`: Number (default 0, min 0)
- `paystackDedicatedAccountNumber`: String
- `paystackBankName`: String
- `updatedAt`: Date

#### WalletTransaction Collection (`wallet_transactions`)
- `_id`: ObjectId
- `walletUserId`: ObjectId (ref: User, indexed)
- `orderId`: ObjectId (ref: Order, nullable)
- `type`: `'credit' | 'debit' | 'escrow_hold' | 'escrow_release' | 'payout'`
- `amountKobo`: Number
- `reference`: String (unique index for webhook idempotency)
- `status`: `'pending' | 'success' | 'failed'`
- `createdAt`: Date

---

### 5.2 Redis Real-Time Keys
- `riders:available:locations` -> Redis GEO Set storing `(lng, lat, rider_id)` of all online, idle riders.
- `rider:telemetry:<rider_id>` -> Redis Hash (TTL 60s) storing `{ lat, lng, bearing, speed, accuracy, battery_level, active_order_id, updated_at }`.
- `order:route_points:<order_id>` -> Redis List storing JSON strings `{"lat":...,"lng":...,"ts":...}` appended every 15s while `in_transit`.
- `lock:order:<order_id>` -> Redis String (`SET NX EX 10`) atomic lock preventing two riders from accepting the same order simultaneously.

---

## 6. WebSocket & REST Event Contracts (packages/shared-types)
All real-time communication must validate payloads with Zod schemas from `@logistics/shared-types`:
- `rider:location_ping` (Rider -> Server): `{ orderId?: string, lat: number, lng: number, bearing: number, speed: number, accuracy: number, batteryLevel?: number, timestamp: number }`
- `tracking:update` (Server -> Room `track:<tracking_code>`): `{ trackingCode: string, riderId: string, lat: number, lng: number, bearing: number, speed: number, status: OrderStatus, etaMinutes?: number, updatedAt: number }`
- `job:new_offer` (Server -> Room `rider:<rider_id>`): `{ orderId: string, trackingCode: string, pickupAddress: string, pickupLandmark?: string, estimatedDistanceKm: number, riderEarningKobo: number, stopsCount: number, expiresAt: number }`

---

## 7. The 22-Stage Execution Roadmap
Follow this exact sequence. Wait for user confirmation after presenting the Verification Proof of each stage.

1. **Stage 1:** Turborepo Monorepo, Workspaces & Shared TypeScript/Zod Contracts (`packages/shared-types`).
2. **Stage 2:** Dockerized MongoDB 7 (Replica Set rs0 for ACID Transactions) & Redis 7 Environment + Mongoose Schemas (`2dsphere` indexes) & Spatial Seed Script (`$nearSphere`).
3. **Stage 3:** Authentication, Nigerian Phone Normalization (+234), OTP Verification & Role-Based Access Control (RBAC).
4. **Stage 4:** Rider KYC, Vehicle Onboarding & Fleet Owner Linking (`RiderProfile` collection).
5. **Stage 5:** Geospatial Address Autocomplete & Dynamic Multi-Stop Fare Calculation Engine (with Redis route caching).
6. **Stage 6:** Customer Web App (`apps/customer-web`) — Responsive Booking UI & Multi-Stop Interactive Map Preview.
7. **Stage 7:** MongoDB ACID Wallet Ledger, Escrow Locking (`session.withTransaction`) & Idempotent Paystack/Monnify Webhook Integration.
8. **Stage 8:** Socket.io Gateway, JWT Handshake Auth, Isolated Rooms & Redis Pub/Sub Adapter.
9. **Stage 9:** High-Frequency Redis Telemetry Ingestion (`rider:location_ping`) & HTTP Fallback Endpoint (`POST /api/v1/telemetry/ping`).
10. **Stage 10:** Automated Nearest-Rider Geospatial Dispatch Worker (Redis `GEOSEARCH` with MongoDB `$nearSphere` fallback + Redis Atomic Locks + 30s Offer Countdown).
11. **Stage 11:** Dispatch Rider SPA UI (`apps/rider-apk`) — High-Contrast Motorcycle Dashboard & Job State Machine.
12. **Stage 12:** CapacitorJS Android Packaging, `AndroidManifest.xml` Permissions & Foreground Background-Geolocation Service.
13. **Stage 13:** Offline Telemetry Queue (IndexedDB) & Auto-Resync on Network Recovery.
14. **Stage 14:** Public Live-Tracking Web Page (`/track/[trackingCode]`) with `requestAnimationFrame` Smooth Bike Interpolation & Bearing Rotation.
15. **Stage 15:** Anti-Fraud 4-Digit Pickup/Delivery PIN Verification, Client-Side Photo Compression (<300KB) & Polyline Archival into MongoDB.
16. **Stage 16:** Termii SMS & WhatsApp DND Transactional Notification Pipeline (BullMQ Workers).
17. **Stage 17:** Business Vendor Portal — Bulk CSV Order Upload, Batch Booking & Multi-Rider Live Tracking Screen.
18. **Stage 18:** Fleet Owner & Super-Admin Command Center ("God's Eye View" Clustered Map & Mid-Trip Order Reassignment).
19. **Stage 19:** Automated Rider & Fleet Bank Payouts (Paystack NUBAN Resolution, Split Commissions & Transfer Webhooks).
20. **Stage 20:** End-to-End (E2E) Lifecycle Simulation & Chaos Testing (50-point Lagos GPX Route Replay + Network Drop Injection).
21. **Stage 21:** Security Hardening, NoSQL Injection Sanitization (`express-mongo-sanitize`), Redis Rate Limiting (PIN Brute-Force Protection) & Android Mock-Location (`isFromMockProvider`) Detection.
22. **Stage 22:** Production Dockerfiles, CI/CD Pipelines, MongoDB Atlas + Cloud Deployment Configs & Signed Release `.apk` Build Scripts.

---

## 8. Definition of Done (Per Stage Checklist)
Before declaring any stage complete, you must execute and report on these 4 steps:

- **[BUILD]:** List all files created or modified and explain how they satisfy the stage architecture.
- **[TEST]:** Write and execute automated unit/integration tests for the new stage features.
- **[DEBUG]:** Fix any linter warnings, TypeScript strict errors, or failing assertions.
- **[VERIFY]:** Show the clean terminal output of `npm run typecheck`, `npm run test`, and `npm run build`, then stop and ask: "Stage [X] is 100% verified. Ready to proceed to Stage [X+1]?"
