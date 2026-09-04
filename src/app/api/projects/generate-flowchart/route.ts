import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { prds, appFlowcharts, projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AiGenerationTimeoutError, generateAppFlowchart } from '@/lib/engine/prompt-chaining';
import { isValidAppFlowchart } from '@/lib/flowchart';
import { GenerationSourceChangedError } from '@/lib/generation-snapshot';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const maxDuration = 90;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
      return NextResponse.json({ error: 'PRD is missing. Please generate PRD first.' }, { status: 404 });
    }

    const flowchartObj: unknown = await generateAppFlowchart(prd.documentContent);
    if (!isValidAppFlowchart(flowchartObj)) {
      return NextResponse.json({ error: 'The generated flowchart was incomplete' }, { status: 502 });
    }

    db.transaction((tx) => {
      const currentPrd = tx.select().from(prds).where(eq(prds.projectId, projectId)).get();
      if (!currentPrd
        || currentPrd.id !== prd.id
        || currentPrd.documentContent !== prd.documentContent
        || currentPrd.updatedAt !== prd.updatedAt) {
        throw new GenerationSourceChangedError();
      }

      const existing = tx.select().from(appFlowcharts).where(eq(appFlowcharts.projectId, projectId)).get();
      const values = { nodes: flowchartObj.nodes, edges: flowchartObj.edges };

      if (existing) {
        tx.update(appFlowcharts).set(values).where(eq(appFlowcharts.projectId, projectId)).run();
      } else {
        tx.insert(appFlowcharts).values({ projectId, ...values }).run();
      }

      tx.update(projects).set({ updatedAt: new Date().toISOString() }).where(eq(projects.id, projectId)).run();
    });

    return NextResponse.json({ success: true, flowchart: flowchartObj });
  } catch (error: unknown) {
    console.error('Error generating app flowchart:', error);
    if (error instanceof AiGenerationTimeoutError) {
      return NextResponse.json({ error: error.message }, { status: 504 });
    }
    if (error instanceof GenerationSourceChangedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: 'Unable to generate the flowchart' }, { status: 500 });
  }
}
