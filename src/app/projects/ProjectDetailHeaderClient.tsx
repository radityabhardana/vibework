'use client';

import Link from 'next/link';
import { ChatCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/context/LanguageContext';

interface ProjectDetailHeaderClientProps {
  projectName: string;
  status: string | null;
  chatSessionId: string | null;
}

export default function ProjectDetailHeaderClient({
  projectName,
  status,
  chatSessionId,
}: ProjectDetailHeaderClientProps) {
  const { t } = useLanguage();

  return (
    <header className="z-10 flex min-h-16 w-full shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-zinc-950/80 backdrop-blur-md px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <Link href="/" className="font-mono text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          {t('← Dasbor', '← Dashboard')}
        </Link>
        <div className="h-4 w-[1px] bg-white/10" />
        <h1 className="truncate font-sans text-base font-bold text-zinc-100 sm:text-lg">{projectName}</h1>
        <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 font-mono text-[11px] font-medium text-zinc-300">
          {status}
        </span>
      </div>
      <Link href={chatSessionId ? `/engine/${chatSessionId}` : '/engine'}>
        <Button variant="secondary" size="sm" className="flex shrink-0 items-center gap-2 text-xs">
          <ChatCircle weight="bold" />
          <span className="hidden sm:inline">{t('Edit di Studio', 'Edit in Studio')}</span>
          <span className="sm:hidden">{t('Studio', 'Studio')}</span>
        </Button>
      </Link>
    </header>
  );
}
