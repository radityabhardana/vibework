import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import path from 'path';

// For local MVP, use a sqlite file in the root project directory with singleton cache
const globalForDb = globalThis as unknown as {
  sqlite: InstanceType<typeof Database> | undefined;
};

const sqlite = globalForDb.sqlite ?? new Database(path.join(process.cwd(), 'vibework.db'));
if (process.env.NODE_ENV !== 'production') {
  globalForDb.sqlite = sqlite;
}

export const db = drizzle(sqlite, { schema });
