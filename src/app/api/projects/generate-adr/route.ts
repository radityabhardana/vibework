import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { prds, adrs, projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateADR } from '@/lib/engine/prompt-chaining';
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

    const adrData = await generateADR(prd.documentContent);

    const [newAdr] = await db.insert(adrs).values({
      projectId,
      frontendStack: safeString(adrData.frontendStack),
      backendStack: safeString(adrData.backendStack),
      database: safeString(adrData.database),
      deployment: safeString(adrData.deployment),
      adrDocument: safeString(adrData.adrDocument),
    }).returning();

    await db.update(projects).set({ status: 'ADR Generated' }).where(eq(projects.id, projectId));

    return NextResponse.json({ adrId: newAdr.id });
  } catch (error: any) {
    console.error("Generate ADR Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
