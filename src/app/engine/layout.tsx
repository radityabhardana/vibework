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
    <div className="flex h-full w-full flex-col lg:flex-row bg-[#030303] text-white selection:bg-white selection:text-black">
      <EngineSidebar initialSessions={sessions} />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Studio App Bar */}
        <header className="h-14 border-b border-white/10 bg-[#030303]/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              <Link href="/" className="hover:text-white transition-colors">
                Vibework
              </Link>
              <span className="text-zinc-700">/</span>
              <span className="text-zinc-200 font-semibold">The Grill</span>
              <span className="hidden sm:inline-block text-zinc-700">/</span>
              <span className="hidden sm:inline-block text-zinc-400">Spec Studio</span>
            </div>
            <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-white/10 bg-white/5 font-mono text-[10px] text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Engine Active</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-4">
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
