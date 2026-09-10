'use client';

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

export function LearningNotFound() {
  const { t } = useLanguage();

  return (
    <div className="flex-1 w-full h-screen flex overflow-hidden items-center justify-center bg-[#030303] text-zinc-400">
      <div className="font-mono text-sm px-4 py-2 rounded-lg border border-white/10 bg-white/5">
        {t('Roadmap Pembelajaran Tidak Ditemukan', 'Learning Roadmap Not Found')}
      </div>
    </div>
  );
}
