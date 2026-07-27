import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { prds, adrs, atomicPrompts, schemas, projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateSchema } from '@/lib/engine/prompt-chaining';
import { GenerationSourceChangedError } from '@/lib/generation-snapshot';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SchemaData = {
  dbSchema: string;
  apiContract: { endpoints: unknown[] };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSchemaData(value: unknown): value is SchemaData {
  if (!isRecord(value)
    || typeof value.dbSchema !== 'string'
    || value.dbSchema.trim().length === 0
    || !isRecord(value.apiContract)
    || !Array.isArray(value.apiContract.endpoints)) {
    return false;
  }

  return value.apiContract.endpoints.every((endpoint) =>
    isRecord(endpoint)
    && typeof endpoint.method === 'string'
    && endpoint.method.trim().length > 0
    && typeof endpoint.path === 'string'
    && endpoint.path.trim().length > 0
  );
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

    const adr = db.select().from(adrs).where(eq(adrs.projectId, projectId)).get();
    if (!adr || !adr.adrDocument) {
      return NextResponse.json({ error: 'ADR not found or empty for this project' }, { status: 404 });
    }

    const schemaData: unknown = await generateSchema(prd.documentContent, adr.adrDocument);
    if (!isSchemaData(schemaData)) {
      return NextResponse.json({ error: 'The generated schema was incomplete' }, { status: 502 });
    }

    const values = {
      dbSchema: schemaData.dbSchema.trim(),
      apiContract: schemaData.apiContract,
    };
    const schemaId = db.transaction((tx) => {
      const currentPrd = tx.select().from(prds).where(eq(prds.projectId, projectId)).get();
      const currentAdr = tx.select().from(adrs).where(eq(adrs.projectId, projectId)).get();
      if (!currentPrd
        || !currentAdr
        || currentPrd.id !== prd.id
        || currentPrd.documentContent !== prd.documentContent
        || currentPrd.updatedAt !== prd.updatedAt
        || currentAdr.id !== adr.id
        || currentAdr.adrDocument !== adr.adrDocument) {
        throw new GenerationSourceChangedError();
      }

      const existing = tx.select().from(schemas).where(eq(schemas.projectId, projectId)).get();
      let id: string;

      if (existing) {
        tx.update(schemas).set(values).where(eq(schemas.projectId, projectId)).run();
        id = existing.id;
      } else {
        id = tx.insert(schemas).values({ projectId, ...values }).returning({ id: schemas.id }).get().id;
      }

      tx.delete(atomicPrompts).where(eq(atomicPrompts.projectId, projectId)).run();

      tx.update(projects).set({
        status: 'Schema Generated',
        updatedAt: new Date().toISOString(),
      }).where(eq(projects.id, projectId)).run();
      return id;
    });

    return NextResponse.json({ schemaId });
  } catch (error: unknown) {
    console.error('Generate Schema Error:', error);
    if (error instanceof GenerationSourceChangedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: 'Unable to generate the schema' }, { status: 500 });
  }
}
