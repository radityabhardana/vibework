import assert from 'node:assert/strict';
import test from 'node:test';
import Database from 'better-sqlite3';
import { migrateDatabase } from '../src/lib/db/migrate';

const OLD_PROJECT_COLUMNS = [
  'id',
  'name',
  'description',
  'status',
  'created_at',
  'updated_at',
  'agents_document',
  'prompt_document',
] as const;

function createLegacyDatabase() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  sqlite.exec(`
    CREATE TABLE projects (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      agents_document TEXT,
      prompt_document TEXT
    );
  `);

  const insert = sqlite.prepare(`
    INSERT INTO projects
      (id, name, description, status, created_at, updated_at, agents_document, prompt_document)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (let index = 1; index <= 4; index += 1) {
    insert.run(
      `project-${index}`,
      `Project ${index}`,
      `Description ${index}\nwith exact spacing`,
      index === 1 ? 'draft' : `status-${index}`,
      `2026-09-12T00:00:0${index}.000Z`,
      `2026-09-12T00:01:0${index}.000Z`,
      index === 2 ? 'AGENTS\ncontent' : null,
      index === 3 ? 'Prompt content: 100%' : null,
    );
  }
  return sqlite;
}

function projectSnapshot(sqlite: Database.Database) {
  return sqlite.prepare(`SELECT ${OLD_PROJECT_COLUMNS.join(', ')} FROM projects ORDER BY id`).all();
}

test('migrates legacy projects additively and remains idempotent', () => {
  const sqlite = createLegacyDatabase();
  try {
    const before = projectSnapshot(sqlite);

    migrateDatabase(sqlite);
    const firstRevisionRows = sqlite.prepare(
      'SELECT spec_revision FROM projects ORDER BY id',
    ).all() as Array<{ spec_revision: number }>;
    assert.deepEqual(firstRevisionRows, [0, 0, 0, 0].map((spec_revision) => ({ spec_revision })));

    const canonicalRevisions = [4, 9, 16, 25];
    sqlite.prepare('UPDATE projects SET spec_revision = ? WHERE id = ?').run(4, 'project-1');
    sqlite.prepare('UPDATE projects SET spec_revision = ? WHERE id = ?').run(9, 'project-2');
    sqlite.prepare('UPDATE projects SET spec_revision = ? WHERE id = ?').run(16, 'project-3');
    sqlite.prepare('UPDATE projects SET spec_revision = ? WHERE id = ?').run(25, 'project-4');

    migrateDatabase(sqlite);

    assert.deepEqual(projectSnapshot(sqlite), before);
    assert.deepEqual(
      sqlite.prepare('SELECT spec_revision FROM projects ORDER BY id').all(),
      canonicalRevisions.map((spec_revision) => ({ spec_revision })),
    );

    const revisionColumn = (sqlite.prepare('PRAGMA table_info(projects)').all() as Array<{
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | null;
    }>).find((column) => column.name === 'spec_revision');
    assert.deepEqual(revisionColumn, {
      cid: 8,
      name: 'spec_revision',
      type: 'INTEGER',
      notnull: 1,
      dflt_value: '0',
      pk: 0,
    });

    const leaseColumns = sqlite.prepare('PRAGMA table_info(generation_leases)').all() as Array<{ name: string }>;
    assert.deepEqual(leaseColumns.map((column) => column.name), [
      'project_id',
      'operation',
      'owner_token',
      'acquired_at',
      'expires_at',
    ]);

    sqlite.prepare(`
      INSERT INTO generation_leases
        (project_id, operation, owner_token, acquired_at, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('project-1', 'adr', '00000000-0000-4000-8000-000000000001', 1000, 121000);
    assert.throws(
      () => sqlite.prepare(`
        INSERT INTO generation_leases
          (project_id, operation, owner_token, acquired_at, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('missing-project', 'adr', '00000000-0000-4000-8000-000000000002', 1000, 121000),
      /FOREIGN KEY constraint failed/,
    );
    assert.throws(
      () => sqlite.prepare(`
        INSERT INTO generation_leases
          (project_id, operation, owner_token, acquired_at, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('project-2', 'invalid', '00000000-0000-4000-8000-000000000003', 1000, 121000),
      /CHECK constraint failed/,
    );

    assert.deepEqual(sqlite.pragma('foreign_key_check'), []);
    assert.deepEqual(sqlite.pragma('integrity_check'), [{ integrity_check: 'ok' }]);

    sqlite.prepare('DELETE FROM projects WHERE id = ?').run('project-1');
    const remainingLeases = sqlite.prepare(
      'SELECT COUNT(*) AS count FROM generation_leases',
    ).get() as { count: number };
    assert.equal(remainingLeases.count, 0);
  } finally {
    sqlite.close();
  }
});

test('does nothing safely when projects has not been created yet', () => {
  const sqlite = new Database(':memory:');
  try {
    migrateDatabase(sqlite);
    assert.deepEqual(sqlite.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table'",
    ).all(), []);
  } finally {
    sqlite.close();
  }
});
