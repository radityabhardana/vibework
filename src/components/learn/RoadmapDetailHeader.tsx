'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { House, GraduationCap } from '@phosphor-icons/react';
import { useLanguage } from '@/context/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

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
    <header className="h-20 w-full border-b-4 border-brutal-black bg-brutal-white flex items-center px-6 justify-between z-10 shrink-0">
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 bg-brutal-yellow border border-brutal-black">
              {topic}
            </span>
            <span className="text-xs font-mono font-bold text-green-700">
              {t('Progres:', 'Progress:')} {masteredNodes}/{totalNodes} ({progressPercent}%)
            </span>
          </div>
          <h1 className="font-sans font-black text-xl md:text-2xl uppercase tracking-tight line-clamp-1">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <Link href="/learn">
          <Button variant="secondary" size="sm" className="flex items-center gap-2">
            <GraduationCap weight="bold" />
            {t('Semua Roadmap', 'All Roadmaps')}
          </Button>
        </Link>
        <Link href="/">
          <Button variant="primary" size="sm" className="flex items-center gap-2">
            <House weight="bold" />
            {t('Dashboard', 'Dashboard')}
          </Button>
        </Link>
      </div>
    </header>
  );
}
