'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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
      // 1. Assemble complete context if advanced inputs exist
      let fullPrompt = trimmedIdea;
      const extras: string[] = [];
      if (targetAudience.trim()) extras.push(`Target User: ${targetAudience.trim()}`);
      if (techStack.trim()) extras.push(`Tech Stack Preferensi: ${techStack.trim()}`);
      if (extras.length > 0) {
        fullPrompt += `\n\n--- Preferensi Tambahan ---\n${extras.join('\n')}`;
      }

      // 2. Ensure we have an active chatSession
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

      // 3. Save the user's idea as a message
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

      // 4. Trigger generation pipeline
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

      // 5. Navigate to project workspace
      router.push(`/projects/${genData.projectId}`);
    } catch (err: unknown) {
      console.error('Generation failed:', err);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
      setStatus('idle');
    }
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-[#f4f4f0] p-4 sm:p-6 md:p-10 flex flex-col items-center">
      <div className="w-full max-w-4xl flex flex-col gap-6">
        {/* Existing Project Banner */}
        {projectId && (
          <div className="bg-brutal-blue text-brutal-white border-4 border-brutal-black p-4 shadow-brutal flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle weight="fill" className="w-6 h-6 text-brutal-yellow shrink-0" />
              <div>
                <p className="font-sans font-black uppercase text-sm md:text-base">
                  Proyek ini telah memiliki Tree & Dokumen Spesifikasi
                </p>
                <p className="font-mono text-xs opacity-90">
                  Kamu bisa langsung membuka workspace atau mengedit ide di bawah untuk regenerate ulang.
                </p>
              </div>
            </div>
            <Link href={`/projects/${projectId}`}>
              <Button
                variant="primary"
                size="sm"
                className="!bg-brutal-yellow !text-brutal-black gap-1.5 whitespace-nowrap"
              >
                <span>Buka Workspace Tree &rarr;</span>
              </Button>
            </Link>
          </div>
        )}

        {/* Hero Header */}
        <div className="bg-brutal-white border-4 border-brutal-black p-6 md:p-8 shadow-brutal relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brutal-yellow -rotate-12 translate-x-12 -translate-y-12 border-b-4 border-l-4 border-brutal-black -z-0 opacity-40 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="bg-brutal-yellow border-2 border-brutal-black px-2.5 py-1 font-mono text-xs font-black uppercase tracking-wider">
                ⚡ Studio Penuangan Ide
              </span>
              <span className="font-mono text-xs font-bold text-gray-600 hidden sm:inline">
                Direct to Tree &bull; PRD &bull; AGENTS.md &bull; Architecture &bull; Prompt.md
              </span>
            </div>
            <h1 className="font-sans font-black text-3xl sm:text-4xl md:text-5xl uppercase tracking-tight text-brutal-black">
              Tuangkan Ide Aplikasi
            </h1>
            <p className="font-mono text-sm sm:text-base text-gray-800 leading-relaxed font-semibold max-w-2xl">
              Tulis konsep, problem, atau fitur apa saja yang ingin kamu bangun. AI akan langsung memetakannya ke dalam <strong>Interactive Tree</strong> dan menyusun seluruh dokumen spesifikasi teknis siap pakai.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-brutal-red text-brutal-white border-4 border-brutal-black p-4 shadow-brutal flex items-center gap-3">
            <WarningCircle weight="bold" className="w-6 h-6 shrink-0" />
            <span className="font-mono text-sm font-bold">{error}</span>
          </div>
        )}

        {/* Main Idea Input Card */}
        <Card bg="white" className="!p-6 md:!p-8 !border-4 !border-brutal-black !shadow-brutal flex flex-col gap-5">
          {/* Quick Preset Chips */}
          <div className="flex flex-col gap-2">
            <label className="font-sans font-black text-xs uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <Sparkle weight="fill" className="w-4 h-4 text-amber-500" />
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f4f4f0] hover:bg-brutal-yellow border-2 border-brutal-black font-mono font-bold text-xs uppercase tracking-tight transition-all active:translate-x-0.5 active:translate-y-0.5 cursor-pointer disabled:opacity-50"
                  >
                    <IconComponent weight="bold" className="w-3.5 h-3.5" />
                    <span>{tag.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Large Idea Textarea */}
          <div className="flex flex-col gap-2">
            <label htmlFor="idea-input" className="font-sans font-black text-sm uppercase tracking-wider text-brutal-black">
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
                className="w-full p-4 md:p-5 font-mono text-sm md:text-base border-4 border-brutal-black bg-white focus:bg-amber-50/20 focus:outline-none focus:ring-4 focus:ring-brutal-blue shadow-inner resize-y leading-relaxed text-brutal-black placeholder:text-gray-400 disabled:opacity-60 transition-colors"
              />
              <div className="flex justify-between items-center mt-2 px-1">
                <span className="font-mono text-xs font-bold text-gray-500">
                  {idea.trim().length > 0 ? `${idea.trim().length} karakter` : 'Minimal beberapa kalimat untuk hasil terbaik'}
                </span>
                {idea.trim().length > 0 && (
                  <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-500 px-2 py-0.5">
                    ✓ Ide Siap Diproses
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Optional Advanced Settings Toggle */}
          <div className="border-t-2 border-dashed border-gray-300 pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase text-gray-700 hover:text-brutal-black"
            >
              <Gear weight="bold" className="w-4 h-4" />
              <span>{showAdvanced ? '[-] Sembunyikan Preferensi Opsional' : '[+] Tambah Preferensi Teknis / Target User (Opsional)'}</span>
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 p-4 bg-[#f8f9fa] border-2 border-brutal-black">
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-xs font-bold uppercase text-gray-800">
                    Target User Spesifik:
                  </label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    disabled={status === 'generating'}
                    placeholder="Misal: Pemilik kos usia 30-55 tahun, Mahasiswa"
                    className="p-2.5 font-mono text-xs border-2 border-brutal-black bg-white focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-xs font-bold uppercase text-gray-800">
                    Tech Stack Preferensi (Opsional):
                  </label>
                  <input
                    type="text"
                    value={techStack}
                    onChange={(e) => setTechStack(e.target.value)}
                    disabled={status === 'generating'}
                    placeholder="Misal: Next.js, Supabase, Tailwind, WhatsApp API"
                    className="p-2.5 font-mono text-xs border-2 border-brutal-black bg-white focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Generation Progress Display */}
          {status === 'generating' && (
            <div className="mt-2 p-5 bg-brutal-white border-4 border-brutal-black shadow-brutal flex flex-col gap-3 animate-in fade-in">
              <div className="flex items-center justify-between font-mono text-xs md:text-sm font-bold">
                <div className="flex items-center gap-2">
                  <Lightning weight="fill" className="w-5 h-5 text-amber-500 animate-bounce" />
                  <span className="text-brutal-black">{GENERATION_STEPS[progressStepIndex]}</span>
                </div>
                <span className="font-black font-sans text-base">{Math.round(progressPercent)}%</span>
              </div>

              {/* Striped Neo-Brutalist Progress Bar */}
              <div className="w-full h-7 bg-gray-200 border-4 border-brutal-black relative overflow-hidden">
                <div
                  className="h-full bg-brutal-yellow border-r-4 border-brutal-black transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
                <div className="absolute inset-0 opacity-15 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#000_10px,#000_20px)] pointer-events-none" />
              </div>

              <div className="flex justify-between font-mono text-[11px] text-gray-600 font-bold px-1">
                <span>Langkah {progressStepIndex + 1} dari {GENERATION_STEPS.length}</span>
                <span>Menyiapkan Tree & Spesifikasi Lengkap...</span>
              </div>
            </div>
          )}

          {/* Action Bar */}
          {status !== 'generating' && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <p className="font-mono text-xs text-gray-500 font-semibold order-2 sm:order-1 text-center sm:text-left">
                💡 AI akan otomatis melengkapi asumsi arsitektur, database, dan security.
              </p>
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={handleGenerate}
                disabled={!idea.trim()}
                className="w-full sm:w-auto order-1 sm:order-2 !bg-brutal-yellow hover:!bg-yellow-400 gap-2.5 !px-8 !py-4 shadow-brutal font-black text-base md:text-lg tracking-wide shrink-0"
              >
                <Lightning weight="fill" className="w-6 h-6 text-brutal-black" />
                <span>{projectId ? '⚡ Regenerate Tree & Spec' : '⚡ Generate Tree & Spec'}</span>
                <ArrowRight weight="bold" className="w-5 h-5" />
              </Button>
            </div>
          )}
        </Card>

        {/* Feature Highlights Footer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-brutal-white border-2 border-brutal-black p-4 shadow-brutal-sm">
            <div className="font-sans font-black text-sm uppercase text-brutal-black flex items-center gap-1.5">
              <span>🌳 Interactive Tree</span>
            </div>
            <p className="font-mono text-xs text-gray-600 mt-1 font-semibold">
              Peta alur modul, screen, dan user journey secara visual.
            </p>
          </div>

          <div className="bg-brutal-white border-2 border-brutal-black p-4 shadow-brutal-sm">
            <div className="font-sans font-black text-sm uppercase text-brutal-black flex items-center gap-1.5">
              <span>📄 PRD Lengkap</span>
            </div>
            <p className="font-mono text-xs text-gray-600 mt-1 font-semibold">
              Spesifikasi MVP, batasan teknis, target persona, dan use cases.
            </p>
          </div>

          <div className="bg-brutal-white border-2 border-brutal-black p-4 shadow-brutal-sm">
            <div className="font-sans font-black text-sm uppercase text-brutal-black flex items-center gap-1.5">
              <span>🤖 AGENTS.md</span>
            </div>
            <p className="font-mono text-xs text-gray-600 mt-1 font-semibold">
              Pedoman aturan, guardrails, dan instruksi untuk AI coding agent.
            </p>
          </div>

          <div className="bg-brutal-white border-2 border-brutal-black p-4 shadow-brutal-sm">
            <div className="font-sans font-black text-sm uppercase text-brutal-black flex items-center gap-1.5">
              <span>⚡ Prompt.md</span>
            </div>
            <p className="font-mono text-xs text-gray-600 mt-1 font-semibold">
              Master atomic prompt step-by-step siap disalin ke editor/agent.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
