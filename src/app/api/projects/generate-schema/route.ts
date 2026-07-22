import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { prds, adrs, schemas, projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateSchema } from '@/lib/engine/prompt-chaining';
import { safeString } from '@/lib/utils';

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

    const schemaData = await generateSchema(prd.documentContent, adr.adrDocument);

    const [newSchema] = await db.insert(schemas).values({
      projectId,
      dbSchema: safeString(schemaData.dbSchema),
      apiContract: schemaData.apiContract, // JSON mode handles objects natively, no safeString needed
    }).returning();

    await db.update(projects).set({ status: 'Schema Generated' }).where(eq(projects.id, projectId));

    return NextResponse.json({ schemaId: newSchema.id });
  } catch (error: any) {
    console.error("Generate Schema Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
