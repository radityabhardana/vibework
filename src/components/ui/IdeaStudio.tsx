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
  ArrowRight,
  Buildings,
  ChartLineUp,
  Package,
  SlidersHorizontal,
} from '@phosphor-icons/react';

type IdeaStudioProps = {
  initialSessionId?: string;
  initialIdea?: string;
  initialProjectId?: string | null;
};

const QUICK_TAGS = [
  { label: 'Web SaaS', icon: Globe, snippet: 'Platform Web SaaS B2B' },
  { label: 'Mobile App', icon: DeviceMobile, snippet: 'Aplikasi Mobile iOS & Android' },
  { label: 'AI Agent', icon: Robot, snippet: 'Automasi AI Agent & Workflow Pintar' },
  { label: 'Marketplace', icon: Storefront, snippet: 'Marketplace & E-Commerce terintegrasi' },
  { label: 'Internal Tool', icon: Kanban, snippet: 'Internal Tool & Admin Dashboard' },
];

const STARTER_PROMPTS = [
  {
    icon: Buildings,
    tag: 'PROPTECH AUTOMATION',
    title: 'Manajemen Kos & Tagihan Otomatis',
    desc: 'Pencatatan kamar, tagihan WhatsApp otomatis, scan meteran listrik AI.',
    prompt: 'Buat aplikasi manajemen kos-kosan otomatis. Fiturnya meliputi pencatatan kamar dan penghuni, tagihan bulanan otomatis yang mengirim notifikasi via WhatsApp, sistem scan foto meteran listrik AI untuk hitung beban per kamar, dan dashboard ringkasan keuangan bulanan bagi pemilik kos.',
    specs: '4 Nodes · PRD · Schema'
  },
  {
    icon: Robot,
    tag: 'AI WORKFLOW AGENT',
    title: 'AI Customer Support Agent',
    desc: 'Integrasi WhatsApp, auto-reply knowledge base dokumen, eskalasi agen manusia.',
    prompt: 'Bangun platform AI Customer Support multi-channel (WhatsApp, Webchat, Telegram). Fitur utama: bot cerdas yang dilatih dengan dokumen SOP & FAQ internal perusahaan, auto-resolve tiket keluhan, dan tombol handover instan ke customer service manusia saat problem butuh eskalasi.',
    specs: '5 Nodes · PRD · AGENTS.md'
  },
  {
    icon: ChartLineUp,
    tag: 'FINTECH SAAS',
    title: 'B2B Subscription & Billing Portal',
    desc: 'Integrasi Stripe/Midtrans, tiered pricing, invoice PDF, tim multi-role.',
    prompt: 'Rancang platform SaaS B2B untuk billing & subscription. Fitur: registrasi organisasi, manajemen tim multi-role (Owner, Admin, Member), tier langganan (Free, Pro, Enterprise), integrasi payment gateway dengan generate invoice PDF otomatis, dan analitik pendapatan bulanan (MRR/ARR).',
    specs: '6 Nodes · PRD · ADR'
  },
  {
    icon: Package,
    tag: 'LOGISTICS & WMS',
    title: 'Inventory & Logistik Gudang',
    desc: 'Scan barcode stock opname, notifikasi stok menipis, laporan keluar masuk.',
    prompt: 'Buat sistem manajemen pergudangan (WMS) berbasis web dan mobile. Fitur: scan barcode kamera untuk barang masuk/keluar, pelacakan multi-gudang secara real-time, notifikasi otomatis jika stok di bawah threshold, serta export laporan inventaris mingguan dan bulanan.',
    specs: '4 Nodes · PRD · Schema'
  }
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
}: IdeaStudioProps) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId);
  const [projectId, setProjectId] = useState<string | null>(initialProjectId);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSessionId,
          regenerate: !!projectId,
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

      const genData = await genRes.json();
      setProgressPercent(100);

      router.push(`/projects/${genData.projectId}`);
    } catch (err: unknown) {
      console.error('Generation failed:', err);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
      setStatus('idle');
    }
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-[#030304] text-white p-4 sm:p-8 md:p-12 flex flex-col items-center justify-start relative selection:bg-white selection:text-black">
      {/* ponytail: inline <style> instead of globals.css (out of scope) — move to globals if adopted site-wide */}
      <style>{`@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important;}}`}</style>
      {/* Ambient glow + dot matrix, calibrated to landing */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[320px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06),transparent_70%)] pointer-events-none" />
      <div
        className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none [mask-image:linear-gradient(to_bottom,black,transparent_60%)]"
      />

      <div className="w-full max-w-3xl flex flex-col items-center gap-6 z-0 pt-2 sm:pt-4">

        {/* Existing Project Alert Banner */}
        {projectId && (
          <div className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle weight="fill" className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-sans text-zinc-300 truncate">
                Proyek ini telah memiliki dokumen spesifikasi &amp; flow node tree.
              </span>
            </div>
            <Link href={`/projects/${projectId}`} className="shrink-0">
              <span className="text-xs font-mono font-medium text-white hover:underline flex items-center gap-1">
                Buka Workspace &rarr;
              </span>
            </Link>
          </div>
        )}

        {/* Studio Hero Header — editorial blueprint */}
        <div className="flex flex-col items-center text-center gap-3.5">
          <div className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">
            <span aria-hidden className="size-1.5 rounded-full bg-white" />
            <span>AI Architecture &amp; Spec Studio</span>
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
          <div className="w-full bg-rose-950/40 text-rose-200 border border-rose-500/30 rounded-xl px-4 py-3 flex items-center gap-2.5 text-xs">
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
            Fig. 02 — Brief
          </span>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] focus-within:border-white/25 transition-colors duration-300 overflow-hidden">
            {/* Textarea */}
            <div className="p-4 sm:p-5">
              <textarea
                ref={textareaRef}
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={status === 'generating'}
                rows={4}
                placeholder="Jelaskan aplikasi yang ingin Anda bangun (alur pengguna, integrasi payment/AI, aturan bisnis)..."
                className="w-full bg-transparent text-sm sm:text-base text-white placeholder:text-zinc-600 focus:outline-none resize-none leading-relaxed font-sans"
              />
            </div>

            {/* Optional Preferences Drawer */}
            {showAdvanced && (
              <div className="mx-4 mb-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-mono text-[10px] text-zinc-400 uppercase tracking-[0.18em] block mb-1">
                    Target Pengguna
                  </label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    disabled={status === 'generating'}
                    placeholder="Misal: Pemilik kos, mahasiswa, UMKM"
                    className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-sans transition-colors"
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
                    className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-sans transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Action Toolbar */}
            <div className="px-4 py-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 bg-white/[0.015]">
              {/* Left Controls */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                    showAdvanced
                      ? 'bg-white/10 border-white/30 text-white'
                      : 'border-white/10 text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <SlidersHorizontal weight="bold" className="w-3.5 h-3.5" />
                  <span>Preferensi</span>
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
                        <span>+{tag.label}</span>
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
                  <span>{status === 'generating' ? 'Drafting Spec...' : projectId ? 'Regenerate' : 'Generate Spec'}</span>
                  <div className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center">
                    <ArrowUp weight="bold" className="w-3 h-3 text-black" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Progress State while Generating */}
        {status === 'generating' && (
          <div className="w-full p-4 sm:p-5 rounded-xl bg-white/[0.03] border border-white/10 shadow-xl flex flex-col gap-3">
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
                    className="h-full bg-white rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600">
              <Lightning weight="fill" className="w-3 h-3 text-amber-400" />
              <span>Jangan tutup halaman ini sampai proses selesai</span>
            </div>
          </div>
        )}

        {/* Curated Architecture Blueprints */}
        {status !== 'generating' && (
          <div className="w-full flex flex-col gap-3 mt-1">
            <div className="flex items-center gap-3 px-1">
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500">
                Contoh Blueprint Siap Pakai
              </span>
              <span aria-hidden className="h-px flex-1 bg-white/10" />
              <span className="text-[10px] font-mono text-zinc-600 hidden sm:inline-block">
                Klik untuk memuat
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STARTER_PROMPTS.map((ex, idx) => {
                const IconComponent = ex.icon;
                return (
                  <button
                    key={ex.title}
                    type="button"
                    onClick={() => setIdea(ex.prompt)}
                    className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/25 hover:-translate-y-0.5 transition-all duration-300 text-left flex items-start gap-3.5 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  >
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white group-hover:bg-white group-hover:text-black transition-colors duration-300">
                        <IconComponent weight="duotone" size={20} />
                      </div>
                      <span className="font-mono text-[9px] text-zinc-600">
                        0{idx + 1}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500 font-semibold">
                          {ex.tag}
                        </span>
                        <ArrowRight weight="bold" className="w-3 h-3 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100" />
                      </div>
                      <div className="text-xs font-bold text-zinc-200 group-hover:text-white transition-colors truncate">
                        {ex.title}
                      </div>
                      <div className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                        {ex.desc}
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center gap-1.5 font-mono text-[10px] text-zinc-500">
                        <span>Output:</span>
                        <span className="text-zinc-400 font-medium">{ex.specs}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
