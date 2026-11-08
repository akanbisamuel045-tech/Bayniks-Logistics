import { describe, it, expect } from 'vitest';
import {
  compressPodPhotoUnder300KB,
  getBase64ByteSize,
} from '../services/imageCompressor.service';

describe('Stage 15: Client-Side Image Compressor (<300KB) for 3G Networks', () => {
  it('calculates accurate byte size from base64 Data URL', () => {
    // 100 characters of base64 data ≈ 75 bytes
    const base64Data = 'A'.repeat(100);
    const dataUrl = `data:image/jpeg;base64,${base64Data}`;
    const size = getBase64ByteSize(dataUrl);

    expect(size).toBe(75);
    expect(size).toBeLessThan(307200);
  });

  it('compresses a simulated mobile camera photo down to byteSize <= 300KB (307,200 bytes)', async () => {
    // Simulated raw 4MB image payload representation
    const simulatedRawPhoto = 'data:image/jpeg;base64,' + 'B'.repeat(100000);

    const result = await compressPodPhotoUnder300KB(simulatedRawPhoto);

    expect(result).toBeDefined();
    expect(result.dataUrl.startsWith('data:image/jpeg;base64,')).toBe(true);
    // Strict requirement: byteSize MUST be <= 300KB (307,200 bytes)
    expect(result.byteSize).toBeLessThanOrEqual(307200);
    expect(result.width).toBeLessThanOrEqual(1024);
    expect(result.height).toBeLessThanOrEqual(1024);
  });

  it('rejects invalid or empty image inputs cleanly', async () => {
    await expect(compressPodPhotoUnder300KB('')).rejects.toThrow('No image file or data URL provided');
    await expect(compressPodPhotoUnder300KB('   ')).rejects.toThrow('Invalid or empty image source');
  });
});

