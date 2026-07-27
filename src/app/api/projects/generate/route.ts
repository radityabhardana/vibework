import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { adrs, appFlowcharts, atomicPrompts, chatMessages, chatSessions, projects, prds, schemas } from '@/lib/db/schema';
import { eq, asc, sql } from 'drizzle-orm';
import { generatePRD } from '@/lib/engine/prompt-chaining';
import { GenerationSourceChangedError } from '@/lib/generation-snapshot';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PrdData = {
  name: string;
  description: string;
  targetUser: string;
  coreFeatures: string;
  mvpConstraints: string;
  monetizationModel: string;
  documentContent: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPrdData(value: unknown): value is PrdData {
  return isRecord(value)
    && isNonEmptyString(value.name)
    && isNonEmptyString(value.description)
    && isNonEmptyString(value.targetUser)
    && isNonEmptyString(value.coreFeatures)
    && isNonEmptyString(value.mvpConstraints)
    && isNonEmptyString(value.monetizationModel)
    && isNonEmptyString(value.documentContent);
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json().catch(() => null);
    if (!isRecord(body) || typeof body.sessionId !== 'string' || !UUID_PATTERN.test(body.sessionId)) {
      return NextResponse.json({ error: 'A valid sessionId is required' }, { status: 400 });
    }
    if (body.projectName !== undefined && typeof body.projectName !== 'string') {
      return NextResponse.json({ error: 'projectName must be a string' }, { status: 400 });
    }

    const sessionId = body.sessionId;
    const requestedName = body.projectName?.trim();
    const session = db.select().from(chatSessions).where(eq(chatSessions.id, sessionId)).get();
    if (!session) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
    }

    if (session.projectId) {
      const existingProject = db.select().from(projects).where(eq(projects.id, session.projectId)).get();
      const existingPrd = db.select().from(prds).where(eq(prds.projectId, session.projectId)).get();
      if (existingProject && existingPrd) {
        return NextResponse.json({ projectId: existingProject.id, reused: true });
      }
    }

    const messages = db.select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(asc(chatMessages.createdAt), sql`rowid`)
      .all();

    if (messages.length === 0) {
      return NextResponse.json({ error: 'No messages found for this session' }, { status: 404 });
    }

    const chatHistory = messages.map(m => `${m.role === 'user' ? 'User' : 'System Architect'}: ${m.content}`).join('\n\n');

    const prdData: unknown = await generatePRD(chatHistory);
    if (!isPrdData(prdData)) {
      return NextResponse.json({ error: 'The generated PRD was incomplete' }, { status: 502 });
    }

    const now = new Date().toISOString();
    const projectName = (requestedName || prdData.name.trim()).slice(0, 50);
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
          status: 'PRD Generated',
          updatedAt: now,
        }).where(eq(projects.id, id)).run();
      } else {
        id = tx.insert(projects).values({
          name: projectName,
          description: prdData.description.trim(),
          status: 'PRD Generated',
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

      // Every downstream artifact is derived from this PRD and must be rebuilt.
      tx.delete(atomicPrompts).where(eq(atomicPrompts.projectId, id)).run();
      tx.delete(schemas).where(eq(schemas.projectId, id)).run();
      tx.delete(adrs).where(eq(adrs.projectId, id)).run();
      tx.delete(appFlowcharts).where(eq(appFlowcharts.projectId, id)).run();

      tx.update(chatSessions).set({ projectId: id, updatedAt: now }).where(eq(chatSessions.id, sessionId)).run();
      return id;
    });

    revalidatePath('/projects');
    revalidatePath('/engine');
    return NextResponse.json({ projectId });
  } catch (error: unknown) {
    console.error('Generate Workflow Error:', error);
    if (error instanceof GenerationSourceChangedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: 'Unable to generate the project' }, { status: 500 });
  }
}
