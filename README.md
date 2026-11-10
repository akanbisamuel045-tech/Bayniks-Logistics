# Bayniks Logistics Platform (Nigeria)
### High-Performance Real-Time Motorcycle Dispatch & Hyper-Local Delivery Infrastructure

[![CI/CD Pipeline](https://github.com/akanbisamuel045-tech/Bayniks-Logistics/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/akanbisamuel045-tech/Bayniks-Logistics/actions/workflows/ci-cd.yml)
[![Node Version](https://img.shields.io/badge/Node-%3E%3D20.0.0-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue.svg)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0%20(rs0)-brightgreen.svg)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-7.0%20RAM-red.svg)](https://redis.io/)
[![Next.js](https://img.shields.io/badge/Next.js-14%20App%20Router-black.svg)](https://nextjs.org/)

---

## 1. System Overview & Architecture Topology

Bayniks Logistics is an end-to-end, on-demand motorcycle delivery and fleet dispatch platform engineered specifically for the infrastructural realities of Lagos, Ibadan, and Nigerian metropolitan centers.

```
                              ┌────────────────────────────────────────┐
                              │      Cloudflare Edge / Nginx CDN       │
                              └───────────────────┬────────────────────┘
                                                  │
                 ┌────────────────────────────────┴────────────────────────────────┐
                 │                                                                 │
                 ▼                                                                 ▼
┌─────────────────────────────────┐                             ┌─────────────────────────────────┐
│     Next.js 14 App Router       │                             │     Express 5 + Socket.io       │
│      (`apps/customer-web`)      │                             │         (`apps/api`)            │
│  - Customer Booking (/)         │                             │  - Geospatial Dispatch Engine   │
│  - Live Tracking (/track/:code) │                             │  - Multi-Room Socket Gateway    │
│  - Vendor Portal (/vendor)      │◄─── HTTP / REST & WebSockets──────► - Paystack & Termii Webhooks  │
│  - Fleet & Admin Radar (/admin) │                             │  - ACID Financial Ledger        │
└────────────────┬────────────────┘                             └──────────────┬───┬──────────────┘
                 │                                                             │   │
                 ▼                                                             │   │
┌─────────────────────────────────┐                                            │   │
│ Android Capacitor 8 Rider APK   │                                            │   │
│       (`apps/rider-apk`)        │◄─────────── WebSocket Live Telemetry ───────┘   │
│  - 5-sec Foreground/BG GPS      │                                                │
│  - SQLite Offline Queue         │                                                │
│  - Canvas POD Image Compression │                                                │
└─────────────────────────────────┘                                                │
                                                                                   │
                 ┌─────────────────────────────────────────────────────────────────┴┐
                 │                                                                  │
                 ▼                                                                  ▼
┌─────────────────────────────────┐                              ┌──────────────────────────────────┐
│      Redis 7 In-Memory RAM      │                              │      MongoDB 7 Replica Set       │
│  - GEOADD `riders:available`    │                              │     (`rs0` Multi-Doc ACID)       │
│  - Live Hash `rider:telemetry`  │                              │  - Users & Rider Profiles        │
│  - Breadcrumb Route Buffers     │                              │  - Multi-Stop Orders & POD       │
│  - Sliding Window Rate Limiting │                              │  - Wallets, Escrow & Splits      │
└─────────────────────────────────┘                              └──────────────────────────────────┘
```

### Monorepo Workspaces

```
logistics/
├── apps/
│   ├── api/                   # Express 5, MongoDB Mongoose, Socket.io, Redis engine (:4000)
│   ├── customer-web/          # Next.js 14 App Router, Bayniks Design System (:3000)
│   │   ├── app/page.tsx       # Customer interactive order booking workstation
│   │   ├── app/track/[code]/  # Zero-install public live tracking radar
│   │   ├── app/vendor/        # Bulk CSV multi-stop vendor workstation
│   │   └── app/admin/         # Super-Admin & Fleet Owner God's Eye radar
│   └── rider-apk/             # Vite + React + Capacitor 8 Android app (:5173)
├── packages/
│   ├── shared-types/          # Canonical Zod schemas, contracts & GeoJSON helpers
│   ├── ui/                    # Reusable React components styled with Tailwind CSS
│   └── config/                # Shared ESLint, Tailwind, and TypeScript configurations
├── scripts/
│   ├── deploy-verify.mjs      # Production deployment manifest audit
│   └── twa-package-guide.mjs  # Google Play Store Bubblewrap TWA generator
├── docker-compose.prod.yml    # Full production stack (Mongo rs0, Redis 7, API, Web)
└── .github/workflows/         # GitHub Actions CI/CD test and build matrix
```

---

## 2. The Golden Architectural Invariants

Every service, database query, and network payload in this platform strictly adheres to three non-negotiable architectural laws:

### Golden Rule 4: GeoJSON Coordinate Ordering Law
- **MongoDB GeoJSON (`{ type: "Point", coordinates: [lng, lat] }`)** and **Redis (`GEOADD`, `GEOSEARCH`)** strictly require **`[longitude, latitude]`** order.
- **Client APIs, Google Maps, Mapbox, and Capacitor Geolocation** use **`(latitude, longitude)`** order or named properties (`{ lat: number, lng: number }`).
- *Invariant:* All external API payloads and Socket events use `{ lat, lng }`. Translation to `[lng, lat]` is performed exclusively inside the database/repository layer via `@logistics/shared-types` (`toGeoJsonPoint` / `fromGeoJsonPoint`).

### Golden Rule 5: Database Write Protection (Zero Disk Writes on Live Pings)
- Riders stream GPS telemetry every 5 seconds. Writing these high-frequency pings directly to MongoDB would saturate disk I/O.
- *Invariant:* All live coordinates are ingested strictly into **Redis RAM**:
  - `GEOADD riders:available:locations <lng> <lat> <riderId>`
  - `HSET rider:telemetry:<riderId> lat <lat> lng <lng> bearing <deg> speed <kmh>`
  - `RPUSH order:route_points:<orderId> <jsonPoint>`
- MongoDB receives only the compressed Google encoded route polyline once when the order transitions to `delivered`.

### Golden Rule 6: Financial Precision & Atomic MongoDB Transactions
- Floating-point currency calculations cause catastrophic rounding errors.
- *Invariant:* All currency values are stored as **Integer Kobo** (`150000` = `₦1,500.00`).
- All wallet debits, escrow locks, and rider/fleet 80/20 settlements execute within **MongoDB Multi-Document ACID Transactions (`session.withTransaction()`)** with atomic conditional balance checks (`{ balanceKobo: { $gte: amountKobo } }`).

---

## 3. Quick-Start Guide (Windows, macOS, Linux)

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0
- MongoDB 7 (with Replica Set `rs0` enabled for ACID transactions)
- Redis 7

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/akanbisamuel045-tech/Bayniks-Logistics.git
cd Bayniks-Logistics
npm install
```

### 2. Start Local MongoDB & Redis Services

#### Option A: Native Windows Services (PowerShell)
```powershell
# Start Redis (in terminal 1)
redis-server.exe

# Start MongoDB Replica Set rs0 (in terminal 2)
npx tsx apps/api/src/scripts/start-local-mongo.ts
```

#### Option B: Docker Compose
```bash
docker compose -f docker-compose.prod.yml up -d mongodb redis
```

### 3. Run the 1-Command Interactive Demo Seeder
Seed an entire ready-to-test Lagos ecosystem with funded wallets, active riders, and live in-transit tracking:

```bash
npm run demo:seed
```

This populates:
- **Super-Admin:** `admin@bayniks.com` / `BayniksPass2026!` (Command Center)
- **Fleet Owner:** `fleet@bayniks.com` / `BayniksPass2026!` (Wallet: `₦120,000.00`)
- **Vendor:** `vendor@bayniks.com` / `BayniksPass2026!` (Wallet: `₦85,000.00`)
- **Customer:** `kainul@bayniks.com` / `BayniksPass2026!` (Wallet: `₦45,200.00`)
- **3 Dispatch Riders:** Tariq Danladi (Busy on 3rd Mainland), Usman Bello (Available at Ikeja Mall), Chinedu Okafor (Pending KYC)
- **Live Order:** `BYN-LIVE01` (Active in-transit with live Redis telemetry)

### 4. Launch Development Servers
```bash
npm run dev
```

| Application | Local URL | Description |
| :--- | :--- | :--- |
| **Customer Web** | [http://localhost:3000](http://localhost:3000) | Instant parcel booking & pricing calculator |
| **Live Tracking** | [http://localhost:3000/track/BYN-LIVE01](http://localhost:3000/track/BYN-LIVE01) | Zero-install live GPS tracking radar |
| **Vendor Portal** | [http://localhost:3000/vendor](http://localhost:3000/vendor) | Bulk CSV multi-stop upload & batch escrow |
| **Admin & Fleet** | [http://localhost:3000/admin](http://localhost:3000/admin) | "God's Eye" live fleet radar & KYC verification |
| **Backend API** | [http://localhost:4000](http://localhost:4000) | REST API & WebSocket Gateway |
| **Rider APK (Web)** | [http://localhost:5173](http://localhost:5173) | Rider dispatch & trip management app |

---

## 4. Mobile Packaging Guide

### A. Rider Android APK (Capacitor 8)
The Rider mobile app (`apps/rider-apk`) is built with React, Vite, and Capacitor 8, featuring background location tracking and offline queueing.

```bash
# Build and sync native Android project
npm run apk:debug --workspace=rider-apk

# Or open in Android Studio:
npx cap open android --workspace=rider-apk
```

Output APK: `apps/rider-apk/android/app/build/outputs/apk/debug/app-debug.apk`

### B. Customer PWA to Google Play Store (Bubblewrap TWA)
`apps/customer-web` is installable as a Progressive Web App and configured for Google Play Store distribution via Trusted Web Activities (TWA):

```bash
# View the interactive packaging guide
node scripts/twa-package-guide.mjs
```

1. Ensure `apps/customer-web/public/.well-known/assetlinks.json` matches your production SHA-256 fingerprint.
2. Initialize Bubblewrap:
   ```bash
   npx @bubblewrap/cli init --manifest=https://your-domain.com/manifest.json
   ```
3. Build the Google Play Store Android App Bundle (`.aab`):
   ```bash
   npx @bubblewrap/cli build
   ```

---

## 5. Production Deployment Guide

### Multi-Stage Container Orchestration
The monorepo includes production multi-stage Dockerfiles (`apps/api/Dockerfile` and `apps/customer-web/Dockerfile`) configured with non-root security (`USER node`) and active healthcheck probes.

#### 1. Verify Deployment Manifests
```bash
npm run deploy:verify
```

#### 2. Configure Environment (`.env`)
```bash
cp .env.example .env
# Set secure JWT secrets, Paystack keys, and Termii API credentials
```

#### 3. Run Production Stack
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Health & Readiness Probes
- **Liveness Probe:** `GET /api/v1/health/live` (Fast process check)
- **Readiness Probe:** `GET /api/v1/health/ready` (Deep inspection of MongoDB Replica Set status and Redis round-trip latency)

---

## 6. Monorepo Verification & Testing Suite

Run the full verification suite across all 6 monorepo workspaces:

```bash
# Verify deployment manifests
npm run deploy:verify

# Static TypeScript typecheck across all workspaces
npm run typecheck

# Execute comprehensive automated test suite (244+ tests)
npm run test

# Build production bundles
npm run build
```

---

## 7. License & Credits

- **Engineering:** Built by Google DeepMind Advanced Agentic Coding Pair with USER.
- **Design System:** Bayniks Atomic Orange (`#FF6D1F`) & Obsidian (`#0E1013`).
- **License:** Proprietary & Confidential - Bayniks Logistics Nigeria.
