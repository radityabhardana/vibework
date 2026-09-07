'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { House, GraduationCap, Sparkle, ArrowRight, Trash, Spinner, Fire, CheckCircle, Checks, X } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

import { useLanguage } from '@/context/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

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
  const [statusText, setStatusText] = useState('');
  const [roadmaps, setRoadmaps] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const availableGoals = language === 'en' ? [
    'Build a Production Project',
    'Career Transition & Job Interview Prep',
    'Academic & Research Deep-Dive',
    'General Mastery & Core Concepts',
  ] : [
    'Membangun Proyek Produksi (Hands-on)',
    'Persiapan Karir & Interview Kerja',
    'Riset & Pendalaman Akademis',
    'Pemahaman Konsep & Teori Dasar',
  ];

  const availableFamiliarity = language === 'en' ? [
    'Complete Beginner (No prior knowledge)',
    'Heard of it / Basic Concepts Known',
    'Hands-on Experience / Have Fundamentals',
    'Experienced / Target Advanced Level',
  ] : [
    'Nol Besar (Belum paham sama sekali)',
    'Pernah Dengar / Tahu Konsep Dasar',
    'Pernah Coba Praktik / Punya Dasar',
    'Sudah Berpengalaman / Level Advanced',
  ];

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
    setStatusText(t('Menghubungkan ke AI Learning Engine...', 'Connecting to AI Learning Engine...'));

    const progressTimer = setInterval(() => {
      setProgress(p => {
        if (p >= 90) return 90;
        const inc = Math.max(1, (90 - p) * 0.08);
        return p + inc;
      });
    }, 400);

    const stepTimer = setTimeout(() => {
      setStatusText(t('Memetakan tahapan & kurikulum micro-lesson...', 'Mapping micro-lessons curriculum...'));
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
      setStatusText(t('Roadmap berhasil dibuat! Membuka canvas...', 'Roadmap generated! Opening workspace...'));
      setTimeout(() => {
        router.push(`/learn/${data.roadmapId}`);
      }, 400);
    } catch (err: any) {
      setError(err.message || 'Failed to generate roadmap');
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
    <div className="w-full h-full flex flex-col bg-background text-foreground overflow-auto relative selection:bg-violet-500/20">
      {/* Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-gradient-to-b from-violet-500/10 via-cyan-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="h-16 w-full border-b border-white/10 bg-zinc-950/80 backdrop-blur-md flex items-center px-6 justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <GraduationCap weight="duotone" className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-sans font-bold text-sm text-zinc-100 tracking-tight">
              {t('Mesin Roadmap Pembelajaran AI', 'AI Learning Roadmap Engine')}
            </h1>
            <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
              roadmap.sh-style interactive trees
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/">
            <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
              <House weight="bold" className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 md:p-10 max-w-5xl w-full mx-auto flex flex-col gap-8 z-0">
        
        {/* Topic Input Banner */}
        <div className="bg-zinc-900/70 border border-white/10 p-6 md:p-8 rounded-2xl shadow-xl backdrop-blur-md flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 font-mono text-[11px] font-medium">
                <Sparkle weight="fill" className="w-3 h-3" />
                Adaptive Curriculum
              </span>
            </div>
            <h2 className="font-sans font-extrabold text-xl sm:text-2xl text-zinc-100 tracking-tight">
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
            <div className="p-3 bg-rose-950/80 text-rose-200 font-sans text-xs rounded-lg border border-rose-500/30">
              {t('Gagal:', 'Error:')} {error}
            </div>
          )}

          <form onSubmit={handleOpenGrill} className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder={t('Contoh: Machine Learning, Blockchain, Python Backend...', 'e.g. Machine Learning, Blockchain, Python Backend...')}
              value={topic}
              onChange={e => setTopic(e.target.value)}
              maxLength={120}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 font-sans text-sm bg-zinc-950 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500/80 focus:ring-2 focus:ring-violet-500/20 transition-all"
            />
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={loading || !topic.trim()}
              className="px-6 flex items-center justify-center gap-2 min-w-[180px] text-xs font-semibold"
            >
              {loading ? (
                <>
                  <Spinner weight="bold" className="w-4 h-4 animate-spin" />
                  <span>{t('Memproses...', 'Generating...')}</span>
                </>
              ) : (
                <>
                  <Fire weight="bold" className="w-4 h-4 text-amber-500" />
                  <span>{t('AI Quick Grill →', 'AI Quick Grill →')}</span>
                </>
              )}
            </Button>
          </form>

          {/* Progress Bar Container when Loading */}
          {loading && (
            <div className="p-4 bg-zinc-950 rounded-xl border border-violet-500/30 shadow-xl flex flex-col gap-2.5 animate-in fade-in duration-200">
              <div className="flex justify-between items-center font-sans text-xs">
                <span className="text-zinc-300 font-medium">{statusText}</span>
                <span className="font-mono text-violet-400 font-bold">{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-2 bg-zinc-900 rounded-full border border-white/10 overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(139,92,246,0.8)]"
                  style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Existing Roadmaps Section */}
        <section className="flex flex-col gap-4">
          <h3 className="font-sans font-bold text-sm uppercase tracking-wider text-zinc-400">
            {t('Daftar Roadmap Pembelajaran Tersimpan', 'Your Saved Learning Roadmaps')}
          </h3>

          {roadmaps.length === 0 ? (
            <div className="p-8 bg-zinc-900/40 border border-dashed border-white/10 rounded-2xl text-center text-zinc-500 font-sans text-xs">
              {t('Belum ada roadmap tersimpan. Masukkan topik di atas untuk membuat & menyimpan roadmap interaktif pertama kamu!', 'No saved roadmaps yet. Enter a topic above to generate & save your first interactive roadmap!')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {roadmaps.map(rm => (
                <Link key={rm.id} href={`/learn/${rm.id}`}>
                  <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-violet-500/40 hover:shadow-[0_0_25px_-5px_rgba(139,92,246,0.2)] transition-all h-full flex flex-col justify-between cursor-pointer group">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-mono font-medium uppercase px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                          {rm.topic}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-zinc-500">{new Date(rm.createdAt).toLocaleDateString()}</span>
                          <button
                            onClick={(e) => handleDelete(e, rm.id)}
                            title={t('Hapus Roadmap', 'Delete Roadmap')}
                            className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                          >
                            <Trash weight="bold" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <h4 className="font-sans font-bold text-base text-zinc-100 mb-1.5 leading-snug group-hover:text-violet-400 transition-colors">{rm.title}</h4>
                      <p className="font-sans text-xs text-zinc-400 line-clamp-2 leading-relaxed">{rm.description}</p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-white/[0.06] flex justify-between items-center font-sans font-semibold text-xs text-violet-400">
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="bg-zinc-950/80 border-b border-white/10 p-5 flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                  <Fire weight="bold" className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="font-sans font-bold text-base text-zinc-100">
                  {t('AI Quick Grill: Personalisasi Roadmap', 'AI Quick Grill: Personalize Roadmap')}
                </h3>
              </div>
              <button
                onClick={() => setShowGrillModal(false)}
                className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-white rounded-md hover:bg-white/[0.06] transition-colors"
              >
                <X weight="bold" className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-6 font-sans text-sm text-zinc-200">
              <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-center gap-2 text-xs">
                <span className="text-zinc-400">{t('Topik Target:', 'Target Topic:')}</span>
                <span className="font-semibold text-violet-300 uppercase">{topic}</span>
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
                      className={`p-3 rounded-xl border text-xs text-left transition-all ${
                        familiarity === index
                          ? 'border-violet-500 bg-violet-500/15 text-zinc-100 shadow-[0_0_15px_-3px_rgba(139,92,246,0.3)]'
                          : 'border-white/10 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 hover:border-white/20'
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
                  <span className="text-[10px] font-mono font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
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
                        className={`p-3 rounded-xl border text-xs text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? 'border-cyan-500 bg-cyan-500/15 text-zinc-100 shadow-[0_0_15px_-3px_rgba(6,182,212,0.3)]'
                            : 'border-white/10 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 hover:border-white/20'
                        }`}
                      >
                        <span>{g}</span>
                        {isSelected ? (
                          <Checks weight="bold" className="w-4 h-4 shrink-0 text-cyan-400" />
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
                  placeholder={t(
                    'Contoh: Fokus pada PyTorch & Vision, atau Solidity & Foundry...',
                    'e.g. Focus on PyTorch & Vision, or Solidity & Foundry...'
                  )}
                  value={focusText}
                  onChange={e => setFocusText(e.target.value)}
                  maxLength={500}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-white/10 font-sans text-xs bg-zinc-950 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/80"
                />
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-white/10 flex justify-end gap-3 sticky bottom-0 bg-zinc-900 p-2">
                <Button variant="secondary" size="sm" onClick={() => setShowGrillModal(false)}>
                  {t('Batal', 'Cancel')}
                </Button>
                <Button variant="primary" size="sm" onClick={handleGenerate} className="text-xs">
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
