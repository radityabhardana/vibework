'use client';

import React from 'react';
import Link from 'next/link';
import { GraduationCap } from '@phosphor-icons/react';
import { useLanguage } from '@/context/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ReturnHomeLink } from '@/components/ui/ReturnHomeLink';

export function RoadmapDetailHeader({
  topic,
  title,
  masteredNodes,
  totalNodes,
}: {
  topic: string;
  title: string;
  masteredNodes: number;
  totalNodes: number;
}) {
  const { t } = useLanguage();
  const progressPercent = Math.round((masteredNodes / Math.max(1, totalNodes)) * 100);

  return (
    <header className="h-16 w-full border-b border-white/[0.08] bg-[#0b0d0f]/95 flex items-center px-4 sm:px-6 justify-between z-20 shrink-0">
      <div className="flex items-center gap-4 min-w-0">
        <ReturnHomeLink label={t('Dashboard', 'Dashboard')} />
        <Link
          href="/learn"
          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors shrink-0"
          title={t('Kembali ke Roadmap', 'Back to Roadmaps')}
        >
          <GraduationCap weight="bold" className="w-4 h-4" />
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-mono font-medium uppercase px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300">
              {topic}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium text-zinc-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {t('Progres:', 'Progress:')} {masteredNodes}/{totalNodes} ({progressPercent}%)
            </span>
          </div>
          <h1 className="text-sm md:text-base font-semibold text-white tracking-tight line-clamp-1">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <LanguageSwitcher />
        <Link
          href="/learn"
          className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
        >
          <GraduationCap weight="bold" className="w-3.5 h-3.5" />
          {t('Semua Roadmap', 'All Roadmaps')}
        </Link>
      </div>
    </header>
  );
}
