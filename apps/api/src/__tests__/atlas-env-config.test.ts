import { describe, it, expect, afterEach } from 'vitest';
import { getMongoUri } from '../config/db';
import { getRedisUrl } from '../config/redis';

describe('MongoDB Atlas & Redis TLS Environment Resolution', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('resolves MONGO_URI first, then MONGODB_URI, then local replica set fallback', () => {
    delete process.env.MONGO_URI;
    delete process.env.MONGODB_URI;
    expect(getMongoUri()).toBe('mongodb://127.0.0.1:27017/logistics_db?replicaSet=rs0');

    process.env.MONGODB_URI = 'mongodb+srv://user:pass@cluster0.mongodb.net/logistics_db';
    expect(getMongoUri()).toBe('mongodb+srv://user:pass@cluster0.mongodb.net/logistics_db');

    process.env.MONGO_URI = 'mongodb+srv://primary:pass@atlas.mongodb.net/prod_db';
    expect(getMongoUri()).toBe('mongodb+srv://primary:pass@atlas.mongodb.net/prod_db');
  });

  it('resolves Redis URL including rediss:// TLS endpoints for managed Redis', () => {
    delete process.env.REDIS_URL;
    expect(getRedisUrl()).toBe('redis://127.0.0.1:6379');

    process.env.REDIS_URL = 'rediss://default:secret@fly-bayniks.upstash.io:6379';
    expect(getRedisUrl()).toBe('rediss://default:secret@fly-bayniks.upstash.io:6379');
  });
});

