import Database from 'better-sqlite3';

const EXPECTED_PROJECT_COLUMNS = [
  { name: 'spec_revision', type: 'integer', notNull: 1 },
] as const;

const EXPECTED_LEASE_COLUMNS = [
  { name: 'project_id', type: 'text', notNull: 1, primaryKey: 1 },
  { name: 'operation', type: 'text', notNull: 1, primaryKey: 0 },
  { name: 'owner_token', type: 'text', notNull: 1, primaryKey: 0 },
  { name: 'acquired_at', type: 'integer', notNull: 1, primaryKey: 0 },
  { name: 'expires_at', type: 'integer', notNull: 1, primaryKey: 0 },
] as const;

type SQLiteDatabase = InstanceType<typeof Database>;
type TableColumn = {
  name: string;
  type: string;
  notnull: number;
  pk: number;
  dflt_value: string | number | null;
};

function normalizeSql(value: string): string {
  return value.replace(/["`]/g, '').replace(/\s+/g, '').toLowerCase();
}

function assertProjectsColumn(sqlite: SQLiteDatabase): void {
  const columns = sqlite.prepare('PRAGMA table_info(projects)').all() as TableColumn[];
  for (const expected of EXPECTED_PROJECT_COLUMNS) {
    const column = columns.find((candidate) => candidate.name === expected.name);
    if (!column
      || column.type.toLowerCase() !== expected.type
      || column.notnull !== expected.notNull
      || !['0', 0, '(0)', "'0'"].includes(column.dflt_value as string | number)) {
      throw new Error('Database migration verification failed for projects.spec_revision.');
    }
  }
}

function assertLeaseTable(sqlite: SQLiteDatabase): void {
  const columns = sqlite.prepare('PRAGMA table_info(generation_leases)').all() as TableColumn[];
  if (columns.length !== EXPECTED_LEASE_COLUMNS.length
    || columns.some((column, index) => {
      const expected = EXPECTED_LEASE_COLUMNS[index];
      return column.name !== expected.name
        || column.type.toLowerCase() !== expected.type
        || column.notnull !== expected.notNull
        || column.pk !== expected.primaryKey;
    })) {
    throw new Error('Database migration verification failed for generation_leases columns.');
  }

  const foreignKeys = sqlite.prepare('PRAGMA foreign_key_list(generation_leases)').all() as Array<{
    table: string;
    from: string;
    to: string;
    on_delete: string;
    on_update: string;
  }>;
  if (foreignKeys.length !== 1
    || foreignKeys[0].table !== 'projects'
    || foreignKeys[0].from !== 'project_id'
    || foreignKeys[0].to !== 'id'
    || foreignKeys[0].on_delete.toLowerCase() !== 'cascade'
    || foreignKeys[0].on_update.toLowerCase() !== 'no action') {
    throw new Error('Database migration verification failed for generation_leases foreign key.');
  }

  const table = sqlite.prepare(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'generation_leases'",
  ).get() as { sql: string } | undefined;
  const tableSql = table?.sql ? normalizeSql(table.sql) : '';
  if (!tableSql.includes('constraintgeneration_leases_operation_checkcheck(generation_leases.operationin(\'adr\',\'schema\',\'prompts\'))')) {
    throw new Error('Database migration verification failed for generation_leases operation constraint.');
  }
}

function verifyMigration(sqlite: SQLiteDatabase): void {
  assertProjectsColumn(sqlite);
  assertLeaseTable(sqlite);

  const integrity = sqlite.pragma('integrity_check') as Array<{ integrity_check: string }>;
  if (integrity.length !== 1 || integrity[0].integrity_check.toLowerCase() !== 'ok') {
    throw new Error('Database migration verification failed integrity_check.');
  }

  const foreignKeyErrors = sqlite.pragma('foreign_key_check') as unknown[];
  if (foreignKeyErrors.length !== 0) {
    throw new Error('Database migration verification failed foreign_key_check.');
  }
}

export function migrateDatabase(sqlite: SQLiteDatabase): void {
  const migrate = sqlite.transaction(() => {
    const projectsTable = sqlite.prepare(
      "SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = 'projects'",
    ).get() as { present: number } | undefined;
    if (!projectsTable) return;

    const projectColumns = sqlite.prepare('PRAGMA table_info(projects)').all() as TableColumn[];
    if (!projectColumns.some((column) => column.name === 'spec_revision')) {
      sqlite.exec('ALTER TABLE projects ADD COLUMN spec_revision INTEGER NOT NULL DEFAULT 0');
    }

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS generation_leases (
        project_id TEXT PRIMARY KEY NOT NULL,
        operation TEXT NOT NULL,
        owner_token TEXT NOT NULL,
        acquired_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON UPDATE NO ACTION ON DELETE CASCADE,
        CONSTRAINT generation_leases_operation_check
          CHECK (generation_leases.operation IN ('adr', 'schema', 'prompts'))
      )
    `);

    verifyMigration(sqlite);
  });

  migrate.immediate();
}
