'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from '@/context/LanguageContext';

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brutal-black/70 backdrop-blur-sm p-4 md:p-8">
      <div className="bg-brutal-white border-4 border-brutal-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-brutal-yellow border-b-4 border-brutal-black p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-bold uppercase px-2 py-0.5 border border-brutal-black ${
                node.status === 'mastered' ? 'bg-green-400' : node.status === 'unlocked' ? 'bg-brutal-white' : 'bg-gray-300'
              }`}>
                {statusLabel}
              </span>
              <span className="text-xs font-mono uppercase opacity-70">{t('Kategori:', 'Category:')} {node.category}</span>
            </div>
            <h2 className="font-sans font-black text-2xl uppercase tracking-tight mt-1">{node.title}</h2>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex border-2 border-brutal-black bg-brutal-white p-1">
              <button
                onClick={() => setActiveTab('material')}
                className={`px-3 py-1 font-mono font-bold text-xs uppercase transition-colors ${
                  activeTab === 'material' ? 'bg-brutal-black text-white' : 'hover:bg-gray-200'
                }`}
              >
                📖 {t('Materi Pelajaran', 'Micro-Lesson')}
              </button>
              <button
                onClick={() => setActiveTab('quiz')}
                className={`px-3 py-1 font-mono font-bold text-xs uppercase transition-colors ${
                  activeTab === 'quiz' ? 'bg-brutal-black text-white' : 'hover:bg-gray-200'
                }`}
              >
                🧪 {t('Kuis Bertahap', 'Staged Quiz')} ({node.quizData?.length || 0})
              </button>
            </div>
            <Button variant="primary" size="sm" onClick={onClose} className="!bg-brutal-red text-white">
              {t('Tutup', 'Close')}
            </Button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto bg-[#f8f9fa] flex-1">
          {activeTab === 'material' && (
            <div className="prose prose-slate max-w-none font-mono text-sm leading-relaxed">
              <ReactMarkdown>{node.contentMarkdown}</ReactMarkdown>
            </div>
          )}

          {activeTab === 'quiz' && (
            <div className="flex flex-col gap-6 font-sans">
              {node.status === 'locked' ? (
                <div className="p-6 bg-red-100 border-4 border-brutal-black font-mono font-bold text-center">
                  🔒 {t('NODE INI MASIH TERKUNCI. Selesaikan node prasyarat terlebih dahulu untuk membuka kuis ini!', 'THIS NODE IS LOCKED. Complete prerequisite nodes first to unlock this quiz!')}
                </div>
              ) : (
                <>
                  {scoreResult && (
                    <div className={`p-4 border-4 border-brutal-black font-mono font-bold text-center ${
                      scoreResult.passed ? 'bg-green-300 text-black' : 'bg-brutal-red text-white'
                    }`}>
                      {scoreResult.passed
                        ? t(
                            `🎉 SELAMAT! Kamu lulus dengan nilai ${scoreResult.score}%! Node Berhasil Dikuasai & Node Selanjutnya Terbuka.`,
                            `🎉 CONGRATULATIONS! You passed with ${scoreResult.score}%! Node Mastered & Next Nodes Unlocked.`
                          )
                        : t(
                            `❌ SKOR: ${scoreResult.score}%. Kamu butuh minimal 70% untuk lulus. Pelajari kembali materi dan coba lagi!`,
                            `❌ SCORE: ${scoreResult.score}%. You need at least 70% to pass. Review the lesson and try again!`
                          )}
                    </div>
                  )}

                  {submitError && (
                    <div className="p-4 border-4 border-brutal-black bg-red-100 font-mono font-bold text-center">
                      {submitError} {t('Silakan coba lagi.', 'Please try again.')}
                    </div>
                  )}

                  {(node.quizData || []).map((q, qIdx) => (
                    <div key={q.id || qIdx} className="bg-brutal-white border-4 border-brutal-black p-5 shadow-brutal-sm">
                      <div className="font-mono font-bold text-sm text-gray-500 uppercase mb-1">
                        {t(`Pertanyaan ${qIdx + 1} dari ${node.quizData.length}`, `Question ${qIdx + 1} of ${node.quizData.length}`)}
                      </div>
                      <h4 className="font-sans font-bold text-base mb-4">{q.question}</h4>

                      <div className="flex flex-col gap-2">
                        {q.options.map((opt, oIdx) => {
                          const isSelected = selectedAnswers[qIdx] === oIdx;
                          const isCorrect = q.correctAnswerIndex === oIdx;

                          let optionStyle = 'bg-white hover:bg-gray-100';
                          if (submitted) {
                            if (isCorrect) optionStyle = 'bg-green-300 font-bold border-green-800';
                            else if (isSelected && !isCorrect) optionStyle = 'bg-red-200 line-through';
                          } else if (isSelected) {
                            optionStyle = 'bg-brutal-yellow font-bold';
                          }

                          return (
                            <button
                              key={oIdx}
                              onClick={() => handleOptionSelect(qIdx, oIdx)}
                              className={`w-full text-left p-3 border-2 border-brutal-black font-mono text-sm transition-all flex items-center gap-3 ${optionStyle}`}
                            >
                              <span className="w-6 h-6 border-2 border-brutal-black flex items-center justify-center font-bold text-xs bg-brutal-white shrink-0">
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>

                      {submitted && (
                        <div className="mt-4 p-3 bg-blue-50 border-2 border-brutal-black font-mono text-xs text-blue-950">
                          <strong>{t('Penjelasan:', 'Explanation:')}</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  ))}

                  {submitted && scoreResult && !scoreResult.passed && (
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => {
                        setSubmitted(false);
                        setScoreResult(null);
                        setSelectedAnswers({});
                      }}
                      className="mt-2 w-full font-black uppercase text-base"
                    >
                      {t('Coba Kuis Lagi', 'Retry Quiz')}
                    </Button>
                  )}

                  {!submitted && (
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleSubmitQuiz}
                      disabled={loading || !node.quizData?.length || Object.keys(selectedAnswers).length < node.quizData.length}
                      className="mt-2 w-full font-black uppercase text-base"
                    >
                      {loading ? t('Menevaluasi...', 'Evaluating...') : t('Kirim Jawaban Kuis', 'Submit Quiz Answers')}
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
