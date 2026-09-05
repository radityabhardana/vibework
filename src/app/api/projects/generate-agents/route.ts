import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { prds, adrs, projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AiGenerationTimeoutError, generateAgentsMd } from '@/lib/engine/prompt-chaining';

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
      return NextResponse.json({ error: 'PRD not found for this project' }, { status: 404 });
    }

    const adr = db.select().from(adrs).where(eq(adrs.projectId, projectId)).get();
    const adrContent = adr?.adrDocument || '';

    const agentResult: unknown = await generateAgentsMd(prd.documentContent, adrContent);
    if (!isRecord(agentResult) || typeof agentResult.agentsDocument !== 'string' || !agentResult.agentsDocument.trim()) {
      return NextResponse.json({ error: 'Gagal menghasilkan dokumen AGENTS.md' }, { status: 502 });
    }

    const agentsDocument = agentResult.agentsDocument.trim();
    db.update(projects)
      .set({ agentsDocument, updatedAt: new Date().toISOString() })
      .where(eq(projects.id, projectId))
      .run();

    return NextResponse.json({ success: true, agentsDocument });
  } catch (error: unknown) {
    console.error('Error generating AGENTS.md:', error);
    if (error instanceof AiGenerationTimeoutError) {
      return NextResponse.json({ error: error.message }, { status: 504 });
    }
    return NextResponse.json({ error: 'Unable to generate AGENTS.md' }, { status: 500 });
  }
}
