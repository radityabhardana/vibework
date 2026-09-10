import React from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { chatSessions, projects } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { EngineSidebar } from '@/components/ui/EngineSidebar';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

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
        {/* Top Studio App Bar */}
        <header className="h-16 shrink-0 border-b border-white/[0.08] bg-[#0d1011] px-4 sm:px-6 flex items-center justify-between z-10">
          <div className="flex min-w-0 items-center gap-3">
            <span className="truncate font-sans text-sm font-semibold tracking-tight text-zinc-100">The Grill</span>
            <div className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600 sm:flex">
              <span>/</span>
              <Link href="/" className="transition-colors hover:text-zinc-300">
                Vibework
              </Link>
              <span>/</span>
              <span className="text-zinc-500">Spec Studio</span>
            </div>
          </div>

          <div className="flex items-center">
            <LanguageSwitcher />
          </div>
        </header>

        {/* Studio Content */}
        <main className="relative min-h-0 flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
