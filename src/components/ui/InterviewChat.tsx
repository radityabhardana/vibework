'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { PaperPlaneRight, Lightning, Robot } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PhaseSidebar,
  MessageBubble,
  NamePromptModal,
  type Message,
} from '@/components/ui/ChatComponents';
import { assignMessagePhases, getMaxMessagePhase } from '@/lib/chat-phases';

type InterviewChatProps = {
  onInterviewComplete?: () => void;
  initialSessionId?: string;
  initialMessages?: Message[];
  initialProjectId?: string | null;
};

const PHASE_TITLES = [
  "Visi & Target Pengguna",
  "Fitur Inti (MVP)",
  "Alur Pengguna (User Flow)",
  "UI/UX & Desain",
  "Bisnis & Teknis"
];

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
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId);
  const [messages, setMessages] = useState<Message[]>(initialMessages || []);
  const [localInput, setLocalInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitted' | 'streaming' | 'generating'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    if (status !== 'generating') return;
    const interval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 95) return 95;
        const increment = Math.max(0.5, (95 - prev) * 0.05);
        return Math.min(95, prev + increment);
      });
    }, 500);
    return () => clearInterval(interval);
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
      throw new Error(await getApiError(response, 'Failed to save the message.'));
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
          throw new Error(await getApiError(res, 'Failed to create a chat session.'));
        }
        const data: unknown = await res.json();
        if (typeof data !== 'object' || data === null || !('id' in data) || typeof data.id !== 'string') {
          throw new Error('The chat session response was invalid.');
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
        throw new Error(await getApiError(response, 'Failed to connect to the AI service.'));
      }

      if (!response.body) throw new Error('The AI service returned no response stream.');

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
          throw new Error('The AI service interrupted the response.');
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

      if (!finalContent.trim()) throw new Error('The AI service returned an empty response.');

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
      setError(err instanceof Error ? err.message : 'Failed to connect to the AI service.');
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
        throw new Error(await getApiError(response, 'Failed to undo the message.'));
      }

      setMessages(prev => prev.slice(0, lastUserIdx));
      setShowCustomInput(false);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to undo the message.');
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

  const executeGenerateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }
    setShowNamePrompt(false);
    setGenerationProgress(0);
    setStatus('generating');
    setError(null);
    try {
      const res = await fetch('/api/projects/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, projectName: projectName.trim(), regenerate: true })
      });
      if (!res.ok) {
        throw new Error(await getApiError(res, 'Failed to generate workflow.'));
      }
      const data: unknown = await res.json();
      if (typeof data !== 'object' || data === null || !('projectId' in data) || typeof data.projectId !== 'string') {
        throw new Error('The workflow response was invalid.');
      }
      router.push('/projects/' + data.projectId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate workflow.');
      setStatus('idle');
    }
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
                    Fase {activePhaseTab}/5 {activePhaseTab < maxPhase ? '· Riwayat' : ''}
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
                    Generated
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-0.5 rounded-full font-mono text-[10px] font-semibold uppercase tracking-wider border border-white/10 bg-white/5 text-zinc-500">
                    Not generated
                  </span>
                )}
                {initialProjectId && (
                  <Link href={`/projects/${initialProjectId}`}>
                    <Button variant="secondary" size="sm" className="!px-3 !py-1 text-xs font-mono">
                      Open Flow &nearr;
                    </Button>
                  </Link>
                )}
                {isComplete ? (
                  <Button variant="primary" size="sm" onClick={initiateGenerateWorkflow} disabled={status !== 'idle'} className="text-xs font-sans">
                    {status === 'generating' ? `${Math.round(generationProgress)}% - Generating...` : initialProjectId ? 'Regenerate Flow' : 'Generate Flow'}
                  </Button>
                ) : hasUserResponse ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={initiateGenerateWorkflow}
                    disabled={status !== 'idle'}
                    className="gap-1.5 text-xs font-sans font-semibold"
                    title="Buat PRD & Flow sekarang (AI akan otomatis melengkapi sisa asumsi)"
                  >
                    <Lightning weight="fill" className="w-3.5 h-3.5" />
                    {status === 'generating' ? `${Math.round(generationProgress)}%...` : initialProjectId ? 'Regenerate Flow' : 'Express Generate'}
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
                  <span>Fase {p}</span>
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
                    <span>Interactive Architecture Interview</span>
                  </div>
                  <h1 className="text-3xl md:text-5xl font-extrabold font-sans tracking-[-0.03em] text-white leading-[1.08]">
                    Vibework Engine
                  </h1>
                  <p className="text-sm md:text-[15px] font-sans text-zinc-400 max-w-lg leading-relaxed border border-white/10 bg-white/[0.02] rounded-xl px-6 py-5">
                    System Architect siap untuk menginterogasi kebutuhan sistem Anda. Jelaskan aplikasi
                    yang ingin dibangun untuk merancang PRD dan node flowchart terperinci.
                  </p>
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                    <Robot weight="duotone" className="w-4 h-4 text-zinc-500" />
                    <span>5 fase wawancara · mulai dari baris pertama di bawah</span>
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
                    <h3 className="font-sans font-bold text-base text-white">Fase {activePhaseTab} Selesai</h3>
                    <p className="font-sans text-xs text-zinc-500 leading-relaxed">
                      Fase ini disimpan sebagai riwayat dan telah terkunci.
                    </p>
                    <div className="flex justify-center">
                      <Button variant="primary" size="sm" onClick={() => setActivePhaseTab(activePhaseTab + 1)}>
                        Lanjut Fase {activePhaseTab + 1} &rarr;
                      </Button>
                    </div>
                  </div>
                )}

                {status === 'submitted' && activePhaseTab === maxPhase && (
                  <div className="flex justify-start">
                    <div className="rounded-xl rounded-tl-sm border border-white/10 bg-[#0a0a0d] px-4 py-3 text-xs text-zinc-400 font-mono flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Architect sedang memproses tanggapan...</span>
                    </div>
                  </div>
                )}
                {error && (
                  <div className="flex justify-center">
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 font-mono text-xs text-rose-200">
                      Error: {error}
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
                <span>Sudah cukup dengan informasi yang tertera?</span>
              </div>
              <button
                type="button"
                onClick={initiateGenerateWorkflow}
                className="inline-flex items-center gap-1.5 font-sans font-semibold text-xs px-3 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 cursor-pointer transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <Lightning weight="bold" className="w-3.5 h-3.5" />
                Generate Sekarang (AI Lengkapi Sisanya)
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
                  placeholder={messages.length === 0 ? "Ketik ide aplikasi Anda di sini..." : "Ketik jawaban Anda (atau klik 'Generate Sekarang')..."}
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
