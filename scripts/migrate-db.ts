import Database from 'better-sqlite3';
import path from 'node:path';
import { migrateDatabase } from '../src/lib/db/migrate';

const sqlite = new Database(path.join(process.cwd(), 'vibework.db'));

try {
  sqlite.pragma('foreign_keys = ON;');
  sqlite.pragma('journal_mode = WAL;');
  migrateDatabase(sqlite);
} finally {
  sqlite.close();
}
