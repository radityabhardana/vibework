import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import path from 'path';

// For local MVP, use a sqlite file in the root project directory with singleton cache
const globalForDb = globalThis as unknown as {
  sqlite: InstanceType<typeof Database> | undefined;
};

const sqlite = globalForDb.sqlite ?? new Database(path.join(process.cwd(), 'vibework.db'));
sqlite.pragma('foreign_keys = ON;');
sqlite.pragma('journal_mode = WAL;');

try {
  const pragma = sqlite.pragma('table_info(projects)') as Array<{ name: string }>;
  const columnNames = new Set(pragma.map(col => col.name));
  if (!columnNames.has('agents_document')) {
    try {
      sqlite.exec('ALTER TABLE projects ADD COLUMN agents_document TEXT;');
    } catch {
      // Column may have been added concurrently by another worker
    }
  }
  if (!columnNames.has('prompt_document')) {
    try {
      sqlite.exec('ALTER TABLE projects ADD COLUMN prompt_document TEXT;');
    } catch {
      // Column may have been added concurrently by another worker
    }
  }
} catch {
  // Pragma or table might not exist yet
}

if (process.env.NODE_ENV !== 'production') {
  globalForDb.sqlite = sqlite;
}

export const db = drizzle(sqlite, { schema });
