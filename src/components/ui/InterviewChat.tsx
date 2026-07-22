'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { PaperPlaneRight } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import {
  PhaseSidebar,
  MessageBubble,
  NamePromptModal,
  type Message,
} from '@/components/ui/ChatComponents';

type InterviewChatProps = {
  onInterviewComplete?: () => void;
  initialSessionId?: string;
  initialMessages?: Message[];
};

const PHASE_TITLES = [
  "Visi & Target Pengguna",
  "Fitur Inti (MVP)",
  "Alur Pengguna (User Flow)",
  "UI/UX & Desain",
  "Bisnis & Teknis"
];

export function InterviewChat({ initialSessionId, initialMessages }: InterviewChatProps) {
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
    let interval: NodeJS.Timeout;
    if (status === 'generating') {
      setGenerationProgress(0);
      interval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 95) return 95;
          const increment = Math.max(0.5, (95 - prev) * 0.05);
          return Math.min(95, prev + increment);
        });
      }, 500);
    } else {
      setGenerationProgress(0);
    }
    return () => clearInterval(interval);
  }, [status]);

  const initialMaxPhase = React.useMemo(() => {
    let rp = 1;
    (initialMessages || []).forEach(m => {
      if (m.role === 'assistant') {
        const match = m.content.match(/\[(?:FASE|PROGRESS):\s*(\d+)\/(\d+)\]/i);
        if (match) rp = parseInt(match[1], 10);
      }
    });
    return Math.max(1, rp);
  }, [initialMessages]);

  const [activePhaseTab, setActivePhaseTab] = useState<number>(initialMaxPhase);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    try {
      await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sId, role: msg.role, content: msg.content })
      });
    } catch (e) {
      console.error("Failed to sync message", e);
    }
  };

  const sendMessage = async (content: string) => {
    setShowCustomInput(false);
    const msgId = crypto.randomUUID();
    const userMessage: Message = { id: msgId, role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setStatus('submitted');
    setError(null);

    let currentSessionId = sessionId;
    try {
      if (!currentSessionId) {
        const res = await fetch('/api/chat/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: content })
        });
        const data = await res.json();
        currentSessionId = data.id;
        setSessionId(currentSessionId);
        window.history.replaceState(null, '', `/engine/${currentSessionId}`);
      }

      if (currentSessionId) {
        await syncMessage(currentSessionId, userMessage);
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      if (!response.body) throw new Error("No response body");

      setStatus('streaming');
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      const assistantId = crypto.randomUUID();
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      let done = false;
      let buffer = '';
      const state = { currentFinalContent: '' };

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') {
                done = true;
                break;
              }
              try {
                const data = JSON.parse(dataStr);
                const contentChunk = data.choices?.[0]?.delta?.content || '';

                if (contentChunk) {
                  state.currentFinalContent += contentChunk;
                  setMessages(prev => prev.map(m =>
                    m.id === assistantId ? { ...m, content: state.currentFinalContent } : m
                  ));
                }
              } catch (err) {
                console.warn('Failed to parse SSE data:', dataStr);
              }
            }
          }
        }
      }
      setStatus('idle');

      if (currentSessionId) {
        await syncMessage(currentSessionId, { id: assistantId, role: 'assistant', content: state.currentFinalContent });
      }

    } catch (err: any) {
      console.error('Chat stream error:', err);
      setError(err.message || 'Failed to connect to AI.');
      setStatus('idle');
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

    setMessages(prev => prev.slice(0, lastUserIdx));
    setShowCustomInput(false);
    setError(null);

    if (sessionId) {
      try {
        await fetch(`/api/chat/message?sessionId=${sessionId}`, {
          method: 'DELETE'
        });
      } catch (err) {
        console.error("Failed to undo in DB", err);
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isLoading = status === 'submitted' || status === 'streaming';
    if (!localInput.trim() || isLoading) return;

    sendMessage(localInput);
    setLocalInput('');
  };

  const isComplete = messages.some(m => m.role === 'assistant' && m.content.includes('REQUIREMENTS COMPLETE'));

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
    setStatus('generating');
    setError(null);
    try {
      const res = await fetch('/api/projects/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, projectName: projectName.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/projects/' + data.projectId);
      } else {
        setError(data.error || 'Failed to generate workflow');
        setStatus('idle');
      }
    } catch (e: any) {
      setError(e.message);
      setStatus('idle');
    }
  };

  const messagesWithPhase = React.useMemo(() => {
    let runningPhase = 1;
    return messages.map(m => {
      let phaseToAssign = runningPhase;
      if (m.role === 'assistant') {
        const match = m.content.match(/\[(?:FASE|PROGRESS):\s*(\d+)\/(\d+)\]/i);
        if (match) {
          runningPhase = parseInt(match[1], 10);
          phaseToAssign = runningPhase;
        }
      }
      return { ...m, phase: phaseToAssign };
    });
  }, [messages]);

  if (messagesWithPhase.length > 0 && Math.max(...messagesWithPhase.map(m => m.phase)) === 1) {
    let assistantCount = 0;
    messagesWithPhase.forEach(m => {
      if (m.role === 'assistant') assistantCount++;
      m.phase = Math.min(5, Math.max(1, assistantCount));
    });
  }

  const maxPhase = Math.max(1, ...messagesWithPhase.map(m => m.phase));
  const activeMessages = messagesWithPhase.filter(m => m.phase === activePhaseTab);

  const lastUserMessageInActive = [...activeMessages].reverse().find(m => m.role === 'user');

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
            <div className="bg-brutal-yellow border-b-4 border-brutal-black p-4 flex justify-between items-center">
              <h2 className="font-sans font-black text-lg md:text-xl uppercase">Fase {activePhaseTab}: {PHASE_TITLES[activePhaseTab - 1]}</h2>
              {isComplete && activePhaseTab === 5 && (
                <Button variant="primary" size="sm" onClick={initiateGenerateWorkflow} disabled={status === 'generating'} className={status === 'generating' ? '' : 'animate-pulse'}>
                  {status === 'generating' ? `${Math.round(generationProgress)}% - Generating PRD...` : 'Generate Workflow'}
                </Button>
              )}
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
                  isLastUserMessage={m.id === lastUserMessageInActive?.id}
                />
              ))}

              {activePhaseTab < maxPhase && (
                <div className="mt-8 mb-4 border-4 border-brutal-black bg-brutal-yellow p-6 shadow-[8px_8px_0px_rgba(0,0,0,1)] rotate-[-1deg] animate-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto w-full flex flex-col gap-4 text-center">
                  <h3 className="font-sans font-black text-2xl uppercase">Fase {activePhaseTab} Selesai!</h3>
                  <p className="font-mono text-sm font-bold opacity-80">Apakah ada ide atau catatan tambahan yang ingin Anda berikan untuk fase ini?</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center mt-2">
                    <Button variant="secondary" onClick={() => { setShowCustomInput(true); inputRef.current?.focus(); }}>
                      Tambahkan Ide
                    </Button>
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
          if (lastMessage?.role === 'assistant' && /-\s*\[OPTION\]/.test(lastMessage.content)) {
            hasOptions = true;
          }

          let shouldShowInput = false;
          if (messages.length === 0) shouldShowInput = true;
          else if (isViewingHistory) shouldShowInput = showCustomInput;
          else shouldShowInput = !hasOptions || showCustomInput || status !== 'idle';

          if (!shouldShowInput) return null;

          return (
            <div className="p-4 md:p-6 bg-brutal-white border-t-4 border-brutal-black shrink-0 relative">
              <form onSubmit={handleFormSubmit} className="max-w-4xl mx-auto flex gap-3">
                <Input
                  ref={inputRef}
                  value={localInput}
                  onChange={(e) => setLocalInput(e.target.value)}
                  placeholder="Ketik ide aplikasi Anda di sini..."
                  className="flex-1 !py-6 !text-lg !rounded-none !border-4 !border-brutal-black !shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] !px-6 focus:!translate-y-1 focus:!translate-x-1 focus:!shadow-none transition-all"
                  disabled={status !== 'idle'}
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

              {showNamePrompt && (
                <NamePromptModal
                  projectName={projectName}
                  onNameChange={setProjectName}
                  onSubmit={executeGenerateWorkflow}
                  onCancel={() => setShowNamePrompt(false)}
                />
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
