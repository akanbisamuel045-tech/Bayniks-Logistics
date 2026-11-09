import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mock next/font/google so layout can be imported in Node/Vitest test environment
vi.mock('next/font/google', () => ({
  Plus_Jakarta_Sans: () => ({ variable: '--font-plus-jakarta' }),
  Space_Grotesk: () => ({ variable: '--font-space-grotesk' }),
}));

import { metadata, viewport } from '../app/layout';

describe('PWA & TWA Groundwork Verification', () => {
  const publicDir = path.resolve(__dirname, '..', 'public');
  const manifestPath = path.join(publicDir, 'manifest.json');
  const swPath = path.join(publicDir, 'sw.js');
  const icon192Path = path.join(publicDir, 'icons', 'icon-192.png');
  const icon512Path = path.join(publicDir, 'icons', 'icon-512.png');

  describe('1. Web App Manifest (`public/manifest.json`)', () => {
    it('manifest file exists and is valid JSON', () => {
      expect(fs.existsSync(manifestPath)).toBe(true);
      const content = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(content);

      expect(manifest.name).toBe('Bayniks Logistics');
      expect(manifest.short_name).toBe('Bayniks');
      expect(manifest.start_url).toBe('/');
      expect(manifest.display).toBe('standalone');
      expect(manifest.orientation).toBe('portrait');
      expect(manifest.theme_color).toBe('#FF6D1F');
      expect(manifest.background_color).toBe('#0E1013');
    });

    it('declares 192x192 and 512x512 icons with any maskable purpose', () => {
      const content = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(content);

      expect(Array.isArray(manifest.icons)).toBe(true);
      expect(manifest.icons).toHaveLength(2);

      const icon192 = manifest.icons.find((i: any) => i.sizes === '192x192');
      expect(icon192).toBeDefined();
      expect(icon192.src).toBe('/icons/icon-192.png');
      expect(icon192.type).toBe('image/png');
      expect(icon192.purpose).toContain('maskable');

      const icon512 = manifest.icons.find((i: any) => i.sizes === '512x512');
      expect(icon512).toBeDefined();
      expect(icon512.src).toBe('/icons/icon-512.png');
      expect(icon512.type).toBe('image/png');
      expect(icon512.purpose).toContain('maskable');
    });

    it('physical icon files exist on disk with valid byte sizes', () => {
      expect(fs.existsSync(icon192Path)).toBe(true);
      expect(fs.statSync(icon192Path).size).toBeGreaterThan(500);

      expect(fs.existsSync(icon512Path)).toBe(true);
      expect(fs.statSync(icon512Path).size).toBeGreaterThan(1000);
    });
  });

  describe('2. Offline-Resilient Service Worker (`public/sw.js`)', () => {
    it('service worker file exists and contains core lifecycle handlers', () => {
      expect(fs.existsSync(swPath)).toBe(true);
      const swCode = fs.readFileSync(swPath, 'utf8');

      // Check standard service worker event listeners
      expect(swCode).toContain("addEventListener('install'");
      expect(swCode).toContain("addEventListener('activate'");
      expect(swCode).toContain("addEventListener('fetch'");

      // Check pre-cache assets and caching strategy keywords
      expect(swCode).toContain('PRECACHE_ASSETS');
      expect(swCode).toContain('/manifest.json');
      expect(swCode).toContain('caches.open');
      expect(swCode).toContain('caches.match');
    });
  });

  describe('3. Next.js App Layout PWA Metadata & Viewport', () => {
    it('exports manifest link and Apple Web App settings in metadata', () => {
      expect(metadata).toBeDefined();
      expect(metadata.manifest).toBe('/manifest.json');

      expect(metadata.appleWebApp).toBeDefined();
      expect(metadata.appleWebApp).toEqual({
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'Bayniks',
      });
    });

    it('exports mobile viewport configuration for standalone app feel', () => {
      expect(viewport).toBeDefined();
      expect(viewport.themeColor).toBe('#FF6D1F');
      expect(viewport.width).toBe('device-width');
      expect(viewport.initialScale).toBe(1);
      expect(viewport.maximumScale).toBe(1);
      expect(viewport.userScalable).toBe(false);
      expect(viewport.viewportFit).toBe('cover');
    });
  });
});
