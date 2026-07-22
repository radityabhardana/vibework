import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chatMessages, chatSessions, projects, prds } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { generatePRD } from '@/lib/engine/prompt-chaining';
import { safeString } from '@/lib/utils';

export async function POST(req: Request) {
  try {
    const { sessionId, projectName } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    // 1. Fetch messages
    const messages = await db.select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(asc(chatMessages.createdAt));

    if (messages.length === 0) {
      return NextResponse.json({ error: 'No messages found for this session' }, { status: 404 });
    }

    const chatHistory = messages.map(m => `${m.role === 'user' ? 'User' : 'System Architect'}: ${m.content}`).join('\n\n');

    // 2. Generate PRD from LLM
    const prdData = await generatePRD(chatHistory);

    // 3. Save to DB
    const [newProject] = await db.insert(projects).values({
      name: projectName || safeString(prdData.name).substring(0, 50) || 'New Project',
      description: safeString(prdData.description),
      status: 'PRD Generated'
    }).returning();

    await db.insert(prds).values({
      projectId: newProject.id,
      targetUser: safeString(prdData.targetUser),
      coreFeatures: safeString(prdData.coreFeatures),
      mvpConstraints: safeString(prdData.mvpConstraints),
      monetizationModel: safeString(prdData.monetizationModel),
      documentContent: safeString(prdData.documentContent)
    });

    // 4. Update Chat Session
    await db.update(chatSessions)
      .set({ projectId: newProject.id })
      .where(eq(chatSessions.id, sessionId));

    return NextResponse.json({ projectId: newProject.id });

  } catch (error: any) {
    console.error("Generate Workflow Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
