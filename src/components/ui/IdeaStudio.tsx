'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Lightning,
  ArrowUp,
  DeviceMobile,
  Globe,
  Robot,
  Storefront,
  Kanban,
  CheckCircle,
  WarningCircle,
  SlidersHorizontal,
  TreeStructure,
  Article,
  Cpu,
  ArrowUpRight,
  Sparkle,
} from '@phosphor-icons/react';
import { useLanguage } from '@/context/LanguageContext';

export type SpecSummaryData = {
  projectId: string;
  projectName: string;
  projectDescription?: string | null;
  nodes?: Array<{ id: string; label?: string; title?: string; description?: string }>;
  prd?: {
    targetUser?: string | null;
    coreFeatures?: string | null;
    mvpConstraints?: string | null;
  } | null;
  adr?: {
    frontendStack?: string | null;
    backendStack?: string | null;
    database?: string | null;
  } | null;
};

type IdeaStudioProps = {
  initialSessionId?: string;
  initialIdea?: string;
  initialProjectId?: string | null;
  initialSpecSummary?: SpecSummaryData | null;
};

const QUICK_TAGS = [
  { label: 'Web SaaS', icon: Globe, snippet: 'Platform Web SaaS B2B' },
  { label: 'Mobile App', icon: DeviceMobile, snippet: 'Aplikasi Mobile iOS & Android' },
  { label: 'AI Agent', icon: Robot, snippet: 'Automasi AI Agent & Workflow Pintar' },
  { label: 'Marketplace', icon: Storefront, snippet: 'Marketplace & E-Commerce terintegrasi' },
  { label: 'Internal Tool', icon: Kanban, snippet: 'Internal Tool & Admin Dashboard' },
];

const GENERATION_STEPS = [
  ['Memetakan Interactive Application Tree & Screen Nodes...', 'Mapping Interactive Application Tree & Screen Nodes...'],
  ['Menyusun Product Requirements Document (PRD)...', 'Preparing Product Requirements Document (PRD)...'],
  ['Merumuskan Aturan AGENTS.md & Guardrails...', 'Defining AGENTS.md Rules & Guardrails...'],
  ['Merancang Architecture Decision Record (ADR) & Schema...', 'Designing Architecture Decision Record (ADR) & Schema...'],
  ['Mengompilasi Master Prompt.md Siap Pakai...', 'Compiling Ready-to-Use Master Prompt.md...'],
];

const ARCHITECTURAL_JUMPSTARTS = [
  {
    title: 'B2B SaaS Multi-tenant',
    titleEn: 'Multi-tenant B2B SaaS',
    category: 'Web SaaS',
    categoryEn: 'Web SaaS',
    snippet: 'Bangun platform B2B SaaS multi-tenant dengan dashboard analitik, manajemen peran & hak akses (RBAC), integrasi subscription payment, dan webhook audit log.',
    snippetEn: 'Build a multi-tenant B2B SaaS platform with analytics dashboards, role and access management (RBAC), subscription payments, and webhook audit logs.',
    tech: 'Next.js 16, Supabase, Tailwind CSS',
  },
  {
    title: 'AI Support & Handover',
    titleEn: 'AI Support & Handover',
    category: 'AI Workflow',
    categoryEn: 'AI Workflow',
    snippet: 'Bangun platform AI Customer Support multi-channel (WhatsApp & Webchat). Bot cerdas dilatih dokumen SOP/FAQ internal, auto-triage tiket, dan handover instan ke CS manusia.',
    snippetEn: 'Build a multi-channel AI Customer Support platform (WhatsApp & Webchat). Train an intelligent bot on internal SOP/FAQ documents, with ticket auto-triage and instant handover to human support.',
    tech: 'Next.js, FastAPI, Vector DB, WhatsApp API',
  },
  {
    title: 'FinTech Expense Tracker',
    titleEn: 'FinTech Expense Tracker',
    category: 'Mobile App',
    categoryEn: 'Mobile App',
    snippet: 'Aplikasi mobile manajemen arus kas & pengeluaran UMKM dengan pencatatan transaksi cepat, scan struk otomatis, grafik analitik keuangan, dan reminder tagihan.',
    snippetEn: 'A mobile cash-flow and expense management app for small businesses with quick transaction entry, automatic receipt scanning, financial analytics, and bill reminders.',
    tech: 'React Native, Expo, SQLite, OCR API',
  },
  {
    title: 'Team Collaboration Canvas',
    titleEn: 'Team Collaboration Canvas',
    category: 'Internal Tool',
    categoryEn: 'Internal Tool',
    snippet: 'Internal tool workspace kolaborasi tim dengan interactive kanban sprint, realtime status task, integrasi notifikasi, dan activity timeline.',
    snippetEn: 'An internal team collaboration workspace with interactive sprint kanban, realtime task status, notification integrations, and an activity timeline.',
    tech: 'Next.js App Router, Tailwind CSS, Realtime SSE',
  },
];

