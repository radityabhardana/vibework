import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { adrs, appFlowcharts, atomicPrompts, chatMessages, chatSessions, projects, prds, schemas } from '@/lib/db/schema';
import { eq, asc, sql } from 'drizzle-orm';
import {
  AiGenerationTimeoutError,
  generatePRD,
  generateAppFlowchart,
  generateADR,
  generateAgentsMd,
  compileMasterPromptMd,
  synthesizeFallbackFlowchart,
  synthesizeFallbackADR,
  synthesizeFallbackAgentsMd
} from '@/lib/engine/prompt-chaining';
import { isValidAppFlowchart } from '@/lib/flowchart';
import { GenerationSourceChangedError } from '@/lib/generation-snapshot';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const maxDuration = 180;

type PrdData = {
  name: string;
  description: string;
  targetUser: string;
  coreFeatures: string;
  mvpConstraints: string;
  monetizationModel: string;
  documentContent: string;
};

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

function normalizeListText(value: unknown) {
  if (isNonEmptyString(value)) return value.trim();
  if (Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString)) {
    return value.map(item => `- ${item.trim()}`).join('\n');
  }
  return null;
}

function normalizePrdData(value: unknown): PrdData | null {
  if (!isRecord(value)
    || !isNonEmptyString(value.name)
    || !isNonEmptyString(value.description)
    || !isNonEmptyString(value.targetUser)
    || !isNonEmptyString(value.monetizationModel)
    || !isNonEmptyString(value.documentContent)) {
    return null;
  }
  const coreFeatures = normalizeListText(value.coreFeatures);
  const mvpConstraints = normalizeListText(value.mvpConstraints);
  if (!coreFeatures || !mvpConstraints) return null;
  return {
    name: value.name,
    description: value.description,
    targetUser: value.targetUser,
    coreFeatures,
    mvpConstraints,
    monetizationModel: value.monetizationModel,
    documentContent: value.documentContent,
  };
}

async function runGenerationPipeline(
  sessionId: string,
  requestedName: string | undefined,
  forceRegenerate: boolean,
  onProgress?: (step: string, percent: number, message: string) => void
): Promise<string> {
  const session = db.select().from(chatSessions).where(eq(chatSessions.id, sessionId)).get();
  if (!session) {
    throw new Error('Chat session not found');
  }

  if (session.projectId && !forceRegenerate) {
    const existingProject = db.select().from(projects).where(eq(projects.id, session.projectId)).get();
    const existingPrd = db.select().from(prds).where(eq(prds.projectId, session.projectId)).get();
    if (existingProject && existingPrd) {
      return existingProject.id;
    }
  }

  const messages = db.select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt), sql`rowid`)
    .all();

  if (messages.length === 0) {
    throw new Error('No messages found for this session');
  }

  const chatHistory = messages.map(m => `${m.role === 'user' ? 'User' : 'System Architect'}: ${m.content}`).join('\n\n');

  // 1. Generate PRD
  onProgress?.('prd', 20, 'Menganalisis transkrip ide & merumuskan PRD...');
  const prdRaw = await generatePRD(chatHistory);
  const prdData = normalizePrdData(prdRaw);
  if (!prdData) {
    throw new Error('The generated PRD was incomplete');
  }

  const now = new Date().toISOString();
  const projectName = (requestedName || prdData.name.trim()).slice(0, 50);

  // 2. Persist project & PRD in database
  onProgress?.('db', 40, 'Menyimpan spesifikasi proyek & PRD ke database...');
  const projectId = db.transaction((tx) => {
    const currentSession = tx.select().from(chatSessions).where(eq(chatSessions.id, sessionId)).get();
    if (!currentSession) throw new Error('Chat session disappeared during generation');
    const currentMessages = tx.select({
      id: chatMessages.id,
      role: chatMessages.role,
      content: chatMessages.content,
    })
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(asc(chatMessages.createdAt), sql`rowid`)
      .all();
    if (currentMessages.length !== messages.length || currentMessages.some((message, index) =>
      message.id !== messages[index].id
      || message.role !== messages[index].role
      || message.content !== messages[index].content
    )) {
      throw new GenerationSourceChangedError();
    }

    let id = currentSession.projectId;
    const existingProject = id
      ? tx.select().from(projects).where(eq(projects.id, id)).get()
      : undefined;

    if (existingProject && id) {
      tx.update(projects).set({
        name: projectName,
        description: prdData.description.trim(),
        status: 'Tree & Spec Generated',
        updatedAt: now,
      }).where(eq(projects.id, id)).run();
    } else {
      id = tx.insert(projects).values({
        name: projectName,
        description: prdData.description.trim(),
        status: 'Tree & Spec Generated',
      }).returning({ id: projects.id }).get().id;
    }

    const prdValues = {
      targetUser: prdData.targetUser.trim(),
      coreFeatures: prdData.coreFeatures.trim(),
      mvpConstraints: prdData.mvpConstraints.trim(),
      monetizationModel: prdData.monetizationModel.trim(),
      documentContent: prdData.documentContent.trim(),
      updatedAt: now,
    };
    const existingPrd = tx.select().from(prds).where(eq(prds.projectId, id)).get();

    if (existingPrd) {
      tx.update(prds).set(prdValues).where(eq(prds.projectId, id)).run();
    } else {
      tx.insert(prds).values({ projectId: id, ...prdValues }).run();
    }

    // Reset downstream artifacts for a clean state
    tx.delete(atomicPrompts).where(eq(atomicPrompts.projectId, id)).run();
    tx.delete(schemas).where(eq(schemas.projectId, id)).run();
    tx.delete(adrs).where(eq(adrs.projectId, id)).run();
    tx.delete(appFlowcharts).where(eq(appFlowcharts.projectId, id)).run();

    tx.update(chatSessions).set({ projectId: id, title: projectName, updatedAt: now }).where(eq(chatSessions.id, sessionId)).run();
    return id;
  });

  // 3. Concurrently generate Tree (flowchart) and Architecture (ADR)
  onProgress?.('architecture', 65, 'Merancang Interactive Flowchart & Tech Stack (ADR)...');
  try {
    const [flowchartRes, adrRes] = await Promise.allSettled([
      generateAppFlowchart(prdData.documentContent),
      generateADR(prdData.documentContent),
    ]);

    let flowchartData = flowchartRes.status === 'fulfilled' && isValidAppFlowchart(flowchartRes.value)
      ? flowchartRes.value
      : synthesizeFallbackFlowchart(prdData.documentContent);

    db.insert(appFlowcharts).values({
      projectId,
      nodes: flowchartData.nodes,
      edges: flowchartData.edges,
    }).run();

    let adrData: AdrData = adrRes.status === 'fulfilled' && isAdrData(adrRes.value)
      ? adrRes.value
      : synthesizeFallbackADR(prdData.documentContent);

    const adrDocContent = adrData.adrDocument.trim();
    db.insert(adrs).values({
      projectId,
      frontendStack: adrData.frontendStack.trim(),
      backendStack: adrData.backendStack.trim(),
      database: adrData.database.trim(),
      deployment: adrData.deployment.trim(),
      adrDocument: adrDocContent,
    }).run();

    // 4. Generate AGENTS.md and compile initial Prompt.md
    onProgress?.('agents', 88, 'Mengompilasi AGENTS.md & Master Prompt Proyek...');
    try {
      const agentResult: unknown = await generateAgentsMd(prdData.documentContent, adrDocContent);
      let agentsDoc = '';
      if (isRecord(agentResult) && typeof agentResult.agentsDocument === 'string') {
        agentsDoc = agentResult.agentsDocument.trim();
      } else {
        agentsDoc = synthesizeFallbackAgentsMd(prdData.documentContent, adrDocContent).agentsDocument;
      }

      const masterPrompt = compileMasterPromptMd({
        projectName,
        prdContent: prdData.documentContent,
        adrContent: adrDocContent,
        agentsDocument: agentsDoc,
      });

      db.update(projects).set({
        agentsDocument: agentsDoc || null,
        promptDocument: masterPrompt,
        updatedAt: new Date().toISOString(),
      }).where(eq(projects.id, projectId)).run();
    } catch (agentsErr) {
      console.warn('Downstream AGENTS.md generation warning:', agentsErr);
    }
  } catch (pipelineErr) {
    console.warn('Downstream Tree/ADR pipeline warning:', pipelineErr);
  }

  revalidatePath('/projects');
  revalidatePath('/engine', 'layout');
  revalidatePath('/engine');

  return projectId;
}

