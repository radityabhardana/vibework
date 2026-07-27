import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chatMessages, chatSessions } from '@/lib/db/schema';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { getUndoMessageIds } from '@/lib/chat-undo';

const MAX_MESSAGE_LENGTH = 20_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]) {
  return Object.keys(value).every(key => keys.includes(key));
}

async function readJson(req: Request) {
  try {
    return await req.json() as unknown;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const body = await readJson(req);
  if (
    !isRecord(body) ||
    !hasOnlyKeys(body, ['id', 'sessionId', 'role', 'content']) ||
    typeof body.id !== 'string' ||
    !UUID_PATTERN.test(body.id) ||
    typeof body.sessionId !== 'string' ||
    !UUID_PATTERN.test(body.sessionId) ||
    (body.role !== 'user' && body.role !== 'assistant') ||
    typeof body.content !== 'string' ||
    !body.content.trim() ||
    body.content.length > MAX_MESSAGE_LENGTH
  ) {
    return NextResponse.json({ error: 'Invalid message request.' }, { status: 400 });
  }

  const message = {
    id: body.id as string,
    sessionId: body.sessionId as string,
    role: body.role as 'user' | 'assistant',
    content: body.content as string,
  };

  try {
    const result = db.transaction(tx => {
      const session = tx.select({ id: chatSessions.id })
        .from(chatSessions)
        .where(eq(chatSessions.id, message.sessionId))
        .get();

      if (!session) return { kind: 'missing' as const };

      const firstUserMessage = message.role === 'user'
        ? tx.select({ id: chatMessages.id })
            .from(chatMessages)
            .where(and(
              eq(chatMessages.sessionId, message.sessionId),
              eq(chatMessages.role, 'user')
            ))
            .get()
        : undefined;

      const inserted = tx.insert(chatMessages).values({
        id: message.id,
        sessionId: message.sessionId,
        role: message.role,
        content: message.content,
        createdAt: new Date().toISOString().replace('T', ' ').replace('Z', ''),
      }).returning().get();

      const sessionUpdate: { updatedAt: string; title?: string } = {
        updatedAt: new Date().toISOString()
      };
      if (message.role === 'user' && !firstUserMessage) {
        const content = message.content.trim();
        const words = content.split(/\s+/).slice(0, 5).join(' ');
        const snippet = words.slice(0, 80).trimEnd();
        sessionUpdate.title = snippet.length < content.length ? `${snippet}...` : snippet;
      }

      tx.update(chatSessions)
        .set(sessionUpdate)
        .where(eq(chatSessions.id, message.sessionId))
        .run();

      return { kind: 'inserted' as const, message: inserted };
    });

    if (result.kind === 'missing') {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }
    return NextResponse.json(result.message, { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to save chat message:', error);
    return NextResponse.json({ error: 'Failed to save the message.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const body = await readJson(req);
  if (
    !isRecord(body) ||
    !hasOnlyKeys(body, ['sessionId', 'userMessageId']) ||
    typeof body.sessionId !== 'string' ||
    !UUID_PATTERN.test(body.sessionId) ||
    typeof body.userMessageId !== 'string' ||
    !UUID_PATTERN.test(body.userMessageId)
  ) {
    return NextResponse.json({ error: 'Invalid undo request.' }, { status: 400 });
  }

  const sessionId = body.sessionId as string;
  const userMessageId = body.userMessageId as string;

  try {
    const result = db.transaction(tx => {
      const session = tx.select({ id: chatSessions.id })
        .from(chatSessions)
        .where(eq(chatSessions.id, sessionId))
        .get();
      if (!session) return { kind: 'missing' as const };

      const currentMessages = tx.select({
        id: chatMessages.id,
        role: chatMessages.role,
        content: chatMessages.content,
      })
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, sessionId))
        .orderBy(asc(chatMessages.createdAt), sql`rowid`)
        .all();
      const messageIds = getUndoMessageIds(currentMessages, userMessageId);
      if (!messageIds) {
        return { kind: 'stale' as const };
      }

      tx.delete(chatMessages)
        .where(and(
          eq(chatMessages.sessionId, sessionId),
          inArray(chatMessages.id, messageIds)
        ))
        .run();
      const hasRemainingUserMessage = currentMessages
        .filter(message => !messageIds.includes(message.id))
        .some(message => message.role === 'user');
      tx.update(chatSessions)
        .set({
          ...(hasRemainingUserMessage ? {} : { title: 'New Chat' }),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(chatSessions.id, sessionId))
        .run();

      return { kind: 'deleted' as const, deleted: messageIds.length };
    });

    if (result.kind === 'missing') {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }
    if (result.kind === 'stale') {
      return NextResponse.json({ error: 'The conversation changed before undo completed.' }, { status: 409 });
    }
    return NextResponse.json({ success: true, deleted: result.deleted });
  } catch (error: unknown) {
    console.error('Failed to undo chat message:', error);
    return NextResponse.json({ error: 'Failed to undo the message.' }, { status: 500 });
  }
}
