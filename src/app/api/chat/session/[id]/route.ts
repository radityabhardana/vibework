import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chatSessions, chatMessages } from '@/lib/db/schema';
import { eq, asc, sql } from 'drizzle-orm';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json({ error: 'Invalid session ID.' }, { status: 400 });
    }

    const session = await db.select().from(chatSessions).where(eq(chatSessions.id, id)).get();

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const messages = await db.select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, id))
      .orderBy(asc(chatMessages.createdAt), sql`rowid`);

    return NextResponse.json({ session, messages });
  } catch (error: unknown) {
    console.error('Failed to load chat session:', error);
    return NextResponse.json({ error: 'Failed to load the chat session.' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json({ error: 'Invalid session ID.' }, { status: 400 });
    }

    const deleted = db.transaction(tx => {
      const session = tx.select({ id: chatSessions.id })
        .from(chatSessions)
        .where(eq(chatSessions.id, id))
        .get();
      if (!session) return false;

      tx.delete(chatMessages).where(eq(chatMessages.sessionId, id)).run();
      tx.delete(chatSessions).where(eq(chatSessions.id, id)).run();
      return true;
    });

    if (!deleted) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to delete chat session:', error);
    return NextResponse.json({ error: 'Failed to delete the chat session.' }, { status: 500 });
  }
}
