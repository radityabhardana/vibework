import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import path from 'path';

// For local MVP, use a sqlite file in the root project directory
const sqlite = new Database(path.join(process.cwd(), 'vibework.db'));
export const db = drizzle(sqlite, { schema });
