'use client';

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

export function EngineNotFound() {
  const { t } = useLanguage();

  return (
    <div className="flex-1 w-full flex overflow-hidden items-center justify-center bg-background text-zinc-400 font-sans text-sm">
      {t('Sesi tidak ditemukan', 'Session not found')}
    </div>
  );
}
