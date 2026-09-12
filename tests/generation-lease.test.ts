import assert from 'node:assert/strict';
import test from 'node:test';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import * as schema from '../src/lib/db/schema';
import {
  acquireGenerationLease,
  GENERATION_LEASE_DURATION_MS,
  GenerationInProgressError,
  GenerationLeaseLostError,
  releaseGenerationLease,
  releaseGenerationLeaseBestEffort,
  withFencedGenerationCommit,
} from '../src/lib/generation-lease';

function createTestDatabase() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  sqlite.exec(`
    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT,
      spec_revision INTEGER NOT NULL DEFAULT 0,
      agents_document TEXT,
      prompt_document TEXT,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE generation_leases (
      project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
      operation TEXT NOT NULL,
      owner_token TEXT NOT NULL,
      acquired_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
  `);
  const database = drizzle(sqlite, { schema });
  database.insert(schema.projects).values({ id: 'project-1', name: 'Lease test' }).run();
  return { database, sqlite };
}

test('acquires a project-wide lease with a deterministic expiry', () => {
  const { database, sqlite } = createTestDatabase();
  try {
    const lease = acquireGenerationLease('project-1', 'adr', 1_000, database);

    assert.equal(lease.operation, 'adr');
    assert.equal(lease.acquiredAt, 1_000);
    assert.equal(lease.expiresAt, 1_000 + GENERATION_LEASE_DURATION_MS);
    assert.match(lease.ownerToken, /^[0-9a-f-]{36}$/i);
  } finally {
    sqlite.close();
  }
});

test('rejects a live lease without exposing its owner token', () => {
  const { database, sqlite } = createTestDatabase();
  try {
    const first = acquireGenerationLease('project-1', 'adr', 1_000, database);

    assert.throws(
      () => acquireGenerationLease('project-1', 'schema', 2_000, database),
      (error: unknown) => {
        assert.ok(error instanceof GenerationInProgressError);
        assert.equal(error.operation, 'adr');
        assert.equal(error.retryAfterSeconds, 119);
        assert.equal(error.message.includes(first.ownerToken), false);
        return true;
      },
    );
  } finally {
    sqlite.close();
  }
});

test('takes over an expired lease with a new operation and owner', () => {
  const { database, sqlite } = createTestDatabase();
  try {
    const first = acquireGenerationLease('project-1', 'adr', 1_000, database);
    const replacement = acquireGenerationLease(
      'project-1',
      'prompts',
      first.expiresAt,
      database,
    );

    assert.equal(replacement.operation, 'prompts');
    assert.notEqual(replacement.ownerToken, first.ownerToken);
  } finally {
    sqlite.close();
  }
});

test('fences a stale commit and conditionally releases only the owner lease', () => {
  const { database, sqlite } = createTestDatabase();
  try {
    const first = acquireGenerationLease('project-1', 'adr', 1_000, database);
    const replacement = acquireGenerationLease('project-1', 'schema', first.expiresAt, database);

    assert.throws(
      () => withFencedGenerationCommit(first, (tx) => {
        tx.update(schema.projects).set({ name: 'stale write' })
          .where(eq(schema.projects.id, 'project-1'));
      }, replacement.acquiredAt, database),
      (error: unknown) => error instanceof GenerationLeaseLostError,
    );

    const project = database.select({ name: schema.projects.name })
      .from(schema.projects)
      .where(eq(schema.projects.id, 'project-1'))
      .get();
    assert.equal(project?.name, 'Lease test');

    releaseGenerationLease(first, database);
    assert.equal(database.select().from(schema.generationLeases).all().length, 1);

    releaseGenerationLease(replacement, database);
    assert.equal(database.select().from(schema.generationLeases).all().length, 0);
  } finally {
    sqlite.close();
  }
});

test('does not surface a lease cleanup failure to the completed operation', () => {
  const throwingDatabase = {
    delete() {
      throw new Error('simulated cleanup failure');
    },
  } as unknown as Parameters<typeof releaseGenerationLease>[1];

  assert.doesNotThrow(() => releaseGenerationLeaseBestEffort({
    projectId: 'project-1',
    ownerToken: '00000000-0000-4000-8000-000000000001',
  }, throwingDatabase));
});
