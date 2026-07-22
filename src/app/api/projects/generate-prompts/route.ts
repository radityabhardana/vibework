import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { prds, adrs, schemas, atomicPrompts, projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateAtomicPrompts } from '@/lib/engine/prompt-chaining';

export async function POST(req: Request) {
  try {
    const { projectId } = await req.json();
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const prd = await db.select().from(prds).where(eq(prds.projectId, projectId)).get();
    if (!prd || !prd.documentContent) {
      return NextResponse.json({ error: 'PRD not found or empty for this project' }, { status: 404 });
    }

    const adr = await db.select().from(adrs).where(eq(adrs.projectId, projectId)).get();
    if (!adr || !adr.adrDocument) {
      return NextResponse.json({ error: 'ADR not found or empty for this project' }, { status: 404 });
    }

    const schemaObj = await db.select().from(schemas).where(eq(schemas.projectId, projectId)).get();
    if (!schemaObj || !schemaObj.dbSchema) {
      return NextResponse.json({ error: 'Schema not found or empty for this project' }, { status: 404 });
    }

    const promptData = await generateAtomicPrompts(prd.documentContent, adr.adrDocument, schemaObj.dbSchema);
    
    if (!promptData.prompts || !Array.isArray(promptData.prompts)) {
      throw new Error("Invalid format returned by AI for prompts.");
    }

    // Insert all prompts
    for (const p of promptData.prompts) {
      await db.insert(atomicPrompts).values({
        projectId,
        title: String(p.title || 'Untitled'),
        context: String(p.context || ''),
        task: String(p.task || ''),
        constraints: String(p.constraints || ''),
        format: String(p.format || ''),
        dependencies: p.dependencies || [],
        executionOrder: Number(p.executionOrder || 1)
      });
    }

    await db.update(projects).set({ status: 'Prompts Generated' }).where(eq(projects.id, projectId));

    return NextResponse.json({ success: true, count: promptData.prompts.length });
  } catch (error: any) {
    console.error("Generate Prompts Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
