import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { prds, adrs, schemas, atomicPrompts, projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AiGenerationTimeoutError, generateAtomicPrompts, compileMasterPromptMd } from '@/lib/engine/prompt-chaining';
import { GenerationSourceChangedError } from '@/lib/generation-snapshot';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const maxDuration = 90;

type AtomicPromptData = {
  title: string;
  context: string;
  task: string;
  constraints: string;
  format: string;
  dependencies: string[];
  executionOrder: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isAtomicPrompt(value: unknown): value is AtomicPromptData {
  return isRecord(value)
    && isNonEmptyString(value.title)
    && isNonEmptyString(value.context)
    && isNonEmptyString(value.task)
    && isNonEmptyString(value.constraints)
    && isNonEmptyString(value.format)
    && Array.isArray(value.dependencies)
    && value.dependencies.every((dependency) => typeof dependency === 'string')
    && typeof value.executionOrder === 'number'
    && Number.isInteger(value.executionOrder)
    && value.executionOrder > 0;
}

function isPromptData(value: unknown): value is { prompts: AtomicPromptData[] } {
  return isRecord(value)
    && Array.isArray(value.prompts)
    && value.prompts.length > 0
    && value.prompts.every(isAtomicPrompt);
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

    const schemaObj = db.select().from(schemas).where(eq(schemas.projectId, projectId)).get();
    if (!schemaObj || !schemaObj.dbSchema) {
      return NextResponse.json({ error: 'Schema not found or empty for this project' }, { status: 404 });
    }

    const promptData: unknown = await generateAtomicPrompts(prd.documentContent, adr.adrDocument, schemaObj.dbSchema);
    if (!isPromptData(promptData)) {
      return NextResponse.json({ error: 'The generated prompts were incomplete' }, { status: 502 });
    }

    const promptValues = promptData.prompts.map((prompt) => ({
      projectId,
      title: prompt.title.trim(),
      context: prompt.context.trim(),
      task: prompt.task.trim(),
      constraints: prompt.constraints.trim(),
      format: prompt.format.trim(),
      dependencies: prompt.dependencies,
      executionOrder: prompt.executionOrder,
    }));

    db.transaction((tx) => {
      const currentPrd = tx.select().from(prds).where(eq(prds.projectId, projectId)).get();
      const currentAdr = tx.select().from(adrs).where(eq(adrs.projectId, projectId)).get();
      const currentSchema = tx.select().from(schemas).where(eq(schemas.projectId, projectId)).get();
      if (!currentPrd
        || !currentAdr
        || !currentSchema
        || currentPrd.id !== prd.id
        || currentPrd.documentContent !== prd.documentContent
        || currentPrd.updatedAt !== prd.updatedAt
        || currentAdr.id !== adr.id
        || currentAdr.adrDocument !== adr.adrDocument
        || currentSchema.id !== schemaObj.id
        || currentSchema.dbSchema !== schemaObj.dbSchema) {
        throw new GenerationSourceChangedError();
      }

      const masterPrompt = compileMasterPromptMd({
        projectName: project.name,
        prdContent: prd.documentContent,
        adrContent: adr.adrDocument,
        dbSchema: schemaObj.dbSchema,
        apiContract: schemaObj.apiContract,
        agentsDocument: project.agentsDocument || undefined,
        prompts: promptValues,
      });

      tx.delete(atomicPrompts).where(eq(atomicPrompts.projectId, projectId)).run();
      tx.insert(atomicPrompts).values(promptValues).run();
      tx.update(projects).set({
        promptDocument: masterPrompt,
        status: 'Prompts Generated',
        updatedAt: new Date().toISOString(),
      }).where(eq(projects.id, projectId)).run();
    });

    return NextResponse.json({ success: true, count: promptValues.length });
  } catch (error: unknown) {
    console.error('Generate Prompts Error:', error);
    if (error instanceof AiGenerationTimeoutError) {
      return NextResponse.json({ error: error.message }, { status: 504 });
    }
    if (error instanceof GenerationSourceChangedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: 'Unable to generate prompts' }, { status: 500 });
  }
}
