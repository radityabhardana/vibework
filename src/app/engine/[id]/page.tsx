import React from 'react';
import { InterviewChat } from '@/components/ui/InterviewChat';
import { db } from '@/lib/db';
import { chatSessions, chatMessages } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

async function fetchSessionData(id: string) {

  const session = await db.select().from(chatSessions).where(eq(chatSessions.id, id)).get();
  
  if (!session) {
    return null;
  }

  const messages = await db.select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, id))
    .orderBy(asc(chatMessages.createdAt));

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

  // Format messages for InterviewChat
  const initialMessages = data.messages.map((m: any) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content
  }));

  // Remove default welcome message injection so the chat starts empty

  return (
    <div className="w-full h-full flex flex-col bg-brutal-white overflow-hidden">
      <div className="flex-1 w-full flex overflow-hidden">
        <div className="flex-1 flex justify-center items-center bg-brutal-white">
          {/* We must wrap InterviewChat in a client-side friendly way. It's a "use client" component. */}
          <InterviewChat 
            initialSessionId={id} 
            initialMessages={initialMessages} 
          />
        </div>
      </div>
    </div>
  );
}
