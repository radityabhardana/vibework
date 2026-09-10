'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { PaperPlaneRight, Lightning, Robot, CheckCircle, CircleNotch, WarningCircle } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PhaseSidebar,
  MessageBubble,
  NamePromptModal,
  type Message,
} from '@/components/ui/ChatComponents';
import { assignMessagePhases, getMaxMessagePhase } from '@/lib/chat-phases';
import { useLanguage } from '@/context/LanguageContext';

type InterviewChatProps = {
  onInterviewComplete?: () => void;
  initialSessionId?: string;
  initialMessages?: Message[];
  initialProjectId?: string | null;
};

const MAX_MESSAGE_LENGTH = 20_000;

async function getApiError(response: Response, fallback: string) {
  try {
    const data: unknown = await response.json();
    if (
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof data.error === 'string'
    ) {
      return data.error;
    }
  } catch {
    // The fallback is intentionally used for non-JSON and malformed error responses.
  }
  return fallback;
}

export function InterviewChat({ initialSessionId, initialMessages, initialProjectId }: InterviewChatProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const PHASE_TITLES = [
    t('Visi & Target Pengguna', 'Vision & Target Users'),
    t('Fitur Inti (MVP)', 'Core Features (MVP)'),
    t('Alur Pengguna (User Flow)', 'User Flow'),
    t('UI/UX & Desain', 'UI/UX & Design'),
    t('Bisnis & Teknis', 'Business & Technical'),
  ];
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId);
  const [messages, setMessages] = useState<Message[]>(initialMessages || []);
  const [localInput, setLocalInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitted' | 'streaming' | 'generating'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState('init');
  const [generationStepLabel, setGenerationStepLabel] = useState(t('Menghubungkan ke System Architect...', 'Connecting to System Architect...'));
  const [generationElapsedSec, setGenerationElapsedSec] = useState(0);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [projectName, setProjectName] = useState('');

  // Live elapsed seconds counter during architecture generation
  useEffect(() => {
    if (status !== 'generating') {
      setGenerationElapsedSec(0);
      return;
    }
    const timer = setInterval(() => {
      setGenerationElapsedSec(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [status]);

  const initialMaxPhase = React.useMemo(() => {
    return getMaxMessagePhase(initialMessages || []);
  }, [initialMessages]);

  const [activePhaseTab, setActivePhaseTab] = useState<number>(initialMaxPhase);
  const [prevMaxPhase, setPrevMaxPhase] = useState<number>(initialMaxPhase);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestInFlightRef = useRef(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, status, showCustomInput]);

  useEffect(() => {
    if (showCustomInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showCustomInput]);

  const syncMessage = async (sId: string, msg: Message) => {
    if (msg.id === 'welcome') return;
    const response = await fetch('/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: msg.id, sessionId: sId, role: msg.role, content: msg.content })
    });
    if (!response.ok) {
      throw new Error(await getApiError(response, t('Gagal menyimpan pesan.', 'Failed to save the message.')));
    }
  };

  const sendMessage = async (content: string) => {
    const normalizedContent = content.trim();
    if (
      !normalizedContent ||
      normalizedContent.length > MAX_MESSAGE_LENGTH ||
      status !== 'idle' ||
      requestInFlightRef.current
    ) return;

    requestInFlightRef.current = true;
    setShowCustomInput(false);
    const msgId = crypto.randomUUID();
    const userMessage: Message = { id: msgId, role: 'user', content: normalizedContent };
    setMessages(prev => [...prev, userMessage]);
    setStatus('submitted');
    setError(null);

    let currentSessionId = sessionId;
    let userPersisted = false;
    let assistantId: string | null = null;
    let assistantPersisted = false;
    let createdSession = false;
    try {
      if (!currentSessionId) {
        const res = await fetch('/api/chat/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        if (!res.ok) {
          throw new Error(await getApiError(res, t('Gagal membuat sesi chat.', 'Failed to create a chat session.')));
        }
        const data: unknown = await res.json();
        if (typeof data !== 'object' || data === null || !('id' in data) || typeof data.id !== 'string') {
          throw new Error(t('Respons sesi chat tidak valid.', 'The chat session response was invalid.'));
        }
        currentSessionId = data.id;
        createdSession = true;
        setSessionId(currentSessionId);
        window.history.replaceState(null, '', `/engine/${currentSessionId}`);
      }

      if (currentSessionId) {
        await syncMessage(currentSessionId, userMessage);
        userPersisted = true;
      }

      const chatAbortController = new AbortController();
      const chatTimeout = setTimeout(() => chatAbortController.abort(), 35_000);

      let response: Response;
      try {
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, userMessage]
              .filter(message => message.role === 'user' || message.role === 'assistant')
              .map(({ role, content: messageContent }) => ({ role, content: messageContent }))
          }),
          signal: chatAbortController.signal
        });
      } finally {
        clearTimeout(chatTimeout);
      }

      if (!response.ok) {
        throw new Error(await getApiError(response, t('Gagal terhubung ke layanan AI.', 'Failed to connect to the AI service.')));
      }

      if (!response.body) throw new Error(t('Layanan AI tidak mengembalikan aliran respons.', 'The AI service returned no response stream.'));

      setStatus('streaming');
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      const generatedAssistantId = crypto.randomUUID();
      assistantId = generatedAssistantId;
      setMessages(prev => [...prev, { id: generatedAssistantId, role: 'assistant', content: '' }]);

      let buffer = '';
      let finalContent = '';
      let receivedDone = false;

      const processEvent = (event: string) => {
        const dataString = event
          .split(/\r?\n/)
          .filter(line => line.startsWith('data:'))
          .map(line => line.slice(5).replace(/^ /, ''))
          .join('\n')
          .trim();

        if (!dataString || receivedDone) return;
        if (dataString === '[DONE]') {
          receivedDone = true;
          return;
        }

        let data: unknown;
        try {
          data = JSON.parse(dataString);
        } catch {
          // Ignore non-JSON keep-alive or comment chunks
          return;
        }

        if (typeof data !== 'object' || data === null || 'error' in data) {
          throw new Error(t('Layanan AI menghentikan respons.', 'The AI service interrupted the response.'));
        }

        const choices = 'choices' in data ? data.choices : undefined;
        if (!Array.isArray(choices) || choices.length === 0) return;
        const firstChoice = choices[0];
        if (typeof firstChoice === 'object' && firstChoice !== null) {
          if ('finish_reason' in firstChoice && firstChoice.finish_reason === 'stop') {
            receivedDone = true;
          }
          const delta = 'delta' in firstChoice && typeof firstChoice.delta === 'object' && firstChoice.delta !== null
            ? firstChoice.delta
            : undefined;
          const contentChunk = typeof delta === 'object' && delta !== null && 'content' in delta && typeof delta.content === 'string'
            ? delta.content
            : '';

          if (contentChunk) {
            finalContent += contentChunk;
            setMessages(prev => prev.map(m =>
              m.id === generatedAssistantId ? { ...m, content: finalContent } : m
            ));
          }
        }
      };

      const processBufferedEvents = (flushFinalEvent = false) => {
        let boundary = buffer.match(/\r?\n\r?\n/);
        while (boundary?.index !== undefined) {
          processEvent(buffer.slice(0, boundary.index));
          buffer = buffer.slice(boundary.index + boundary[0].length);
          boundary = buffer.match(/\r?\n\r?\n/);
        }
        if (flushFinalEvent && buffer.trim()) {
          processEvent(buffer);
          buffer = '';
        }
      };

      while (true) {
        const { value, done: readerDone } = await reader.read();
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          processBufferedEvents();
        }
        if (readerDone) {
          buffer += decoder.decode();
          processBufferedEvents(true);
          break;
        }
        if (receivedDone) {
          break;
        }
      }

      try {
        await reader.cancel();
      } catch {
        // Stream already closed
      }

      if (!finalContent.trim()) throw new Error(t('Layanan AI mengembalikan respons kosong.', 'The AI service returned an empty response.'));

      if (currentSessionId) {
        await syncMessage(currentSessionId, { id: generatedAssistantId, role: 'assistant', content: finalContent });
        assistantPersisted = true;
      }
      setStatus('idle');
    } catch (err: unknown) {
      if (!userPersisted) {
        setMessages(prev => prev.filter(message => message.id !== userMessage.id));
      }
      if (assistantId && !assistantPersisted) {
        setMessages(prev => prev.filter(message => message.id !== assistantId));
      }
      setError(err instanceof Error ? err.message : t('Gagal terhubung ke layanan AI.', 'Failed to connect to the AI service.'));
      setStatus('idle');
    } finally {
      requestInFlightRef.current = false;
      if (createdSession) router.refresh();
    }
  };

  const handleUndo = async () => {
    if (status !== 'idle' || messages.length === 0) return;

    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIdx = i;
        break;
      }
    }

    if (lastUserIdx === -1) return;

    if (!sessionId || requestInFlightRef.current) return;

    requestInFlightRef.current = true;
    try {
      const response = await fetch('/api/chat/message', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userMessageId: messages[lastUserIdx].id
        })
      });
      if (!response.ok) {
        throw new Error(await getApiError(response, t('Gagal membatalkan pesan.', 'Failed to undo the message.')));
      }

      setMessages(prev => prev.slice(0, lastUserIdx));
      setShowCustomInput(false);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('Gagal membatalkan pesan.', 'Failed to undo the message.'));
    } finally {
      requestInFlightRef.current = false;
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isLoading = status === 'submitted' || status === 'streaming';
    if (!localInput.trim() || isLoading) return;

    sendMessage(localInput);
    setLocalInput('');
  };

  const isComplete = messages.some(
    m => m.role === 'assistant' && /(?:REQUIREMENTS?\s+COMPLETE|PERSYARATAN\s+LENGKAP)/i.test(m.content)
  );

  const initiateGenerateWorkflow = () => {
    if (!sessionId) return;
    if (!projectName.trim()) {
      const firstUserMsg = messages.find(m => m.role === 'user')?.content.trim() || '';
      if (firstUserMsg) {
        const words = firstUserMsg.split(/\s+/).slice(0, 4).join(' ');
        setProjectName(words.slice(0, 35));
      }
    }
    setShowNamePrompt(true);
  };

  const executeGenerateWorkflow = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const effectiveName = projectName.trim() || messages.find(m => m.role === 'user')?.content.trim().slice(0, 35) || t('Arsitektur Proyek', 'Project Architecture');
    if (!effectiveName) {
      setError(t('Nama proyek wajib diisi', 'Project name is required'));
      return;
    }
    setShowNamePrompt(false);
    setGenerationProgress(5);
    setGenerationStep('init');
    setGenerationStepLabel(t('Menghubungkan ke System Architect...', 'Connecting to System Architect...'));
    setStatus('generating');
    setError(null);

    try {
      const res = await fetch('/api/projects/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          sessionId,
          projectName: effectiveName,
          regenerate: true,
          stream: true
        })
      });

      if (!res.ok) {
        throw new Error(await getApiError(res, t('Gagal menghasilkan spesifikasi proyek.', 'Failed to generate the project specification.')));
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader();
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
            if (!trimmed || trimmed.startsWith(':')) {
              // Keep-alive heartbeat from server
              continue;
            }
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
                    setGenerationProgress(payload.percent);
                  }
                  if (typeof payload.step === 'string') {
                    setGenerationStep(payload.step);
                  }
                  if (typeof payload.message === 'string') {
                    setGenerationStepLabel(payload.message);
                  }
                } else if (currentEvent === 'complete') {
                  setGenerationProgress(100);
                  setGenerationStep('complete');
                  if (typeof payload.message === 'string') {
                    setGenerationStepLabel(payload.message);
                  }
                  if (typeof payload.projectId === 'string') {
                    targetProjectId = payload.projectId;
                  }
                } else if (currentEvent === 'error') {
                  throw new Error(typeof payload.error === 'string' ? payload.error : t('Gagal menghasilkan spesifikasi proyek.', 'Failed to generate the project specification.'));
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
          router.push('/projects/' + targetProjectId);
        } else {
          throw new Error(t('Generasi selesai namun project ID tidak ditemukan. Silakan periksa dashboard proyek Anda.', 'Generation finished but the project ID was not found. Check your project dashboard.'));
        }
      } else {
        // Fallback for standard non-streaming response
        const data: unknown = await res.json();
        if (typeof data !== 'object' || data === null || !('projectId' in data) || typeof data.projectId !== 'string') {
          throw new Error(t('Respons workflow tidak valid.', 'The workflow response was invalid.'));
        }
        setGenerationProgress(100);
        router.push('/projects/' + data.projectId);
      }
    } catch (e: unknown) {
      console.error('Failed to generate workflow:', e);
      setError(e instanceof Error ? e.message : t('Gagal menghasilkan workflow.', 'Failed to generate the workflow.'));
      setStatus('idle');
    }
  };

  const handleRetryGeneration = () => {
    executeGenerateWorkflow();
  };

  const messagesWithPhase = React.useMemo(() => {
    return assignMessagePhases(messages);
  }, [messages]);

  const maxPhase = Math.max(1, ...messagesWithPhase.map(m => m.phase));

  // Automatically advance to the new phase if the user was currently on the active phase,
  // and safely clamp activePhaseTab if maxPhase decreases (e.g. after undo)
  if (prevMaxPhase !== maxPhase) {
    setPrevMaxPhase(maxPhase);
    if (activePhaseTab > maxPhase || activePhaseTab === prevMaxPhase) {
      setActivePhaseTab(maxPhase);
    }
  }

  const hasUserResponse = messagesWithPhase.some(m => m.role === 'user');

  const activeMessages = messagesWithPhase.filter(m => m.phase === activePhaseTab);

  const latestMessage = messages[messages.length - 1];
  const latestUserMessage = [...messages].reverse().find(m => m.role === 'user');
  const actionableAssistantId = latestMessage?.role === 'assistant' ? latestMessage.id : null;
  const undoableUserId = latestUserMessage?.id;

  return (
    <div className="flex h-full w-full bg-transparent overflow-hidden">
      <PhaseSidebar
        activePhaseTab={activePhaseTab}
        maxPhase={maxPhase}
        onPhaseChange={setActivePhaseTab}
      />

      <div className="flex-1 flex flex-col h-full bg-[#050507] text-white overflow-hidden relative selection:bg-white selection:text-black">
        {/* ponytail: inline <style> instead of globals.css (out of scope) — move to globals if adopted site-wide */}
        <style>{`@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important;}}`}</style>

        {messages.length > 0 && (
          <div className="flex flex-col shrink-0">
            {/* Phase header — the [FASE: n/5] affordance */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#08080b]/90 backdrop-blur-md px-4 py-3 md:px-6">
              <div className="flex min-w-0 items-center gap-4">
                <span
                  aria-hidden
                  className="hidden sm:block font-mono text-3xl font-bold leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.35)] select-none"
                >
                  0{activePhaseTab}
                </span>
                <div className="min-w-0">
                  <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-500">
                    {t('Fase', 'Phase')} {activePhaseTab}/5 {activePhaseTab < maxPhase ? `· ${t('Riwayat', 'History')}` : ''}
                  </div>
                  <h2 className="truncate font-sans text-sm md:text-base font-bold text-white tracking-tight">
                    {PHASE_TITLES[activePhaseTab - 1]}
                  </h2>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {initialProjectId ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full font-mono text-[10px] font-semibold uppercase tracking-wider border border-white/15 bg-white/5 text-zinc-300">
                    <span aria-hidden className="size-1.5 rounded-full bg-emerald-400" />
                    {t('Generated', 'Generated')}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-0.5 rounded-full font-mono text-[10px] font-semibold uppercase tracking-wider border border-white/10 bg-white/5 text-zinc-500">
                    {t('Belum digenerate', 'Not generated')}
                  </span>
                )}
                {initialProjectId && (
                  <Link href={`/projects/${initialProjectId}`}>
                    <Button variant="secondary" size="sm" className="!px-3 !py-1 text-xs font-mono">
                      {t('Buka Flow', 'Open Flow')} &nearr;
                    </Button>
                  </Link>
                )}
                {isComplete ? (
                  <Button variant="primary" size="sm" onClick={initiateGenerateWorkflow} disabled={status !== 'idle'} className="text-xs font-sans">
                    {status === 'generating' ? `${Math.round(generationProgress)}% - ${t('Generating...', 'Generating...')}` : initialProjectId ? t('Regenerate Flow', 'Regenerate Flow') : t('Generate Flow', 'Generate Flow')}
                  </Button>
                ) : hasUserResponse ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={initiateGenerateWorkflow}
                    disabled={status !== 'idle'}
                    className="gap-1.5 text-xs font-sans font-semibold"
                    title={t('Buat PRD & Flow sekarang (AI akan otomatis melengkapi sisa asumsi)', 'Create the PRD & Flow now (AI will complete the remaining assumptions)')}
                  >
                    <Lightning weight="fill" className="w-3.5 h-3.5" />
                    {status === 'generating' ? `${Math.round(generationProgress)}%...` : initialProjectId ? t('Regenerate Flow', 'Regenerate Flow') : t('Generate Cepat', 'Express Generate')}
                  </Button>
                ) : null}
              </div>
            </div>

            {/* Phase progress ticks */}
            <div className="flex items-center border-b border-white/10 bg-[#08080b]/60 px-4 md:px-6" aria-hidden>
              {[1, 2, 3, 4, 5].map(p => (
                <div key={p} className="group/tick relative flex-1 py-2">
                  <div className={`h-1 rounded-full transition-colors duration-500 ${p < activePhaseTab ? 'bg-white/60' : p === activePhaseTab ? 'bg-white' : 'bg-white/10'}`} />
                  <span className={`mt-1.5 block font-mono text-[9px] tracking-wider ${p <= maxPhase ? 'text-zinc-500' : 'text-zinc-700'}`}>
                    0{p}
                  </span>
                </div>
              ))}
            </div>

            {status === 'generating' && (
              <div className="w-full h-1.5 bg-white/10 relative overflow-hidden flex items-center">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
            )}

            {/* Mobile phase strip */}
            <div className="md:hidden bg-[#08080b] border-b border-white/10 flex overflow-x-auto">
              {[1, 2, 3, 4, 5].map(p => (
                <button
                  key={p}
                  onClick={() => setActivePhaseTab(p)}
                  disabled={p > maxPhase}
                  className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 border-r border-white/10 font-mono text-xs font-semibold transition-colors ${
                    activePhaseTab === p ? 'bg-white text-black' : p > maxPhase ? 'opacity-30 text-zinc-600' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{t('Fase', 'Phase')} {p}</span>
                  {p < maxPhase && activePhaseTab !== p && (
                    <span className={`size-1 rounded-full ${p < activePhaseTab ? 'bg-white/60' : 'bg-white/30'}`} />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages column — centered, capped at max-w-3xl; composer + banners share this column */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:px-6 md:py-8 bg-[#030304] relative">
          <div className="mx-auto w-full max-w-3xl flex flex-col gap-6">
            {messages.length === 0 ? (
              /* Empty state — no session yet */
              <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                <div aria-hidden className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.05),transparent_70%)] pointer-events-none" />
                <div className="relative flex flex-col items-center gap-6 max-w-xl">
                  <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                    <span aria-hidden className="size-1.5 rounded-full bg-emerald-400" />
                    <span>{t('Wawancara Arsitektur Interaktif', 'Interactive Architecture Interview')}</span>
                  </div>
                  <h1 className="text-3xl md:text-5xl font-extrabold font-sans tracking-[-0.03em] text-white leading-[1.08]">
                    Vibework Engine
                  </h1>
                  <p className="text-sm md:text-[15px] font-sans text-zinc-400 max-w-lg leading-relaxed border border-white/10 bg-white/[0.02] rounded-xl px-6 py-5">
                    {t('System Architect siap untuk menggali kebutuhan sistem Anda. Jelaskan aplikasi yang ingin dibangun untuk merancang PRD dan node flowchart terperinci.', 'System Architect is ready to explore your system requirements. Describe the application you want to build to design a detailed PRD and flowchart node tree.')}
                  </p>
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                    <Robot weight="duotone" className="w-4 h-4 text-zinc-500" />
                    <span>{t('5 fase wawancara · mulai dari baris pertama di bawah', '5 interview phases · start with the first line below')}</span>
                  </div>
                  {error && (
                    <Card bg="red" className="!p-4 border-rose-500/30 text-rose-300 text-xs font-mono">
                      Error: {error}
                    </Card>
                  )}
                </div>
              </div>
            ) : (
              <>
                {activeMessages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    status={status}
                    onSend={sendMessage}
                    onUndo={handleUndo}
                    showCustomInput={showCustomInput}
                    onShowCustom={() => setShowCustomInput(true)}
                    isActionable={m.id === actionableAssistantId && activePhaseTab === maxPhase}
                    canUndo={m.id === undoableUserId}
                  />
                ))}

                {activePhaseTab < maxPhase && (
                  <div className="mt-2 mb-2 rounded-xl border border-white/10 bg-white/[0.02] px-6 py-6 max-w-md mx-auto w-full flex flex-col gap-3 text-center">
                    <span aria-hidden className="font-mono text-2xl font-bold leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.3)] select-none">
                      0{activePhaseTab}
                    </span>
                    <h3 className="font-sans font-bold text-base text-white">{t('Fase', 'Phase')} {activePhaseTab} {t('Selesai', 'Complete')}</h3>
                    <p className="font-sans text-xs text-zinc-500 leading-relaxed">
                      {t('Fase ini disimpan sebagai riwayat dan telah terkunci.', 'This phase is saved as history and has been locked.')}
                    </p>
                    <div className="flex justify-center">
                      <Button variant="primary" size="sm" onClick={() => setActivePhaseTab(activePhaseTab + 1)}>
                        {t('Lanjut Fase', 'Continue to Phase')} {activePhaseTab + 1} &rarr;
                      </Button>
                    </div>
                  </div>
                )}

                {status === 'submitted' && activePhaseTab === maxPhase && (
                  <div className="flex justify-start">
                    <div className="rounded-xl rounded-tl-sm border border-white/10 bg-[#0a0a0d] px-4 py-3 text-xs text-zinc-400 font-mono flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{t('Architect sedang memproses tanggapan...', 'The Architect is processing your response...')}</span>
                    </div>
                  </div>
                )}

                {/* Architect Generation Terminal (Live State) */}
                {status === 'generating' && (
                  <div className="my-2 w-full rounded-2xl border border-white/15 bg-gradient-to-b from-[#0c0c11] to-[#060608] p-5 sm:p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden text-white">
                    <div aria-hidden className="absolute -top-32 -right-32 w-72 h-72 bg-white/[0.04] rounded-full blur-3xl pointer-events-none" />
                    
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                      <div className="flex items-center gap-2.5 font-mono text-xs text-zinc-300">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                        </span>
                        <span className="font-bold tracking-wider uppercase text-white">{t('Architect Engine Aktif', 'Architect Engine Active')}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
                        <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1">
                          {Math.floor(generationElapsedSec / 60).toString().padStart(2, '0')}:{(generationElapsedSec % 60).toString().padStart(2, '0')} {t('berlalu', 'elapsed')}
                        </span>
                      </div>
                    </div>

                    {/* Main Title */}
                    <div className="mt-4 flex flex-col gap-1">
                      <h3 className="font-sans font-bold text-base sm:text-lg text-white">
                        {t('Merancang Arsitektur & Spesifikasi Sistem', 'Designing System Architecture & Specifications')}
                      </h3>
                      <p className="font-sans text-xs text-zinc-400">
                        {t('Target Proyek:', 'Project Target:')} <span className="font-mono text-zinc-200 font-semibold">{projectName || t('Arsitektur Proyek', 'Project Architecture')}</span>
                      </p>
                    </div>

                    {/* 4-Stage Stepper Grid */}
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-sans">
                      {/* Stage 1: PRD */}
                      <div className={`p-3 rounded-xl border transition-all ${
                        generationProgress >= 40 ? 'border-emerald-500/30 bg-emerald-500/5 text-zinc-300' :
                        generationStep === 'prd' || generationProgress < 40 ? 'border-white/30 bg-white/[0.06] text-white shadow-lg shadow-white/5' :
                        'border-white/5 bg-white/[0.02] text-zinc-500'
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">01 · PRD &amp; {t('Cakupan', 'Scope')}</span>
                          {generationProgress >= 40 ? (
                            <CheckCircle weight="fill" className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <CircleNotch weight="bold" className="w-4 h-4 text-white animate-spin shrink-0" />
                          )}
                        </div>
                        <div className="mt-1 font-semibold text-xs text-zinc-100">{t('Product Requirements Document', 'Product Requirements Document')}</div>
                        <div className="text-[11px] text-zinc-400">{t('Persona, cakupan MVP, & alur bisnis', 'Personas, MVP scope, & business flows')}</div>
                      </div>

                      {/* Stage 2: Database / Spec */}
                      <div className={`p-3 rounded-xl border transition-all ${
                        generationProgress >= 65 ? 'border-emerald-500/30 bg-emerald-500/5 text-zinc-300' :
                        generationStep === 'db' ? 'border-white/30 bg-white/[0.06] text-white shadow-lg shadow-white/5' :
                        'border-white/5 bg-white/[0.02] text-zinc-500'
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">02 · Database &amp; {t('Spesifikasi', 'Spec')}</span>
                          {generationProgress >= 65 ? (
                            <CheckCircle weight="fill" className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : generationStep === 'db' ? (
                            <CircleNotch weight="bold" className="w-4 h-4 text-white animate-spin shrink-0" />
                          ) : (
                            <span className="text-[10px] font-mono text-zinc-600">{t('Menunggu', 'Pending')}</span>
                          )}
                        </div>
                        <div className="mt-1 font-semibold text-xs text-zinc-100">{t('Penyimpanan Spesifikasi', 'Specification Storage')}</div>
                        <div className="text-[11px] text-zinc-400">{t('Persistensi skema & entitas relasional', 'Schema & relational entity persistence')}</div>
                      </div>

                      {/* Stage 3: Flowchart & ADR */}
                      <div className={`p-3 rounded-xl border transition-all ${
                        generationProgress >= 88 ? 'border-emerald-500/30 bg-emerald-500/5 text-zinc-300' :
                        generationStep === 'architecture' ? 'border-white/30 bg-white/[0.06] text-white shadow-lg shadow-white/5' :
                        'border-white/5 bg-white/[0.02] text-zinc-500'
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">03 · Flowchart &amp; {t('Tech Stack', 'Tech Stack')}</span>
                          {generationProgress >= 88 ? (
                            <CheckCircle weight="fill" className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : generationStep === 'architecture' ? (
                            <CircleNotch weight="bold" className="w-4 h-4 text-white animate-spin shrink-0" />
                          ) : (
                            <span className="text-[10px] font-mono text-zinc-600">{t('Menunggu', 'Pending')}</span>
                          )}
                        </div>
                        <div className="mt-1 font-semibold text-xs text-zinc-100">{t('Application Tree & ADR', 'Application Tree & ADR')}</div>
                        <div className="text-[11px] text-zinc-400">{t('Node alur pengguna & stack teknologi', 'User flow nodes & technology stack')}</div>
                      </div>

                      {/* Stage 4: AGENTS.md & Master Prompt */}
                      <div className={`p-3 rounded-xl border transition-all ${
                        generationProgress >= 100 ? 'border-emerald-500/30 bg-emerald-500/5 text-zinc-300' :
                        generationStep === 'agents' ? 'border-white/30 bg-white/[0.06] text-white shadow-lg shadow-white/5' :
                        'border-white/5 bg-white/[0.02] text-zinc-500'
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">04 · {t('AI Coding Agent', 'AI Coding Agent')}</span>
                          {generationProgress >= 100 ? (
                            <CheckCircle weight="fill" className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : generationStep === 'agents' ? (
                            <CircleNotch weight="bold" className="w-4 h-4 text-white animate-spin shrink-0" />
                          ) : (
                            <span className="text-[10px] font-mono text-zinc-600">{t('Menunggu', 'Pending')}</span>
                          )}
                        </div>
                        <div className="mt-1 font-semibold text-xs text-zinc-100">AGENTS.md &amp; Prompt.md</div>
                        <div className="text-[11px] text-zinc-400">{t('Guardrails dan instruksi coding agent', 'Coding agent guardrails and instructions')}</div>
                      </div>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="mt-5 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-zinc-300 truncate">{generationStepLabel}</span>
                        <span className="font-bold text-white shrink-0">{Math.round(generationProgress)}%</span>
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden relative">
                        <div
                          className="h-full bg-gradient-to-r from-zinc-300 via-white to-zinc-100 rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_rgba(255,255,255,0.7)]"
                          style={{ width: `${Math.max(5, generationProgress)}%` }}
                        />
                      </div>
                    </div>

                    {/* Dynamic tip */}
                    <div className="mt-3.5 flex items-center gap-2 font-mono text-[10px] text-zinc-400">
                      <Lightning weight="fill" className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>
                        {generationElapsedSec > 35
                          ? t('AI sedang memvalidasi relasi dependensi arsitektur dan aturan anti-halusinasi...', 'AI is validating architecture dependencies and anti-hallucination rules...')
                          : t('Setiap spesifikasi dirancang dan divalidasi langsung agar siap dipakai oleh AI coding agent.', 'Every specification is designed and validated live so it is ready for an AI coding agent.')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Error / Timeout Recovery Card */}
                {error && (
                  <div className="my-3 w-full rounded-2xl border border-rose-500/30 bg-gradient-to-b from-rose-950/20 to-black/40 p-5 sm:p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden text-white">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <div className="size-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                          <WarningCircle weight="bold" className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-sans font-bold text-sm sm:text-base text-rose-100">
                            {t('Generasi Arsitektur Memerlukan Waktu Lebih Lama', 'Architecture Generation Is Taking Longer')}
                          </h4>
                          <p className="font-sans text-xs text-zinc-300 mt-1 leading-relaxed">
                            {error.includes('timed out')
                              ? t('Layanan AI membutuhkan waktu lebih lama untuk menyelesaikan sintesis arsitektur. Data sesi dan transkrip Anda aman.', 'The AI service is taking longer to complete the architecture synthesis. Your session data and transcript are safe.')
                              : error}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-3 pt-3 border-t border-rose-500/20">
                        <Button
                          variant="primary"
                          onClick={handleRetryGeneration}
                          className="gap-2 bg-white text-black hover:bg-zinc-200 text-xs font-semibold shadow-md"
                        >
                          <Lightning weight="fill" className="w-3.5 h-3.5" />
                          <span>⚡ {t('Coba Lagi Sekarang', 'Try Again Now')}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setError(null)}
                          className="text-xs text-zinc-400 hover:text-white"
                        >
                          {t('Lanjut Edit Obrolan', 'Continue Editing Chat')}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {hasUserResponse && !isComplete && status === 'idle' && (
          <div className="shrink-0 bg-[#08080b] px-4 md:px-6 pb-2 pt-2">
            <div className="mx-auto w-full max-w-3xl p-3 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-sans text-xs text-zinc-300">
                <Lightning weight="fill" className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>{t('Sudah cukup dengan informasi yang tertera?', 'Is the information provided enough?')}</span>
              </div>
              <button
                type="button"
                onClick={initiateGenerateWorkflow}
                className="inline-flex items-center gap-1.5 font-sans font-semibold text-xs px-3 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 cursor-pointer transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <Lightning weight="bold" className="w-3.5 h-3.5" />
                {t('Generate Sekarang (AI Lengkapi Sisanya)', 'Generate Now (AI Completes the Rest)')}
              </button>
            </div>
          </div>
        )}

        {(() => {
          const lastMessage = activeMessages[activeMessages.length - 1];
          const isViewingHistory = activePhaseTab < maxPhase;

          let hasOptions = false;
          if (lastMessage?.role === 'assistant' && /(?:[-*•]|\d+\.)?\s*\[OPTION\]/i.test(lastMessage.content)) {
            hasOptions = true;
          }

          let shouldShowInput = false;
          if (messages.length === 0) shouldShowInput = true;
          else if (isViewingHistory) shouldShowInput = false;
          else shouldShowInput = !hasOptions || showCustomInput || status !== 'idle';

          if (!shouldShowInput) return null;

          return (
            <div className="px-4 pb-4 pt-2 md:px-6 bg-[#08080b] border-t border-white/10 shrink-0 relative">
              <form onSubmit={handleFormSubmit} className="mx-auto max-w-3xl flex gap-2 items-center">
                <Input
                  ref={inputRef}
                  value={localInput}
                  onChange={(e) => setLocalInput(e.target.value)}
                  placeholder={messages.length === 0 ? t('Ketik ide aplikasi Anda di sini...', 'Type your app idea here...') : t("Ketik jawaban Anda (atau klik 'Generate Sekarang')...", "Type your answer (or click 'Generate Now')...")}
                  className="flex-1 !rounded-xl !border-white/10 !bg-black/60 focus:!border-white/30 text-xs sm:text-sm text-white"
                  disabled={status !== 'idle'}
                  maxLength={MAX_MESSAGE_LENGTH}
                />
                <Button
                  type="submit"
                  variant="primary"
                  className="!rounded-xl !px-4"
                  disabled={status !== 'idle' || !localInput.trim()}
                >
                  <PaperPlaneRight weight="bold" className="w-4 h-4" />
                </Button>
              </form>
            </div>
          );
        })()}

        {showNamePrompt && (
          <NamePromptModal
            projectName={projectName}
            onNameChange={setProjectName}
            onSubmit={executeGenerateWorkflow}
            onCancel={() => setShowNamePrompt(false)}
          />
        )}
      </div>
    </div>
  );
}
