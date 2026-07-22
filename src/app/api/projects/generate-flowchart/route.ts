import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { prds, appFlowcharts, projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateAppFlowchart } from '@/lib/engine/prompt-chaining';

export async function POST(req: Request) {
  try {
    const { projectId } = await req.json();

    const prd = await db.select().from(prds).where(eq(prds.projectId, projectId)).get();

    if (!prd || !prd.documentContent) {
      return NextResponse.json({ error: 'PRD is missing. Please generate PRD first.' }, { status: 400 });
    }

    const flowchartObj = await generateAppFlowchart(prd.documentContent);

    // Save to DB
    await db.insert(appFlowcharts).values({
      projectId,
      nodes: flowchartObj.nodes,
      edges: flowchartObj.edges,
    });

    await db.update(projects).set({ updatedAt: new Date().toISOString() }).where(eq(projects.id, projectId));

    return NextResponse.json({ success: true, flowchart: flowchartObj });
  } catch (error: any) {
    console.error('Error generating app flowchart:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
