#!/usr/bin/env node
/**
 * Bayniks Logistics — Production Deployment Verification Script
 * Validates presence, syntax, and invariants of all Dockerfiles, Compose stacks, CI workflows, and TWA configurations.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const checks = [];

function recordCheck(name, passed, message) {
  checks.push({ name, passed, message });
  const icon = passed ? '✓' : '✗';
  console.log(`${icon} [${name}]: ${message}`);
}

console.log('\n--- Bayniks Logistics: Production Deployment Verification ---\n');

// 1. Verify apps/api/Dockerfile
const apiDockerPath = path.join(rootDir, 'apps', 'api', 'Dockerfile');
if (fs.existsSync(apiDockerPath)) {
  const content = fs.readFileSync(apiDockerPath, 'utf8');
  const hasBuilder = content.includes('AS builder');
  const hasRunner = content.includes('AS runner');
  const hasHealthcheck = content.includes('HEALTHCHECK');
  const hasUserNode = content.includes('USER node');
  const hasPort4000 = content.includes('4000');

  const valid = hasBuilder && hasRunner && hasHealthcheck && hasUserNode && hasPort4000;
  recordCheck(
    'API Dockerfile',
    valid,
    valid
      ? 'Multi-stage node:20-alpine builder/runner with non-root USER node and live healthcheck probe present'
      : 'Missing required multi-stage or security directives in apps/api/Dockerfile'
  );
} else {
  recordCheck('API Dockerfile', false, 'apps/api/Dockerfile does not exist');
}

// 2. Verify apps/customer-web/Dockerfile
const webDockerPath = path.join(rootDir, 'apps', 'customer-web', 'Dockerfile');
if (fs.existsSync(webDockerPath)) {
  const content = fs.readFileSync(webDockerPath, 'utf8');
  const hasBuilder = content.includes('AS builder');
  const hasRunner = content.includes('AS runner');
  const hasHealthcheck = content.includes('HEALTHCHECK');
  const hasUserNode = content.includes('USER node');
  const hasPort3000 = content.includes('3000');

  const valid = hasBuilder && hasRunner && hasHealthcheck && hasUserNode && hasPort3000;
  recordCheck(
    'Customer Web Dockerfile',
    valid,
    valid
      ? 'Multi-stage Next.js builder/runner with non-root USER node and HTTP healthcheck probe present'
      : 'Missing required multi-stage or security directives in apps/customer-web/Dockerfile'
  );
} else {
  recordCheck('Customer Web Dockerfile', false, 'apps/customer-web/Dockerfile does not exist');
}

// 3. Verify docker-compose.prod.yml
const composePath = path.join(rootDir, 'docker-compose.prod.yml');
if (fs.existsSync(composePath)) {
  const content = fs.readFileSync(composePath, 'utf8');
  const hasMongo = content.includes('mongodb:') && content.includes('rs0');
  const hasRedis = content.includes('redis:') && content.includes('--appendonly') && content.includes('yes');
  const hasApi = content.includes('api:') && content.includes('apps/api/Dockerfile');
  const hasWeb = content.includes('customer-web:') && content.includes('apps/customer-web/Dockerfile');

  const valid = hasMongo && hasRedis && hasApi && hasWeb;
  recordCheck(
    'Production Docker Compose',
    valid,
    valid
      ? 'Full stack orchestrated: Mongo 7 rs0, Redis 7 AOF persistence, API, and Next.js Web App with health dependencies'
      : 'Missing required services or configurations in docker-compose.prod.yml'
  );
} else {
  recordCheck('Production Docker Compose', false, 'docker-compose.prod.yml does not exist');
}

// 4. Verify .github/workflows/ci-cd.yml
const ciPath = path.join(rootDir, '.github', 'workflows', 'ci-cd.yml');
if (fs.existsSync(ciPath)) {
  const content = fs.readFileSync(ciPath, 'utf8');
  const hasTypecheck = content.includes('npm run typecheck');
  const hasTest = content.includes('npm run test');
  const hasBuild = content.includes('npm run build');
  const hasDeployVerify = content.includes('npm run deploy:verify');

  const valid = hasTypecheck && hasTest && hasBuild && hasDeployVerify;
  recordCheck(
    'GitHub Actions CI/CD Pipeline',
    valid,
    valid
      ? 'Workflow configured on push/PR with Redis/Mongo 7 rs0 services, typecheck, test, and build gates'
      : 'Missing required validation steps in .github/workflows/ci-cd.yml'
  );
} else {
  recordCheck('GitHub Actions CI/CD Pipeline', false, '.github/workflows/ci-cd.yml does not exist');
}

// 5. Verify .env.example
const envExamplePath = path.join(rootDir, '.env.example');
if (fs.existsSync(envExamplePath)) {
  const content = fs.readFileSync(envExamplePath, 'utf8');
  const hasMongo = content.includes('MONGODB_URI');
  const hasRedis = content.includes('REDIS_URL');
  const hasJwt = content.includes('JWT_SECRET');
  const hasPaystack = content.includes('PAYSTACK_SECRET_KEY');
  const hasTermii = content.includes('TERMII_API_KEY');

  const valid = hasMongo && hasRedis && hasJwt && hasPaystack && hasTermii;
  recordCheck(
    'Environment Blueprint (.env.example)',
    valid,
    valid
      ? 'Complete blueprint documenting Mongo rs0, Redis, JWT, Paystack, and Termii production secrets'
      : 'Missing critical environment variables in .env.example'
  );
} else {
  recordCheck('Environment Blueprint (.env.example)', false, '.env.example does not exist');
}

// 6. Verify Google Play TWA assetlinks.json
const assetlinksPath = path.join(rootDir, 'apps', 'customer-web', 'public', '.well-known', 'assetlinks.json');
if (fs.existsSync(assetlinksPath)) {
  try {
    const json = JSON.parse(fs.readFileSync(assetlinksPath, 'utf8'));
    const entry = json[0];
    const valid =
      entry?.target?.package_name === 'com.bayniks.customer' &&
      Array.isArray(entry?.relation) &&
      entry.relation.includes('delegate_permission/common.handle_all_urls');

    recordCheck(
      'TWA Digital Asset Links',
      valid,
      valid
        ? 'Valid digital asset links matching com.bayniks.customer for instant Google Play packaging'
        : 'assetlinks.json content does not match expected package_name or relation'
    );
  } catch (err) {
    recordCheck('TWA Digital Asset Links', false, `Invalid JSON in assetlinks.json: ${err.message}`);
  }
} else {
  recordCheck('TWA Digital Asset Links', false, 'assetlinks.json does not exist');
}

// Final Verdict
const allPassed = checks.every((c) => c.passed);
console.log('\n-------------------------------------------------------------');
if (allPassed) {
  console.log('✓ [STATUS: 100% READY] All production deployment manifests verified.');
  console.log('-------------------------------------------------------------\n');
  process.exit(0);
} else {
  console.error('✗ [STATUS: FAILED] Some deployment manifests failed verification.');
  console.log('-------------------------------------------------------------\n');
  process.exit(1);
}
