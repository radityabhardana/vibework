'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Lightning,
  ArrowUpRight,
  DeviceMobile,
  Globe,
  Robot,
  Storefront,
  WarningCircle,
  SlidersHorizontal,
  Sparkle,
  TreeStructure,
  Article,
  Cpu,
  CaretDown,
  CaretUp,
  ShieldCheck,
  ArrowClockwise,
} from '@phosphor-icons/react';

export type ProjectSummaryData = {
  id?: string;
  name: string;
  description?: string | null;
  status?: string | null;
  createdAt?: string | null;
};

type IdeaStudioProps = {
  initialSessionId?: string;
  initialIdea?: string;
  initialProjectId?: string | null;
  initialProjectData?: ProjectSummaryData | null;
};

const ARCH_PRESETS = [
  { label: 'Web SaaS B2B', icon: Globe, snippet: 'Platform Web SaaS B2B dengan multi-tenant & dashboard analitik' },
  { label: 'Mobile App', icon: DeviceMobile, snippet: 'Aplikasi Mobile iOS & Android native-feel dengan navigasi bottom-tab' },
  { label: 'AI Agent System', icon: Robot, snippet: 'Automasi AI Agent & Workflow Pintar dengan tool calling dan knowledge base' },
  { label: 'Marketplace', icon: Storefront, snippet: 'Marketplace terintegrasi sistem transaksi, katalog & payment gateway' },
];

const QUICK_STACKS = [
  'Next.js 15 + Tailwind',
  'React Native (Expo)',
  'Supabase / PostgreSQL',
  'FastAPI + Python AI',
  'WhatsApp Automation',
];

const GENERATION_STEPS = [
  'Memetakan Interactive Application Tree & Screen Nodes...',
  'Menyusun Product Requirements Document (PRD)...',
  'Merumuskan Aturan AGENTS.md & Guardrails...',
  'Merancang Architecture Decision Record (ADR) & Schema...',
  'Mengompilasi Master Prompt.md Siap Pakai...',
];

