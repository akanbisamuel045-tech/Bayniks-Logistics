import { MongoMemoryReplSet } from 'mongodb-memory-server';

async function start() {
  console.log('[MongoDaemon] Starting MongoDB Replica Set (rs0) on port 27017...');
  const replSet = await MongoMemoryReplSet.create({
    replSet: {
      name: 'rs0',
      count: 1,
      storageEngine: 'wiredTiger',
    },
    instanceOpts: [
      {
        port: 27017,
      },
    ],
  });

  const uri = replSet.getUri('logistics_db');
  console.log('[MongoDaemon] Replica Set rs0 is ready and listening at:', uri);

  // Keep process open
  process.on('SIGINT', async () => {
    console.log('[MongoDaemon] Stopping MongoDB Replica Set...');
    await replSet.stop();
    process.exit(0);
  });
}

start().catch((err) => {
  console.error('[MongoDaemon] Failed to start:', err);
  process.exit(1);
});

