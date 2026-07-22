const fs = require('fs');
const file = '/home/hardana/Projects/vibework/src/components/ui/InterviewChat.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add activePhaseTab state
content = content.replace(
  `const [showCustomInput, setShowCustomInput] = useState(false);`,
  `const [showCustomInput, setShowCustomInput] = useState(false);

  const initialMaxPhase = React.useMemo(() => {
    let rp = 1;
    (initialMessages || []).forEach(m => {
      if (m.role === 'assistant') {
        const match = m.content.match(/\\[(?:FASE|PROGRESS):\\s*(\\d+)\\/(\\d+)\\]/i);
        if (match) rp = parseInt(match[1], 10);
      }
    });
    return Math.max(1, rp);
  }, [initialMessages]);

  const [activePhaseTab, setActivePhaseTab] = useState<number>(initialMaxPhase);`
);

// 2. Replace progress calculation and layout header
const layoutRegex = /const isComplete = messages\.some[\s\S]*?\{\/\* Main Content Area \*\/\}\n\s*<div ref=\{scrollRef\} className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6 bg-\[#f4f4f0\] relative">\n\s*\{messages\.length === 0 \? \(/;

const newLayout = `const isComplete = messages.some(m => m.role === 'assistant' && m.content.includes('REQUIREMENTS COMPLETE'));

  const messagesWithPhase = React.useMemo(() => {
    let runningPhase = 1;
    return messages.map(m => {
      let phaseToAssign = runningPhase;
      if (m.role === 'assistant') {
        const match = m.content.match(/\\[(?:FASE|PROGRESS):\\s*(\\d+)\\/(\\d+)\\]/i);
        if (match) {
          runningPhase = parseInt(match[1], 10);
          phaseToAssign = runningPhase;
        }
      }
      return { ...m, phase: phaseToAssign };
    });
  }, [messages]);

  // Fallback for old sessions without tags
  if (messagesWithPhase.length > 0 && Math.max(...messagesWithPhase.map(m => m.phase)) === 1) {
     let assistantCount = 0;
     messagesWithPhase.forEach(m => {
       if (m.role === 'assistant') assistantCount++;
       m.phase = Math.min(5, Math.max(1, assistantCount));
     });
  }

  const maxPhase = Math.max(1, ...messagesWithPhase.map(m => m.phase));
  const activeMessages = messagesWithPhase.filter(m => m.phase === activePhaseTab);

  const PHASE_TITLES = [
    "Visi & Target Pengguna",
    "Fitur Inti (MVP)",
    "Alur Pengguna (User Flow)",
    "UI/UX & Desain",
    "Bisnis & Teknis"
  ];

  return (
    <div className="flex h-full w-full max-w-6xl mx-auto bg-transparent gap-4 overflow-hidden">
      {/* Sidebar Tabs */}
      <div className="hidden md:flex flex-col w-64 shrink-0 gap-2 overflow-y-auto pb-4">
        <h2 className="font-sans font-black text-xl uppercase mb-2 text-brutal-black px-4 py-4 border-4 border-brutal-black bg-brutal-yellow shadow-brutal-sm">
          The Grill
        </h2>
        {[1,2,3,4,5].map(p => (
          <button 
            key={p}
            onClick={() => setActivePhaseTab(p)}
            disabled={p > maxPhase}
            className={\`w-full text-left p-4 border-4 border-brutal-black font-mono font-bold transition-all \${
              activePhaseTab === p 
                ? 'bg-brutal-blue text-brutal-white translate-x-1 shadow-brutal z-10' 
                : p > maxPhase 
                  ? 'bg-brutal-white/50 text-brutal-black/30 cursor-not-allowed border-dashed'
                  : 'bg-brutal-white hover:bg-brutal-yellow hover:-translate-y-1 hover:shadow-brutal'
            }\`}
          >
            <div className="text-xs opacity-70 mb-1">FASE {p}</div>
            <div className="text-sm leading-tight">{PHASE_TITLES[p-1]}</div>
          </button>
        ))}
      </div>

      {/* Main Chat Container */}
      <div className="flex-1 flex flex-col h-full bg-brutal-white border-4 border-brutal-black shadow-brutal overflow-hidden relative">
        
        {/* Header for Active Chat */}
        {messages.length > 0 && (
          <div className="flex flex-col shrink-0">
            <div className="bg-brutal-yellow border-b-4 border-brutal-black p-4 flex justify-between items-center">
              <h2 className="font-sans font-black text-lg md:text-xl uppercase">Fase {activePhaseTab}: {PHASE_TITLES[activePhaseTab-1]}</h2>
              {isComplete && onInterviewComplete && activePhaseTab === 5 && (
                <Button variant="primary" size="sm" onClick={onInterviewComplete} className="animate-pulse">
                  Generate Workflow
                </Button>
              )}
            </div>
            
            {/* Mobile Tab Scroller */}
            <div className="md:hidden bg-brutal-white border-b-4 border-brutal-black flex overflow-x-auto">
              {[1,2,3,4,5].map(p => (
                 <button 
                   key={p}
                   onClick={() => setActivePhaseTab(p)}
                   disabled={p > maxPhase}
                   className={\`shrink-0 px-4 py-3 border-r-4 border-brutal-black font-mono font-bold text-sm \${
                     activePhaseTab === p ? 'bg-brutal-blue text-brutal-white' : p > maxPhase ? 'opacity-30' : 'hover:bg-brutal-yellow'
                   }\`}
                 >
                   Fase {p}
                 </button>
              ))}
            </div>
          </div>
        )}

      {/* Main Content Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6 bg-[#f4f4f0] relative">
        {messages.length === 0 ? (`;
content = content.replace(layoutRegex, newLayout);

// 3. Update map loop target
content = content.replace(
  `{messages.map((m, idx) => {
              const isLast = idx === messages.length - 1;`,
  `{activeMessages.map((m, idx) => {
              const isLast = m.id === messages[messages.length - 1].id;`
);

// 4. Update lastUserIdx loop
content = content.replace(
  `for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'user') {`,
  `for (let i = activeMessages.length - 1; i >= 0; i--) {
            if (activeMessages[i].role === 'user') {`
);

// 5. Interstitial Card at bottom of loop
const loopBottom = `        })}
        {status === 'submitted' && (
          <div className="flex justify-start">
            <Card bg="white" className="!p-4">
              <span className="font-mono animate-pulse">Architect is typing...</span>
            </Card>
          </div>
        )}`;

const newLoopBottom = `        })}
        
        {/* Interstitial Phase Complete Card */}
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
        )}`;
content = content.replace(loopBottom, newLoopBottom);

// 6. Update Input form logic
const inputLogic = `{(() => {
        const lastMessage = messages[messages.length - 1];
        const hasOptions = lastMessage?.role === 'assistant' && /-\\s*\\[OPTION\\]/.test(lastMessage.content);
        const shouldShowInput = messages.length === 0 || !hasOptions || showCustomInput || status !== 'idle';
        
        if (!shouldShowInput) return null;`;

const newInputLogic = `{(() => {
        const lastMessage = activeMessages[activeMessages.length - 1];
        const isViewingHistory = activePhaseTab < maxPhase;
        
        let hasOptions = false;
        if (lastMessage?.role === 'assistant' && /-\\s*\\[OPTION\\]/.test(lastMessage.content)) {
          hasOptions = true;
        }

        let shouldShowInput = false;
        if (messages.length === 0) shouldShowInput = true;
        else if (isViewingHistory) shouldShowInput = showCustomInput;
        else shouldShowInput = !hasOptions || showCustomInput || status !== 'idle';
        
        if (!shouldShowInput) return null;`;
content = content.replace(inputLogic, newInputLogic);

fs.writeFileSync(file, content);
console.log("Refactor complete.");
