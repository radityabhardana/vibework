import React from 'react';
import { IdeaStudio } from '@/components/ui/IdeaStudio';
import { db } from '@/lib/db';
import { chatSessions, chatMessages } from '@/lib/db/schema';
import { eq, asc, sql } from 'drizzle-orm';

async function fetchSessionData(id: string) {
  const session = await db.select().from(chatSessions).where(eq(chatSessions.id, id)).get();
  
  if (!session) {
    return null;
  }

  const messages = await db.select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, id))
    .orderBy(asc(chatMessages.createdAt), sql`rowid`);

  return { session, messages };
}

export default async function EngineHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchSessionData(id);

  if (!data) {
    return (
      <div className="flex-1 w-full flex overflow-hidden items-center justify-center bg-[#e5e5f7]">
        <div className="font-mono text-xl">Session Not Found</div>
      </div>
    );
  }

  const initialIdea = data.messages.find(m => m.role === 'user')?.content || '';

  return (
    <div className="w-full h-full flex flex-col bg-[#f4f4f0] overflow-hidden">
      <IdeaStudio
        initialSessionId={id}
        initialIdea={initialIdea}
        initialProjectId={data.session.projectId}
      />
    </div>
  );
}
