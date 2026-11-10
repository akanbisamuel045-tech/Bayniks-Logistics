import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = path.resolve(__dirname, '../../../../');

describe('Stage 21: CI/CD Pipeline, Multi-Stage Dockerfiles & Automated Deployment Scripts', () => {
  // 1. Backend API Dockerfile Verification
  describe('1. Backend API Dockerfile (apps/api/Dockerfile)', () => {
    const dockerfilePath = path.join(rootDir, 'apps/api/Dockerfile');

    it('exists in apps/api directory', () => {
      expect(fs.existsSync(dockerfilePath)).toBe(true);
    });

    it('defines multi-stage builder and runner targets using node:20-alpine', () => {
      const content = fs.readFileSync(dockerfilePath, 'utf8');
      expect(content).toContain('FROM node:20-alpine AS builder');
      expect(content).toContain('FROM node:20-alpine AS runner');
    });

    it('enforces non-root USER node and exposes port 4000 with live healthcheck probe', () => {
      const content = fs.readFileSync(dockerfilePath, 'utf8');
      expect(content).toContain('USER node');
      expect(content).toContain('EXPOSE 4000');
      expect(content).toContain('HEALTHCHECK');
      expect(content).toContain('/api/v1/health/live');
      expect(content).toContain('NODE_ENV=production');
    });
  });

  // 2. Customer Web Dockerfile Verification
  describe('2. Customer Web Dockerfile (apps/customer-web/Dockerfile)', () => {
    const dockerfilePath = path.join(rootDir, 'apps/customer-web/Dockerfile');

    it('exists in apps/customer-web directory', () => {
      expect(fs.existsSync(dockerfilePath)).toBe(true);
    });

    it('defines multi-stage builder and runner targets', () => {
      const content = fs.readFileSync(dockerfilePath, 'utf8');
      expect(content).toContain('FROM node:20-alpine AS builder');
      expect(content).toContain('FROM node:20-alpine AS runner');
    });

    it('configures non-root execution, port 3000, and HTTP healthcheck', () => {
      const content = fs.readFileSync(dockerfilePath, 'utf8');
      expect(content).toContain('USER node');
      expect(content).toContain('EXPOSE 3000');
      expect(content).toContain('HEALTHCHECK');
      expect(content).toContain('NODE_ENV=production');
    });

    it('enables standalone output in next.config.js when DOCKER_BUILD is true', () => {
      const nextConfigPath = path.join(rootDir, 'apps/customer-web/next.config.js');
      const content = fs.readFileSync(nextConfigPath, 'utf8');
      expect(content).toContain('DOCKER_BUILD');
      expect(content).toContain('standalone');
    });
  });

  // 3. Production Docker Compose Stack
  describe('3. Production Docker Compose Stack (docker-compose.prod.yml)', () => {
    const composePath = path.join(rootDir, 'docker-compose.prod.yml');

    it('exists in repository root', () => {
      expect(fs.existsSync(composePath)).toBe(true);
    });

    it('orchestrates MongoDB 7.0 Replica Set (rs0) with automated initiation healthcheck', () => {
      const content = fs.readFileSync(composePath, 'utf8');
      expect(content).toContain('image: mongo:7.0');
      expect(content).toContain('--replSet');
      expect(content).toContain('rs0');
      expect(content).toContain('healthcheck:');
    });

    it('orchestrates Redis 7 Alpine with AOF persistence enabled', () => {
      const content = fs.readFileSync(composePath, 'utf8');
      expect(content).toContain('image: redis:7-alpine');
      expect(content).toContain('--appendonly');
      expect(content).toContain('yes');
    });

    it('wires API and Web services with proper health dependencies and restart policies', () => {
      const content = fs.readFileSync(composePath, 'utf8');
      expect(content).toContain('container_name: bayniks-api');
      expect(content).toContain('container_name: bayniks-web');
      expect(content).toContain('condition: service_healthy');
      expect(content).toContain('restart: unless-stopped');
    });

    it('excludes build artifacts, keys, and caches via root .dockerignore', () => {
      const dockerignorePath = path.join(rootDir, '.dockerignore');
      expect(fs.existsSync(dockerignorePath)).toBe(true);
      const content = fs.readFileSync(dockerignorePath, 'utf8');
      expect(content).toContain('node_modules');
      expect(content).toContain('.next');
      expect(content).toContain('dist');
      expect(content).toContain('.git');
    });
  });

  // 4. GitHub Actions CI/CD Pipeline
  describe('4. GitHub Actions CI/CD Workflow (.github/workflows/ci-cd.yml)', () => {
    const ciPath = path.join(rootDir, '.github/workflows/ci-cd.yml');

    it('exists and triggers on push and pull_request to main', () => {
      expect(fs.existsSync(ciPath)).toBe(true);
      const content = fs.readFileSync(ciPath, 'utf8');
      expect(content).toContain('branches: [ main ]');
    });

    it('enforces all verification quality gates: typecheck, test, and build', () => {
      const content = fs.readFileSync(ciPath, 'utf8');
      expect(content).toContain('npm run typecheck');
      expect(content).toContain('npm run test');
      expect(content).toContain('npm run build');
      expect(content).toContain('npm run deploy:verify');
    });

    it('configures service containers for MongoDB rs0 and Redis 7', () => {
      const content = fs.readFileSync(ciPath, 'utf8');
      expect(content).toContain('image: redis:7-alpine');
      expect(content).toContain('mongodb-replica-set: \'rs0\'');
    });
  });

  // 5. Automated Deployment & TWA Scripts
  describe('5. Automated Deployment & TWA Scripts', () => {
    it('executes npm run deploy:verify with zero errors (exit code 0)', () => {
      const output = execSync('npm run deploy:verify', { cwd: rootDir, encoding: 'utf8' });
      expect(output).toContain('[STATUS: 100% READY]');
    });

    it('provides TWA Bubblewrap Google Play packaging guide', () => {
      const guidePath = path.join(rootDir, 'scripts/twa-package-guide.mjs');
      expect(fs.existsSync(guidePath)).toBe(true);
      const content = fs.readFileSync(guidePath, 'utf8');
      expect(content).toContain('@bubblewrap/cli');
      expect(content).toContain('com.bayniks.customer');
    });
  });
});

