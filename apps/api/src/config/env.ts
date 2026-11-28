import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

let loaded = false;

/**
 * Loads environment variables from `apps/api/.env` and monorepo root `.env`
 * regardless of the current working directory used to launch scripts or API servers.
 */
export function loadApiEnv(): void {
  if (loaded) return;
  loaded = true;

  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../../.env'),
  ];

  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false });
    }
  }
}

loadApiEnv();

