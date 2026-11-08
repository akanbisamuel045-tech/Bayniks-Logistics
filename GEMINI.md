# Nigerian Real-Time Logistics Platform — Workspace Rules & Master Blueprint (MongoDB + Redis Edition)

See full specification in [ARCHITECTURE.md](file:///c:/Users/USER/Desktop/logistics/ARCHITECTURE.md).

## Strict Agent Execution Protocol (THE GOLDEN RULES)
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

## Definition of Done (Per Stage Checklist)
Before declaring any stage complete, execute and report on these 4 steps:
- **[BUILD]:** List all files created or modified and explain how they satisfy the stage architecture.
- **[TEST]:** Write and execute automated unit/integration tests for the new stage features.
- **[DEBUG]:** Fix any linter warnings, TypeScript strict errors, or failing assertions.
- **[VERIFY]:** Show the clean terminal output of `npm run typecheck`, `npm run test`, and `npm run build`, then stop and ask: "Stage [X] is 100% verified. Ready to proceed to Stage [X+1]?"
