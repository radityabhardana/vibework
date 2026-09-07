'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import {
  Lightning,
  Sparkle,
  ArrowRight,
  DeviceMobile,
  Globe,
  Robot,
  Storefront,
  Kanban,
  CheckCircle,
  WarningCircle,
  Gear
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
    <div className="flex-1 w-full h-full overflow-y-auto bg-[#030303] text-white p-4 sm:p-6 md:p-10 flex flex-col items-center relative selection:bg-white selection:text-black">
      {/* Subtle WriteMate Radial Gradient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[350px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_70%)] pointer-events-none" />

      <div className="w-full max-w-4xl flex flex-col gap-6 z-0">
        {/* Existing Project Banner */}
        {projectId && (
          <div className="bg-white/[0.03] border border-white/20 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0">
                <CheckCircle weight="fill" className="w-5 h-5" />
              </div>
              <div>
                <p className="font-mono font-bold text-sm text-white">
                  Proyek ini telah memiliki Tree & Dokumen Spesifikasi
                </p>
                <p className="font-sans text-xs text-zinc-400">
                  Kamu bisa langsung membuka workspace atau mengedit ide di bawah untuk regenerate ulang.
                </p>
              </div>
            </div>
            <Link href={`/projects/${projectId}`}>
              <Button
                variant="primary"
                size="sm"
                className="gap-1.5 whitespace-nowrap text-xs !py-2.5"
              >
                <span>Buka Workspace Tree &rarr;</span>
              </Button>
            </Link>
          </div>
        )}

        {/* Hero Header */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-white/20 bg-white/5 font-mono text-xs text-white -tracking-[0.2px]">
                <Sparkle weight="fill" className="w-3.5 h-3.5" />
                Prompt & Spec Studio
              </span>
              <span className="font-mono text-xs text-zinc-500 hidden sm:inline">
                Tree &bull; PRD &bull; AGENTS.md &bull; Architecture &bull; Prompt.md
              </span>
            </div>
            <h1 className="font-sans font-extrabold text-2xl sm:text-3xl md:text-4xl tracking-tight text-white">
              Tuangkan Ide Aplikasi
            </h1>
            <p className="font-sans text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl">
              Tulis konsep, problem, atau fitur apa saja yang ingin kamu bangun. AI akan langsung memetakannya ke dalam <strong>Interactive Tree</strong> dan menyusun seluruh dokumen spesifikasi teknis siap pakai.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-950/40 text-rose-200 border border-rose-500/40 rounded-xl p-4 shadow-lg flex items-center gap-3">
            <WarningCircle weight="bold" className="w-5 h-5 text-rose-400 shrink-0" />
            <span className="font-mono text-xs font-medium">{error}</span>
          </div>
        )}

        {/* Main Idea Input Card */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-2xl flex flex-col gap-6">
          {/* Quick Preset Chips */}
          <div className="flex flex-col gap-2.5">
            <label className="font-mono font-medium text-xs text-zinc-400 flex items-center gap-1.5">
              <Sparkle weight="fill" className="w-3.5 h-3.5 text-white" />
              Inspirasi / Kategori Cepat:
            </label>
            <div className="flex flex-wrap gap-2">
              {QUICK_TAGS.map((tag) => {
                const IconComponent = tag.icon;
                return (
                  <button
                    key={tag.label}
                    type="button"
                    onClick={() => handleAddTag(tag.snippet)}
                    disabled={status === 'generating'}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-white/30 font-mono text-xs text-zinc-300 hover:text-white transition-all duration-300 cursor-pointer disabled:opacity-50"
                  >
                    <IconComponent weight="bold" className="w-3.5 h-3.5 text-white" />
                    <span>{tag.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Large Idea Textarea */}
          <div className="flex flex-col gap-2">
            <label htmlFor="idea-input" className="font-mono font-medium text-xs text-zinc-300">
              Deskripsi Ide / Problem / Fitur Utama:
            </label>
            <div className="relative">
              <textarea
                id="idea-input"
                ref={textareaRef}
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                disabled={status === 'generating'}
                rows={7}
                placeholder="Contoh: Buat aplikasi manajemen kos-kosan otomatis. Fiturnya meliputi pencatatan kamar dan penghuni, tagihan bulanan otomatis yang mengirim notifikasi via WhatsApp, sistem scan foto meteran listrik AI untuk hitung beban per kamar, dan dashboard ringkasan keuangan bulanan bagi pemilik..."
                className="w-full p-4 md:p-5 font-mono text-sm rounded-xl border border-white/15 bg-white/[0.02] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/20 shadow-inner resize-y leading-relaxed disabled:opacity-50 transition-all duration-300"
              />
              <div className="flex justify-between items-center mt-2 px-1">
                <span className="font-mono text-xs text-zinc-500">
                  {idea.trim().length > 0 ? `${idea.trim().length} karakter` : 'Minimal beberapa kalimat untuk hasil terbaik'}
                </span>
                {idea.trim().length > 0 && (
                  <span className="font-mono text-xs font-medium text-white bg-white/10 border border-white/20 px-2.5 py-0.5 rounded-full">
                    ✓ Ide Siap Diproses
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Optional Advanced Settings Toggle */}
          <div className="border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="inline-flex items-center gap-2 font-mono text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <Gear weight="bold" className="w-3.5 h-3.5" />
              <span>{showAdvanced ? '[-] Sembunyikan Preferensi Opsional' : '[+] Tambah Preferensi Teknis / Target User (Opsional)'}</span>
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 p-4 bg-white/[0.02] rounded-xl border border-white/10 animate-in fade-in">
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-xs text-zinc-400">
                    Target User Spesifik:
                  </label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    disabled={status === 'generating'}
                    placeholder="Misal: Pemilik kos usia 30-55 tahun, Mahasiswa"
                    className="p-2.5 font-mono text-xs rounded-lg border border-white/15 bg-white/[0.03] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/50"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-xs text-zinc-400">
                    Tech Stack Preferensi (Opsional):
                  </label>
                  <input
                    type="text"
                    value={techStack}
                    onChange={(e) => setTechStack(e.target.value)}
                    disabled={status === 'generating'}
                    placeholder="Misal: Next.js, Supabase, Tailwind, WhatsApp API"
                    className="p-2.5 font-mono text-xs rounded-lg border border-white/15 bg-white/[0.03] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/50"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Generation Progress Display */}
          {status === 'generating' && (
            <div className="mt-2 p-5 bg-white/[0.04] rounded-xl border border-white/20 shadow-2xl flex flex-col gap-3 animate-in fade-in">
              <div className="flex items-center justify-between font-mono text-xs font-medium">
                <div className="flex items-center gap-2">
                  <Lightning weight="fill" className="w-4 h-4 text-white animate-bounce" />
                  <span className="text-zinc-200">{GENERATION_STEPS[progressStepIndex]}</span>
                </div>
                <span className="font-mono font-bold text-sm text-white">{Math.round(progressPercent)}%</span>
              </div>

              {/* WriteMate Sleek Progress Bar */}
              <div className="w-full h-2 bg-white/10 rounded-full border border-white/15 relative overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex justify-between font-mono text-[10px] text-zinc-500 px-1">
                <span>Langkah {progressStepIndex + 1} dari {GENERATION_STEPS.length}</span>
                <span>Menyiapkan Tree & Spesifikasi Lengkap...</span>
              </div>
            </div>
          )}

          {/* Action Bar */}
          {status !== 'generating' && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <p className="font-mono text-xs text-zinc-500 order-2 sm:order-1 text-center sm:text-left">
                💡 AI akan otomatis melengkapi asumsi arsitektur, database, dan security.
              </p>
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={handleGenerate}
                disabled={!idea.trim()}
                className="w-full sm:w-auto order-1 sm:order-2 gap-2 !px-8 !py-3.5 shrink-0"
              >
                <Lightning weight="fill" className="w-4 h-4" />
                <span>{projectId ? 'Regenerate Tree & Spec' : 'Generate Tree & Spec'}</span>
                <ArrowRight weight="bold" className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Feature Highlights Footer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4">
            <div className="font-mono font-semibold text-xs text-white flex items-center gap-1.5">
              <span>🌳 Interactive Tree</span>
            </div>
            <p className="font-sans text-xs text-zinc-400 mt-1">
              Peta alur modul, screen, dan user journey secara visual.
            </p>
          </div>

          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4">
            <div className="font-mono font-semibold text-xs text-white flex items-center gap-1.5">
              <span>📄 PRD Lengkap</span>
            </div>
            <p className="font-sans text-xs text-zinc-400 mt-1">
              Spesifikasi MVP, batasan teknis, target persona, dan use cases.
            </p>
          </div>

          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4">
            <div className="font-mono font-semibold text-xs text-white flex items-center gap-1.5">
              <span>🤖 AGENTS.md</span>
            </div>
            <p className="font-sans text-xs text-zinc-400 mt-1">
              Pedoman aturan, guardrails, dan instruksi untuk AI coding agent.
            </p>
          </div>

          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4">
            <div className="font-mono font-semibold text-xs text-white flex items-center gap-1.5">
              <span>⚡ Prompt.md</span>
            </div>
            <p className="font-sans text-xs text-zinc-400 mt-1">
              Master atomic prompt step-by-step siap disalin ke editor/agent.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
