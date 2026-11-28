import { connectMongo, disconnectMongo, getMongoUri } from '../config/db';
import { getRedisClient, closeRedis, getRedisUrl } from '../config/redis';

async function verifyConnections() {
  const mongoUri = getMongoUri();
  const maskedMongo = mongoUri.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@');
  const redisUrl = getRedisUrl();
  const maskedRedis = redisUrl.replace(/:\/\/([^:]*):([^@]+)@/, '://$1:****@');

  console.log(`[db:check] Testing MongoDB connection: ${maskedMongo}`);
  try {
    const mongooseInstance = await connectMongo(mongoUri);
    const admin = mongooseInstance.connection.db?.admin();
    const ping = await admin?.ping();
    const hello = await admin?.command({ hello: 1 }).catch(() => null);
    const hasReplSet = Boolean(hello?.setName);

    console.log(
      `[db:check] MongoDB OK (ping=${ping?.ok}, replicaSet=${hello?.setName || 'standalone'})`
    );
    if (!hasReplSet) {
      console.warn(
        '[db:check] WARNING: Connected MongoDB is NOT a Replica Set. ACID transactions require MongoDB Atlas or --replSet rs0.'
      );
    }
  } catch (err: any) {
    console.error('[db:check] MongoDB FAILED:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await disconnectMongo().catch(() => {});
  }

  console.log(`[db:check] Testing Redis connection: ${maskedRedis}`);
  const redis = getRedisClient(redisUrl);
  try {
    const pong = await redis.ping();
    console.log(`[db:check] Redis OK (${pong})`);
  } catch (err: any) {
    console.error('[db:check] Redis FAILED:', err?.message || err);
    console.error(
      '[db:check] Tip: Set REDIS_URL in apps/api/.env (e.g. Upstash rediss://... or Redis Cloud redis://...) or run local Redis.'
    );
    process.exitCode = 1;
  } finally {
    await closeRedis().catch(() => {});
  }
}

verifyConnections();

