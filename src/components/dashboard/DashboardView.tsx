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
      index: '01',
      title: 'The Grill',
      subtitle: t('Architecture Studio', 'Architecture Studio'),
      description: t(
        'Wawancara Socratic 5 fase untuk membedah ide menjadi PRD, ADR, Flowchart & Prompt siap pakai.',
        '5-phase Socratic interview turning ideas into PRD, ADR, Flowcharts & ready prompts.'
      ),
      href: '/engine',
      icon: Sparkle,
      tag: t('Arsitektur', 'Architecture'),
    },
    {
      id: 'kurikulum',
      index: '02',
      title: t('Kurikulum', 'Curriculum'),
      subtitle: t('Learning Engine', 'Learning Engine'),
      description: t(
        'Peta jalan belajar teknologi visual bertahap dengan micro-lessons dan kuis interaktif.',
        'Staged visual technology learning roadmaps with micro-lessons and interactive quizzes.'
      ),
      href: '/learn',
      icon: GraduationCap,
      tag: t('Peta Belajar', 'Roadmaps'),
    },
    {
      id: 'voice-studio',
      index: '03',
      title: 'Voice Studio',
      subtitle: t('Voice AI Studio', 'Voice AI Studio'),
      description: t(
        'Kloning suara dan sintesis narasi audio text-to-speech berbasis ModelStudio AI.',
        'Voice cloning and text-to-speech audio narration powered by ModelStudio AI.'
      ),
      href: '/voice',
      icon: Waveform,
      tag: t('Audio TTS', 'Audio TTS'),
    },
  ];

  return (
    <div className="relative w-full h-full min-h-screen flex flex-col bg-[#0b0d0f] text-zinc-100 overflow-hidden">
      {/* Background ambient lighting — single subtle white glow */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_65%_55%_at_78%_18%,rgba(184,231,199,0.12),transparent_68%)]"
      />
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none bg-dot-grid opacity-25 [mask-image:linear-gradient(to_bottom,black,transparent_65%)]"
      />

      {/* Top Bar: Minimal brand & status */}
      <header className="relative z-20 h-20 w-full px-6 sm:px-10 flex items-center justify-between border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-[var(--accent)] flex items-center justify-center text-[#102016]">
            <Sparkle weight="fill" className="w-4 h-4" />
          </div>
          <span className="font-mono font-bold text-xs tracking-wider uppercase text-white">
            Vibework
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] font-mono text-[11px] text-zinc-400">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t('Engine Aktif', 'Engine Active')}</span>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Center Canvas: The 3 Main Dashboard Buttons */}
      <main className="relative z-10 flex-1 flex flex-col justify-center px-6 py-10 max-w-6xl mx-auto w-full">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--accent)]">{t('Ruang kerja', 'Workspace')}</p>
            <h1 className="font-sans text-3xl font-extrabold tracking-[-0.04em] text-white sm:text-4xl">{t('Pilih langkah berikutnya', 'Choose your next step')}</h1>
          </div>
          <p className="max-w-xs text-xs leading-5 text-zinc-500 sm:text-right">{t('Mulai dari ide baru, lalu gunakan hasilnya di ruang kerja proyek.', 'Start with a new idea, then use its output in the project workspace.')}</p>
        </div>
        <div className="mb-5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          <span className="flex size-6 items-center justify-center rounded-full bg-[var(--accent)] font-bold text-[#102016]">1</span>
          <span>{t('Direkomendasikan untuk memulai', 'Recommended starting point')}</span>
          <span className="h-px flex-1 bg-white/10" />
          <span className="hidden sm:inline">{t('Tiga alat, satu alur kerja', 'Three tools, one workflow')}</span>
        </div>
        <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5">
          {MODULES.map((item, itemIndex) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`group relative rounded-2xl border p-6 sm:p-7 hover:-translate-y-1 active:scale-[0.99] transition-all duration-200 flex flex-col justify-between cursor-pointer ${item.id === 'the-grill' ? 'border-[rgba(184,231,199,0.45)] bg-[#17221d] md:col-span-6 md:min-h-[280px]' : 'border-white/10 bg-[var(--surface)] md:col-span-3 min-h-[230px]'} hover:border-[var(--accent)] hover:bg-[var(--surface-raised)]`}
              >
                <div className="h-full flex flex-col justify-between gap-8">
                  {/* Top: Ghost index & Tag */}
                  <div className="flex items-start justify-between gap-3">
                    <span
                      aria-hidden
                      className="font-mono text-4xl font-bold leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.25)] group-hover:[-webkit-text-stroke:1px_rgba(255,255,255,0.5)] transition-all select-none"
                    >
                      {itemIndex === 0 ? '→' : item.index}
                    </span>
                    <span className="font-mono text-[10px] uppercase font-semibold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400">
                      {item.tag}
                    </span>
                  </div>

                  {/* Bottom: Title, Description & Action */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-medium">
                      <span
                        className="size-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-300 transition-colors duration-300 group-hover:text-white group-hover:border-white/25 shrink-0"
                      >
                        <Icon weight="duotone" className="w-4 h-4" />
                      </span>
                      {item.subtitle}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="font-sans font-extrabold text-2xl text-white transition-colors">
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
