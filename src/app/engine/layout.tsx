import React from 'react';
import Link from 'next/link';
import { Plus, ChatCircle, House } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DeleteSessionButton } from '@/components/ui/DeleteSessionButton';
import { db } from '@/lib/db';
import { chatSessions } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function EngineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessions = await db.select().from(chatSessions).orderBy(desc(chatSessions.createdAt));

  return (
    <div className="flex w-full h-full">
      {/* Secondary Sidebar for Engine (Chat History) */}
      <aside className="w-64 h-full border-r-4 border-brutal-black bg-brutal-white flex flex-col shrink-0">
        <div className="p-4 border-b-4 border-brutal-black flex flex-col gap-2">
          <Link href="/">
            <Button variant="secondary" className="w-full flex items-center justify-center gap-2">
              <House weight="bold" />
              Dashboard
            </Button>
          </Link>
          <Link href="/engine">
            <Button variant="primary" className="w-full flex items-center justify-center gap-2 mt-2">
              <Plus weight="bold" />
              New Chat
            </Button>
          </Link>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {sessions.length === 0 ? (
            <p className="font-mono text-sm opacity-50 text-center mt-4">No history yet.</p>
          ) : (
            sessions.map(s => (
              <Link key={s.id} href={`/engine/${s.id}`}>
                <Card bg="white" className="p-3 hover:bg-brutal-yellow hover:-translate-y-1 transition-all cursor-pointer">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate overflow-hidden">
                      <ChatCircle weight="bold" className="shrink-0" />
                      <span className="font-mono text-sm font-bold truncate">{s.title}</span>
                    </div>
                    <DeleteSessionButton sessionId={s.id} />
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      </aside>

      {/* Engine Main Area */}
      <main className="flex-1 h-full relative overflow-hidden">
        {children}
      </main>
    </div>
  );
}