export async function POST(req: Request) {
  try {
    const isStreamRequest = req.headers.get('accept')?.includes('text/event-stream');
    const body: unknown = await req.json().catch(() => null);

    if (!isRecord(body) || typeof body.sessionId !== 'string' || !UUID_PATTERN.test(body.sessionId)) {
      return NextResponse.json({ error: 'A valid sessionId is required' }, { status: 400 });
    }
    if (body.projectName !== undefined && typeof body.projectName !== 'string') {
      return NextResponse.json({ error: 'projectName must be a string' }, { status: 400 });
    }

    const sessionId = body.sessionId;
    const requestedName = body.projectName?.trim();
    const forceRegenerate = body.regenerate === true;
    const streamMode = isStreamRequest || body.stream === true;

    if (streamMode) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          // Send periodic keepalive ping to prevent proxy/client timeouts
          const keepAliveTimer = setInterval(() => {
            try {
              controller.enqueue(encoder.encode(': ping\n\n'));
            } catch {
              clearInterval(keepAliveTimer);
            }
          }, 3000);

          const sendEvent = (event: string, data: Record<string, unknown>) => {
            try {
              controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            } catch (err) {
              console.warn('Stream enqueue error:', err);
            }
          };

          try {
            sendEvent('progress', { step: 'init', percent: 5, message: 'Menginisialisasi pipeline arsitektur...' });

            const projectId = await runGenerationPipeline(
              sessionId,
              requestedName,
              forceRegenerate,
              (step, percent, message) => {
                sendEvent('progress', { step, percent, message });
              }
            );

            sendEvent('complete', { projectId, percent: 100, message: 'Arsitektur proyek berhasil dirancang!' });
          } catch (err: unknown) {
            console.error('Stream Generation Pipeline Error:', err);
            const message = err instanceof Error ? err.message : 'Gagal menghasilkan spesifikasi proyek';
            sendEvent('error', { error: message });
          } finally {
            clearInterval(keepAliveTimer);
            try {
              controller.close();
            } catch {
              // Ignore close error if already closed
            }
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
        },
      });
    }

    // Standard Non-Streaming JSON Response
    const projectId = await runGenerationPipeline(sessionId, requestedName, forceRegenerate);
    return NextResponse.json({ projectId });
  } catch (error: unknown) {
    console.error('Generate Workflow Error:', error);
    if (error instanceof AiGenerationTimeoutError) {
      return NextResponse.json({ error: error.message }, { status: 504 });
    }
    if (error instanceof GenerationSourceChangedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to generate the project' }, { status: 500 });
  }
}
