import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chatSessions } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function GET() {
  try {
    const sessions = await db.select().from(chatSessions).orderBy(desc(chatSessions.createdAt));
    return NextResponse.json(sessions);
  } catch (error: unknown) {
    console.error('Failed to list chat sessions:', error);
    return NextResponse.json({ error: 'Failed to load chat sessions.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid session request.' }, { status: 400 });
  }

  if (
    !isRecord(body) ||
    Object.keys(body).some(key => key !== 'projectId') ||
    ('projectId' in body && body.projectId !== null && (
      typeof body.projectId !== 'string' || !UUID_PATTERN.test(body.projectId)
    ))
  ) {
    return NextResponse.json({ error: 'Invalid session request.' }, { status: 400 });
  }

  try {
    const result = await db.insert(chatSessions).values({
      title: 'New Chat',
      projectId: typeof body.projectId === 'string' ? body.projectId : null,
    }).returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to create chat session:', error);
    return NextResponse.json({ error: 'Failed to create the chat session.' }, { status: 500 });
  }
}
