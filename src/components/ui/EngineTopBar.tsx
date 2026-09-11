'use client';

import React from 'react';
import Link from 'next/link';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/context/LanguageContext';
import { ReturnHomeLink } from '@/components/ui/ReturnHomeLink';

export function EngineTopBar() {
  const { t } = useLanguage();

  return (
    <header className="h-16 shrink-0 border-b border-white/[0.08] bg-[#0d1011] px-4 sm:px-6 flex items-center justify-between z-10">
      <div className="flex min-w-0 items-center gap-3">
        <span className="truncate font-sans text-sm font-semibold tracking-tight text-zinc-100">The Grill</span>
        <div className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600 sm:flex">
          <span>/</span>
          <Link href="/" className="transition-colors hover:text-zinc-300">
            Vibework
          </Link>
          <span>/</span>
          <span className="text-zinc-500">{t('Studio Spesifikasi', 'Spec Studio')}</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <ReturnHomeLink label={t('Dashboard', 'Dashboard')} />
        <LanguageSwitcher />
      </div>
    </header>
  );
}
