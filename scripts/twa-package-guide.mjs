#!/usr/bin/env node
/**
 * Bayniks Logistics — Bubblewrap TWA Google Play Packaging Helper
 * Explains how to package the Bayniks customer web application into an Android APK / AAB.
 */

console.log(`
================================================================================
   Bayniks Logistics — Trusted Web Activity (TWA) Google Play Packaging Guide
================================================================================

This guide enables generating a signed Google Play Store Android App Bundle (.aab)
and APK for the Bayniks Web Application using Google's official Bubblewrap CLI.

PREREQUISITES:
1. Node.js 18+ and Java Development Kit (JDK 17+) installed.
2. Android SDK Command-line Tools.
3. Live production domain attached (e.g. https://bayniks.ng).

STEP-BY-STEP PACKAGING WORKFLOW:

1. Initialize Bubblewrap Project:
   ------------------------------------------------------------
   npx @bubblewrap/cli init --manifest=https://bayniks.ng/manifest.json

   When prompted:
   - Application Name: Bayniks Logistics
   - Short Name: Bayniks
   - Package ID: com.bayniks.customer
   - Display Mode: standalone
   - Orientation: portrait
   - Status Bar Color: #FF6D1F (Bayniks Atomic Orange)
   - Navigation Bar Color: #0E1013 (Obsidian Dark)

2. Generate Production Signing Key:
   ------------------------------------------------------------
   Follow the Bubblewrap keystore prompt or generate a keystore:
   keytool -genkey -v -keystore bayniks-release-key.jks \\
     -alias bayniks-key -keyalg RSA -keysize 2048 -validity 10000

3. Retrieve SHA-256 Fingerprint:
   ------------------------------------------------------------
   keytool -list -v -keystore bayniks-release-key.jks -alias bayniks-key

   Copy the "Certificate fingerprint: SHA256: XX:XX:XX..." output.

4. Update Digital Asset Links:
   ------------------------------------------------------------
   Paste the SHA-256 fingerprint into:
   apps/customer-web/public/.well-known/assetlinks.json

   Deploy the updated site so Google Play can verify digital ownership:
   https://bayniks.ng/.well-known/assetlinks.json

5. Build Signed Android App Bundle (.aab):
   ------------------------------------------------------------
   npx @bubblewrap/cli build

   Output:
   - app-release-bundle.aab (Upload directly to Google Play Console)
   - app-release-signed.apk (For direct sideloading or internal testing)

================================================================================
`);

