'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from '@/context/LanguageContext';
import {
  BookOpen,
  Flask,
  X,
  CheckCircle,
  WarningCircle,
  ArrowClockwise,
  LockSimple,
  CircleNotch,
} from '@phosphor-icons/react';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

interface LearningNodeData {
  dbNodeId: string;
  nodeId: string;
  title: string;
  description: string;
  category: string;
  status: 'locked' | 'unlocked' | 'mastered';
  contentMarkdown: string;
  quizData: QuizQuestion[];
}

export function LearningDrawer({
  node,
  roadmapId,
  onClose,
  onQuizCompleted,
}: {
  node: LearningNodeData;
  roadmapId: string;
  onClose: () => void;
  onQuizCompleted: () => void;
}) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'material' | 'quiz'>('material');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [scoreResult, setScoreResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleOptionSelect = (qIdx: number, oIdx: number) => {
    if (submitted) return;
    setSelectedAnswers(prev => ({ ...prev, [qIdx]: oIdx }));
  };

  const handleSubmitQuiz = async () => {
    if (Object.keys(selectedAnswers).length < (node.quizData || []).length) {
      alert(t('Harap jawab semua pertanyaan sebelum mengirim!', 'Please answer all questions before submitting!'));
      return;
    }

    setLoading(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/learn/${roadmapId}/submit-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dbNodeId: node.dbNodeId,
          answers: selectedAnswers,
        }),
      });

      const data = await res.json().catch(() => ({})) as { error?: string; passed?: boolean; score?: number };
      if (!res.ok) {
        throw new Error(data.error || t('Gagal mengirim jawaban kuis', 'Failed to submit quiz'));
      }
      if (typeof data.passed !== 'boolean' || typeof data.score !== 'number') {
        throw new Error(t('Respons penilaian tidak valid', 'Invalid grading response'));
      }

      setSubmitted(true);
      setScoreResult({ score: data.score, passed: data.passed });

      if (data.passed) {
        onQuizCompleted();
      }
    } catch (error: unknown) {
      setSubmitted(false);
      setSubmitError(error instanceof Error ? error.message : t('Gagal mengirim jawaban kuis', 'Failed to submit quiz'));
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = {
    mastered: t('DIKUASAI', 'MASTERED'),
    unlocked: t('TERBUKA', 'UNLOCKED'),
    locked: t('TERKUNCI', 'LOCKED'),
  }[node.status];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-8 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[90vh] bg-zinc-900/80 p-0.5 rounded-2xl ring-1 ring-white/10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="w-full h-full bg-[#08080b] rounded-[14px] flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className="border-b border-white/10 bg-[#0d0d12]/95 backdrop-blur-md px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-mono font-medium uppercase px-2.5 py-0.5 rounded-full border ${
                  node.status === 'mastered'
                    ? 'bg-white text-black border-white'
                    : node.status === 'unlocked'
                    ? 'bg-white/10 text-white border-white/20'
                    : 'bg-zinc-800/80 text-zinc-400 border-zinc-700/50'
                }`}>
                  {statusLabel}
                </span>
                <span className="text-[11px] font-mono uppercase text-zinc-500">
                  {t('Kategori:', 'Category:')} {node.category}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-semibold text-white tracking-tight truncate">
                {node.title}
              </h2>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end shrink-0">
              <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('material')}
                  aria-label={t('Buka materi pelajaran', 'Open lesson material')}
                  className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-colors flex items-center gap-1.5 ${
                    activeTab === 'material'
                      ? 'bg-white text-black shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <BookOpen weight="bold" className="w-3.5 h-3.5" />
                  {t('Materi Pelajaran', 'Micro-Lesson')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('quiz')}
                  aria-label={t('Buka kuis bertahap', 'Open staged quiz')}
                  className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-colors flex items-center gap-1.5 ${
                    activeTab === 'quiz'
                      ? 'bg-white text-black shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Flask weight="bold" className="w-3.5 h-3.5" />
                  {t('Kuis Bertahap', 'Staged Quiz')} ({node.quizData?.length || 0})
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label={t('Tutup dialog pembelajaran', 'Close learning dialog')}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                title={t('Tutup', 'Close')}
              >
                <X weight="bold" className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content Body */}
          <div className="p-6 md:p-8 overflow-y-auto bg-[#08080b] flex-1 text-zinc-200">
            {activeTab === 'material' && (
              <div className="prose prose-invert prose-zinc max-w-none text-sm font-sans leading-relaxed [&_h1]:text-white [&_h2]:text-white [&_h3]:text-zinc-200 [&_code]:text-zinc-200 [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-[#0d0d12] [&_pre]:border [&_pre]:border-white/10 [&_pre]:rounded-xl">
                <ReactMarkdown>{node.contentMarkdown}</ReactMarkdown>
              </div>
            )}

            {activeTab === 'quiz' && (
              <div className="flex flex-col gap-6">
                {node.status === 'locked' ? (
                  <div className="p-6 rounded-xl bg-white/[0.02] border border-white/15 text-zinc-300 flex items-center justify-center gap-3 text-center text-sm font-mono">
                    <LockSimple weight="bold" className="w-5 h-5 shrink-0 text-zinc-400" />
                    <span>
                      {t(
                        'NODE INI MASIH TERKUNCI. Selesaikan node prasyarat terlebih dahulu untuk membuka kuis ini!',
                        'THIS NODE IS LOCKED. Complete prerequisite nodes first to unlock this quiz!'
                      )}
                    </span>
                  </div>
                ) : (
                  <>
                    {scoreResult && (
                      <div className={`p-4 rounded-xl border font-mono text-sm text-center flex items-center justify-center gap-2 bg-transparent ${
                        scoreResult.passed
                          ? 'border-emerald-500/30 text-emerald-300'
                          : 'border-rose-500/30 text-rose-300'
                      }`}>
                        {scoreResult.passed ? (
                          <>
                            <CheckCircle weight="fill" className="w-5 h-5 text-emerald-400 shrink-0" />
                            <span>
                              {t(
                                `SELAMAT! Kamu lulus dengan nilai ${scoreResult.score}%. Node Berhasil Dikuasai & Node Selanjutnya Terbuka.`,
                                `CONGRATULATIONS! You passed with ${scoreResult.score}%. Node Mastered & Next Nodes Unlocked.`
                              )}
                            </span>
                          </>
                        ) : (
                          <>
                            <WarningCircle weight="fill" className="w-5 h-5 text-rose-400 shrink-0" />
                            <span>
                              {t(
                                `SKOR: ${scoreResult.score}%. Kamu butuh minimal 70% untuk lulus. Pelajari kembali materi dan coba lagi!`,
                                `SCORE: ${scoreResult.score}%. You need at least 70% to pass. Review the lesson and try again!`
                              )}
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    {submitError && (
                      <div className="p-4 rounded-xl border border-rose-500/30 bg-transparent font-mono text-xs text-rose-300 text-center">
                        {submitError} {t('Silakan coba lagi.', 'Please try again.')}
                      </div>
                    )}

                    {(node.quizData || []).map((q, qIdx) => (
                      <div key={q.id || qIdx} className="bg-[#0d0d12] border border-white/10 rounded-xl p-5 shadow-lg">
                        <div className="font-mono text-xs text-zinc-500 uppercase mb-1.5 tracking-wider">
                          {t(`Pertanyaan ${qIdx + 1} dari ${node.quizData.length}`, `Question ${qIdx + 1} of ${node.quizData.length}`)}
                        </div>
                        <h4 className="text-base font-semibold text-white mb-4 leading-snug">
                          {q.question}
                        </h4>

                        <div className="flex flex-col gap-2">
                          {q.options.map((opt, oIdx) => {
                            const isSelected = selectedAnswers[qIdx] === oIdx;
                            const isCorrect = q.correctAnswerIndex === oIdx;

                            let optionStyle = 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-white/25 text-zinc-300';
                            if (submitted) {
                              if (isCorrect) optionStyle = 'bg-transparent border-emerald-500/40 text-emerald-200 font-medium';
                              else if (isSelected && !isCorrect) optionStyle = 'bg-transparent border-rose-500/40 text-rose-300 line-through';
                            } else if (isSelected) {
                              optionStyle = 'bg-white/[0.08] border-white/40 text-white font-medium ring-1 ring-white/20';
                            }

                            return (
                              <button
                                key={oIdx}
                                type="button"
                                onClick={() => handleOptionSelect(qIdx, oIdx)}
                                className={`w-full text-left p-3.5 rounded-xl border text-sm transition-all flex items-center gap-3 ${optionStyle}`}
                              >
                                <span className="w-6 h-6 rounded-md border border-white/10 flex items-center justify-center font-mono text-xs font-semibold bg-white/5 text-zinc-400 shrink-0">
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <span className="leading-relaxed">{opt}</span>
                              </button>
                            );
                          })}
                        </div>

                        {submitted && (
                          <div className="mt-4 p-3.5 rounded-lg bg-white/[0.03] border border-white/10 font-mono text-xs text-zinc-300 leading-relaxed">
                            <strong className="text-white">{t('Penjelasan:', 'Explanation:')}</strong> {q.explanation}
                          </div>
                        )}
                      </div>
                    ))}

                    {submitted && scoreResult && !scoreResult.passed && (
                      <button
                        onClick={() => {
                          setSubmitted(false);
                          setScoreResult(null);
                          setSelectedAnswers({});
                        }}
                        className="mt-2 w-full py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-colors shadow-lg flex items-center justify-center gap-2"
                      >
                        <ArrowClockwise weight="bold" className="w-4 h-4" />
                        {t('Coba Kuis Lagi', 'Retry Quiz')}
                      </button>
                    )}

                    {!submitted && (
                      <button
                        onClick={handleSubmitQuiz}
                        disabled={loading || !node.quizData?.length || Object.keys(selectedAnswers).length < node.quizData.length}
                        className="mt-2 w-full py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2"
                      >
                        {loading && <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />}
                        {loading ? t('Menevaluasi...', 'Evaluating...') : t('Kirim Jawaban Kuis', 'Submit Quiz Answers')}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
