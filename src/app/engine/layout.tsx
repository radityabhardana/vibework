import React from 'react';
import { db } from '@/lib/db';
import { chatSessions, projects } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { EngineSidebar } from '@/components/ui/EngineSidebar';
import { EngineTopBar } from '@/components/ui/EngineTopBar';

export const dynamic = 'force-dynamic';

export default async function EngineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessions = await db.select({
    id: chatSessions.id,
    title: chatSessions.title,
    projectId: chatSessions.projectId,
    projectName: projects.name,
    updatedAt: chatSessions.updatedAt,
  })
    .from(chatSessions)
    .leftJoin(projects, eq(chatSessions.projectId, projects.id))
    .orderBy(desc(chatSessions.updatedAt));

  return (
    <div className="flex h-full w-full flex-col lg:flex-row bg-[#0b0d0f] text-white">
      <EngineSidebar initialSessions={sessions} />
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <EngineTopBar />

        {/* Studio Content */}
        <main className="relative min-h-0 flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
