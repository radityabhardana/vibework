'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { House, GraduationCap, Sparkle, ArrowRight, Trash, Spinner, Fire, CheckCircle, Checks } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

import { useLanguage } from '@/context/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

export default function LearnHubPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [topic, setTopic] = useState('');
  const [showGrillModal, setShowGrillModal] = useState(false);

  // Quick Grill form state
  const [familiarity, setFamiliarity] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
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

  // Set default initial state based on language
  useEffect(() => {
    if (!familiarity) {
      setFamiliarity(availableFamiliarity[0]);
    }
    if (goals.length === 0) {
      setGoals([availableGoals[0]]);
    }
  }, [language]);

  const toggleGoal = (goalToToggle: string) => {
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
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRoadmaps();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setProgress(0);
      setStatusText(t('Menganalisis topik & kebutuhan grill...', 'Analyzing topic & grill requirements...'));
      interval = setInterval(() => {
        setProgress(p => {
          let next = p;
          if (p < 30) next = p + Math.random() * 8 + 2;
          else if (p < 65) next = p + Math.random() * 5 + 1;
          else if (p < 90) next = p + Math.random() * 3 + 0.5;
          else if (p < 98) next = p + 0.3;

          if (next < 30) setStatusText(t('Personalisasi level & tujuan...', 'Personalizing for selected goals & level...'));
          else if (next < 65) setStatusText(t('Menyusun pohon section & micro-lessons...', 'Generating granular section tree & micro-lessons...'));
          else if (next < 90) setStatusText(t('Membuat soal kuis interaktif...', 'Creating interactive quiz questions for every node...'));
          else setStatusText(t('Finalisasi roadmap & menyimpan ke DB...', 'Finalizing roadmap tree & saving to database...'));

          return next;
        });
      }, 400);
    } else {
      setProgress(0);
      setStatusText('');
    }
    return () => clearInterval(interval);
  }, [loading, t]);

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

    try {
      const res = await fetch('/api/learn/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          familiarity,
          goals,
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
    <div className="w-full h-full flex flex-col bg-[#e5e5f7] overflow-auto relative">
      {/* Header */}
      <header className="h-20 w-full border-b-4 border-brutal-black bg-brutal-white flex items-center px-6 justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <GraduationCap weight="bold" className="w-8 h-8 text-brutal-black" />
          <h1 className="font-sans font-black text-2xl uppercase tracking-tight">
            {t('MESIN ROADMAP PEMBELAJARAN AI', 'AI LEARNING ROADMAP ENGINE')}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/">
            <Button variant="secondary" size="sm" className="flex items-center gap-2">
              <House weight="bold" />
              {t('Dashboard', 'Dashboard')}
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-8 max-w-5xl w-full mx-auto flex flex-col gap-8">
        
        {/* Topic Input Banner */}
        <Card bg="yellow" className="p-8 border-4 border-brutal-black shadow-brutal">
          <div className="flex items-center gap-3 mb-2">
            <Sparkle weight="bold" className="w-7 h-7 text-brutal-black" />
            <h2 className="font-sans font-black text-2xl uppercase">
              {t('BUAT ROADMAP PEMBELAJARAN AI', 'GENERATE AI LEARNING ROADMAP')}
            </h2>
          </div>
          <p className="font-mono font-bold text-sm opacity-90 mb-6 max-w-2xl">
            {t(
              'Ketik teknologi atau domain apapun (contoh: Machine Learning, Blockchain, Rust). AI akan mewawancarai kamu dengan pertanyaan singkat untuk menyusun pohon roadmap 100% personal!',
              'Type any technology or domain (e.g. Machine Learning, Blockchain, Rust). AI will Grill you with key questions to build a 100% personalized roadmap tree!'
            )}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-brutal-red text-white font-mono font-bold border-2 border-brutal-black">
              {t('Gagal:', 'Error:')} {error}
            </div>
          )}

          <form onSubmit={handleOpenGrill} className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder={t('Contoh: Machine Learning, Blockchain, Python Backend...', 'e.g. Machine Learning, Blockchain, Python Backend...')}
              value={topic}
              onChange={e => setTopic(e.target.value)}
              disabled={loading}
              className="flex-1 px-4 py-3 border-4 border-brutal-black font-mono text-base font-bold bg-brutal-white focus:outline-none shadow-brutal-sm"
            />
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={loading || !topic.trim()}
              className="font-black uppercase tracking-wider px-8 flex items-center justify-center gap-2 min-w-[220px]"
            >
              {loading ? (
                <>
                  <Spinner weight="bold" className="w-5 h-5 animate-spin" />
                  {t('MEMPROSES...', 'GENERATING...')}
                </>
              ) : (
                <>
                  <Fire weight="bold" className="w-5 h-5" />
                  {t('AI QUICK GRILL →', 'AI QUICK GRILL →')}
                </>
              )}
            </Button>
          </form>

          {/* Progress Bar Container when Loading */}
          {loading && (
            <div className="mt-6 p-4 bg-brutal-white border-4 border-brutal-black shadow-brutal-sm flex flex-col gap-2 animate-in fade-in duration-200">
              <div className="flex justify-between items-center font-mono font-bold text-xs">
                <span className="uppercase text-brutal-black">{statusText}</span>
                <span className="bg-brutal-yellow px-2 py-0.5 border border-brutal-black">{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-5 bg-gray-200 border-2 border-brutal-black overflow-hidden relative">
                <div
                  className="h-full bg-brutal-blue transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Existing Roadmaps Section */}
        <section className="flex flex-col gap-4">
          <h3 className="font-sans font-black text-xl uppercase tracking-tight text-brutal-black">
            {t('DAFTAR ROADMAP PEMBELAJARAN TERSIMPAN', 'YOUR SAVED LEARNING ROADMAPS')}
          </h3>

          {roadmaps.length === 0 ? (
            <div className="p-8 bg-brutal-white border-4 border-brutal-black font-mono text-center opacity-70">
              {t('Belum ada roadmap tersimpan. Masukkan topik di atas untuk membuat & menyimpan roadmap interaktif pertama kamu!', 'No saved roadmaps yet. Enter a topic above to generate & save your first interactive roadmap!')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {roadmaps.map(rm => (
                <Link key={rm.id} href={`/learn/${rm.id}`}>
                  <Card bg="white" className="p-6 border-4 border-brutal-black shadow-brutal hover:-translate-y-1 transition-all h-full flex flex-col justify-between cursor-pointer group">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 bg-brutal-yellow border border-brutal-black">
                          {rm.topic}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-gray-500">{new Date(rm.createdAt).toLocaleDateString()}</span>
                          <button
                            onClick={(e) => handleDelete(e, rm.id)}
                            title={t('Hapus Roadmap', 'Delete Roadmap')}
                            className="p-1 hover:bg-red-100 border border-transparent hover:border-brutal-black text-gray-500 hover:text-red-600 transition-all"
                          >
                            <Trash weight="bold" className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <h4 className="font-sans font-black text-xl uppercase mb-2 leading-tight group-hover:text-amber-600 transition-colors">{rm.title}</h4>
                      <p className="font-mono text-xs text-gray-600 line-clamp-2">{rm.description}</p>
                    </div>

                    <div className="mt-4 pt-4 border-t-2 border-brutal-black flex justify-between items-center font-mono font-bold text-xs">
                      <span>{t('Buka Pohon & Kerjakan Kuis →', 'View Tree & Take Quizzes →')}</span>
                      <ArrowRight weight="bold" className="w-5 h-5" />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* AI Quick Grill Modal */}
      {showGrillModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brutal-black/70 backdrop-blur-sm p-4">
          <div className="bg-brutal-white border-4 border-brutal-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] w-full max-w-2xl flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="bg-brutal-yellow border-b-4 border-brutal-black p-4 flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Fire weight="bold" className="w-6 h-6 text-brutal-black" />
                <h3 className="font-sans font-black text-xl uppercase tracking-tight">
                  {t('AI QUICK GRILL: PERSONALISASI ROADMAP', 'AI QUICK GRILL: PERSONALIZE ROADMAP')}
                </h3>
              </div>
              <button
                onClick={() => setShowGrillModal(false)}
                className="font-mono font-bold text-sm px-2 py-1 bg-brutal-white border-2 border-brutal-black hover:bg-red-200"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-6 font-mono text-sm">
              <div className="p-3 bg-blue-100 border-2 border-brutal-black font-bold">
                {t('Topik Target:', 'Target Topic:')} <span className="underline uppercase text-blue-900">{topic}</span>
              </div>

              {/* Q1: Self-Familiarity with Topic */}
              <div>
                <label className="font-sans font-black uppercase text-sm block mb-2">
                  {t('1. Bagaimana kondisi pemahaman awal kamu dalam topik ini?', '1. What is your current familiarity with this topic?')}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableFamiliarity.map((fam) => (
                    <button
                      key={fam}
                      type="button"
                      onClick={() => setFamiliarity(fam)}
                      className={`p-3 border-2 border-brutal-black font-bold text-xs text-left transition-all ${
                        familiarity === fam ? 'bg-brutal-yellow shadow-brutal-sm scale-[1.01]' : 'bg-white hover:bg-gray-100'
                      }`}
                    >
                      {familiarity === fam ? '👉 ' : ''}{fam}
                    </button>
                  ))}
                </div>
              </div>

              {/* Q2: Primary Learning Goals (Multi-Select) */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="font-sans font-black uppercase text-sm block">
                    {t('2. Apa tujuan utama kamu belajar topik ini?', '2. What are your primary learning goals?')}
                  </label>
                  <span className="text-[11px] font-mono font-bold text-amber-700 bg-amber-100 px-2 py-0.5 border border-amber-400">
                    {t('Bisa Pilih Lebih Dari Satu', 'Multi-Select Available')}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableGoals.map((g) => {
                    const isSelected = goals.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => toggleGoal(g)}
                        className={`p-3 border-2 border-brutal-black font-bold text-xs text-left flex items-center justify-between transition-all ${
                          isSelected ? 'bg-brutal-blue text-white shadow-brutal-sm scale-[1.01]' : 'bg-white text-brutal-black hover:bg-gray-100'
                        }`}
                      >
                        <span>{g}</span>
                        {isSelected ? (
                          <Checks weight="bold" className="w-5 h-5 shrink-0 text-white" />
                        ) : (
                          <span className="w-4 h-4 border-2 border-brutal-black bg-white inline-block shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Q3: Specific Focus / Sub-domains */}
              <div>
                <label className="font-sans font-black uppercase text-sm block mb-2">
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
                  className="w-full px-3 py-2 border-2 border-brutal-black font-mono text-sm bg-white focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-4 border-t-2 border-brutal-black flex justify-end gap-3 sticky bottom-0 bg-white p-2">
                <Button variant="secondary" size="sm" onClick={() => setShowGrillModal(false)}>
                  {t('Batal', 'Cancel')}
                </Button>
                <Button variant="primary" size="md" onClick={handleGenerate} className="font-black uppercase">
                  <CheckCircle weight="bold" className="w-5 h-5 mr-1" />
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
