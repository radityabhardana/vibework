import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chatMessages, chatSessions } from '@/lib/db/schema';
import { eq, asc, and, gt } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validate
    if (!body.sessionId || !body.role || !body.content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Insert message
    const result = await db.insert(chatMessages).values({
      sessionId: body.sessionId,
      role: body.role,
      content: body.content,
    }).returning();
    
    // Update session updatedAt, and optionally generate title if this is the first user message
    const isFirstUserMessage = body.role === 'user'; // Simplification. In reality, we might want to check if it's strictly the first.
    
    if (isFirstUserMessage) {
      // Let's grab the first few words for a title
      const snippet = body.content.split(' ').slice(0, 5).join(' ');
      await db.update(chatSessions)
        .set({ title: snippet + '...', updatedAt: new Date().toISOString() })
        .where(eq(chatSessions.id, body.sessionId));
    } else {
      await db.update(chatSessions)
        .set({ updatedAt: new Date().toISOString() })
        .where(eq(chatSessions.id, body.sessionId));
    }

    return NextResponse.json(result[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const messages = await db.select().from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(asc(chatMessages.createdAt));

    if (messages.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    // Find the last user message
    let lastUserMessageIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMessageIdx = i;
        break;
      }
    }

    if (lastUserMessageIdx === -1) {
       return NextResponse.json({ success: false, message: 'No user message to undo' }, { status: 400 });
    }

    const lastUserMessage = messages[lastUserMessageIdx];

    await db.delete(chatMessages)
      .where(
        and(
          eq(chatMessages.sessionId, sessionId),
          eq(chatMessages.id, lastUserMessage.id)
        )
      );

    await db.delete(chatMessages)
      .where(
        and(
          eq(chatMessages.sessionId, sessionId),
          gt(chatMessages.createdAt, lastUserMessage.createdAt as string)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
