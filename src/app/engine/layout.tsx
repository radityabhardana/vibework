import React from 'react';
import Link from 'next/link';
import { Plus, ChatCircle, House } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DeleteSessionButton } from '@/components/ui/DeleteSessionButton';
import { db } from '@/lib/db';
import { chatSessions, projects } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

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
    <div className="flex h-full w-full flex-col lg:flex-row">
      <aside className="flex max-h-[13rem] w-full shrink-0 flex-col border-b-4 border-brutal-black bg-brutal-white lg:h-full lg:max-h-none lg:w-72 lg:border-r-4 lg:border-b-0">
        <div className="flex flex-col gap-3 border-b-4 border-brutal-black bg-brutal-black p-3 text-brutal-white lg:p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="font-sans text-xl font-black uppercase tracking-wider">The Grill</h1>
              <p className="font-mono text-[10px] font-bold uppercase opacity-60">Projects + history</p>
            </div>
            <span className="border-2 border-brutal-white px-2 py-1 font-mono text-xs font-bold tabular-nums">
              {sessions.length}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/">
              <Button variant="secondary" size="sm" className="w-full gap-2 !border-2 !shadow-none">
                <House weight="bold" />
                Dashboard
              </Button>
            </Link>
            <Link href="/engine">
              <Button variant="primary" size="sm" className="w-full gap-2 !border-2 !shadow-none">
                <Plus weight="bold" />
                New Project
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-3 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:p-4">
          {sessions.length === 0 ? (
            <div className="flex min-h-20 w-full items-center justify-center border-2 border-dashed border-brutal-black/30 px-4 text-center">
              <p className="font-mono text-xs font-bold uppercase opacity-50">No projects yet.</p>
            </div>
          ) : (
            sessions.map(s => (
              <Card key={s.id} bg="white" noPadding className="relative min-w-60 shrink-0 !shadow-[3px_3px_0px_0px_rgba(5,5,5,1)] lg:min-w-0">
                <Link href={`/engine/${s.id}`} className="block p-3 pr-10 transition-colors hover:bg-brutal-yellow focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-brutal-blue">
                  <div className="flex min-w-0 items-start gap-2">
                    <ChatCircle weight="bold" className="mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm font-bold">{s.projectName || s.title}</p>
                      {s.projectName && (
                        <p className="mt-0.5 truncate font-mono text-[10px] opacity-50">{s.title}</p>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className={`border-2 border-brutal-black px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                          s.projectId ? 'bg-brutal-blue text-brutal-white' : 'bg-brutal-yellow text-brutal-black'
                        }`}>
                          {s.projectId ? 'Generated' : 'Not generated'}
                        </span>
                        {s.updatedAt && (
                          <span className="font-mono text-[10px] opacity-60">
                            {new Date(s.updatedAt.replace(' ', 'T') + (s.updatedAt.endsWith('Z') ? '' : 'Z')).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
                <div className="absolute right-2 top-2">
                  <DeleteSessionButton sessionId={s.id} />
                </div>
              </Card>
            ))
          )}
        </div>
      </aside>

      <main className="relative min-h-0 flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
