import mongoose from 'mongoose';
import './env';

export function getMongoUri(): string {
  return (
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    'mongodb://127.0.0.1:27017/logistics_db?replicaSet=rs0'
  );
}

export const DEFAULT_MONGO_URI = getMongoUri();

export async function connectMongo(uri?: string): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  const resolvedUri = uri || getMongoUri();
  const isSrvAtlas = resolvedUri.startsWith('mongodb+srv://');

  // Ensure 2dsphere and unique indexes are automatically built; give Atlas SRV + TLS 10s
  await mongoose.connect(resolvedUri, {
    autoIndex: true,
    serverSelectionTimeoutMS: isSrvAtlas ? 10000 : 5000,
    appName: 'bayniks-api',
  });

  return mongoose;
}

export async function disconnectMongo(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

export async function checkMongoHealth(): Promise<{ status: 'ok' | 'error'; readyState: number; details?: string }> {
  try {
    const readyState = mongoose.connection.readyState;
    if (readyState !== 1) {
      return { status: 'error', readyState, details: 'MongoDB is not connected' };
    }

    if (!mongoose.connection.db) {
      return { status: 'error', readyState, details: 'Database instance unavailable' };
    }

    const pingResult = await mongoose.connection.db.admin().ping();
    if (pingResult && pingResult.ok === 1) {
      return { status: 'ok', readyState };
    }

    return { status: 'error', readyState, details: 'Ping command failed' };
  } catch (error) {
    return {
      status: 'error',
      readyState: mongoose.connection.readyState,
      details: error instanceof Error ? error.message : String(error),
    };
  }
}