export function IdeaStudio({
  initialSessionId,
  initialIdea = '',
  initialProjectId = null,
  initialSpecSummary = null,
}: IdeaStudioProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId);
  const [projectId, setProjectId] = useState<string | null>(initialProjectId);
  const [specSummary] = useState<SpecSummaryData | null>(initialSpecSummary || null);
  const [idea, setIdea] = useState(initialIdea);
  const [targetAudience, setTargetAudience] = useState('');
  const [techStack, setTechStack] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
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

  const handleApplyJumpstart = (template: (typeof ARCHITECTURAL_JUMPSTARTS)[0]) => {
    setIdea(template.snippet);
    if (template.tech) {
      setTechStack(template.tech);
    }
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
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
          throw new Error(t('Gagal menginisialisasi sesi baru.', 'Failed to initialize a new session.'));
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
        throw new Error(t('Gagal menyimpan ide aplikasi ke database.', 'Failed to save the app idea to the database.'));
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
            : t('Gagal generate spesifikasi proyek.', 'Failed to generate the project specification.');
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
                  throw new Error(payload.error || t('Gagal generate spesifikasi proyek.', 'Failed to generate the project specification.'));
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
          router.push(`/projects/${targetProjectId}`);
        } else {
          throw new Error(t('Sesi pembuatan selesai namun projectId tidak ditemukan.', 'Generation finished but the projectId was not found.'));
        }
      } else {
        const genData = await genRes.json();
        setProgressPercent(100);
        router.push(`/projects/${genData.projectId}`);
      }
    } catch (err: unknown) {
      console.error('Generation failed:', err);
      setError(err instanceof Error ? err.message : t('Terjadi kesalahan sistem.', 'A system error occurred.'));
      setStatus('idle');
    }
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-[#0b0d0f] text-white px-4 py-8 sm:px-6 md:px-8 md:py-12 flex flex-col items-center justify-start relative">
      {/* ponytail: inline <style> instead of globals.css (out of scope) — move to globals if adopted site-wide */}
      <style>{`@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important;}}`}</style>
      {/* Ambient glow + dot matrix, calibrated to landing */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[320px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06),transparent_70%)] pointer-events-none" />
      <div
        className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none [mask-image:linear-gradient(to_bottom,black,transparent_60%)]"
      />

      <div className="w-full max-w-5xl flex flex-col gap-8 z-0">

        {/* Existing Project Alert Banner */}
        {projectId && (
          <div className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle weight="fill" className="w-4 h-4 text-zinc-300 shrink-0" />
              <span className="text-xs font-sans text-zinc-300 truncate">
                {t('Proyek ini telah memiliki dokumen spesifikasi & flow node tree.', 'This project already has specification documents & a flow node tree.')}
              </span>
            </div>
            <Link href={`/projects/${projectId}`} className="shrink-0">
              <span className="text-xs font-mono font-medium text-white hover:underline flex items-center gap-1">
                {t('Buka Workspace', 'Open Workspace')} &rarr;
              </span>
            </Link>
          </div>
        )}

        {/* Studio Hero Header — editorial blueprint */}
        <div className="flex flex-col items-start gap-3 max-w-3xl">
          <div className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--accent)]">
            <span aria-hidden className="size-1.5 rounded-full bg-white" />
            <span>{t('AI Architecture & Spec Studio', 'AI Architecture & Spec Studio')}</span>
            <span aria-hidden className="size-1.5 rounded-full bg-white/20" />
          </div>
          <h1 className="font-sans font-extrabold text-3xl sm:text-4xl md:text-5xl tracking-[-0.03em] leading-[1.08] text-white">
            {t('Tuangkan Ide Aplikasi Anda', 'Describe Your App Idea')}
          </h1>
          <p className="font-sans text-xs sm:text-sm text-zinc-400 max-w-lg leading-relaxed">
            {t('Deskripsikan aplikasi, alur pengguna, atau problem yang ingin diselesaikan. AI akan merancang arsitektur visual, PRD, dan kode secara otomatis.', 'Describe the application, user flow, or problem you want to solve. AI will automatically design the visual architecture, PRD, and code.')}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="w-full bg-rose-950/40 text-rose-200 border border-rose-500/30 rounded-xl px-4 py-3 flex items-center gap-2 text-xs">
            <WarningCircle weight="bold" className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-mono">{error}</span>
          </div>
        )}

        {/* Composer — single calm bezel with registration marks */}
        <div className="relative w-full group/composer">
          <span aria-hidden className="absolute -top-[7px] -left-[9px] font-mono text-sm leading-none text-zinc-600 select-none">+</span>
          <span aria-hidden className="absolute -top-[7px] -right-[9px] font-mono text-sm leading-none text-zinc-600 select-none">+</span>
          <span aria-hidden className="absolute -bottom-[7px] -left-[9px] font-mono text-sm leading-none text-zinc-600 select-none">+</span>
          <span aria-hidden className="absolute -bottom-[7px] -right-[9px] font-mono text-sm leading-none text-zinc-600 select-none">+</span>
          <span aria-hidden className="absolute -top-4 right-0 font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600 select-none">
            {t('Fig. 02 — Brief', 'Fig. 02 — Brief')}
          </span>

          <div className="rounded-2xl border border-white/10 bg-[#14191a] shadow-[var(--shadow-brutal)] focus-within:border-[var(--accent)]/50 transition-colors duration-300 overflow-hidden">
            {/* Textarea */}
            <div className="p-4">
              <textarea
                ref={textareaRef}
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={status === 'generating'}
                rows={4}
                placeholder={t('Jelaskan aplikasi yang ingin Anda bangun (alur pengguna, integrasi payment/AI, aturan bisnis)...', 'Describe the app you want to build (user flow, payment/AI integrations, business rules)...')}
                className="w-full bg-transparent text-sm sm:text-base text-white placeholder:text-zinc-600 focus:outline-none resize-none leading-relaxed font-sans"
              />
            </div>

            {/* Optional Preferences Drawer */}
            {showAdvanced && (
              <div className="mx-4 mb-4 p-4 rounded-xl bg-white/[0.02] border border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-mono text-[10px] text-zinc-400 uppercase tracking-[0.18em] block mb-1">
                    {t('Target Pengguna', 'Target Users')}
                  </label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    disabled={status === 'generating'}
                    placeholder={t('Misal: Pemilik kos, mahasiswa, UMKM', 'e.g. Landlords, students, small businesses')}
                    className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-sans transition-colors"
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] text-zinc-400 uppercase tracking-[0.18em] block mb-1">
                    {t('Tech Stack Preferensi', 'Preferred Tech Stack')}
                  </label>
                  <input
                    type="text"
                    value={techStack}
                    onChange={(e) => setTechStack(e.target.value)}
                    disabled={status === 'generating'}
                    placeholder={t('Misal: Next.js, Supabase, Tailwind, WhatsApp API', 'e.g. Next.js, Supabase, Tailwind, WhatsApp API')}
                    className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-sans transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Action Toolbar */}
            <div className="px-4 py-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 bg-white/[0.015]">
              {/* Left Controls */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className={`px-3 py-1 rounded-lg border text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                    showAdvanced
                      ? 'bg-white/10 border-white/30 text-white'
                      : 'border-white/10 text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <SlidersHorizontal weight="bold" className="w-3.5 h-3.5" />
                  <span>{t('Preferensi', 'Preferences')}</span>
                </button>

                <div className="hidden md:flex items-center gap-1 pl-1">
                  {QUICK_TAGS.slice(0, 3).map((tag) => {
                    const TagIcon = tag.icon;
                    return (
                      <button
                        key={tag.label}
                        type="button"
                        onClick={() => handleAddTag(tag.snippet)}
                        disabled={status === 'generating'}
                        className="px-2 py-1 rounded-md text-[11px] font-mono text-zinc-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                      >
                        <TagIcon weight="bold" className="w-3 h-3" />
                        <span>+{t(tag.label === 'Web SaaS' ? 'Web SaaS' : tag.label === 'Mobile App' ? 'Aplikasi Mobile' : tag.label === 'AI Agent' ? 'AI Agent' : tag.label === 'Marketplace' ? 'Marketplace' : 'Internal Tool', tag.label)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-block font-mono text-[10px] text-zinc-600">
                  {idea.trim().length > 0 ? `${idea.trim().length} chars · ` : ''}⌘⏎
                </span>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!idea.trim() || status === 'generating'}
                  className="px-4 py-2 rounded-xl bg-white text-black hover:bg-white/90 disabled:opacity-30 disabled:hover:bg-white font-mono font-semibold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <span>{status === 'generating' ? t('Menyusun Spec...', 'Drafting Spec...') : projectId ? t('Regenerate', 'Regenerate') : t('Generate Spec', 'Generate Spec')}</span>
                  <div className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center">
                    <ArrowUp weight="bold" className="w-3 h-3 text-black" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SPECIFICATION OVERVIEW (Clean Deliverables Summary)          */}
        {/* ============================================================ */}
        {specSummary && (
          <div className="w-full flex flex-col gap-3.5 pt-1">
            {/* Section Header Bar */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-300 font-semibold">
                  {t('Architecture Deliverables', 'Architecture Deliverables')}
                </span>
                <span className="text-zinc-600 font-mono text-[11px]">/</span>
                <span className="text-[11px] font-mono text-zinc-500">
                  {specSummary.nodes?.length || 0} {t('node dipetakan', 'nodes mapped')}
                </span>
              </div>
              <Link
                href={`/projects/${specSummary.projectId}`}
                className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors group"
              >
                <span>{t('Buka Full Workspace', 'Open Full Workspace')}</span>
                <ArrowUpRight weight="bold" className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>

            {/* Modular 3-Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Card 1: Flowchart Blueprint */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col justify-between gap-3 hover:border-white/20 transition-colors">
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-zinc-400">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-zinc-300">
                      <TreeStructure weight="bold" className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{t('Flowchart Nodes', 'Flowchart Nodes')}</span>
                    </div>
                    <span className="font-mono text-[10px] text-zinc-500">{specSummary.nodes?.length || 0} {t('layar', 'screens')}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 pt-0.5">
                    {specSummary.nodes && specSummary.nodes.length > 0 ? (
                      specSummary.nodes.slice(0, 3).map((node, i) => (
                        <div
                          key={node.id || i}
                          className="flex items-center gap-2 text-xs font-sans text-zinc-300 bg-white/[0.02] border border-white/5 px-2.5 py-1.5 rounded-lg"
                        >
                          <span className="font-mono text-[10px] text-zinc-500 font-medium">0{i + 1}</span>
                          <span className="truncate">{node.label || node.title || node.id}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs font-sans text-zinc-500 italic">{t('Flowchart node siap digenerate', 'Flowchart nodes are ready to generate')}</span>
                    )}
                    {(specSummary.nodes?.length || 0) > 3 && (
                      <span className="font-mono text-[10px] text-zinc-500 pl-1">
                        +{(specSummary.nodes?.length || 0) - 3} {t('node lainnya...', 'more nodes...')}
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/projects/${specSummary.projectId}`}
                  className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 pt-2 border-t border-white/5"
                >
                  {t('Lihat Interactive Flowchart', 'View Interactive Flowchart')} →
                </Link>
              </div>

              {/* Card 2: Product Requirements Document (PRD) */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col justify-between gap-3 hover:border-white/20 transition-colors">
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-zinc-400">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-zinc-300">
                      <Article weight="bold" className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{t('Product Specs', 'Product Specs')}</span>
                    </div>
                    <span className="font-mono text-[10px] text-emerald-400">{t('PRD Ready', 'PRD Ready')}</span>
                  </div>
                  <div className="flex flex-col gap-2 pt-0.5">
                    <div>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 block mb-0.5">{t('Target User', 'Target User')}</span>
                      <p className="line-clamp-2 text-xs font-sans text-zinc-300">
                        {specSummary.prd?.targetUser || t('Pengguna terdaftar & admin sistem', 'Registered users & system admins')}
                      </p>
                    </div>
                    <div>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 block mb-0.5">{t('MVP Scope', 'MVP Scope')}</span>
                      <p className="line-clamp-2 text-xs font-sans text-zinc-300">
                        {specSummary.prd?.coreFeatures?.split('\n')[0]?.replace(/^[-*]\s*/, '') || t('Alur fungsional inti dan modul utama', 'Core functional flows and main modules')}
                      </p>
                    </div>
                  </div>
                </div>
                <Link
                  href={`/projects/${specSummary.projectId}`}
                  className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 pt-2 border-t border-white/5"
                >
                  {t('Buka Dokumen PRD', 'Open PRD Document')} →
                </Link>
              </div>

              {/* Card 3: Tech Stack & ADR */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col justify-between gap-3 hover:border-white/20 transition-colors">
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-zinc-400">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-zinc-300">
                      <Cpu weight="bold" className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{t('Tech Stack & ADR', 'Tech Stack & ADR')}</span>
                    </div>
                    <span className="font-mono text-[10px] text-zinc-500">{t('ADR Spec', 'ADR Spec')}</span>
                  </div>
                  <div className="flex flex-col gap-2 pt-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono bg-white/5 border border-white/10 text-zinc-300 px-2 py-0.5 rounded">
                        Next.js 16
                      </span>
                      <span className="text-[10px] font-mono bg-white/5 border border-white/10 text-zinc-300 px-2 py-0.5 rounded">
                        Tailwind CSS
                      </span>
                      <span className="text-[10px] font-mono bg-white/5 border border-white/10 text-zinc-300 px-2 py-0.5 rounded">
                        TypeScript
                      </span>
                      <span className="text-[10px] font-mono bg-white/5 border border-white/10 text-zinc-300 px-2 py-0.5 rounded">
                        SQLite
                      </span>
                    </div>
                    <div className="pt-1 text-xs text-zinc-400">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 block mb-0.5">{t('Coding Rules', 'Coding Rules')}</span>
                      <span className="text-[11px] text-zinc-300 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span>{t('AGENTS.md Guardrails Terpasang', 'AGENTS.md Guardrails Installed')}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <Link
                  href={`/projects/${specSummary.projectId}`}
                  className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 pt-2 border-t border-white/5"
                >
                  {t('Lihat Aturan AGENTS.md', 'View AGENTS.md Rules')} →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Architectural Jumpstarts & Inspiration (New Spec page) */}
        {!specSummary && (
          <div className="w-full flex flex-col gap-3.5 pt-1">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Sparkle weight="bold" className="w-3.5 h-3.5 text-zinc-400" />
                <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                  {t('Architectural Jumpstarts', 'Architectural Jumpstarts')}
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">{t('Klik kartu untuk menggunakan template', 'Click a card to use a template')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ARCHITECTURAL_JUMPSTARTS.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => handleApplyJumpstart(item)}
                  className="text-left rounded-xl border border-white/10 bg-white/[0.015] p-3.5 flex flex-col justify-between gap-2.5 hover:bg-white/[0.04] hover:border-white/20 transition-all duration-150 active:scale-[0.99] group cursor-pointer"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-sans font-medium text-xs text-white group-hover:text-emerald-300 transition-colors">
                        {t(item.title, item.titleEn)}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">
                        {t(item.category, item.categoryEn)}
                      </span>
                    </div>
                    <p className="font-sans text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {t(item.snippet, item.snippetEn)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-zinc-500 border-t border-white/5">
                    <span className="truncate pr-2">{item.tech}</span>
                    <span className="text-zinc-400 group-hover:text-white transition-colors">{t('Pakai Template', 'Use Template')} →</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Output Studio Capabilities Note */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 opacity-70">
              <div className="rounded-lg border border-white/5 bg-white/[0.01] px-3 py-2 flex items-center gap-2">
                <TreeStructure weight="bold" className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="font-mono text-[10px] text-zinc-400 truncate">{t('Interactive Flowchart Tree', 'Interactive Flowchart Tree')}</span>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.01] px-3 py-2 flex items-center gap-2">
                <Article weight="bold" className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="font-mono text-[10px] text-zinc-400 truncate">{t('PRD & Schema Spec', 'PRD & Schema Spec')}</span>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.01] px-3 py-2 flex items-center gap-2">
                <Cpu weight="bold" className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="font-mono text-[10px] text-zinc-400 truncate">AGENTS.md &amp; Prompt.md</span>
              </div>
            </div>
          </div>
        )}

        {/* Progress State while Generating */}
        {status === 'generating' && (
          <div className="w-full p-4 rounded-xl bg-white/[0.03] border border-white/10 shadow-xl flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <span
                aria-hidden
                className="font-mono text-2xl font-bold leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.4)] select-none"
              >
                0{progressStepIndex + 1}
              </span>
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3 font-mono text-xs">
                  <span className="text-zinc-200 truncate">{t(GENERATION_STEPS[progressStepIndex][0], GENERATION_STEPS[progressStepIndex][1])}</span>
                  <span className="font-bold text-white shrink-0">{Math.round(progressPercent)}%</span>
                </div>
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600">
              <Lightning weight="fill" className="w-3 h-3 text-zinc-400" />
              <span>{t('Jangan tutup halaman ini sampai proses selesai', 'Do not close this page until the process is complete')}</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
