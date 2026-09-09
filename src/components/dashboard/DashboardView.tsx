'use client';

import React from 'react';
import Link from 'next/link';
import {
  Sparkle,
  GraduationCap,
  Waveform,
  ArrowRight,
} from '@phosphor-icons/react';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/context/LanguageContext';

export function DashboardView() {
  const { t } = useLanguage();

  const MODULES = [
    {
      id: 'the-grill',
      title: 'The Grill',
      subtitle: t('Architecture Studio', 'Architecture Studio'),
      description: t(
        'Wawancara Socratic 5 fase untuk membedah ide menjadi PRD, ADR, Flowchart & Prompt siap pakai.',
        '5-phase Socratic interview turning ideas into PRD, ADR, Flowcharts & ready prompts.'
      ),
      href: '/engine',
      icon: Sparkle,
      tag: t('Arsitektur', 'Architecture'),
      glow: 'group-hover:shadow-[0_0_40px_-10px_rgba(34,211,238,0.25)]',
      border: 'hover:border-cyan-500/30',
      iconBg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300',
    },
    {
      id: 'kurikulum',
      title: t('Kurikulum', 'Curriculum'),
      subtitle: t('Learning Engine', 'Learning Engine'),
      description: t(
        'Peta jalan belajar teknologi visual bertahap dengan micro-lessons dan kuis interaktif.',
        'Staged visual technology learning roadmaps with micro-lessons and interactive quizzes.'
      ),
      href: '/learn',
      icon: GraduationCap,
      tag: t('Peta Belajar', 'Roadmaps'),
      glow: 'group-hover:shadow-[0_0_40px_-10px_rgba(52,211,153,0.25)]',
      border: 'hover:border-emerald-500/30',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
    },
    {
      id: 'voice-studio',
      title: 'Voice Studio',
      subtitle: t('Voice AI Studio', 'Voice AI Studio'),
      description: t(
        'Kloning suara dan sintesis narasi audio text-to-speech berbasis ModelStudio AI.',
        'Voice cloning and text-to-speech audio narration powered by ModelStudio AI.'
      ),
      href: '/voice',
      icon: Waveform,
      tag: t('Audio TTS', 'Audio TTS'),
      glow: 'group-hover:shadow-[0_0_40px_-10px_rgba(251,191,36,0.25)]',
      border: 'hover:border-amber-500/30',
      iconBg: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
    },
  ];

  return (
    <div className="relative w-full h-full min-h-screen flex flex-col justify-between bg-[#030303] text-zinc-100 selection:bg-white selection:text-black overflow-hidden">
      {/* Background ambient lighting */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_70%_50%_at_50%_50%,rgba(120,119,198,0.07),rgba(0,0,0,0))]"
      />
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none bg-dot-grid opacity-20 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)]"
      />

      {/* Top Bar: Minimal brand & status */}
      <header className="relative z-20 h-16 w-full px-6 sm:px-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-white flex items-center justify-center text-black shadow-[0_0_15px_rgba(255,255,255,0.25)]">
            <Sparkle weight="fill" className="w-4 h-4" />
          </div>
          <span className="font-mono font-bold text-xs tracking-wider uppercase text-white">
            Vibework
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] font-mono text-[11px] text-zinc-400">
            <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse" />
            <span>{t('Engine Aktif', 'Engine Active')}</span>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Center Canvas: The 3 Main Dashboard Buttons */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-8 max-w-5xl mx-auto w-full">
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {MODULES.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`group relative p-1.5 rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 ${item.border} ${item.glow} hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex flex-col justify-between min-h-[260px] sm:min-h-[290px] cursor-pointer`}
              >
                <div className="h-full p-6 sm:p-7 rounded-xl bg-[#060608] border border-white/5 flex flex-col justify-between gap-6">
                  {/* Top: Icon & Tag */}
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`size-12 rounded-xl border flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${item.iconBg}`}
                    >
                      <Icon weight="duotone" className="w-6 h-6" />
                    </div>
                    <span className="font-mono text-[10px] uppercase font-semibold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400">
                      {item.tag}
                    </span>
                  </div>

                  {/* Bottom: Title, Description & Action */}
                  <div className="flex flex-col gap-2">
                    <div className="font-mono text-[11px] uppercase tracking-wider text-zinc-500 font-medium">
                      {item.subtitle}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="font-sans font-extrabold text-2xl text-white group-hover:text-cyan-100 transition-colors">
                        {item.title}
                      </h2>
                      <div className="size-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 group-hover:bg-white group-hover:text-black group-hover:border-white transition-all duration-300 shrink-0">
                        <ArrowRight
                          weight="bold"
                          className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                        />
                      </div>
                    </div>
                    <p className="font-sans text-xs text-zinc-400 leading-relaxed pt-1">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="relative z-20 h-14 w-full px-6 sm:px-10 flex items-center justify-center font-mono text-[10px] text-zinc-600 uppercase tracking-wider">
        <span>Vibework Studio · 3 Core Engines</span>
      </footer>
    </div>
  );
}
