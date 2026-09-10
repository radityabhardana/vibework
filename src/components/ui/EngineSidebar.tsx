'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CheckCircle, FileText, House, Plus, Sparkle } from '@phosphor-icons/react';
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
  const diffInSec = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (diffInSec < 60) return 'Baru saja';
  const diffInMin = Math.floor(diffInSec / 60);
  if (diffInMin < 60) return `${diffInMin}m lalu`;
  const diffInHours = Math.floor(diffInMin / 60);
  if (diffInHours < 24) return `${diffInHours}j lalu`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}h lalu`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

type Filter = 'all' | 'ready' | 'draft';

export function EngineSidebar({ initialSessions }: { initialSessions: EngineSessionItem[] }) {
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const pathname = usePathname();

  const handleDeleted = (deletedId: string) => {
    setDeletedIds(previous => previous.includes(deletedId) ? previous : [...previous, deletedId]);
  };

  const visibleSessions = initialSessions.filter(session => !deletedIds.includes(session.id));
  const sessions = visibleSessions.filter(session => {
    if (filter === 'ready') return Boolean(session.projectId);
    if (filter === 'draft') return !session.projectId;
    return true;
  });
  const readyCount = visibleSessions.filter(session => Boolean(session.projectId)).length;
  const draftCount = visibleSessions.length - readyCount;

  return (
    <aside className="flex max-h-[min(48vh,28rem)] w-full shrink-0 flex-col border-b border-white/[0.08] bg-[#0d1011] lg:h-full lg:max-h-none lg:w-72 lg:border-b-0 lg:border-r">
      <div className="flex shrink-0 flex-col gap-5 border-b border-white/[0.08] bg-[#0a0d0e] px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <Link href="/engine" className="group flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-black shadow-[0_8px_24px_-12px_rgba(255,255,255,0.35)]">
              <Sparkle weight="fill" className="size-4" />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-sans text-sm font-bold tracking-tight text-white">The Grill</span>
              <span className="mt-1 block truncate font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500">Architecture Studio</span>
            </span>
          </Link>
          <span className="mt-1 size-2 shrink-0 rounded-full bg-emerald-300" title="Studio aktif" />
        </div>

        <Link href="/engine" className="block">
          <Button variant="primary" size="sm" className="w-full !bg-zinc-100 !text-black !py-2.5 text-xs font-sans shadow-sm hover:!bg-white focus-visible:!ring-white/50">
            <Plus weight="bold" className="size-4" />
            <span>Spec baru</span>
          </Button>
        </Link>
        <p className="-mt-2 font-sans text-[11px] leading-4 text-zinc-500">Mulai percakapan untuk mengubah ide menjadi dokumen arsitektur.</p>
      </div>

      <div className="flex shrink-0 items-center gap-1 px-4 py-4" role="tablist" aria-label="Filter sesi">
        {([
          ['all', 'Semua', visibleSessions.length],
          ['ready', 'Siap', readyCount],
          ['draft', 'Draft', draftCount],
        ] as const).map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            onClick={() => setFilter(value)}
            className={`rounded-lg px-2.5 py-1.5 font-mono text-[10px] transition-colors ${filter === value ? 'bg-white text-[#102016] font-bold' : 'text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200'}`}
          >
            {label} <span className="opacity-60">{count}</span>
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 lg:overscroll-contain">
        <div className="mb-2 flex items-center justify-between px-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">Riwayat sesi</span>
          <span className="font-mono text-[10px] text-zinc-600">{sessions.length}</span>
        </div>
        {sessions.length === 0 ? (
          <div className="mx-1 my-3 rounded-xl bg-[#151819] px-4 py-5">
            <div className="mb-3 flex size-8 items-center justify-center rounded-lg bg-white/[0.06] text-zinc-300">
              {filter === 'draft' ? <FileText weight="duotone" className="size-4" /> : <Sparkle weight="duotone" className="size-4" />}
            </div>
            <p className="font-sans text-xs font-semibold text-zinc-200">{filter === 'all' ? 'Belum ada sesi' : `Belum ada ${filter}`}</p>
            <p className="mt-1 font-sans text-[11px] leading-4 text-zinc-500">Klik “Spec baru” untuk memulai dari ide aplikasi.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {sessions.map(session => {
              const isActive = pathname === `/engine/${session.id}`;
              const sessionTitle = session.projectName || session.title || 'Spec tanpa judul';
              return (
                <div key={session.id} className={`group relative flex items-center gap-2 rounded-xl px-3 py-2.5 transition-colors ${isActive ? 'bg-white/[0.09] text-white ring-1 ring-white/[0.16]' : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white'}`}>
                  <span className={`size-2 shrink-0 rounded-full ${session.projectId ? 'bg-emerald-300' : 'bg-zinc-600'}`} title={session.projectId ? 'Workspace siap' : 'Draft'} />
                  <Link href={`/engine/${session.id}`} className="min-w-0 flex-1 focus-visible:outline-none">
                    <span className="block truncate font-sans text-xs font-medium">{sessionTitle}</span>
                    <span className="mt-0.5 block font-mono text-[9px] text-zinc-500">{formatRelativeTime(session.updatedAt) || 'Waktu tidak tersedia'}</span>
                  </Link>
                  {isActive && <CheckCircle weight="fill" className="size-4 shrink-0 text-[var(--accent)]" />}
                  <div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <DeleteSessionButton sessionId={session.id} sessionTitle={sessionTitle} onDeleted={handleDeleted} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-white/[0.08] px-5 py-3 text-[10px] text-zinc-500">
        <span className="flex items-center gap-2 font-mono"><span className="size-1.5 rounded-full bg-emerald-300" /> Riwayat tersimpan</span>
        <Link href="/" className="flex items-center gap-1.5 font-mono transition-colors hover:text-white" title="Kembali ke dashboard">
          <House weight="bold" className="size-3" /> Dashboard
        </Link>
      </div>
    </aside>
  );
}
