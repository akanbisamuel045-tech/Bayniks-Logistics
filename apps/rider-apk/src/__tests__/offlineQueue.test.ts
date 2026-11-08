import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  offlineTelemetryQueue,
  OfflineTelemetryQueueService,
} from '../services/offlineTelemetryQueue.service';
import { backgroundLocationService } from '../services/backgroundLocation.service';
import { useRiderStore } from '../store/riderStore';
import type { RiderLocationPing } from '@logistics/shared-types';

describe('Stage 13: Offline Telemetry Queue (IndexedDB) & Auto-Resync', () => {
  let queue: OfflineTelemetryQueueService;

  beforeEach(async () => {
    vi.restoreAllMocks();
    queue = new OfflineTelemetryQueueService();
    await queue.clearQueue();
    await offlineTelemetryQueue.clearQueue();

    useRiderStore.setState({
      pendingOfflinePingsCount: 0,
      isNetworkConnected: true,
      authToken: 'mock-test-token',
    });
  });

  afterEach(async () => {
    await queue.clearQueue();
    await offlineTelemetryQueue.clearQueue();
  });

  it('enqueues failed pings in chronological order and prevents duplicates', async () => {
    const baseTime = 1710000000000;

    const ping1: RiderLocationPing = {
      lat: 6.5200,
      lng: 3.3700,
      bearing: 90,
      speed: 20,
      accuracy: 5,
      timestamp: baseTime + 2000,
      orderId: 'order-1',
    };

    const ping2: RiderLocationPing = {
      lat: 6.5210,
      lng: 3.3710,
      bearing: 95,
      speed: 22,
      accuracy: 4,
      timestamp: baseTime + 1000, // Arrived out of order
      orderId: 'order-1',
    };

    // 1. Enqueue ping1 then ping2
    await queue.enqueueOfflinePing(ping1);
    const count = await queue.enqueueOfflinePing(ping2);

    expect(count).toBe(2);

    // 2. Verify sorted chronologically
    const queued = await queue.getQueuedPings();
    expect(queued[0]?.timestamp).toBe(baseTime + 1000);
    expect(queued[1]?.timestamp).toBe(baseTime + 2000);

    // 3. Duplicate ping with same timestamp and location is not duplicated
    const duplicateCount = await queue.enqueueOfflinePing(ping1);
    expect(duplicateCount).toBe(2);
  });

  it('enforces ring-buffer capacity cap of 500 pings, dropping oldest', async () => {
    const baseTime = 1710000000000;

    // Enqueue 505 pings
    for (let i = 0; i < 505; i++) {
      await queue.enqueueOfflinePing({
        lat: 6.5000 + i * 0.0001,
        lng: 3.3000 + i * 0.0001,
        bearing: 0,
        speed: 15,
        accuracy: 3,
        timestamp: baseTime + i * 1000,
      });
    }

    const length = await queue.getQueueLength();
    expect(length).toBe(500);

    const queued = await queue.getQueuedPings();
    // Oldest 5 items (i = 0..4) should have been dropped; first is i = 5
    expect(queued[0]?.timestamp).toBe(baseTime + 5000);
    expect(queued[queued.length - 1]?.timestamp).toBe(baseTime + 504000);
  });

  it('automatically buffers pings into offlineTelemetryQueue when device is offline or network fails', async () => {
    const baseTime = 1710000000000;

    // Simulate network down: global fetch fails with network error
    const fetchMock = vi.fn().mockRejectedValue(new Error('Failed to fetch (offline)'));
    vi.stubGlobal('fetch', fetchMock);

    // Mock disconnected socket
    const disconnectedSocket: any = { connected: false };

    // Transmit 5 consecutive pings in dead zone
    for (let i = 0; i < 5; i++) {
      const ping: RiderLocationPing = {
        lat: 6.5200 + i * 0.001,
        lng: 3.3800 + i * 0.001,
        bearing: 45,
        speed: 25,
        accuracy: 4,
        timestamp: baseTime + i * 5000,
        orderId: 'order-offline-zone',
      };

      const result = await backgroundLocationService.transmitTelemetryPing(
        ping,
        disconnectedSocket,
        'token-xyz',
        'http://localhost:4000'
      );

      expect(result.transport).toBe('offline_queue');
      expect(result.queuedCount).toBe(i + 1);
    }

    const queuedPings = await offlineTelemetryQueue.getQueuedPings();
    expect(queuedPings.length).toBe(5);
    expect(queuedPings[0]?.timestamp).toBe(baseTime);
    expect(queuedPings[4]?.timestamp).toBe(baseTime + 20000);
  });

  it('flushes queued pings in batch chunks upon network recovery and clears queue', async () => {
    const baseTime = 1710000000000;

    // Populate queue with 3 offline pings
    for (let i = 0; i < 3; i++) {
      await offlineTelemetryQueue.enqueueOfflinePing({
        lat: 6.5300 + i * 0.001,
        lng: 3.3900 + i * 0.001,
        bearing: 60,
        speed: 28,
        accuracy: 3.5,
        timestamp: baseTime + i * 5000,
        orderId: 'order-resync-1',
      });
    }

    expect(await offlineTelemetryQueue.getQueueLength()).toBe(3);

    // Mock successful batch ingestion response from backend
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, count: 3 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    // Trigger flush
    const result = await offlineTelemetryQueue.flushOfflineQueue('http://localhost:4000', 'token-123');

    expect(result.flushedCount).toBe(3);
    expect(result.remainingCount).toBe(0);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/telemetry/ping',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-123',
        }),
        body: expect.stringContaining('"pings":'),
      })
    );

    // Verify queue is now empty
    const remaining = await offlineTelemetryQueue.getQueueLength();
    expect(remaining).toBe(0);
  });

  it('prevents concurrent flush runs using isFlushing mutex lock', async () => {
    // Populate queue with 1 ping
    await offlineTelemetryQueue.enqueueOfflinePing({
      lat: 6.5400,
      lng: 3.4000,
      bearing: 10,
      speed: 15,
      accuracy: 4,
      timestamp: Date.now(),
    });

    let resolveFetch: Function;
    const pendingFetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    const fetchMock = vi.fn().mockReturnValue(
      pendingFetchPromise.then(() => ({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, count: 1 }),
      }))
    );
    vi.stubGlobal('fetch', fetchMock);

    // Launch first flush (will hold lock until resolveFetch is called)
    const firstFlushPromise = offlineTelemetryQueue.flushOfflineQueue('http://localhost:4000', 'token');

    // Launch second flush immediately while first is in-flight
    const secondFlushPromise = offlineTelemetryQueue.flushOfflineQueue('http://localhost:4000', 'token');

    // Second flush should immediately bail out due to mutex
    const secondResult = await secondFlushPromise;
    expect(secondResult.flushedCount).toBe(0);

    // Resolve first flush
    resolveFetch!();
    const firstResult = await firstFlushPromise;
    expect(firstResult.flushedCount).toBe(1);

    // Fetch should only have been called once
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
