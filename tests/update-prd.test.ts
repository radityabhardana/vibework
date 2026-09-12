import assert from 'node:assert/strict';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { db } from '../src/lib/db';
import * as schema from '../src/lib/db/schema';
import { POST } from '../src/app/api/projects/update-prd/route';

const postUpdatePrd = (body: unknown) => POST(new Request('http://localhost/api/projects/update-prd', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
}));

function seedProject(options: {
  revision?: number;
  documentContent?: string;
  artifacts?: boolean;
} = {}) {
  const projectId = crypto.randomUUID();
  const prdId = crypto.randomUUID();
  const artifacts = options.artifacts ?? false;

  db.transaction((tx) => {
    tx.insert(schema.projects).values({
      id: projectId,
      name: 'Update PRD test project',
      specRevision: options.revision ?? 0,
      agentsDocument: artifacts ? 'old agents' : null,
      promptDocument: artifacts ? 'old prompt' : null,
      status: 'Generated',
    }).run();
    tx.insert(schema.prds).values({
      id: prdId,
      projectId,
      documentContent: options.documentContent ?? 'Original PRD',
      updatedAt: '2026-09-12T00:00:00.000Z',
    }).run();

    if (artifacts) {
      tx.insert(schema.adrs).values({
        id: crypto.randomUUID(),
        projectId,
        adrDocument: 'old adr',
      }).run();
      tx.insert(schema.schemas).values({
        id: crypto.randomUUID(),
        projectId,
        dbSchema: 'old schema',
        apiContract: { endpoints: [] },
      }).run();
      tx.insert(schema.atomicPrompts).values({
        id: crypto.randomUUID(),
        projectId,
        title: 'Old prompt',
        context: 'context',
        task: 'task',
        constraints: 'constraints',
        format: 'format',
        dependencies: [],
        executionOrder: 1,
      }).run();
      tx.insert(schema.appFlowcharts).values({
        id: crypto.randomUUID(),
        projectId,
        nodes: [],
        edges: [],
      }).run();
    }
  });

  return projectId;
}

function cleanupProject(projectId: string) {
  db.delete(schema.projects).where(eq(schema.projects.id, projectId)).run();
}

test('updates PRD atomically and invalidates only the target project artifacts', async () => {
  const projectId = seedProject({ artifacts: true });
  const otherProjectId = seedProject({ artifacts: true });
  try {
    const response = await postUpdatePrd({
      projectId,
      documentContent: 'Updated\r\nPRD',
      expectedRevision: 0,
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true,
      changed: true,
      operation: 'prd',
      committedRevision: 1,
      invalidated: ['adr', 'schema', 'prompts', 'flowchart', 'agents'],
    });

    const project = db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).get();
    const prd = db.select().from(schema.prds).where(eq(schema.prds.projectId, projectId)).get();
    assert.equal(project?.status, 'PRD Updated');
    assert.equal(project?.specRevision, 1);
    assert.equal(project?.agentsDocument, null);
    assert.equal(project?.promptDocument, null);
    assert.equal(prd?.documentContent, 'Updated\nPRD');
    assert.equal(db.select().from(schema.adrs).where(eq(schema.adrs.projectId, projectId)).all().length, 0);
    assert.equal(db.select().from(schema.schemas).where(eq(schema.schemas.projectId, projectId)).all().length, 0);
    assert.equal(db.select().from(schema.atomicPrompts).where(eq(schema.atomicPrompts.projectId, projectId)).all().length, 0);
    assert.equal(db.select().from(schema.appFlowcharts).where(eq(schema.appFlowcharts.projectId, projectId)).all().length, 0);

    const other = db.select().from(schema.projects).where(eq(schema.projects.id, otherProjectId)).get();
    assert.equal(other?.specRevision, 0);
    assert.equal(db.select().from(schema.adrs).where(eq(schema.adrs.projectId, otherProjectId)).all().length, 1);
  } finally {
    cleanupProject(projectId);
    cleanupProject(otherProjectId);
  }
});

test('treats equal LF-normalized content as a no-op', async () => {
  const projectId = seedProject({ documentContent: 'Same\nPRD', artifacts: true });
  try {
    const response = await postUpdatePrd({ projectId, documentContent: 'Same\r\nPRD', expectedRevision: 0 });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true,
      changed: false,
      operation: 'prd',
      committedRevision: 0,
      invalidated: [],
    });
    assert.equal(db.select().from(schema.adrs).where(eq(schema.adrs.projectId, projectId)).all().length, 1);
    assert.equal(db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).get()?.specRevision, 0);
  } finally {
    cleanupProject(projectId);
  }
});

test('rejects invalid update PRD input before touching persistence', async () => {
  const validProjectId = crypto.randomUUID();
  const invalidBodies = [
    { projectId: 'not-a-uuid', documentContent: 'PRD', expectedRevision: 0 },
    { projectId: validProjectId, documentContent: 'PRD', expectedRevision: -1 },
    { projectId: validProjectId, documentContent: 'PRD', expectedRevision: 1.5 },
    { projectId: validProjectId, documentContent: 'PRD', expectedRevision: '0' },
    { projectId: validProjectId, documentContent: ' \r\n ', expectedRevision: 0 },
    { projectId: validProjectId, documentContent: 'x'.repeat(50_001), expectedRevision: 0 },
  ];

  for (const body of invalidBodies) {
    const response = await postUpdatePrd(body);
    assert.equal(response.status, 400);
  }
});

test('rejects a stale expected revision with the current revision', async () => {
  const projectId = seedProject({ revision: 3 });
  try {
    const response = await postUpdatePrd({ projectId, documentContent: 'New PRD', expectedRevision: 2 });
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), {
      error: 'The project changed before the PRD update could be saved.',
      code: 'PROJECT_REVISION_CONFLICT',
      currentRevision: 3,
    });
  } finally {
    cleanupProject(projectId);
  }
});

test('rejects an active generation lease without changing the PRD', async () => {
  const projectId = seedProject();
  const now = Date.now();
  try {
    db.insert(schema.generationLeases).values({
      projectId,
      operation: 'schema',
      ownerToken: crypto.randomUUID(),
      acquiredAt: now,
      expiresAt: now + 60_000,
    }).run();

    const response = await postUpdatePrd({ projectId, documentContent: 'Should not save', expectedRevision: 0 });
    assert.equal(response.status, 409);
    assert.equal(response.headers.get('Retry-After') !== null, true);
    const body = await response.json();
    assert.equal(body.code, 'GENERATION_IN_PROGRESS');
    assert.equal(body.activeOperation, 'schema');
    assert.equal(db.select().from(schema.prds).where(eq(schema.prds.projectId, projectId)).get()?.documentContent, 'Original PRD');
    assert.equal(db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).get()?.specRevision, 0);
  } finally {
    cleanupProject(projectId);
  }
});
