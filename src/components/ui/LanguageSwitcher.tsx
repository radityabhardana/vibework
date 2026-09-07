'use client';

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Translate } from '@phosphor-icons/react';

export const LanguageSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={`inline-flex items-center rounded-lg border border-white/10 bg-zinc-900/90 p-1 font-sans text-xs ${className}`}>
      <div className="flex items-center gap-1.5 px-2 py-0.5 text-zinc-400 select-none">
        <Translate weight="bold" className="w-3.5 h-3.5" />
        <span className="hidden sm:inline font-mono text-[11px] uppercase tracking-wider text-zinc-500">Lang</span>
      </div>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => setLanguage('id')}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            language === 'id'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-white/10'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
          }`}
        >
          🇮🇩 ID
        </button>
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            language === 'en'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-white/10'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
          }`}
        >
          🇬🇧 EN
        </button>
      </div>
    </div>
  );
};
