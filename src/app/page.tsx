'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Robot, GraduationCap, Waveform, WarningCircle, Sparkle, ArrowRight, Code, Lightning } from '@phosphor-icons/react';
import { useLanguage } from '@/context/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

export default function DashboardPage() {
  const { t } = useLanguage();

  return (
    <div className="w-full h-full flex flex-col bg-[#030303] text-white overflow-auto relative selection:bg-white selection:text-black">
      {/* Subtle WriteMate Radial Gradient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[380px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_70%)] pointer-events-none" />

      {/* Top Navbar */}
      <header className="h-16 w-full border-b border-white/10 bg-[#030303]/80 backdrop-blur-md flex items-center justify-between px-6 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-white flex items-center justify-center text-black">
            <Sparkle weight="fill" className="w-4 h-4" />
          </div>
          <div>
            <span className="font-mono font-bold text-sm text-white tracking-tight uppercase">
              Vibework AI
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/5 font-mono text-[11px] text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
            <span>Multi-LLM Engine Active</span>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-6 md:p-12 max-w-6xl w-full mx-auto flex flex-col gap-12 z-0">
        
        {/* WriteMate Hero Section */}
        <div className="flex flex-col items-center text-center gap-4 pt-4">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 bg-white/5 font-mono text-xs text-white -tracking-[0.2px]">
            <Sparkle weight="fill" className="w-3.5 h-3.5" />
            <span>{t('AI-Powered Spec & Development Platform', 'AI-Powered Spec & Development Platform')}</span>
          </div>

          {/* Display Heading */}
          <h1 className="font-sans font-extrabold text-3xl sm:text-5xl md:text-6xl text-white tracking-tight max-w-4xl leading-[1.15]">
            {t(
              'Orkestrasi Ide & Blueprint Coding Berbasis Multi-LLM',
              'Multi-LLM AI Coding & Specification Platform'
            )}
          </h1>

          {/* Subtitle */}
          <p className="font-sans text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
            {t(
              'Rancang arsitektur visual interaktif, rumuskan PRD dan guardrails AGENTS.md, serta petakan roadmap pembelajaran modular dalam satu studio terintegrasi.',
              'Design interactive visual architectures, formulate PRDs and AGENTS.md guardrails, and map modular learning roadmaps in one unified studio.'
            )}
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            <Link href="/engine">
              <Button variant="primary" size="md">
                <span>{t('Mulai Proyek Baru →', 'Start New Spec →')}</span>
              </Button>
            </Link>
            <Link href="/learn">
              <Button variant="secondary" size="md">
                <span>{t('Jelajahi Roadmap AI', 'Explore AI Roadmap')}</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Cards Grid (WriteMate Style) */}
        <section className="flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="font-mono text-xs uppercase tracking-wider text-zinc-400 font-semibold">
              {t('Modul Studio Tersedia', 'Available Studio Modules')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            
            {/* The Grill Card */}
            <Link href="/engine" className="group">
              <Card bg="white" className="p-7 h-full flex flex-col justify-between hover:border-white/30 hover:bg-white/[0.05]">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-6">
                    <div className="size-12 rounded-xl bg-white/[0.06] border border-white/15 flex items-center justify-center text-white group-hover:scale-105 transition-transform duration-300">
                      <Robot weight="duotone" className="w-6 h-6" />
                    </div>
                    <span className="font-mono text-[10px] uppercase font-semibold px-2.5 py-1 rounded-full bg-white/5 text-zinc-300 border border-white/15">
                      Spec Engine
                    </span>
                  </div>
                  <h3 className="font-mono font-bold text-lg text-white mb-2 group-hover:text-white transition-colors">
                    {t('The Grill: Mesin Proyek', 'The Grill: Project Engine')}
                  </h3>
                  <p className="font-sans text-sm text-zinc-400 leading-relaxed">
                    {t(
                      'Ubah ide mentah menjadi interactive application tree, PRD lengkap, aturan AGENTS.md, dan file arsitektur teknis siap pakai.',
                      'Transform raw ideas into interactive application trees, complete PRDs, AGENTS.md rules, and ready-to-use technical specs.'
                    )}
                  </p>
                </div>
                <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between font-mono text-xs font-medium text-white">
                  <span>{t('Buka The Grill', 'Open The Grill')}</span>
                  <ArrowRight weight="bold" className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            </Link>

            {/* Learning Engine Card */}
            <Link href="/learn" className="group">
              <Card bg="white" className="p-7 h-full flex flex-col justify-between hover:border-white/30 hover:bg-white/[0.05]">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-6">
                    <div className="size-12 rounded-xl bg-white/[0.06] border border-white/15 flex items-center justify-center text-white group-hover:scale-105 transition-transform duration-300">
                      <GraduationCap weight="duotone" className="w-6 h-6" />
                    </div>
                    <span className="font-mono text-[10px] uppercase font-semibold px-2.5 py-1 rounded-full bg-white/5 text-zinc-300 border border-white/15">
                      Curriculum
                    </span>
                  </div>
                  <h3 className="font-mono font-bold text-lg text-white mb-2 group-hover:text-white transition-colors">
                    {t('Mesin Pembelajaran AI', 'AI Learning Engine')}
                  </h3>
                  <p className="font-sans text-sm text-zinc-400 leading-relaxed">
                    {t(
                      'Buat visual roadmap bertahap untuk topik teknologi apapun dengan materi terstruktur dan kuis evaluasi otomatis.',
                      'Generate staged visual roadmaps for any technical topic with structured micro-lessons and automated quizzes.'
                    )}
                  </p>
                </div>
                <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between font-mono text-xs font-medium text-white">
                  <span>{t('Pelajari Topik', 'Learn Topic')}</span>
                  <ArrowRight weight="bold" className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            </Link>

            {/* Voice Studio Card */}
            <Link href="/voice" className="group md:col-span-2 xl:col-span-1">
              <Card bg="white" className="p-7 h-full flex flex-col justify-between hover:border-white/30 hover:bg-white/[0.05] relative">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-6">
                    <div className="size-12 rounded-xl bg-white/[0.06] border border-white/15 flex items-center justify-center text-white group-hover:scale-105 transition-transform duration-300">
                      <Waveform weight="duotone" className="w-6 h-6" />
                    </div>
                    <span className="font-mono text-[10px] uppercase font-semibold px-2.5 py-1 rounded-full bg-white/5 text-zinc-300 border border-white/15 flex items-center gap-1.5">
                      <WarningCircle weight="bold" className="w-3 h-3 text-amber-400" />
                      WIP
                    </span>
                  </div>

                  <h3 className="font-mono font-bold text-lg text-white mb-2 group-hover:text-white transition-colors">
                    {t('Gudang & Studio Suara', 'Voice Warehouse & Studio')}
                  </h3>
                  <p className="font-sans text-sm text-zinc-400 leading-relaxed">
                    {t(
                      'Kelola sampel suara dan generate narasi berkualitas tinggi dengan karakteristik vokal AI yang konsisten.',
                      'Manage voice samples and generate high-fidelity narrations with consistent AI vocal characters.'
                    )}
                  </p>
                </div>
                <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between font-mono text-xs font-medium text-white">
                  <span>{t('Buka Studio', 'Open Studio')}</span>
                  <ArrowRight weight="bold" className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            </Link>

          </div>
        </section>

      </main>
    </div>
  );
}
