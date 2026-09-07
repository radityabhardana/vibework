'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Robot, GraduationCap, Waveform, WarningCircle, Sparkle, ArrowRight } from '@phosphor-icons/react';
import { useLanguage } from '@/context/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

export default function DashboardPage() {
  const { t } = useLanguage();

  return (
    <div className="w-full h-full flex flex-col bg-background text-foreground overflow-auto relative">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-cyan-500/10 via-violet-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Top Navigation Bar */}
      <header className="h-16 w-full border-b border-white/10 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-6 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 p-[1px] flex items-center justify-center">
            <div className="w-full h-full bg-zinc-950 rounded-[7px] flex items-center justify-center">
              <Sparkle weight="fill" className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div>
            <h1 className="font-sans font-bold text-sm text-zinc-100 tracking-tight">
              Vibework Studio
            </h1>
            <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
              {t('Ringkasan Dashboard', 'Dashboard Overview')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border border-white/5 bg-white/[0.02]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="font-mono text-[11px] text-zinc-400">AI Engine Online</span>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-6 md:p-10 max-w-6xl w-full mx-auto flex flex-col gap-10 z-0">
        
        {/* Welcome Section */}
        <div className="flex flex-col gap-2">
          <h2 className="font-sans font-extrabold text-2xl md:text-3xl text-zinc-100 tracking-tight">
            {t('Orkestrasi Ide & Pengembangan AI', 'AI Ideation & Development Orchestrator')}
          </h2>
          <p className="font-sans text-sm md:text-base text-zinc-400 max-w-2xl leading-relaxed">
            {t(
              'Rancang arsitektur aplikasi secara visual, susun PRD otomatis, dan petakan roadmap pembelajaran interaktif dalam satu studio terintegrasi.',
              'Design app architectures visually, generate PRDs automatically, and map interactive learning roadmaps in a single integrated studio.'
            )}
          </p>
        </div>

        {/* Quick Actions Grid */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-sans font-semibold text-xs uppercase tracking-wider text-zinc-400">
              {t('Modul Utama', 'Core Modules')}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            
            {/* The Grill Card */}
            <Link href="/engine" className="group">
              <Card bg="blue" className="p-6 cursor-pointer hover:-translate-y-1 hover:border-cyan-500/50 hover:shadow-[0_0_30px_-5px_rgba(6,182,212,0.25)] transition-all h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                      <Robot weight="duotone" className="w-7 h-7" />
                    </div>
                    <span className="font-mono text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      Core Engine
                    </span>
                  </div>
                  <h4 className="font-sans font-bold text-lg text-zinc-100 mb-2 group-hover:text-cyan-400 transition-colors">
                    {t('The Grill: Mesin Proyek', 'The Grill: Project Engine')}
                  </h4>
                  <p className="font-sans text-sm text-zinc-400 leading-relaxed">
                    {t(
                      'Ubah ide mentah menjadi interactive application tree, PRD lengkap, aturan AGENTS.md, dan file arsitektur teknis siap pakai.',
                      'Transform raw ideas into interactive application trees, complete PRDs, AGENTS.md rules, and ready-to-use technical specs.'
                    )}
                  </p>
                </div>
                <div className="mt-8 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-semibold text-cyan-400">
                  <span>{t('Buka The Grill', 'Open The Grill')}</span>
                  <ArrowRight weight="bold" className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            </Link>

            {/* Learning Engine Card */}
            <Link href="/learn" className="group">
              <Card bg="white" className="p-6 cursor-pointer hover:-translate-y-1 hover:border-violet-500/50 hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.25)] transition-all h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:scale-105 transition-transform">
                      <GraduationCap weight="duotone" className="w-7 h-7" />
                    </div>
                    <span className="font-mono text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                      Interactive
                    </span>
                  </div>
                  <h4 className="font-sans font-bold text-lg text-zinc-100 mb-2 group-hover:text-violet-400 transition-colors">
                    {t('Mesin Pembelajaran AI', 'AI Learning Engine')}
                  </h4>
                  <p className="font-sans text-sm text-zinc-400 leading-relaxed">
                    {t(
                      'Buat visual roadmap bertahap untuk topik teknologi apapun dengan materi terstruktur dan kuis evaluasi otomatis.',
                      'Generate staged visual roadmaps for any technical topic with structured micro-lessons and automated quizzes.'
                    )}
                  </p>
                </div>
                <div className="mt-8 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-semibold text-violet-400">
                  <span>{t('Pelajari Topik', 'Learn Topic')}</span>
                  <ArrowRight weight="bold" className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            </Link>

            {/* Voice Studio Card */}
            <Link href="/voice" className="group md:col-span-2 xl:col-span-1">
              <Card bg="red" className="p-6 cursor-pointer hover:-translate-y-1 hover:border-rose-500/50 hover:shadow-[0_0_30px_-5px_rgba(244,63,94,0.25)] transition-all h-full flex flex-col justify-between relative">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform">
                      <Waveform weight="duotone" className="w-7 h-7" />
                    </div>
                    <span className="font-mono text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                      <WarningCircle weight="bold" className="w-3 h-3" />
                      WIP
                    </span>
                  </div>

                  <h4 className="font-sans font-bold text-lg text-zinc-100 mb-2 group-hover:text-rose-400 transition-colors">
                    {t('Gudang & Studio Suara', 'Voice Warehouse & Studio')}
                  </h4>
                  <p className="font-sans text-sm text-zinc-400 leading-relaxed">
                    {t(
                      'Kelola sampel suara dan generate narasi berkualitas tinggi dengan karakteristik vokal AI yang konsisten.',
                      'Manage voice samples and generate high-fidelity narrations with consistent AI vocal characters.'
                    )}
                  </p>
                </div>
                <div className="mt-8 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-semibold text-rose-400">
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
