'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkle,
  Plus,
  ArrowRight,
  FileText,
  TreeStructure,
  ListChecks,
  Code,
  Terminal,
  Cpu,
  GraduationCap,
  Waveform,
  MagnifyingGlass,
  ArrowSquareOut,
  Clock,
  Stack,
  Globe,
  DeviceMobile,
  Robot,
  ChartLineUp,
  Buildings,
  House,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/context/LanguageContext';

export interface DashboardProject {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  updatedAt: string | null;
  createdAt: string | null;
  promptCount: number;
  prdCount: number;
  adrCount: number;
  flowchartCount: number;
  sessionId?: string | null;
}

export interface DashboardSession {
  id: string;
  title: string | null;
  projectId: string | null;
  projectName: string | null;
  updatedAt: string | null;
}

export interface DashboardRoadmap {
  id: string;
  topic: string;
  title: string;
  createdAt: string | null;
  totalNodes: number;
  masteredNodes: number;
}

export interface DashboardStats {
  totalProjects: number;
  totalPrompts: number;
  totalRoadmaps: number;
  totalRoadmapNodes: number;
  masteredRoadmapNodes: number;
  totalPrds: number;
  totalAdrs: number;
  totalFlowcharts: number;
  totalSessions: number;
}

export interface DashboardViewProps {
  stats: DashboardStats;
  projects: DashboardProject[];
  sessions: DashboardSession[];
  roadmaps: DashboardRoadmap[];
}

const QUICK_ARCHETYPES = [
  { label: 'Web SaaS B2B', icon: Globe, snippet: 'Platform Web SaaS B2B untuk otomasi workflow bisnis terintegrasi' },
  { label: 'Mobile App', icon: DeviceMobile, snippet: 'Aplikasi mobile iOS dan Android dengan offline-first sync' },
  { label: 'AI Agent System', icon: Robot, snippet: 'Multi-agent AI workflow untuk otomatisasi data pipeline & support' },
  { label: 'Fintech & Billing', icon: ChartLineUp, snippet: 'Platform SaaS billing, tiered subscription, dan payment gateway' },
  { label: 'Proptech & Kos', icon: Buildings, snippet: 'Aplikasi pencatatan kos-kosan otomatis, tagihan WhatsApp & meteran listrik AI' },
];

function formatRelativeTime(dateString: string | null, isEn: boolean): string {
  if (!dateString) return isEn ? 'Recently' : 'Baru saja';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffDay > 30) {
      return date.toLocaleDateString(isEn ? 'en-US' : 'id-ID', { month: 'short', day: 'numeric' });
    }
    if (diffDay > 0) return isEn ? `${diffDay}d ago` : `${diffDay} hari lalu`;
    if (diffHour > 0) return isEn ? `${diffHour}h ago` : `${diffHour} jam lalu`;
    if (diffMin > 0) return isEn ? `${diffMin}m ago` : `${diffMin} mnt lalu`;
    return isEn ? 'Just now' : 'Baru saja';
  } catch {
    return isEn ? 'Recently' : 'Baru saja';
  }
}

