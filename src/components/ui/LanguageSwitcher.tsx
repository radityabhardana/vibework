'use client';

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Translate } from '@phosphor-icons/react';

export const LanguageSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={`flex items-center border-2 border-brutal-black bg-brutal-white font-mono text-xs font-bold shadow-brutal-sm ${className}`}>
      <div className="px-2 py-1 flex items-center gap-1 bg-gray-100 border-r-2 border-brutal-black text-brutal-black select-none">
        <Translate weight="bold" className="w-4 h-4" />
        <span className="hidden sm:inline">Lang:</span>
      </div>
      <button
        type="button"
        onClick={() => setLanguage('id')}
        className={`px-2 py-1 transition-all ${
          language === 'id'
            ? 'bg-brutal-yellow font-black text-brutal-black underline'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        🇮🇩 ID
      </button>
      <div className="w-[2px] h-full bg-brutal-black" />
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2 py-1 transition-all ${
          language === 'en'
            ? 'bg-brutal-yellow font-black text-brutal-black underline'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        🇬🇧 EN
      </button>
    </div>
  );
};
