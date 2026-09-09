'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Robot,
  GraduationCap,
  Waveform,
  WarningCircle,
  Sparkle,
  ArrowRight,
  Check,
  FileText,
  TreeStructure,
  ListChecks,
  Terminal,
  Code,
  Lock,
} from '@phosphor-icons/react';
import { useLanguage } from '@/context/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

/* ponytail: inline <style> instead of touching globals.css — move there if adopted site-wide */
const NOISE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E";

const CORNERS = [
  '-top-[7px] -left-[9px]',
  '-top-[7px] -right-[9px]',
  '-bottom-[7px] -left-[9px]',
  '-bottom-[7px] -right-[9px]',
];

const OUTPUTS = [
  { icon: TreeStructure, id: 'Flowchart aplikasi', en: 'App flowchart' },
  { icon: FileText, id: 'PRD lengkap', en: 'Complete PRD' },
  { icon: ListChecks, id: 'ADR', en: 'ADR' },
  { icon: Terminal, id: 'Aturan AGENTS.md', en: 'AGENTS.md rules' },
  { icon: Code, id: 'Prompt atomik', en: 'Atomic prompts' },
];

const STEPS = [
  {
    titleId: 'Masuk dengan ide mentah',
    titleEn: 'Walk in with a raw idea',
    descId: 'Tulis ide seadanya — gak perlu rapi buat mulai.',
    descEn: "Type the idea as-is — it doesn't need to be polished to begin.",
  },
  {
    titleId: 'Bertahan di interogasi',
    titleEn: 'Survive the interrogation',
    descId: 'System Architect menelusuri tiap celah lewat 5 fase wawancara.',
    descEn: 'A System Architect probes every gap across 5 interview phases.',
  },
  {
    titleId: 'Pulang bawa blueprint',
    titleEn: 'Leave with a blueprint',
    descId: 'Flowchart interaktif, PRD, ADR, AGENTS.md, dan prompt atomik siap dieksekusi.',
    descEn: 'Interactive flowchart, PRD, ADR, AGENTS.md, and atomic prompts — ready to execute.',
  },
];

const NODE_STATES = ['done', 'done', 'done', 'current', 'locked', 'locked'] as const;

