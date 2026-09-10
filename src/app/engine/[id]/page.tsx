import React from 'react';
import { IdeaStudio } from '@/components/ui/IdeaStudio';
import { db } from '@/lib/db';
import { chatSessions, chatMessages, projects } from '@/lib/db/schema';
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

  let project = null;
  if (session.projectId) {
    project = await db.select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      createdAt: projects.createdAt,
    }).from(projects).where(eq(projects.id, session.projectId)).get() || null;
  }

  return { session, messages, project };
}

export default async function EngineHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchSessionData(id);

  if (!data) {
    return (
      <div className="flex-1 w-full flex overflow-hidden items-center justify-center bg-background text-zinc-400 font-sans text-sm">
        Session Not Found
      </div>
    );
  }

  const initialIdea = data.messages.find(m => m.role === 'user')?.content || '';

  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      <IdeaStudio
        initialSessionId={id}
        initialIdea={initialIdea}
        initialProjectId={data.session.projectId}
        initialProjectData={data.project}
      />
    </div>
  );
}