export function IdeaStudio({
  initialSessionId,
  initialIdea = '',
  initialProjectId = null,
  initialProjectData = null,
}: IdeaStudioProps) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId);
  const [projectId, setProjectId] = useState<string | null>(initialProjectId);
  const [projectData] = useState<ProjectSummaryData | null>(initialProjectData);
  const [idea, setIdea] = useState(initialIdea);
  const [targetAudience, setTargetAudience] = useState('');
  const [techStack, setTechStack] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showReDraft, setShowReDraft] = useState(false);
  const [status, setStatus] = useState<'idle' | 'generating'>('idle');
  const [progressStepIndex, setProgressStepIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (status !== 'generating') {
      setProgressPercent(0);
      setProgressStepIndex(0);
      return;
    }

    const timer = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev >= 95) return 95;
        const inc = Math.max(0.6, (95 - prev) * 0.04);
        return Math.min(95, prev + inc);
      });
    }, 400);

    const stepTimer = setInterval(() => {
      setProgressStepIndex((prev) => (prev < GENERATION_STEPS.length - 1 ? prev + 1 : prev));
    }, 4500);

    return () => {
      clearInterval(timer);
      clearInterval(stepTimer);
    };
  }, [status]);

  const handleAddTag = (snippet: string) => {
    setIdea((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return `Kategori: ${snippet}.\n\n`;
      if (trimmed.includes(snippet)) return prev;
      return `${trimmed}\n\n[Kategori: ${snippet}]`;
    });
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleAddTech = (tech: string) => {
    setTechStack((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return tech;
      if (trimmed.includes(tech)) return prev;
      return `${trimmed}, ${tech}`;
    });
    setShowAdvanced(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleGenerate = async () => {
    const trimmedIdea = idea.trim();
    if (!trimmedIdea || status === 'generating') return;

    setStatus('generating');
    setError(null);

    try {
      let fullPrompt = trimmedIdea;
      const extras: string[] = [];
      if (targetAudience.trim()) extras.push(`Target User: ${targetAudience.trim()}`);
      if (techStack.trim()) extras.push(`Tech Stack Preferensi: ${techStack.trim()}`);
      if (extras.length > 0) {
        fullPrompt += `\n\n--- Preferensi Tambahan ---\n${extras.join('\n')}`;
      }

      let activeSessionId = sessionId;
      if (!activeSessionId) {
        const sessionRes = await fetch('/api/chat/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (!sessionRes.ok) {
          throw new Error('Gagal menginisialisasi sesi baru.');
        }
        const sessionData = await sessionRes.json();
        activeSessionId = sessionData.id;
        setSessionId(activeSessionId);
      }

      const messageRes = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          sessionId: activeSessionId,
          role: 'user',
          content: fullPrompt,
        }),
      });

      if (!messageRes.ok) {
        throw new Error('Gagal menyimpan ide aplikasi ke database.');
      }

      const genRes = await fetch('/api/projects/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          sessionId: activeSessionId,
          regenerate: !!projectId,
          stream: true,
        }),
      });

      if (!genRes.ok) {
        const errPayload: unknown = await genRes.json().catch(() => ({}));
        const message =
          typeof errPayload === 'object' && errPayload !== null && 'error' in errPayload
            ? String((errPayload as Record<string, unknown>).error)
            : 'Gagal generate spesifikasi proyek.';
        throw new Error(message);
      }

      const contentType = genRes.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream') && genRes.body) {
        const reader = genRes.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let targetProjectId: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || '';

          let currentEvent = 'message';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;
            if (trimmed.startsWith('event:')) {
              currentEvent = trimmed.slice(6).trim();
              continue;
            }
            if (trimmed.startsWith('data:')) {
              const dataStr = trimmed.slice(5).trim();
              try {
                const payload = JSON.parse(dataStr);
                if (currentEvent === 'progress') {
                  if (typeof payload.percent === 'number') {
                    setProgressPercent(payload.percent);
                  }
                  if (payload.step === 'prd') setProgressStepIndex(1);
                  else if (payload.step === 'db') setProgressStepIndex(2);
                  else if (payload.step === 'architecture') setProgressStepIndex(3);
                  else if (payload.step === 'agents') setProgressStepIndex(4);
                } else if (currentEvent === 'complete') {
                  setProgressPercent(100);
                  if (typeof payload.projectId === 'string') {
                    targetProjectId = payload.projectId;
                  }
                } else if (currentEvent === 'error') {
                  throw new Error(payload.error || 'Gagal generate spesifikasi proyek.');
                }
              } catch (parseErr) {
                if (parseErr instanceof Error && currentEvent === 'error') {
                  throw parseErr;
                }
              }
            }
          }
        }

        if (targetProjectId) {
          setProjectId(targetProjectId);
          router.push(`/projects/${targetProjectId}`);
        } else {
          throw new Error('Sesi pembuatan selesai namun projectId tidak ditemukan.');
        }
      } else {
        const genData = await genRes.json();
        setProgressPercent(100);
        setProjectId(genData.projectId);
        router.push(`/projects/${genData.projectId}`);
      }
    } catch (err: unknown) {
      console.error('Generation failed:', err);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
      setStatus('idle');
    }
  };

  const isCompletedProject = Boolean(projectId);

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-[#030304] text-white px-4 py-8 sm:px-6 md:px-8 md:py-12 flex flex-col items-center justify-start relative selection:bg-white selection:text-black">
      {/* Reduced-motion baseline */}
      <style>{`@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important;}}`}</style>
      
      {/* Ambient glow + subtle dot matrix */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[340px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06),transparent_70%)] pointer-events-none" />
      <div
        className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none [mask-image:linear-gradient(to_bottom,black,transparent_75%)]"
      />

      <div className="w-full max-w-3xl flex flex-col gap-6 z-0">

        {/* ============================================================ */}
        {/* EXECUTIVE ARCHITECTURE DOSSIER HERO CARD (If Spec is Ready) */}
        {/* ============================================================ */}
        {isCompletedProject && (
          <div className="w-full rounded-3xl p-1.5 sm:p-2 bg-gradient-to-b from-white/10 via-white/[0.04] to-white/[0.01] border border-white/15 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.95)] ring-1 ring-emerald-500/20 transition-all duration-300">
            <div className="rounded-[1.25rem] bg-[#070709] border border-white/10 p-6 sm:p-8 flex flex-col gap-6 relative overflow-hidden">
              {/* Emerald ambient blur inside card */}
              <div className="absolute -top-24 right-0 w-80 h-80 bg-emerald-500/[0.08] rounded-full blur-3xl pointer-events-none" />

              {/* Status Header Badge */}
              <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] uppercase tracking-[0.2em]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  <span>Arsitektur &amp; Dokumen Siap</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
                  <span>ID:</span>
                  <span className="text-zinc-300 truncate max-w-[140px] sm:max-w-none">{projectId}</span>
                </div>
              </div>

              {/* Project Title & Summary */}
              <div className="flex flex-col gap-2 relative z-10">
                <h2 className="font-sans font-extrabold text-2xl sm:text-3xl text-white tracking-[-0.02em] leading-tight">
                  {projectData?.name || 'Project Blueprint & Architecture'}
                </h2>
                <p className="font-sans text-xs sm:text-sm text-zinc-400 max-w-xl leading-relaxed">
                  {projectData?.description ||
                    'Interactive Application Tree, Product Requirements Document (PRD), Tech Decision Record (ADR), dan instruksi AGENTS.md telah selesai dirumuskan dan siap diimplementasikan.'}
                </p>
              </div>

              {/* 4 Deliverable Pillars Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 relative z-10">
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    <TreeStructure weight="duotone" className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-zinc-200">Interactive Flowchart Tree</div>
                    <div className="text-[10px] text-zinc-500 truncate">Screen nodes, user flow &amp; edge transitions</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
                    <Article weight="duotone" className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-zinc-200">Product Requirements (PRD)</div>
                    <div className="text-[10px] text-zinc-500 truncate">User stories, MVP scope &amp; constraints</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 shrink-0">
                    <ShieldCheck weight="duotone" className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-zinc-200">AI Coding Guardrails</div>
                    <div className="text-[10px] text-zinc-500 truncate">AGENTS.md rules &amp; anti-hallucination</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                    <Cpu weight="duotone" className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-zinc-200">Architecture Decision (ADR)</div>
                    <div className="text-[10px] text-zinc-500 truncate">Tech stack, DB schema &amp; API contract</div>
                  </div>
                </div>
              </div>

              {/* High-Impact Actions Bar */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10">
                <Link href={`/projects/${projectId}`} className="flex-1 min-w-[240px]">
                  <button
                    type="button"
                    className="w-full group/btn relative inline-flex items-center justify-between gap-4 px-6 py-4 rounded-2xl bg-white text-black font-sans font-extrabold text-sm sm:text-base hover:bg-zinc-100 transition-all duration-300 shadow-[0_0_35px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_50px_rgba(255,255,255,0.5)] active:scale-[0.98] cursor-pointer"
                  >
                    <div className="flex flex-col text-left">
                      <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-500 font-semibold">Langkah Selanjutnya</span>
                      <span className="text-base sm:text-lg font-extrabold tracking-tight">Buka Project Workspace</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center group-hover/btn:scale-105 group-hover/btn:translate-x-1 transition-all duration-300 shadow-md">
                      <ArrowUpRight weight="bold" className="w-5 h-5" />
                    </div>
                  </button>
                </Link>

                <Link href={`/projects/${projectId}?tab=tree`} className="shrink-0">
                  <button
                    type="button"
                    className="w-full h-full px-5 py-4 rounded-2xl border border-white/15 bg-white/[0.03] hover:bg-white/10 text-white font-mono text-xs flex items-center justify-center gap-2 transition-all cursor-pointer hover:border-white/30"
                  >
                    <TreeStructure weight="bold" className="w-4 h-4 text-emerald-400" />
                    <span>Lihat Flowchart Visual</span>
                  </button>
                </Link>
              </div>

              {/* Re-Draft Toggle Option */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="font-mono text-[11px] text-zinc-500">
                  Ingin memperbarui atau merancang ulang ide ini?
                </span>
                <button
                  type="button"
                  onClick={() => setShowReDraft(!showReDraft)}
                  className="inline-flex items-center gap-1.5 font-mono text-xs text-zinc-300 hover:text-white transition-colors py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer"
                >
                  <SlidersHorizontal weight="bold" className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{showReDraft ? 'Tutup Editor Brief' : 'Buka Editor Brief'}</span>
                  {showReDraft ? <CaretUp weight="bold" className="w-3 h-3 ml-0.5" /> : <CaretDown weight="bold" className="w-3 h-3 ml-0.5" />}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STUDIO COMPOSER (Visible if New Spec OR User clicks Re-draft) */}
        {/* ============================================================ */}
        {(!isCompletedProject || showReDraft) && (
          <div className="flex flex-col gap-6">

            {/* Studio Hero Header */}
            <div className="flex flex-col items-center text-center gap-3">
              <div className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                <span aria-hidden className="size-1.5 rounded-full bg-white" />
                <span>The Grill · AI Architecture Studio</span>
                <span aria-hidden className="size-1.5 rounded-full bg-white/20" />
              </div>
              <h1 className="font-sans font-extrabold text-3xl sm:text-4xl md:text-5xl tracking-[-0.03em] leading-[1.08] text-white">
                Tuangkan Ide Aplikasi Anda
              </h1>
              <p className="font-sans text-xs sm:text-sm text-zinc-400 max-w-lg leading-relaxed">
                Deskripsikan aplikasi, alur pengguna, atau problem yang ingin diselesaikan. AI akan merancang arsitektur visual, PRD, dan kode secara otomatis.
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="w-full bg-rose-950/40 text-rose-200 border border-rose-500/30 rounded-2xl px-4 py-3.5 flex items-center gap-3 text-xs">
                <WarningCircle weight="bold" className="w-5 h-5 text-rose-400 shrink-0" />
                <span className="font-mono flex-1">{error}</span>
              </div>
            )}

            {/* Double-Bezel Tactile Composer */}
            <div className="w-full rounded-3xl p-1.5 sm:p-2 bg-gradient-to-b from-white/[0.08] via-white/[0.03] to-white/[0.01] border border-white/15 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/5 focus-within:border-white/30 focus-within:ring-white/15 transition-all duration-300">
              <div className="rounded-[1.25rem] bg-gradient-to-b from-[#0b0b0e] to-[#050507] border border-white/5 p-4 sm:p-5 flex flex-col gap-3.5">
                
                {/* Composer Inner Top Bar */}
                <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-semibold">
                      Studio Brief Composer
                    </span>
                  </div>

                  {/* Dynamic Prompt Readiness Meter */}
                  <div>
                    {idea.trim().length === 0 ? (
                      <span className="font-mono text-[10px] text-zinc-600">Siap menerima ide</span>
                    ) : idea.trim().length < 40 ? (
                      <span className="font-mono text-[10px] text-amber-400/90 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span>Ide Singkat ({idea.trim().length} chars)</span>
                      </span>
                    ) : idea.trim().length < 120 ? (
                      <span className="font-mono text-[10px] text-sky-400/90 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                        <span>Deskripsi Cukup ({idea.trim().length} chars)</span>
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] text-emerald-400 flex items-center gap-1.5 font-semibold">
                        <Sparkle weight="fill" className="w-3 h-3 text-emerald-400 animate-pulse" />
                        <span>Detail &amp; Siap Diarsitekturkan ({idea.trim().length} chars)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Textarea */}
                <div>
                  <textarea
                    ref={textareaRef}
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={status === 'generating'}
                    rows={5}
                    placeholder="Jelaskan aplikasi yang ingin Anda bangun: apa masalah utamanya, siapa target penggunanya, fitur inti MVP, serta preferensi teknis atau integrasi (AI, Database, Payment, WhatsApp)..."
                    className="w-full bg-transparent text-sm sm:text-base text-white placeholder:text-zinc-600 focus:outline-none resize-none leading-relaxed font-sans"
                  />
                </div>

                {/* Tactile Architecture Constraint Chips */}
                <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">
                      Quick Archetype &amp; Stack Presets
                    </span>
                    <span className="font-mono text-[9px] text-zinc-600 hidden sm:inline-block">
                      Klik untuk menyematkan ke prompt
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {ARCH_PRESETS.map((preset) => {
                      const PresetIcon = preset.icon;
                      const isAdded = idea.includes(preset.label);
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => handleAddTag(preset.snippet)}
                          disabled={status === 'generating'}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all flex items-center gap-1.5 cursor-pointer border ${
                            isAdded
                              ? 'bg-white/10 text-white border-white/30 shadow-sm'
                              : 'bg-white/[0.02] border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 hover:border-white/20'
                          }`}
                        >
                          <PresetIcon weight={isAdded ? 'fill' : 'bold'} className="w-3.5 h-3.5" />
                          <span>+{preset.label}</span>
                        </button>
                      );
                    })}

                    {QUICK_STACKS.slice(0, 3).map((stack) => (
                      <button
                        key={stack}
                        type="button"
                        onClick={() => handleAddTech(stack)}
                        disabled={status === 'generating'}
                        className="px-2 py-1 rounded-lg text-[10px] font-mono text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/10"
                      >
                        +{stack}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Preferences Drawer */}
                {showAdvanced && (
                  <div className="mt-2 p-4 rounded-xl bg-white/[0.02] border border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-mono text-[10px] text-zinc-400 uppercase tracking-[0.18em] block mb-1">
                        Target Pengguna (User Persona)
                      </label>
                      <input
                        type="text"
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                        disabled={status === 'generating'}
                        placeholder="Misal: Pemilik kos, mahasiswa, UMKM"
                        className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-sans transition-colors"
                      />
                    </div>
                    <div>
                      <label className="font-mono text-[10px] text-zinc-400 uppercase tracking-[0.18em] block mb-1">
                        Tech Stack Preferensi
                      </label>
                      <input
                        type="text"
                        value={techStack}
                        onChange={(e) => setTechStack(e.target.value)}
                        disabled={status === 'generating'}
                        placeholder="Misal: Next.js, Supabase, Tailwind, WhatsApp API"
                        className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-sans transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* Action Toolbar */}
                <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 bg-white/[0.01]">
                  {/* Left: Preferences Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                      showAdvanced
                        ? 'bg-white/10 border-white/30 text-white'
                        : 'border-white/10 text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <SlidersHorizontal weight="bold" className="w-3.5 h-3.5" />
                    <span>Preferensi Teknis</span>
                  </button>

                  {/* Right: Keyboard Shortcut & Primary Button-in-Button */}
                  <div className="flex items-center gap-3">
                    <span className="hidden sm:inline-block font-mono text-[10px] text-zinc-600">
                      ⌘⏎ untuk proses
                    </span>

                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={!idea.trim() || status === 'generating'}
                      className="group/dispatch relative inline-flex items-center gap-3 px-5 py-2.5 rounded-xl bg-white text-black font-sans font-bold text-xs hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-white transition-all duration-200 active:scale-[0.98] shadow-md cursor-pointer disabled:pointer-events-none"
                    >
                      <span>
                        {status === 'generating'
                          ? 'Merancang Arsitektur...'
                          : projectId
                          ? 'Regenerate Arsitektur'
                          : 'Rancang Arsitektur & Spec'}
                      </span>
                      <div className="w-6 h-6 rounded-lg bg-black text-white flex items-center justify-center group-hover/dispatch:translate-x-0.5 group-hover/dispatch:-translate-y-0.5 transition-transform duration-200">
                        {status === 'generating' ? (
                          <ArrowClockwise weight="bold" className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ArrowUpRight weight="bold" className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </button>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* ============================================================ */}
        {/* GENERATION PROGRESS STATE                                   */}
        {/* ============================================================ */}
        {status === 'generating' && (
          <div className="w-full p-5 rounded-2xl bg-white/[0.03] border border-white/15 shadow-2xl flex flex-col gap-3.5">
            <div className="flex items-center gap-4">
              <span
                aria-hidden
                className="font-mono text-2xl font-bold leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.4)] select-none"
              >
                0{progressStepIndex + 1}
              </span>
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3 font-mono text-xs">
                  <span className="text-zinc-200 truncate">{GENERATION_STEPS[progressStepIndex]}</span>
                  <span className="font-bold text-white shrink-0">{Math.round(progressPercent)}%</span>
                </div>
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-500">
              <Lightning weight="fill" className="w-3 h-3 text-emerald-400" />
              <span>Pipeline arsitektur aktif · Mohon jangan tutup halaman</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
