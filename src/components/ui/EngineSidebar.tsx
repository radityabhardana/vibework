'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, House, Sparkle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { DeleteSessionButton } from '@/components/ui/DeleteSessionButton';

export interface EngineSessionItem {
  id: string;
  title: string | null;
  projectId: string | null;
  projectName: string | null;
  updatedAt: string | null;
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffInSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSec < 60) return 'Baru saja';
  const diffInMin = Math.floor(diffInSec / 60);
  if (diffInMin < 60) return `${diffInMin}m lalu`;
  const diffInHours = Math.floor(diffInMin / 60);
  if (diffInHours < 24) return `${diffInHours}j lalu`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}h lalu`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export function EngineSidebar({ initialSessions }: { initialSessions: EngineSessionItem[] }) {
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'ready' | 'draft'>('all');
  const pathname = usePathname();

  const handleDeleted = (deletedId: string) => {
    setDeletedIds(prev => (prev.includes(deletedId) ? prev : [...prev, deletedId]));
  };

  const sessions = initialSessions
    .filter(s => !deletedIds.includes(s.id))
    .filter(s => {
      if (filter === 'ready') return Boolean(s.projectId);
      if (filter === 'draft') return !s.projectId;
      return true;
    });

  const totalReady = initialSessions.filter(s => !deletedIds.includes(s.id) && Boolean(s.projectId)).length;

  return (
    <aside className="flex max-h-[40vh] w-full shrink-0 flex-col border-b border-white/10 bg-[#050507] lg:h-full lg:max-h-none lg:w-64 lg:border-r lg:border-b-0">
      {/* Sidebar Header */}
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 bg-[#030304]">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-md bg-white flex items-center justify-center text-black shadow-sm">
            <Sparkle weight="fill" className="w-3.5 h-3.5" />
          </div>
          <div className="leading-tight">
            <span className="block font-sans font-bold text-sm text-white tracking-tight">The Grill</span>
            <span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-500">
              Architecture Studio
            </span>
          </div>
        </div>

        {/* Primary Action Button */}
        <Link href="/engine">
          <Button variant="primary" size="sm" className="w-full !py-2 text-xs font-sans gap-2 justify-center shadow-sm hover:bg-zinc-100 transition-colors">
            <Plus weight="bold" className="w-3.5 h-3.5" />
            <span>New Architecture Spec</span>
          </Button>
        </Link>
      </div>


      {/* Filter Tabs */}
      <div className="flex items-center gap-1 px-3 pt-2 pb-1 text-[10px] font-mono shrink-0">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-2 py-0.5 rounded transition-colors ${
            filter === 'all' ? 'bg-white/10 text-white font-semibold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Semua ({initialSessions.length - deletedIds.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('ready')}
          className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
            filter === 'ready' ? 'bg-white/10 text-white font-semibold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <span className="w-1 h-1 rounded-full bg-emerald-400" />
          <span>Ready ({totalReady})</span>
        </button>
        <button
          type="button"
          onClick={() => setFilter('draft')}
          className={`px-2 py-0.5 rounded transition-colors ${
            filter === 'draft' ? 'bg-white/10 text-white font-semibold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Draft
        </button>
      </div>

      {/* Session History List */}
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 py-1">
        {sessions.length === 0 ? (
          <div className="flex min-h-16 w-full items-center justify-center rounded-lg border border-dashed border-white/10 p-3 text-center my-2">
            <p className="font-sans text-xs text-zinc-500">
              {filter === 'all' ? 'Belum ada sesi proyek.' : `Tidak ada spec ${filter}.`}
            </p>
          </div>
        ) : (
          sessions.map(s => {
            const isActive = pathname === `/engine/${s.id}`;
            const timeAgo = formatRelativeTime(s.updatedAt);
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
                          ? 'bg-emerald-400'
                          : 'bg-zinc-600'
                      }`}
                      title={s.projectId ? 'Workspace Ready' : 'Draft Spec'}
                    />
                    <div className="flex flex-col min-w-0 leading-snug">
                      <span className="truncate font-sans font-medium text-xs text-zinc-200 group-hover:text-white">
                        {s.projectName || s.title || 'Untitled Spec'}
                      </span>
                      {timeAgo && (
                        <span className="font-mono text-[9px] text-zinc-500 tracking-tight">
                          {timeAgo}
                        </span>
                      )}
                    </div>
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

      {/* Telemetry Hint Box */}
      <div className="px-3 pb-2 pt-1 shrink-0">
        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 font-mono text-[10px] text-zinc-500 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Spec Pipeline</span>
            <span className="text-emerald-400 text-[9px]">v1.2 Active</span>
          </div>
          <div className="text-[9px] text-zinc-600 flex items-center justify-between">
            <span>Shortcut</span>
            <span><kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400 text-[8.5px]">⌘⏎</kbd> Generate</span>
          </div>
        </div>
      </div>

      {/* Sidebar System Status Footer */}
      <div className="border-t border-white/10 px-4 py-3 bg-[#030304] shrink-0">
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