export function DashboardView({ stats, projects, sessions, roadmaps }: DashboardViewProps) {
  const { language, t } = useLanguage();
  const isEn = language === 'en';
  const router = useRouter();

  const [ideaInput, setIdeaInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'ready' | 'draft'>('all');

  const handleLaunchGrill = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (ideaInput.trim()) {
      router.push(`/engine?idea=${encodeURIComponent(ideaInput.trim())}`);
    } else {
      router.push('/engine');
    }
  };

  const handleSelectArchetype = (snippet: string) => {
    setIdeaInput(snippet);
  };

  // Filter projects & sessions
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchesSearch) return false;

      if (activeTab === 'ready') return p.promptCount > 0 || p.status?.toLowerCase().includes('generated');
      if (activeTab === 'draft') return p.promptCount === 0 || p.status?.toLowerCase().includes('draft');
      return true;
    });
  }, [projects, searchQuery, activeTab]);

  const unlinkedSessions = useMemo(() => {
    return sessions.filter((s) => !s.projectId);
  }, [sessions]);

  const masteryPercent =
    stats.totalRoadmapNodes > 0
      ? Math.round((stats.masteredRoadmapNodes / stats.totalRoadmapNodes) * 100)
      : 0;

  return (
    <div className="relative w-full h-full min-h-screen flex flex-col bg-[#030303] text-zinc-100 overflow-y-auto selection:bg-white selection:text-black">
      {/* Background ambient lighting & grid */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.08),rgba(255,255,255,0))]"
      />
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none bg-dot-grid opacity-30 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]"
      />

      {/* ============ DASHBOARD TOP COMMAND BAR ============ */}
      <header className="sticky top-0 z-30 h-16 w-full border-b border-white/10 bg-[#030303]/90 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between gap-4">
        {/* Left: Studio Identity & Navigation */}
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="size-8 rounded-lg bg-white flex items-center justify-center text-black shadow-[0_0_12px_rgba(255,255,255,0.3)] transition-transform duration-300 group-hover:scale-105">
              <Sparkle weight="fill" className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-mono font-bold text-xs tracking-wider uppercase text-white">
                Vibework Studio
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-500">
                {t('Developer OS', 'Developer OS')}
              </span>
            </div>
          </Link>

          <span className="hidden md:inline-block h-4 w-px bg-white/10" />

          {/* Module Nav Links */}
          <nav className="hidden lg:flex items-center gap-1 font-mono text-xs">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-md bg-white/10 text-white font-medium flex items-center gap-1.5"
            >
              <House weight="bold" className="w-3.5 h-3.5" />
              <span>{t('Dashboard', 'Dashboard')}</span>
            </Link>
            <Link
              href="/engine"
              className="px-3 py-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5"
            >
              <Sparkle weight="bold" className="w-3.5 h-3.5" />
              <span>{t('The Grill', 'The Grill')}</span>
            </Link>
            <Link
              href="/learn"
              className="px-3 py-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5"
            >
              <GraduationCap weight="bold" className="w-3.5 h-3.5" />
              <span>{t('Kurikulum', 'Learn')}</span>
            </Link>
            <Link
              href="/voice"
              className="px-3 py-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5"
            >
              <Waveform weight="bold" className="w-3.5 h-3.5" />
              <span>{t('Voice Studio', 'Voice Studio')}</span>
            </Link>
          </nav>
        </div>

        {/* Right: Engine Status Pill + New Spec CTA + Language */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Engine Status */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] font-mono text-[11px] text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="font-medium">{t('Multi-LLM Engine Online', 'Multi-LLM Engine Online')}</span>
          </div>

          {/* Quick Create CTA */}
          <Link href="/engine">
            <Button
              variant="primary"
              size="sm"
              className="!py-1.5 !px-3 text-xs font-mono font-medium gap-1.5 shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]"
            >
              <Plus weight="bold" className="w-3.5 h-3.5" />
              <span>{t('Spesifikasi Baru', 'New Spec')}</span>
            </Button>
          </Link>

          <LanguageSwitcher />
        </div>
      </header>

      {/* ============ MAIN DASHBOARD CONTENT ============ */}
      <main className="relative flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 flex flex-col gap-8">
        {/* ============ DOUBLE-BEZEL KPI METRIC TILES ============ */}
        <section aria-label="System Metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Architecture Blueprints */}
          <div className="p-1 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all duration-300 group">
            <div className="h-full p-4 rounded-xl bg-[#070709] border border-white/5 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                  {t('Proyek Arsitektur', 'Architecture Specs')}
                </span>
                <div className="size-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 group-hover:scale-105 transition-transform">
                  <TreeStructure weight="duotone" className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-sans font-extrabold text-3xl text-white tracking-tight">
                  {stats.totalProjects}
                </span>
                <span className="font-mono text-[11px] text-emerald-400 flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  {t('Siap Pakai', 'Ready')}
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between font-mono text-[10px] text-zinc-500">
                <span>{stats.totalPrds} PRD · {stats.totalAdrs} ADR</span>
                <span className="text-zinc-400">{stats.totalSessions} {t('sesi', 'sessions')}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Atomic Execution Prompts */}
          <div className="p-1 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all duration-300 group">
            <div className="h-full p-4 rounded-xl bg-[#070709] border border-white/5 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                  {t('Prompt Atomik AI', 'Atomic Prompts')}
                </span>
                <div className="size-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 group-hover:scale-105 transition-transform">
                  <Terminal weight="duotone" className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-sans font-extrabold text-3xl text-white tracking-tight">
                  {stats.totalPrompts}
                </span>
                <span className="font-mono text-[11px] text-cyan-400">
                  {t('Tervalidasi', 'Agent-Ready')}
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between font-mono text-[10px] text-zinc-500">
                <span>{t('Cursor & Windsurf Ready', 'Cursor & Windsurf Ready')}</span>
                <span className="text-zinc-400">100% {t('urut', 'ordered')}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Curriculum Mastery */}
          <div className="p-1 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all duration-300 group">
            <div className="h-full p-4 rounded-xl bg-[#070709] border border-white/5 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                  {t('Penguasaan Kurikulum', 'Curriculum Mastery')}
                </span>
                <div className="size-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 group-hover:scale-105 transition-transform">
                  <GraduationCap weight="duotone" className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-sans font-extrabold text-3xl text-white tracking-tight">
                  {stats.masteredRoadmapNodes}
                </span>
                <span className="font-mono text-xs text-zinc-400">
                  / {stats.totalRoadmapNodes} {t('node', 'nodes')} ({masteryPercent}%)
                </span>
              </div>
              <div className="mt-2">
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
                    style={{ width: `${Math.max(5, masteryPercent)}%` }}
                  />
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between font-mono text-[10px] text-zinc-500">
                <span>{stats.totalRoadmaps} {t('Track Aktif', 'Active Tracks')}</span>
                <Link href="/learn" className="text-white hover:underline">
                  {t('Buka ↗', 'Open ↗')}
                </Link>
              </div>
            </div>
          </div>

          {/* Card 4: System Engine Diagnostics */}
          <div className="p-1 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all duration-300 group">
            <div className="h-full p-4 rounded-xl bg-[#070709] border border-white/5 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                  {t('Sistem & Database', 'Engine & Storage')}
                </span>
                <div className="size-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 group-hover:scale-105 transition-transform">
                  <Cpu weight="duotone" className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-sans font-extrabold text-2xl text-white tracking-tight">
                  WAL Active
                </span>
                <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  SQLite
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between font-mono text-[10px] text-zinc-500">
                <span>Drizzle ORM Engine</span>
                <span className="text-emerald-400 font-medium">{t('Normal', 'Healthy')}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ============ QUICK SPEC LAUNCHER (COMMAND DECK) ============ */}
        <section aria-label="Quick Spec Launcher">
          <div className="p-1.5 rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/15 shadow-[0_0_50px_-15px_rgba(255,255,255,0.08)]">
            <div className="p-5 sm:p-6 rounded-xl bg-[#060608] border border-white/5 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse" />
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-300">
                    {t('The Grill // Quick Architecture Spec Launcher', 'The Grill // Quick Architecture Spec Launcher')}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-zinc-500">
                  {t('Socratic Multi-Phase Interview', 'Socratic Multi-Phase Interview')}
                </span>
              </div>

              {/* Launcher Form */}
              <form onSubmit={handleLaunchGrill} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={ideaInput}
                    onChange={(e) => setIdeaInput(e.target.value)}
                    placeholder={t(
                      'Ketik ide aplikasi atau arsitektur baru... (cth: SaaS B2B billing midtrans, AI customer service otomatis WhatsApp)',
                      'Type a new app idea or system architecture... (e.g., B2B billing SaaS with Stripe, multi-agent AI support on WhatsApp)'
                    )}
                    className="w-full h-12 px-4 rounded-xl border border-white/15 bg-white/[0.03] text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all font-sans"
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="h-12 px-6 rounded-xl font-mono text-xs font-semibold gap-2 shrink-0 justify-center shadow-sm"
                >
                  <span>{t('Mulai Interogasi', 'Launch The Grill')}</span>
                  <ArrowRight weight="bold" className="w-4 h-4" />
                </Button>
              </form>

              {/* Archetype Starter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
                <span className="font-mono text-[10px] uppercase text-zinc-500 shrink-0">
                  {t('Preset Cepat:', 'Quick Presets:')}
                </span>
                {QUICK_ARCHETYPES.map((arch) => {
                  const Icon = arch.icon;
                  return (
                    <button
                      key={arch.label}
                      type="button"
                      onClick={() => handleSelectArchetype(arch.snippet)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.08] hover:border-white/25 text-zinc-400 hover:text-white font-mono text-[11px] transition-all shrink-0 cursor-pointer"
                    >
                      <Icon weight="bold" className="w-3 h-3 text-zinc-500" />
                      <span>{arch.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ============ RECENT SPECS & BLUEPRINTS (MAIN TABLE / FEED) ============ */}
        <section aria-label="Recent Specs & Blueprints" className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-zinc-400 font-semibold">
                {t('Spesifikasi & Blueprint Proyek', 'Architecture Specs & Blueprints')}
              </span>
              <span className="px-2 py-0.5 rounded-full border border-white/15 bg-white/5 font-mono text-[10px] text-zinc-400">
                {projects.length}
              </span>
            </div>

            {/* Filter & Tabs */}
            <div className="flex items-center gap-3">
              {/* Search Bar */}
              <div className="relative">
                <MagnifyingGlass weight="bold" className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('Cari spesifikasi...', 'Search specs...')}
                  className="h-8 pl-8 pr-3 rounded-lg border border-white/10 bg-white/[0.03] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition-all font-mono"
                />
              </div>

              {/* Tab Pills */}
              <div className="flex items-center p-0.5 rounded-lg border border-white/10 bg-white/[0.02] font-mono text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    activeTab === 'all' ? 'bg-white/10 text-white font-medium' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {t('Semua', 'All')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ready')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    activeTab === 'ready' ? 'bg-white/10 text-white font-medium' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {t('Siap Eksekusi', 'Ready')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('draft')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    activeTab === 'draft' ? 'bg-white/10 text-white font-medium' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {t('Draft', 'Draft')}
                </button>
              </div>
            </div>
          </div>

          {/* Project Cards List */}
          {filteredProjects.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] flex flex-col items-center justify-center text-center gap-3">
              <div className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500">
                <FileText weight="duotone" className="w-5 h-5" />
              </div>
              <p className="font-sans text-sm text-zinc-400">
                {t('Tidak ada spesifikasi arsitektur yang cocok.', 'No architecture specs found.')}
              </p>
              <Link href="/engine">
                <Button variant="secondary" size="sm" className="font-mono text-xs">
                  <Plus weight="bold" className="w-3.5 h-3.5" />
                  <span>{t('Buat Spesifikasi Pertama', 'Create First Spec')}</span>
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProjects.map((p) => {
                const isReady = p.promptCount > 0;
                return (
                  <div
                    key={p.id}
                    className="p-1 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all duration-300 group flex flex-col justify-between"
                  >
                    <div className="p-5 rounded-xl bg-[#060608] border border-white/5 flex flex-col justify-between h-full gap-4">
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`size-2 rounded-full shrink-0 ${
                                isReady
                                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
                                  : 'bg-zinc-500'
                              }`}
                            />
                            <h3 className="font-sans font-bold text-base text-white truncate group-hover:text-cyan-200 transition-colors">
                              {p.name}
                            </h3>
                          </div>
                          <p className="font-sans text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                            {p.description || t('Spesifikasi sistem dan blueprint arsitektur aplikasi.', 'System specification and application architecture blueprint.')}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`shrink-0 px-2.5 py-1 rounded-full font-mono text-[10px] uppercase font-medium border ${
                            isReady
                              ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                              : 'border-zinc-700 bg-zinc-800/50 text-zinc-400'
                          }`}
                        >
                          {p.status || (isReady ? 'Ready' : 'Draft')}
                        </span>
                      </div>

                      {/* Deliverables Pills */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md font-mono text-[10px] border ${
                            p.prdCount > 0
                              ? 'border-white/15 bg-white/5 text-zinc-200'
                              : 'border-white/5 bg-transparent text-zinc-600'
                          }`}
                        >
                          <FileText weight={p.prdCount > 0 ? 'fill' : 'regular'} className="w-3 h-3 text-zinc-400" />
                          <span>PRD</span>
                        </span>

                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md font-mono text-[10px] border ${
                            p.adrCount > 0
                              ? 'border-white/15 bg-white/5 text-zinc-200'
                              : 'border-white/5 bg-transparent text-zinc-600'
                          }`}
                        >
                          <ListChecks weight={p.adrCount > 0 ? 'fill' : 'regular'} className="w-3 h-3 text-zinc-400" />
                          <span>ADR</span>
                        </span>

                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md font-mono text-[10px] border ${
                            p.flowchartCount > 0
                              ? 'border-white/15 bg-white/5 text-zinc-200'
                              : 'border-white/5 bg-transparent text-zinc-600'
                          }`}
                        >
                          <TreeStructure weight={p.flowchartCount > 0 ? 'fill' : 'regular'} className="w-3 h-3 text-zinc-400" />
                          <span>Flowchart</span>
                        </span>

                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md font-mono text-[10px] border ${
                            p.promptCount > 0
                              ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300 font-medium'
                              : 'border-white/5 bg-transparent text-zinc-600'
                          }`}
                        >
                          <Code weight="bold" className="w-3 h-3 text-cyan-400" />
                          <span>{p.promptCount} {t('Prompt', 'Prompts')}</span>
                        </span>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5 font-mono text-[11px] text-zinc-500">
                        <div className="flex items-center gap-1.5">
                          <Clock weight="regular" className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{formatRelativeTime(p.updatedAt, isEn)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link href={`/projects/${p.id}`}>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="!py-1 !px-2.5 text-[11px] font-mono gap-1"
                            >
                              <span>{t('Buka Workspace', 'Open Workspace')}</span>
                              <ArrowSquareOut weight="bold" className="w-3 h-3" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Active Unlinked Studio Sessions (if any) */}
          {unlinkedSessions.length > 0 && (
            <div className="mt-2 p-4 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-medium flex items-center gap-2">
                  <Terminal weight="bold" className="w-3.5 h-3.5 text-amber-400" />
                  {t('Sesi Wawancara Studio Berjalan (Draft)', 'Ongoing Studio Interview Sessions (Draft)')}
                </span>
                <span className="font-mono text-[10px] text-zinc-500">
                  {unlinkedSessions.length} {t('sesi', 'sessions')}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {unlinkedSessions.map((s) => (
                  <Link
                    key={s.id}
                    href={`/engine/${s.id}`}
                    className="p-3 rounded-lg border border-white/10 bg-[#050507] hover:border-white/25 hover:bg-white/[0.04] transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <span className="size-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                      <span className="font-sans text-xs text-zinc-200 truncate group-hover:text-white">
                        {s.title || t('Sesi Wawancara Tanpa Judul', 'Untitled Interview Spec')}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-zinc-500 shrink-0 flex items-center gap-1 group-hover:text-white transition-colors">
                      <span>{t('Lanjut', 'Resume')}</span>
                      <ArrowRight weight="bold" className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ============ BENTO HUB: LEARNING ROADMAPS & STUDIO MODULES ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 cols: Learning Roadmaps */}
          <section aria-label="Learning Tracks" className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <GraduationCap weight="bold" className="w-4 h-4 text-zinc-400" />
                <span className="font-mono text-xs uppercase tracking-[0.25em] text-zinc-400 font-semibold">
                  {t('Roadmap Kurikulum Belajar', 'Curriculum Roadmaps')}
                </span>
              </div>
              <Link
                href="/learn"
                className="font-mono text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
              >
                <span>{t('Buka Kurikulum', 'Open Hub')}</span>
                <ArrowRight weight="bold" className="w-3 h-3" />
              </Link>
            </div>

            <div className="flex flex-col gap-3">
              {roadmaps.map((r) => {
                const pct = r.totalNodes > 0 ? Math.round((r.masteredNodes / r.totalNodes) * 100) : 0;
                return (
                  <Link
                    key={r.id}
                    href={`/learn/${r.id}`}
                    className="p-1 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all duration-300 group"
                  >
                    <div className="p-4 rounded-xl bg-[#060608] border border-white/5 flex items-center justify-between gap-4">
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">
                            {r.topic}
                          </span>
                          <h4 className="font-sans font-semibold text-sm text-white truncate group-hover:text-cyan-200 transition-colors">
                            {r.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 font-mono text-[10px] text-zinc-500">
                          <span>
                            {r.masteredNodes} / {r.totalNodes} {t('node dikuasai', 'nodes mastered')}
                          </span>
                          <span className="text-zinc-600">·</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="w-full h-1 rounded-full bg-white/10 mt-1 overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 transition-all duration-300"
                            style={{ width: `${Math.max(4, pct)}%` }}
                          />
                        </div>
                      </div>

                      <div className="shrink-0 pl-2">
                        <span className="size-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:bg-white/10 transition-colors">
                          <ArrowRight weight="bold" className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Right 5 cols: Studio Core Modules Hub */}
          <section aria-label="Studio Modules" className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Stack weight="bold" className="w-4 h-4 text-zinc-400" />
                <span className="font-mono text-xs uppercase tracking-[0.25em] text-zinc-400 font-semibold">
                  {t('Modul Studio', 'Studio Modules')}
                </span>
              </div>
              <span className="font-mono text-[10px] text-zinc-500">3 {t('mesin', 'engines')}</span>
            </div>

            <div className="flex flex-col gap-3">
              {/* Module 1: The Grill */}
              <Link
                href="/engine"
                className="p-1 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all duration-300 group"
              >
                <div className="p-4 rounded-xl bg-[#060608] border border-white/5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-xl bg-white/[0.06] border border-white/15 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                      <Sparkle weight="duotone" className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-sans font-bold text-sm text-white">The Grill</span>
                      <span className="font-sans text-xs text-zinc-400 truncate">
                        {t('Wawancara Socratic 5 Fase & PRD / ADR', '5-Phase Socratic Spec & PRD / ADR')}
                      </span>
                    </div>
                  </div>
                  <ArrowRight weight="bold" className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              </Link>

              {/* Module 2: Curriculum Engine */}
              <Link
                href="/learn"
                className="p-1 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all duration-300 group"
              >
                <div className="p-4 rounded-xl bg-[#060608] border border-white/5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-xl bg-white/[0.06] border border-white/15 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                      <GraduationCap weight="duotone" className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-sans font-bold text-sm text-white">Curriculum Engine</span>
                      <span className="font-sans text-xs text-zinc-400 truncate">
                        {t('Peta Jalan Teknologi & Micro-Quiz Node', 'Visual Tech Roadmaps & Micro-Quizzes')}
                      </span>
                    </div>
                  </div>
                  <ArrowRight weight="bold" className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              </Link>

              {/* Module 3: Voice Studio */}
              <Link
                href="/voice"
                className="p-1 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all duration-300 group"
              >
                <div className="p-4 rounded-xl bg-[#060608] border border-white/5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-xl bg-white/[0.06] border border-white/15 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                      <Waveform weight="duotone" className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-sans font-bold text-sm text-white">Voice Studio</span>
                        <span className="px-1.5 py-0.5 rounded font-mono text-[9px] uppercase bg-amber-400/10 text-amber-300 border border-amber-400/20">
                          Beta
                        </span>
                      </div>
                      <span className="font-sans text-xs text-zinc-400 truncate">
                        {t('Kloning Suara & Sintesis TTS Audio', 'Voice Cloning & TTS Synthesis Engine')}
                      </span>
                    </div>
                  </div>
                  <ArrowRight weight="bold" className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              </Link>
            </div>
          </section>
        </div>

        {/* ============ FOOTER TELEMETRY ============ */}
        <footer className="mt-4 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[10px] text-zinc-600">
          <div className="flex items-center gap-3">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            <span>VIBEWORK STUDIO OS v0.1.0 · SQLITE WAL ENGINE</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/engine" className="hover:text-zinc-400 transition-colors">
              The Grill
            </Link>
            <Link href="/learn" className="hover:text-zinc-400 transition-colors">
              Curriculum
            </Link>
            <Link href="/voice" className="hover:text-zinc-400 transition-colors">
              Voice
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
