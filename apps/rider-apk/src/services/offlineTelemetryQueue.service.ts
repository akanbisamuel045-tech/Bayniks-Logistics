import type { RiderLocationPing } from '@logistics/shared-types';

const DB_NAME = 'lagosexpress_db';
const DB_VERSION = 1;
const STORE_NAME = 'telemetry_queue';
const QUEUE_STORAGE_KEY = 'lagosexpress:offline_pings_v1';
const MAX_QUEUE_SIZE = 500;
const BATCH_CHUNK_SIZE = 100;

class MemoryStore {
  private store = new Map<string, any>();

  async get(key: string): Promise<any> {
    return this.store.get(key);
  }

  async set(key: string, value: any): Promise<void> {
    this.store.set(key, value);
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

export class OfflineTelemetryQueueService {
  private memoryStore = new MemoryStore();
  private isFlushing = false;

  private isIndexedDbAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async getStorageRaw(): Promise<RiderLocationPing[]> {
    if (!this.isIndexedDbAvailable()) {
      const data = await this.memoryStore.get(QUEUE_STORAGE_KEY);
      return Array.isArray(data) ? data : [];
    }

    try {
      const db = await this.openDatabase();
      return new Promise<RiderLocationPing[]>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(QUEUE_STORAGE_KEY);

        req.onsuccess = () => {
          resolve(Array.isArray(req.result) ? req.result : []);
        };
        req.onerror = () => {
          resolve([]);
        };
      });
    } catch {
      const data = await this.memoryStore.get(QUEUE_STORAGE_KEY);
      return Array.isArray(data) ? data : [];
    }
  }

  private async setStorageRaw(pings: RiderLocationPing[]): Promise<void> {
    if (!this.isIndexedDbAvailable()) {
      await this.memoryStore.set(QUEUE_STORAGE_KEY, pings);
      return;
    }

    try {
      const db = await this.openDatabase();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(pings, QUEUE_STORAGE_KEY);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      await this.memoryStore.set(QUEUE_STORAGE_KEY, pings);
    }
  }

  /**
   * Enqueues an offline GPS ping to persistent storage.
   * Enforces 500-ping ring buffer cap and deduplicates identical timestamps.
   */
  public async enqueueOfflinePing(ping: RiderLocationPing): Promise<number> {
    const queue = await this.getStorageRaw();

    // Deduplicate identical timestamps
    const exists = queue.some(
      (p) => p.timestamp === ping.timestamp && p.lat === ping.lat && p.lng === ping.lng
    );
    if (!exists) {
      queue.push(ping);
    }

    // Sort chronologically ascending
    queue.sort((a, b) => a.timestamp - b.timestamp);

    // Enforce ring-buffer cap of 500 pings (drop oldest if exceeded)
    if (queue.length > MAX_QUEUE_SIZE) {
      queue.splice(0, queue.length - MAX_QUEUE_SIZE);
    }

    await this.setStorageRaw(queue);
    return queue.length;
  }

  /**
   * Returns all queued pings sorted chronologically.
   */
  public async getQueuedPings(): Promise<RiderLocationPing[]> {
    const queue = await this.getStorageRaw();
    return queue.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Returns current queue length.
   */
  public async getQueueLength(): Promise<number> {
    const queue = await this.getStorageRaw();
    return queue.length;
  }

  /**
   * Clears the entire queue (used in tests and on rider logout).
   */
  public async clearQueue(): Promise<void> {
    if (!this.isIndexedDbAvailable()) {
      await this.memoryStore.del(QUEUE_STORAGE_KEY);
      return;
    }

    try {
      const db = await this.openDatabase();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(QUEUE_STORAGE_KEY);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      await this.memoryStore.del(QUEUE_STORAGE_KEY);
    }
  }

  /**
   * Flushes queued offline pings to backend in chunks of up to 100 pings.
   * Mutex lock prevents concurrent flush runs.
   */
  public async flushOfflineQueue(
    apiBaseUrl = '',
    authToken = ''
  ): Promise<{ flushedCount: number; remainingCount: number }> {
    if (this.isFlushing) {
      return { flushedCount: 0, remainingCount: await this.getQueueLength() };
    }

    this.isFlushing = true;
    let totalFlushed = 0;

    try {
      while (true) {
        const currentQueue = await this.getStorageRaw();
        if (currentQueue.length === 0) {
          break;
        }

        const chunk = currentQueue.slice(0, BATCH_CHUNK_SIZE);
        const chunkTimestamps = new Set(chunk.map((p) => p.timestamp));

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        const res = await fetch(`${apiBaseUrl}/api/v1/telemetry/ping`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ pings: chunk }),
        });

        if (!res.ok) {
          // Network still down or server unavailable -> stop and retry later
          break;
        }

        // Successfully ingested chunk -> remove flushed items from queue
        const remainingQueue = currentQueue.filter((p) => !chunkTimestamps.has(p.timestamp));
        await this.setStorageRaw(remainingQueue);
        totalFlushed += chunk.length;

        if (remainingQueue.length === 0) {
          break;
        }
      }
    } catch {
      // Network failure during flush -> retain items for next retry
    } finally {
      this.isFlushing = false;
    }

    return {
      flushedCount: totalFlushed,
      remainingCount: await this.getQueueLength(),
    };
  }

  public isFlushingActive(): boolean {
    return this.isFlushing;
  }
}

export const offlineTelemetryQueue = new OfflineTelemetryQueueService();

