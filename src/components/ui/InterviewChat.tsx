'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { PaperPlaneRight } from '@phosphor-icons/react';
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
  const prevMaxPhaseRef = useRef(initialMaxPhase);

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
  useEffect(() => {
    if (activePhaseTab > maxPhase) {
      setActivePhaseTab(maxPhase);
    }
    if (maxPhase > prevMaxPhaseRef.current) {
      if (activePhaseTab === prevMaxPhaseRef.current) {
        setActivePhaseTab(maxPhase);
      }
    }
    prevMaxPhaseRef.current = maxPhase;
  }, [maxPhase, activePhaseTab]);

  const hasPhase5UserResponse = messagesWithPhase.some(m => m.role === 'user' && m.phase === 5);
  const canForceComplete = maxPhase === 5 && hasPhase5UserResponse;

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

      <div className="flex-1 flex flex-col h-full bg-brutal-white overflow-hidden relative">

        {messages.length > 0 && (
          <div className="flex flex-col shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-brutal-black bg-brutal-yellow p-3 md:p-4">
              <h2 className="min-w-0 flex-1 font-sans text-base font-black uppercase md:text-xl">Fase {activePhaseTab}: {PHASE_TITLES[activePhaseTab - 1]}</h2>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`border-2 border-brutal-black px-2 py-1 font-mono text-[10px] font-bold uppercase sm:text-xs ${
                  initialProjectId ? 'bg-brutal-blue text-brutal-white' : 'bg-brutal-white text-brutal-black'
                }`}>
                  {initialProjectId ? 'Generated' : 'Not generated'}
                </span>
                {initialProjectId && (
                  <Link href={`/projects/${initialProjectId}`}>
                    <Button variant="secondary" size="sm" className="!border-2 !px-3 !py-1.5 !shadow-[3px_3px_0px_0px_rgba(5,5,5,1)]">
                      Open Flow &nearr;
                    </Button>
                  </Link>
                )}
                {isComplete ? (
                  <Button variant="primary" size="sm" onClick={initiateGenerateWorkflow} disabled={status !== 'idle'} className={status === 'generating' ? '!border-2 !px-3 !py-1.5' : 'animate-pulse !border-2 !px-3 !py-1.5'}>
                    {status === 'generating' ? `${Math.round(generationProgress)}% - Generating...` : initialProjectId ? 'Regenerate Flow' : 'Generate Flow'}
                  </Button>
                ) : canForceComplete ? (
                  <Button variant="secondary" size="sm" onClick={initiateGenerateWorkflow} disabled={status !== 'idle'} className="!border-2 !px-3 !py-1.5" title="Selesaikan wawancara & buat alur kerja">
                    {status === 'generating' ? `${Math.round(generationProgress)}% - Generating...` : initialProjectId ? 'Regenerate Flow' : 'Selesai & Generate'}
                  </Button>
                ) : null}
              </div>
            </div>

            {status === 'generating' && (
              <div className="w-full h-6 bg-brutal-white border-b-4 border-brutal-black relative overflow-hidden flex items-center">
                <div
                  className="absolute top-0 left-0 h-full bg-brutal-blue transition-all duration-500 ease-out border-r-4 border-brutal-black"
                  style={{ width: `${generationProgress}%` }}
                />
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#000_10px,#000_20px)]" />
              </div>
            )}

            <div className="md:hidden bg-brutal-white border-b-4 border-brutal-black flex overflow-x-auto">
              {[1, 2, 3, 4, 5].map(p => (
                <button
                  key={p}
                  onClick={() => setActivePhaseTab(p)}
                  disabled={p > maxPhase}
                  className={`shrink-0 px-4 py-3 border-r-4 border-brutal-black font-mono font-bold text-sm ${
                    activePhaseTab === p ? 'bg-brutal-blue text-brutal-white' : p > maxPhase ? 'opacity-30' : 'hover:bg-brutal-yellow'
                  }`}
                >
                  Fase {p}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6 bg-[#f4f4f0] relative">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4 animate-in fade-in duration-1000">
              <h1 className="text-4xl md:text-6xl font-black font-sans uppercase mb-6 tracking-tighter text-brutal-black">
                Vibework Engine
              </h1>
              <p className="text-lg md:text-xl font-mono text-brutal-black max-w-2xl bg-brutal-yellow p-6 border-4 border-brutal-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] leading-relaxed font-bold">
                System Architect siap untuk menginterogasi Anda. Beritahu saya aplikasi apa yang ingin Anda bangun, dan kita akan merancang PRD yang sempurna bersama.
              </p>
              {error && (
                <Card bg="white" className="!p-4 mt-8 border-brutal-red text-brutal-red font-bold uppercase">
                  Error: {error}
                </Card>
              )}
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
                <div className="mt-8 mb-4 border-4 border-brutal-black bg-brutal-yellow p-6 shadow-[8px_8px_0px_rgba(0,0,0,1)] rotate-[-1deg] animate-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto w-full flex flex-col gap-4 text-center">
                  <h3 className="font-sans font-black text-2xl uppercase">Fase {activePhaseTab} Selesai!</h3>
                  <p className="font-mono text-sm font-bold opacity-80">Fase ini ditampilkan sebagai riwayat dan tidak dapat diubah dari sini.</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center mt-2">
                    <Button variant="primary" onClick={() => setActivePhaseTab(activePhaseTab + 1)}>
                      Lanjut Fase {activePhaseTab + 1} &rarr;
                    </Button>
                  </div>
                </div>
              )}

              {status === 'submitted' && activePhaseTab === maxPhase && (
                <div className="flex justify-start">
                  <Card bg="white" className="!p-4">
                    <span className="font-mono animate-pulse">Architect is typing...</span>
                  </Card>
                </div>
              )}
              {error && (
                <div className="flex justify-center mt-4">
                  <Card bg="white" className="!p-4 border-brutal-red text-brutal-red font-bold uppercase">
                    Error: {error}
                  </Card>
                </div>
              )}
            </>
          )}
        </div>

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
            <div className="p-4 md:p-6 bg-brutal-white border-t-4 border-brutal-black shrink-0 relative">
              <form onSubmit={handleFormSubmit} className="max-w-4xl mx-auto flex gap-3">
                <Input
                  ref={inputRef}
                  value={localInput}
                  onChange={(e) => setLocalInput(e.target.value)}
                  placeholder={messages.length === 0 ? "Ketik ide aplikasi Anda di sini..." : "Ketik jawaban Anda di sini..."}
                  className="flex-1 !py-6 !text-lg !rounded-none !border-4 !border-brutal-black !shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] !px-6 focus:!translate-y-1 focus:!translate-x-1 focus:!shadow-none transition-all"
                  disabled={status !== 'idle'}
                  maxLength={MAX_MESSAGE_LENGTH}
                />
                <Button
                  type="submit"
                  variant="primary"
                  className="!px-6 !rounded-none !border-4 !shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:!translate-y-1 hover:!translate-x-1 hover:!shadow-none transition-all"
                  disabled={status !== 'idle' || !localInput.trim()}
                >
                  <PaperPlaneRight weight="bold" className="w-8 h-8" />
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
