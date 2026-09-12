import { NextResponse } from 'next/server';
import { and, eq, gt, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { adrs, appFlowcharts, atomicPrompts, generationLeases, prds, projects, schemas } from '@/lib/db/schema';
import { GenerationInProgressError } from '@/lib/generation-lease';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_DOCUMENT_CONTENT_LENGTH = 50_000;
const INVALIDATED_ARTIFACTS = ['adr', 'schema', 'prompts', 'flowchart', 'agents'] as const;

class ProjectRevisionConflictError extends Error {
  readonly currentRevision: number;

  constructor(currentRevision: number) {
    super('The project changed before the PRD update could be saved.');
    this.name = 'ProjectRevisionConflictError';
    this.currentRevision = currentRevision;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeDocumentContent(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\r\n?/g, '\n');
  if (normalized.trim().length === 0 || normalized.length > MAX_DOCUMENT_CONTENT_LENGTH) return null;
  return normalized;
}

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json().catch(() => null);
    if (!isRecord(body)
      || typeof body.projectId !== 'string'
      || !UUID_PATTERN.test(body.projectId)
      || typeof body.expectedRevision !== 'number'
      || !Number.isInteger(body.expectedRevision)
      || body.expectedRevision < 0) {
      return NextResponse.json({ error: 'A valid projectId and non-negative integer expectedRevision are required' }, { status: 400 });
    }

    const documentContent = normalizeDocumentContent(body.documentContent);
    if (documentContent === null) {
      return NextResponse.json({ error: 'documentContent must be non-empty and at most 50,000 UTF-16 characters after LF normalization' }, { status: 400 });
    }

    const projectId = body.projectId;
    const expectedRevision = body.expectedRevision;
    const nowMs = Date.now();
    const now = new Date().toISOString();

    const result = db.transaction((tx) => {
      const project = tx.select().from(projects).where(eq(projects.id, projectId)).get();
      if (!project) return { kind: 'not-found' as const };

      const prd = tx.select().from(prds).where(eq(prds.projectId, projectId)).get();
      if (!prd) return { kind: 'prd-not-found' as const };

      const currentRevision = project.specRevision ?? 0;
      if (currentRevision !== expectedRevision) {
        throw new ProjectRevisionConflictError(currentRevision);
      }

      const liveLease = tx.select().from(generationLeases).where(and(
        eq(generationLeases.projectId, projectId),
        gt(generationLeases.expiresAt, nowMs),
      )).get();
      if (liveLease) {
        throw new GenerationInProgressError(
          liveLease.operation,
          liveLease.expiresAt,
          nowMs,
        );
      }

      const currentDocumentContent = typeof prd.documentContent === 'string'
        ? prd.documentContent.replace(/\r\n?/g, '\n')
        : '';
      if (currentDocumentContent === documentContent) {
        return {
          kind: 'saved' as const,
          changed: false,
          committedRevision: currentRevision,
          invalidated: [] as string[],
        };
      }

      tx.update(prds)
        .set({ documentContent, updatedAt: now })
        .where(eq(prds.id, prd.id))
        .run();
      tx.delete(adrs).where(eq(adrs.projectId, projectId)).run();
      tx.delete(schemas).where(eq(schemas.projectId, projectId)).run();
      tx.delete(atomicPrompts).where(eq(atomicPrompts.projectId, projectId)).run();
      tx.delete(appFlowcharts).where(eq(appFlowcharts.projectId, projectId)).run();
      tx.update(projects).set({
        agentsDocument: null,
        promptDocument: null,
        status: 'PRD Updated',
        specRevision: sql`${projects.specRevision} + 1`,
        updatedAt: now,
      }).where(eq(projects.id, projectId)).run();

      const committedProject = tx.select({ specRevision: projects.specRevision })
        .from(projects)
        .where(eq(projects.id, projectId))
        .get();

      return {
        kind: 'saved' as const,
        changed: true,
        committedRevision: committedProject!.specRevision,
        invalidated: [...INVALIDATED_ARTIFACTS],
      };
    }, { behavior: 'immediate' });

    if (result.kind === 'not-found') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (result.kind === 'prd-not-found') {
      return NextResponse.json({ error: 'PRD not found for this project' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      changed: result.changed,
      operation: 'prd',
      committedRevision: result.committedRevision,
      invalidated: result.invalidated,
    });
  } catch (error: unknown) {
    if (error instanceof ProjectRevisionConflictError) {
      return NextResponse.json({
        error: error.message,
        code: 'PROJECT_REVISION_CONFLICT',
        currentRevision: error.currentRevision,
      }, { status: 409 });
    }
    if (error instanceof GenerationInProgressError) {
      return NextResponse.json({
        error: error.message,
        code: 'GENERATION_IN_PROGRESS',
        activeOperation: error.operation,
        retryAfterSeconds: error.retryAfterSeconds,
      }, {
        status: 409,
        headers: { 'Retry-After': String(error.retryAfterSeconds) },
      });
    }
    console.error('Update PRD Error:', error);
    return NextResponse.json({ error: 'Unable to update the PRD' }, { status: 500 });
  }
}
