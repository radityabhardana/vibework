'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, ChatCircle, House } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { DeleteSessionButton } from '@/components/ui/DeleteSessionButton';

export interface EngineSessionItem {
  id: string;
  title: string | null;
  projectId: string | null;
  projectName: string | null;
  updatedAt: string | null;
}

export function EngineSidebar({
  initialSessions,
}: {
  initialSessions: EngineSessionItem[];
}) {
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const pathname = usePathname();

  const handleDeleted = (deletedId: string) => {
    setDeletedIds(prev => (prev.includes(deletedId) ? prev : [...prev, deletedId]));
  };

  const sessions = initialSessions.filter(s => !deletedIds.includes(s.id));

  return (
    <aside className="flex max-h-[14rem] w-full shrink-0 flex-col border-b border-white/10 bg-[#060606] lg:h-full lg:max-h-none lg:w-72 lg:border-r lg:border-b-0">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col gap-3.5 border-b border-white/10 p-4 bg-[#030303]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            <div>
              <h1 className="font-mono text-sm font-semibold tracking-tight text-white uppercase">The Grill</h1>
              <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">Multi-LLM Spec Engine</p>
            </div>
          </div>
          <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-xs text-zinc-400 tabular-nums">
            {sessions.length}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/">
            <Button variant="secondary" size="sm" className="w-full gap-1.5 !px-3 !py-2 text-xs">
              <House weight="bold" className="w-3.5 h-3.5" />
              Home
            </Button>
          </Link>
          <Link href="/engine">
            <Button variant="primary" size="sm" className="w-full gap-1.5 !px-3 !py-2 text-xs">
              <Plus weight="bold" className="w-3.5 h-3.5" />
              New Spec
            </Button>
          </Link>
        </div>
      </div>

      {/* Session List */}
      <div className="flex min-h-0 flex-1 gap-2.5 overflow-x-auto p-3 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:p-3">
        {sessions.length === 0 ? (
          <div className="flex min-h-24 w-full items-center justify-center rounded-xl border border-dashed border-white/10 p-4 text-center">
            <p className="font-mono text-xs text-zinc-500">Belum ada sesi proyek.</p>
          </div>
        ) : (
          sessions.map(s => {
            const isActive = pathname === `/engine/${s.id}`;
            return (
              <div
                key={s.id}
                className={`group relative min-w-64 shrink-0 rounded-xl border transition-all duration-300 lg:min-w-0 ${
                  isActive
                    ? 'border-white/40 bg-white/[0.08] shadow-[0_0_20px_-5px_rgba(255,255,255,0.1)] ring-1 ring-white/20'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.05]'
                }`}
              >
                <Link
                  href={`/engine/${s.id}`}
                  className="block p-3 pr-9 transition-colors focus:outline-none"
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <div className={`mt-0.5 shrink-0 rounded p-1 ${isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                      <ChatCircle weight={isActive ? 'fill' : 'regular'} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate font-mono text-xs font-semibold ${isActive ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>
                        {s.projectName || s.title}
                      </p>
                      {s.projectName && (
                        <p className="mt-0.5 truncate font-sans text-[11px] text-zinc-500">{s.title}</p>
                      )}
                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider ${
                            s.projectId
                              ? 'bg-white/10 text-white border border-white/20'
                              : 'bg-white/[0.03] text-zinc-500 border border-white/5'
                          }`}
                        >
                          {s.projectId ? 'Ready' : 'Draft'}
                        </span>
                        {s.updatedAt && (() => {
                          try {
                            const d = new Date(
                              s.updatedAt.replace(' ', 'T') + (s.updatedAt.endsWith('Z') ? '' : 'Z')
                            );
                            if (isNaN(d.getTime())) return null;
                            return (
                              <span suppressHydrationWarning className="font-mono text-[10px] text-zinc-500">
                                {d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            );
                          } catch {
                            return null;
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                </Link>
                <div className="absolute right-2 top-2 opacity-60 transition-opacity group-hover:opacity-100">
                  <DeleteSessionButton
                    sessionId={s.id}
                    sessionTitle={s.projectName || s.title || undefined}
                    onDeleted={handleDeleted}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
