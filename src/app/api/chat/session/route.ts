import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chatSessions } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const sessions = await db.select().from(chatSessions).orderBy(desc(chatSessions.createdAt));
    return NextResponse.json(sessions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await db.insert(chatSessions).values({
      title: body.title || 'New Chat',
      projectId: body.projectId || null,
    }).returning();
    
    return NextResponse.json(result[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
