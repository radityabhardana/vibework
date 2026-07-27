import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { prds, adrs, atomicPrompts, projects, schemas } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateADR } from '@/lib/engine/prompt-chaining';
import { GenerationSourceChangedError } from '@/lib/generation-snapshot';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AdrData = {
  frontendStack: string;
  backendStack: string;
  database: string;
  deployment: string;
  adrDocument: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isAdrData(value: unknown): value is AdrData {
  return isRecord(value)
    && isNonEmptyString(value.frontendStack)
    && isNonEmptyString(value.backendStack)
    && isNonEmptyString(value.database)
    && isNonEmptyString(value.deployment)
    && isNonEmptyString(value.adrDocument);
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json().catch(() => null);
    if (!isRecord(body) || typeof body.projectId !== 'string' || !UUID_PATTERN.test(body.projectId)) {
      return NextResponse.json({ error: 'A valid projectId is required' }, { status: 400 });
    }
    const projectId = body.projectId;

    const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const prd = db.select().from(prds).where(eq(prds.projectId, projectId)).get();
    if (!prd || !prd.documentContent) {
      return NextResponse.json({ error: 'PRD not found or empty for this project' }, { status: 404 });
    }

    const adrData: unknown = await generateADR(prd.documentContent);
    if (!isAdrData(adrData)) {
      return NextResponse.json({ error: 'The generated ADR was incomplete' }, { status: 502 });
    }

    const values = {
      frontendStack: adrData.frontendStack.trim(),
      backendStack: adrData.backendStack.trim(),
      database: adrData.database.trim(),
      deployment: adrData.deployment.trim(),
      adrDocument: adrData.adrDocument.trim(),
    };
    const adrId = db.transaction((tx) => {
      const currentPrd = tx.select().from(prds).where(eq(prds.projectId, projectId)).get();
      if (!currentPrd
        || currentPrd.id !== prd.id
        || currentPrd.documentContent !== prd.documentContent
        || currentPrd.updatedAt !== prd.updatedAt) {
        throw new GenerationSourceChangedError();
      }

      const existing = tx.select().from(adrs).where(eq(adrs.projectId, projectId)).get();
      let id: string;

      if (existing) {
        tx.update(adrs).set(values).where(eq(adrs.projectId, projectId)).run();
        id = existing.id;
      } else {
        id = tx.insert(adrs).values({ projectId, ...values }).returning({ id: adrs.id }).get().id;
      }

      tx.delete(atomicPrompts).where(eq(atomicPrompts.projectId, projectId)).run();
      tx.delete(schemas).where(eq(schemas.projectId, projectId)).run();

      tx.update(projects).set({
        status: 'ADR Generated',
        updatedAt: new Date().toISOString(),
      }).where(eq(projects.id, projectId)).run();
      return id;
    });

    return NextResponse.json({ adrId });
  } catch (error: unknown) {
    console.error('Generate ADR Error:', error);
    if (error instanceof GenerationSourceChangedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: 'Unable to generate the ADR' }, { status: 500 });
  }
}