const BARS = [24, 42, 58, 80, 46, 66, 90, 54, 32, 62, 76, 40, 86, 50, 28, 70, 44, 82, 36, 58, 74, 48, 30, 64, 52, 38];

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <div className="relative w-full h-full flex flex-col bg-[#030303] text-white overflow-auto scroll-smooth selection:bg-white selection:text-black">
      <style>{`
        @keyframes vw-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .vw-rise { opacity: 0; animation: vw-rise 0.8s cubic-bezier(0.22, 0.61, 0.21, 1) forwards; }
        .vw-d1 { animation-delay: 0.05s }
        .vw-d2 { animation-delay: 0.15s }
        .vw-d3 { animation-delay: 0.25s }
        .vw-d4 { animation-delay: 0.35s }
        .vw-d5 { animation-delay: 0.5s }
        @keyframes vw-caret { 0%, 49% { opacity: 1 } 50%, 100% { opacity: 0 } }
        .vw-caret { animation: vw-caret 1.1s steps(1) infinite; }
        .vw-noise { background-image: url("${NOISE}"); background-repeat: repeat; }
        @media (prefers-reduced-motion: reduce) {
          .vw-rise { animation: none; opacity: 1; }
          .vw-caret { animation: none; }
        }
      `}</style>

      {/* Film grain + blueprint grid */}
      <div aria-hidden className="vw-noise fixed inset-0 z-40 pointer-events-none opacity-[0.035]" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-20 h-16 shrink-0 w-full border-b border-white/10 bg-[#030303]/80 backdrop-blur-md flex items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="size-8 rounded-lg bg-white flex items-center justify-center text-black transition-transform duration-300 group-hover:rotate-12">
            <Sparkle weight="fill" className="w-4 h-4" />
          </div>
          <span className="font-mono font-bold text-sm text-white tracking-tight uppercase">
            {t('Vibework AI', 'Vibework AI')}
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          <nav className="hidden md:flex items-center gap-5 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
            <Link href="/engine" className="hover:text-white transition-colors">
              {t('The Grill', 'The Grill')}
            </Link>
            <Link href="/learn" className="hover:text-white transition-colors">
              {t('Kurikulum', 'Learn')}
            </Link>
            <Link href="/voice" className="hover:text-white transition-colors">
              {t('Voice', 'Voice')}
            </Link>
          </nav>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/5 font-mono text-[11px] text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
            <span>{t('Multi-LLM Engine Aktif', 'Multi-LLM Engine Active')}</span>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="relative flex-1 w-full max-w-6xl mx-auto px-6 flex flex-col">
        {/* Dot grid texture, fading out */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[85vh] bg-dot-grid opacity-60 pointer-events-none [mask-image:radial-gradient(ellipse_75%_60%_at_50%_15%,black,transparent)]"
        />

        {/* ============ HERO — asymmetric 5/7, The Grill gets the stage ============ */}
        <section className="relative grid lg:grid-cols-12 gap-12 lg:gap-10 items-center pt-14 pb-20 lg:min-h-[calc(100vh-4rem)]">
          {/* Left: copy */}
          <div className="lg:col-span-5 flex flex-col items-start gap-6">
            <div className="vw-rise vw-d1 inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500">
              <span className="size-1.5 rounded-full bg-white" />
              {t('Platform Spesifikasi & Pengembangan Multi-LLM', 'Multi-LLM Spec & Development Platform')}
            </div>

            <h1 className="vw-rise vw-d2 font-sans font-extrabold tracking-[-0.03em] leading-[1.04] text-white text-[2.55rem] sm:text-6xl xl:text-[4.4rem]">
              {t('Ide mentah masuk.', 'Raw idea in.')}
              <span className="block mt-1 text-transparent [-webkit-text-stroke:1.25px_rgba(255,255,255,0.45)]">
                {t('Blueprint siap pakai keluar.', 'Execution-ready blueprint out.')}
              </span>
            </h1>

            <p className="vw-rise vw-d3 text-sm sm:text-[15px] text-zinc-400 leading-relaxed max-w-md">
              {t(
                'The Grill — mesin andalan Vibework — mewawancarai ide lo lewat 5 fase, sampai detail yang belum kepikiran ikut keluar. Hasil akhirnya: flowchart aplikasi interaktif, PRD, ADR, aturan AGENTS.md, dan prompt atomik siap dilempar ke AI coding agent.',
                'The Grill — the flagship engine — interviews your idea across 5 phases until every unthought-of detail surfaces. The end result: an interactive app flowchart, PRD, ADR, AGENTS.md rules, and atomic prompts ready to hand to an AI coding agent.'
              )}
            </p>

            <div className="vw-rise vw-d4 flex flex-wrap items-center gap-3">
              <Link href="/engine" className="group">
                <Button variant="primary" size="lg">
                  <span>{t('Mulai Wawancara', 'Start the Interview')}</span>
                  <ArrowRight weight="bold" className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/learn">
                <Button variant="secondary" size="lg">
                  <span>{t('Jelajahi Roadmap Belajar', 'Explore Learning Roadmaps')}</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Right: The Grill panel — the focal point */}
          <div className="vw-rise vw-d5 lg:col-span-7 relative">
            <div
              aria-hidden
              className="absolute -top-5 right-0 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600"
            >
              {t('Fig. 01 — Sesi Wawancara', 'Fig. 01 — Interview Session')}
            </div>
            <div aria-hidden className="absolute -inset-10 rounded-[3rem] bg-white/[0.05] blur-3xl pointer-events-none" />

            <Card
              noPadding
              bg="white"
              className="relative rounded-2xl p-5 sm:p-7 border-white/15 bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-[0_0_100px_-30px_rgba(255,255,255,0.25)] hover:border-white/25 transition-all duration-500"
            >
              {/* Registration marks */}
              {CORNERS.map((pos) => (
                <span
                  key={pos}
                  aria-hidden
                  className={`absolute ${pos} font-mono text-sm leading-none text-zinc-500 select-none`}
                >
                  +
                </span>
              ))}

              {/* Panel header */}
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-8 rounded-lg bg-white/[0.06] border border-white/15 flex items-center justify-center shrink-0">
                    <Robot weight="duotone" className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono font-bold text-xs tracking-wide text-white uppercase truncate">
                      {t('The Grill', 'The Grill')}
                    </div>
                    <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider truncate">
                      {t('System Architect — wawancara berjalan', 'System Architect — interview live')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-emerald-300/90 border border-emerald-400/20 bg-emerald-400/[0.06] rounded-full px-2.5 py-1 shrink-0">
                  <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
                  {t('Fase 2/5', 'Phase 2/5')}
                </div>
              </div>

              {/* Interview mock */}
              <div className="py-6 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5 max-w-[88%]">
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600">
                    {t('System Architect', 'System Architect')}
                  </span>
                  <div className="rounded-lg rounded-tl-none border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-zinc-200 leading-relaxed">
                    {t(
                      'User menutup tab di tengah checkout. Ordernya berubah jadi status apa?',
                      'The user closes the tab mid-checkout. What status does the order land in?'
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 max-w-[88%] self-end">
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600">
                    {t('Kamu', 'You')}
                  </span>
                  <div className="rounded-lg rounded-tr-none border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-zinc-400 italic leading-relaxed">
                    {t('...jujur, belum kepikiran sampe situ.', '...honestly, I had not thought that far.')}
                  </div>
                </div>

                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 flex items-center gap-1.5">
                  {t('System Architect mengetik', 'System Architect is typing')}
                  <span className="vw-caret inline-block w-[7px] h-[11px] bg-white/80 translate-y-[2px]" />
                </div>
              </div>

              {/* Outputs */}
              <div className="pt-5 border-t border-white/10">
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600 pb-3">
                  {t('Keluaran akhir', 'What you walk away with')}
                </div>
                <div className="flex flex-wrap gap-2">
                  {OUTPUTS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.en}
                        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-[11px] text-zinc-300 hover:border-white/25 hover:text-white transition-colors duration-300"
                      >
                        <Icon weight="duotone" className="w-3.5 h-3.5 text-zinc-500" />
                        {t(item.id, item.en)}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Phase ticks */}
              <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between gap-6">
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600 shrink-0">
                  {t('5 fase wawancara', '5 interview phases')}
                </span>
                <div className="flex items-end gap-3 flex-1 max-w-[320px]">
                  {[1, 2, 3, 4, 5].map((phase) => (
                    <div key={phase} className="flex-1 flex flex-col gap-1.5">
                      <div
                        className={`h-1 rounded-full transition-colors ${phase <= 2 ? 'bg-white/80' : 'bg-white/10'}`}
                      />
                      <span className="font-mono text-[9px] text-zinc-600">
                        0{phase}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* ============ HOW IT RUNS — indexed strip ============ */}
        <section className="relative border-t border-white/10 py-14">
          <div className="flex items-center gap-4 pb-10">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">
              {t('Cara kerjanya', 'How it runs')}
            </span>
            <span aria-hidden className="flex-1 h-px bg-white/10" />
            <span aria-hidden className="font-mono text-[10px] text-zinc-600">/01</span>
          </div>

          <div className="grid md:grid-cols-3 gap-10 md:gap-0">
            {STEPS.map((step, i) => (
              <div
                key={step.titleEn}
                className="flex flex-col gap-3 md:px-8 md:border-l md:border-white/10 md:first:pl-0 md:first:border-l-0"
              >
                <span className="font-mono font-bold text-5xl leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.3)]">
                  0{i + 1}
                </span>
                <h3 className="font-sans font-semibold text-white text-base">
                  {t(step.titleId, step.titleEn)}
                </h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{t(step.descId, step.descEn)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ============ OTHER MODULES — asymmetric 7/5 ============ */}
        <section id="modul" className="relative border-t border-white/10 py-14 scroll-mt-16">
          <div className="flex items-center gap-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">
              {t('Modul lain di studio', 'Other studio modules')}
            </span>
            <span aria-hidden className="flex-1 h-px bg-white/10" />
            <span aria-hidden className="font-mono text-[10px] text-zinc-600">/02</span>
          </div>

          <div className="grid lg:grid-cols-12 gap-5 mt-8">
            {/* Curriculum */}
            <Link href="/learn" className="group lg:col-span-7 h-full">
              <Card noPadding bg="white" className="h-full p-6 sm:p-8 flex flex-col justify-between hover:-translate-y-1">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-6">
                    <div className="size-11 rounded-xl bg-white/[0.06] border border-white/15 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                      <GraduationCap weight="duotone" className="w-5 h-5" />
                    </div>
                    <span className="font-mono text-[10px] uppercase font-semibold px-2.5 py-1 rounded-full bg-white/5 text-zinc-400 border border-white/15">
                      {t('Kurikulum', 'Curriculum')}
                    </span>
                  </div>

                  <h3 className="font-sans font-bold text-xl text-white mb-2">
                    {t('Mesin Kurikulum', 'Curriculum Engine')}
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed max-w-lg">
                    {t(
                      'Roadmap visual bertahap untuk topik teknologi apa pun — sampai 8 bagian, 40 node. Tiap node berisi micro-lesson dan kuis.',
                      'Staged visual roadmaps for any technical topic — up to 8 sections, 40 nodes. Every node carries a micro-lesson and a quiz.'
                    )}
                  </p>

                  {/* Progression chain */}
                  <div className="mt-8 flex items-center">
                    {NODE_STATES.map((state, i) => (
                      <React.Fragment key={i}>
                        {state === 'done' && (
                          <span className="size-7 rounded-full bg-white text-black flex items-center justify-center shrink-0">
                            <Check weight="bold" className="w-3 h-3" />
                          </span>
                        )}
                        {state === 'current' && (
                          <span className="size-7 rounded-full border border-white/60 bg-white/[0.05] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(255,255,255,0.25)]">
                            <span className="size-1.5 rounded-full bg-white animate-pulse" />
                          </span>
                        )}
                        {state === 'locked' && (
                          <span className="size-7 rounded-full border border-white/10 bg-white/[0.02] flex items-center justify-center shrink-0">
                            <Lock weight="bold" className="w-3 h-3 text-zinc-600" />
                          </span>
                        )}
                        {i < NODE_STATES.length - 1 && (
                          <span aria-hidden className="flex-1 h-px bg-white/10" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="mt-3 font-mono text-[9px] uppercase tracking-wider text-zinc-600">
                    {t(
                      'Node berikutnya terkunci sampai kuisnya lolos.',
                      'The next node stays locked until its quiz is passed.'
                    )}
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between font-mono text-xs font-medium text-white">
                  <span>{t('Pelajari Topik', 'Learn a Topic')}</span>
                  <ArrowRight weight="bold" className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            </Link>

            {/* Voice Studio */}
            <Link href="/voice" className="group lg:col-span-5 h-full">
              <Card noPadding bg="white" className="h-full p-6 sm:p-8 flex flex-col justify-between hover:-translate-y-1">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-6">
                    <div className="size-11 rounded-xl bg-white/[0.06] border border-white/15 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                      <Waveform weight="duotone" className="w-5 h-5" />
                    </div>
                    <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-semibold px-2.5 py-1 rounded-full border border-amber-400/25 bg-amber-400/[0.06] text-amber-300/90">
                      <WarningCircle weight="bold" className="w-3 h-3" />
                      {t('WIP', 'WIP')}
                    </span>
                  </div>

                  <h3 className="font-sans font-bold text-xl text-white mb-2">
                    {t('Voice Studio', 'Voice Studio')}
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {t(
                      'Kloning suara dan narasi TTS berbasis AI — masih dalam pengerjaan.',
                      'AI voice cloning and TTS narration — still in the works.'
                    )}
                  </p>

                  {/* Waveform */}
                  <div className="mt-8 flex items-end gap-[3px] h-10" aria-hidden>
                    {BARS.map((height, i) => (
                      <span
                        key={i}
                        style={{ height: `${height}%`, animationDelay: `${i * 90}ms` }}
                        className={`w-1 rounded-full ${i % 4 === 1 ? 'bg-white/40 animate-pulse' : 'bg-white/15'}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between font-mono text-xs font-medium text-white">
                  <span>{t('Buka Studio', 'Open Studio')}</span>
                  <ArrowRight weight="bold" className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative border-t border-white/10 mt-4 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
            {t(
              'Vibework AI — platform spesifikasi & pengembangan multi-LLM',
              'Vibework AI — multi-LLM spec & development platform'
            )}
          </div>
          <div className="flex items-center gap-5 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
            <Link href="/engine" className="hover:text-white transition-colors">
              {t('The Grill', 'The Grill')}
            </Link>
            <Link href="/learn" className="hover:text-white transition-colors">
              {t('Kurikulum', 'Learn')}
            </Link>
            <Link href="/voice" className="hover:text-white transition-colors">
              {t('Voice', 'Voice')}
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
