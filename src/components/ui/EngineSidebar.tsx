'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, House, Sparkle, Waveform, Kanban, GraduationCap } from '@phosphor-icons/react';
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
    <aside className="flex max-h-[16rem] w-full shrink-0 flex-col border-b border-white/10 bg-[#050507] lg:h-full lg:max-h-none lg:w-64 lg:border-r lg:border-b-0">
      {/* Sidebar Header */}
      <div className="flex flex-col gap-3 border-b border-white/10 p-3.5 bg-[#030304]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-white flex items-center justify-center text-black font-bold text-xs">
              <Sparkle weight="fill" className="w-3.5 h-3.5" />
            </div>
            <span className="font-sans font-bold text-sm text-white tracking-tight">The Grill</span>
          </div>
          <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 font-mono text-[11px] text-zinc-400">
            {sessions.length} specs
          </span>
        </div>

        {/* Primary Action Button */}
        <Link href="/engine">
          <Button variant="primary" size="sm" className="w-full !py-2 text-xs font-sans gap-2 justify-center shadow-sm">
            <Plus weight="bold" className="w-3.5 h-3.5" />
            <span>New Architecture Spec</span>
          </Button>
        </Link>
      </div>

      {/* Quick Navigation Links */}
      <div className="flex flex-col gap-0.5 px-2 py-2 border-b border-white/5 shrink-0">
        <Link
          href="/engine"
          className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-sans transition-colors ${
            pathname === '/engine' ? 'bg-white/10 text-white font-medium' : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Sparkle weight="bold" className="w-3.5 h-3.5" />
          <span>Architecture Studio</span>
        </Link>
        <Link
          href="/projects"
          className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-sans transition-colors ${
            pathname.startsWith('/projects') ? 'bg-white/10 text-white font-medium' : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Kanban weight="bold" className="w-3.5 h-3.5" />
          <span>All Workspaces</span>
        </Link>
        <Link
          href="/voice"
          className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-sans transition-colors ${
            pathname === '/voice' ? 'bg-white/10 text-white font-medium' : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Waveform weight="bold" className="w-3.5 h-3.5" />
          <span>Voice Studio</span>
        </Link>
        <Link
          href="/learn"
          className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-sans transition-colors ${
            pathname === '/learn' ? 'bg-white/10 text-white font-medium' : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <GraduationCap weight="bold" className="w-3.5 h-3.5" />
          <span>Curriculum Roadmap</span>
        </Link>
      </div>

      {/* Session History List */}
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2">
        <div className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold flex items-center justify-between">
          <span>Recent Specs</span>
          <span className="text-[10px] text-zinc-600">{sessions.length}</span>
        </div>

        {sessions.length === 0 ? (
          <div className="flex min-h-16 w-full items-center justify-center rounded-lg border border-dashed border-white/10 p-3 text-center">
            <p className="font-sans text-xs text-zinc-500">Belum ada sesi proyek.</p>
          </div>
        ) : (
          sessions.map(s => {
            const isActive = pathname === `/engine/${s.id}`;
            return (
              <div
                key={s.id}
                className={`group relative flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-all duration-150 ${
                  isActive
                    ? 'bg-white/10 text-white font-medium shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Link href={`/engine/${s.id}`} className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        s.projectId
                          ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]'
                          : 'bg-zinc-600'
                      }`}
                      title={s.projectId ? 'Ready' : 'Draft'}
                    />
                    <span className="truncate font-sans">{s.projectName || s.title || 'Untitled Spec'}</span>
                  </div>
                </Link>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 flex items-center">
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

      {/* Sidebar System Status Footer */}
      <div className="border-t border-white/10 p-3 bg-[#030304] shrink-0">
        <div className="flex items-center justify-between font-mono text-[10px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>SQLite Engine</span>
          </div>
          <Link href="/" className="hover:text-zinc-300 transition-colors flex items-center gap-1">
            <House weight="bold" className="w-3 h-3" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
