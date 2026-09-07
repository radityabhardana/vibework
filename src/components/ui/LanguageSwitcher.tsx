'use client';

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Translate } from '@phosphor-icons/react';

export const LanguageSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={`inline-flex items-center rounded-lg border border-white/15 bg-white/[0.03] p-1 font-mono text-xs ${className}`}>
      <div className="flex items-center gap-1.5 px-2 py-0.5 text-zinc-400 select-none">
        <Translate weight="bold" className="w-3.5 h-3.5" />
        <span className="hidden sm:inline uppercase text-[10px] tracking-wider text-zinc-500">Lang</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setLanguage('id')}
          className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all duration-200 cursor-pointer ${
            language === 'id'
              ? 'bg-white text-black font-semibold shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          🇮🇩 ID
        </button>
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all duration-200 cursor-pointer ${
            language === 'en'
              ? 'bg-white text-black font-semibold shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          🇬🇧 EN
        </button>
      </div>
    </div>
  );
};
