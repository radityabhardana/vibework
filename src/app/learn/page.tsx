'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { GraduationCap, Sparkle, ArrowRight, Trash, Spinner, Fire, CheckCircle, Checks, X } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

import { useLanguage } from '@/context/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ReturnHomeLink } from '@/components/ui/ReturnHomeLink';

export default function LearnHubPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [topic, setTopic] = useState('');
  const [showGrillModal, setShowGrillModal] = useState(false);

  // Quick Grill form state
  const [familiarity, setFamiliarity] = useState(0);
  const [goals, setGoals] = useState<number[]>([0]);
  const [focusText, setFocusText] = useState('');

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusKey, setStatusKey] = useState<'connecting' | 'mapping' | 'generated' | null>(null);
  const [roadmaps, setRoadmaps] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const availableGoals = [
    t('Membangun Proyek Produksi (Hands-on)', 'Build a Production Project'),
    t('Persiapan Karir & Interview Kerja', 'Career Transition & Job Interview Prep'),
    t('Riset & Pendalaman Akademis', 'Academic & Research Deep-Dive'),
    t('Pemahaman Konsep & Teori Dasar', 'General Mastery & Core Concepts'),
  ];

  const availableFamiliarity = [
    t('Nol Besar (Belum paham sama sekali)', 'Complete Beginner (No prior knowledge)'),
    t('Pernah Dengar / Tahu Konsep Dasar', 'Heard of it / Basic Concepts Known'),
    t('Pernah Coba Praktik / Punya Dasar', 'Hands-on Experience / Have Fundamentals'),
    t('Sudah Berpengalaman / Level Advanced', 'Experienced / Target Advanced Level'),
  ];

  const statusText = statusKey === 'connecting'
    ? t('Menghubungkan ke AI Learning Engine...', 'Connecting to AI Learning Engine...')
    : statusKey === 'mapping'
      ? t('Memetakan tahapan & kurikulum micro-lesson...', 'Mapping micro-lessons curriculum...')
      : statusKey === 'generated'
        ? t('Roadmap berhasil dibuat! Membuka canvas...', 'Roadmap generated! Opening workspace...')
        : '';

  const toggleGoal = (goalToToggle: number) => {
    setGoals(prev => {
      if (prev.includes(goalToToggle)) {
        if (prev.length === 1) return prev; // Keep at least one goal
        return prev.filter(g => g !== goalToToggle);
      } else {
        return [...prev, goalToToggle];
      }
    });
  };

  const fetchRoadmaps = async () => {
    try {
      const res = await fetch('/api/learn/list');
      if (res.ok) {
        const data = await res.json();
        setRoadmaps(data.roadmaps || []);
      }
    } catch (err) {
      console.error('Failed to fetch roadmaps:', err);
    }
  };

  useEffect(() => {
    fetchRoadmaps();
  }, []);

  const handleOpenGrill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setShowGrillModal(true);
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setShowGrillModal(false);
    setLoading(true);
    setError(null);
    setProgress(10);
    setStatusKey('connecting');

    const progressTimer = setInterval(() => {
      setProgress(p => {
        if (p >= 90) return 90;
        const inc = Math.max(1, (90 - p) * 0.08);
        return p + inc;
      });
    }, 400);

    const stepTimer = setTimeout(() => {
      setStatusKey('mapping');
    }, 2500);

    try {
      const res = await fetch('/api/learn/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          familiarityIndex: familiarity,
          goalIndices: goals,
          focusText: focusText.trim(),
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setProgress(100);
      setStatusKey('generated');
      setTimeout(() => {
        router.push(`/learn/${data.roadmapId}`);
      }, 400);
    } catch (err: any) {
      setError(err.message || t('Gagal membuat roadmap.', 'Failed to generate roadmap.'));
      setLoading(false);
    } finally {
      clearInterval(progressTimer);
      clearTimeout(stepTimer);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(t('Apakah Anda yakin ingin menghapus roadmap ini?', 'Are you sure you want to delete this roadmap?'))) return;

    try {
      const res = await fetch('/api/learn/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        fetchRoadmaps();
      }
    } catch (err) {
      console.error('Failed to delete roadmap:', err);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0b0d0f] text-white overflow-auto relative">
      {/* Ambient Lighting & Geometric Dot Matrix */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Header */}
      <header className="h-16 w-full border-b border-white/10 bg-[#030303]/80 backdrop-blur-md flex items-center px-4 sm:px-6 justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <ReturnHomeLink label={t('Dashboard', 'Dashboard')} />
          <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-white">
            <GraduationCap weight="duotone" className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-sans font-bold text-sm text-white tracking-tight">
                {t('Mesin Roadmap Pembelajaran AI', 'AI Learning Roadmap Engine')}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-white/15 bg-white/5 font-mono text-[10px] text-zinc-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {t('Aktif', 'Active')}
              </span>
            </div>
            <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider hidden sm:block">
              {t('pohon interaktif bergaya roadmap.sh', 'roadmap.sh-style interactive trees')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 sm:p-6 md:p-10 max-w-6xl w-full mx-auto flex flex-col gap-10 z-0">
        
        {/* Double-Bezel Topic Input Chassis */}
        <div className="p-2 sm:p-2.5 rounded-3xl bg-[#14191a] border border-white/10 shadow-[var(--shadow-brutal)]">
          <div className="rounded-2xl bg-[#08080b]/90 border border-white/5 p-6 sm:p-8 flex flex-col gap-5 shadow-inner">
            <div className="flex flex-col gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/5 font-mono text-[11px] text-zinc-300 w-fit">
                <Sparkle weight="fill" className="w-3 h-3 text-zinc-200" />
                <span>{t('Arsitek Kurikulum Adaptif', 'Adaptive Curriculum Architect')}</span>
              </div>
              <h2 className="font-sans font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
                {t('Buat Roadmap Pembelajaran Baru', 'Generate New Learning Roadmap')}
              </h2>
              <p className="font-sans text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
                {t(
                  'Ketik teknologi atau domain apapun (contoh: Machine Learning, Blockchain, Rust). AI akan mewawancarai kamu dengan pertanyaan singkat untuk menyusun pohon roadmap 100% personal!',
                  'Type any technology or domain (e.g. Machine Learning, Blockchain, Rust). AI will Grill you with key questions to build a 100% personalized roadmap tree!'
                )}
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-950/60 text-rose-200 font-mono text-xs rounded-xl border border-rose-500/30">
                {t('Gagal:', 'Error:')} {error}
              </div>
            )}

            <form onSubmit={handleOpenGrill} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                aria-label={t('Topik roadmap', 'Roadmap topic')}
                placeholder={t('Contoh: Machine Learning, Blockchain, Python Backend...', 'e.g. Machine Learning, Blockchain, Python Backend...')}
                value={topic}
                onChange={e => setTopic(e.target.value)}
                maxLength={120}
                disabled={loading}
                className="flex-1 px-4 py-3 rounded-xl border border-white/10 font-sans text-sm bg-black/60 text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/15 transition-all"
              />
              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={loading || !topic.trim()}
                className="px-6 flex items-center justify-center gap-2 min-w-[170px] text-xs font-semibold shadow-md active:scale-95 transition-all"
              >
                {loading ? (
                  <>
                    <Spinner weight="bold" className="w-4 h-4 animate-spin" />
                    <span>{t('Memproses...', 'Generating...')}</span>
                  </>
                ) : (
                  <>
                    <Fire weight="bold" className="w-4 h-4" />
                    <span>{t('AI Quick Grill →', 'AI Quick Grill →')}</span>
                  </>
                )}
              </Button>
            </form>

            {/* Progress Bar Container when Loading */}
            {loading && (
              <div className="p-4 bg-white/[0.02] rounded-xl border border-white/10 shadow-xl flex flex-col gap-2.5 animate-in fade-in duration-200">
                <div className="flex justify-between items-center font-mono text-xs">
                  <span className="text-zinc-300 font-medium">{statusText}</span>
                  <span className="text-white font-bold">{Math.round(progress)}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                    style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Existing Roadmaps Section */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {t('Daftar Roadmap Pembelajaran Tersimpan', 'Your Saved Learning Roadmaps')}
            </h3>
            <span className="font-mono text-[10px] text-zinc-600">
              {roadmaps.length} {t('Roadmap', 'Roadmaps')}
            </span>
          </div>

          {roadmaps.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] text-center text-zinc-500 font-sans text-xs">
              {t('Belum ada roadmap tersimpan. Masukkan topik di atas untuk membuat & menyimpan roadmap interaktif pertama kamu!', 'No saved roadmaps yet. Enter a topic above to generate & save your first interactive roadmap!')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roadmaps.map(rm => (
                <Link key={rm.id} href={`/learn/${rm.id}`}>
                  <div className="p-5 sm:p-6 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/30 transition-all h-full flex flex-col justify-between cursor-pointer group shadow-sm hover:shadow-xl backdrop-blur-md">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-mono font-medium uppercase px-2.5 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-white/10">
                          {rm.topic}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-zinc-500">{new Date(rm.createdAt).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US')}</span>
                          <button
                            type="button"
                            onClick={(e) => handleDelete(e, rm.id)}
                            title={t('Hapus Roadmap', 'Delete Roadmap')}
                            className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash weight="bold" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <h4 className="font-sans font-bold text-base text-white mb-1.5 leading-snug group-hover:text-zinc-100 transition-colors">{rm.title}</h4>
                      <p className="font-sans text-xs text-zinc-400 line-clamp-2 leading-relaxed">{rm.description}</p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-white/5 flex justify-between items-center font-mono text-xs text-zinc-400 group-hover:text-white font-medium transition-colors">
                      <span>{t('Buka Pohon & Kerjakan Kuis', 'View Tree & Take Quizzes')}</span>
                      <ArrowRight weight="bold" className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* AI Quick Grill Modal */}
      {showGrillModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#09090c] border border-white/15 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto text-white">
            
            {/* Modal Header */}
            <div className="bg-zinc-950/80 border-b border-white/10 p-5 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-white">
                  <Fire weight="bold" className="w-4 h-4" />
                </div>
                <h3 className="font-sans font-bold text-base text-white">
                  {t('AI Quick Grill: Personalisasi Roadmap', 'AI Quick Grill: Personalize Roadmap')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGrillModal(false)}
                aria-label={t('Tutup dialog', 'Close dialog')}
                className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <X weight="bold" className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-6 font-sans text-sm text-zinc-200">
              <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl flex items-center gap-2 text-xs">
                <span className="text-zinc-400">{t('Topik Target:', 'Target Topic:')}</span>
                <span className="font-semibold text-white uppercase">{topic}</span>
              </div>

              {/* Q1: Self-Familiarity with Topic */}
              <div className="flex flex-col gap-2">
                <label className="font-sans font-semibold text-xs text-zinc-300 block">
                  {t('1. Bagaimana kondisi pemahaman awal kamu dalam topik ini?', '1. What is your current familiarity with this topic?')}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {availableFamiliarity.map((fam, index) => (
                    <button
                      key={fam}
                      type="button"
                      onClick={() => setFamiliarity(index)}
                      className={`p-3 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                        familiarity === index
                          ? 'border-white/40 bg-white/15 text-white shadow-md'
                          : 'border-white/10 bg-black/40 text-zinc-400 hover:text-white hover:border-white/20'
                      }`}
                    >
                      {fam}
                    </button>
                  ))}
                </div>
              </div>

              {/* Q2: Primary Learning Goals (Multi-Select) */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="font-sans font-semibold text-xs text-zinc-300 block">
                    {t('2. Apa tujuan utama kamu belajar topik ini?', '2. What are your primary learning goals?')}
                  </label>
                  <span className="text-[10px] font-mono font-medium text-zinc-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                    {t('Multi-Select', 'Multi-Select')}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {availableGoals.map((g, index) => {
                    const isSelected = goals.includes(index);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => toggleGoal(index)}
                        className={`p-3 rounded-xl border text-xs text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'border-white/40 bg-white/15 text-white shadow-md'
                            : 'border-white/10 bg-black/40 text-zinc-400 hover:text-white hover:border-white/20'
                        }`}
                      >
                        <span>{g}</span>
                        {isSelected ? (
                          <Checks weight="bold" className="w-4 h-4 shrink-0 text-white" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded border border-white/20 inline-block shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Q3: Specific Focus / Sub-domains */}
              <div className="flex flex-col gap-2">
                <label className="font-sans font-semibold text-xs text-zinc-300 block">
                  {t(
                    '3. Ada spesifik framework, tools, atau fokus area yang ingin dipelajari? (Opsional)',
                    '3. Any specific frameworks, tools, or focus areas to emphasize? (Optional)'
                  )}
                </label>
                <input
                  type="text"
                  aria-label={t('Fokus pembelajaran tambahan', 'Additional learning focus')}
                  placeholder={t(
                    'Contoh: Fokus pada PyTorch & Vision, atau Solidity & Foundry...',
                    'e.g. Focus on PyTorch & Vision, or Solidity & Foundry...'
                  )}
                  value={focusText}
                  onChange={e => setFocusText(e.target.value)}
                  maxLength={500}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 font-sans text-xs bg-black/60 text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
                />
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-white/10 flex justify-end gap-3 sticky bottom-0 bg-[#09090c] p-2">
                <Button variant="secondary" size="sm" onClick={() => setShowGrillModal(false)}>
                  {t('Batal', 'Cancel')}
                </Button>
                <Button variant="primary" size="sm" onClick={handleGenerate} className="text-xs font-semibold">
                  <CheckCircle weight="bold" className="w-4 h-4 mr-1" />
                  {t('Buat Pohon Personal →', 'Generate Personalized Tree →')}
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
