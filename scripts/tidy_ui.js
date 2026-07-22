const fs = require('fs');

// 1. layout.tsx
const layoutFile = '/home/hardana/Projects/vibework/src/app/engine/layout.tsx';
let layoutContent = fs.readFileSync(layoutFile, 'utf8');
layoutContent = layoutContent.replace(
  `className="w-64 h-full border-r-4 border-brutal-black bg-gray-100 flex flex-col shrink-0"`,
  `className="w-64 h-full border-r-4 border-brutal-black bg-brutal-white flex flex-col shrink-0"`
);
fs.writeFileSync(layoutFile, layoutContent);

// 2. InterviewChat.tsx
const chatFile = '/home/hardana/Projects/vibework/src/components/ui/InterviewChat.tsx';
let chatContent = fs.readFileSync(chatFile, 'utf8');

const oldSidebar = `<div className="hidden md:flex flex-col w-72 shrink-0 gap-2 overflow-y-auto overflow-x-hidden p-4 border-r-4 border-brutal-black bg-brutal-white">
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
      </div>`;

const newSidebar = `<div className="hidden md:flex flex-col w-72 shrink-0 overflow-y-auto overflow-x-hidden border-r-4 border-brutal-black bg-brutal-white">
        <h2 className="font-sans font-black text-2xl uppercase text-brutal-white px-6 py-5 bg-brutal-black tracking-widest shrink-0">
          The Grill
        </h2>
        <div className="flex flex-col w-full">
          {[1,2,3,4,5].map(p => (
            <button 
              key={p}
              onClick={() => setActivePhaseTab(p)}
              disabled={p > maxPhase}
              className={\`w-full text-left p-5 border-b-4 border-brutal-black font-mono font-bold transition-all \${
                activePhaseTab === p 
                  ? 'bg-brutal-blue text-brutal-white pl-8' 
                  : p > maxPhase 
                    ? 'bg-brutal-white/40 text-brutal-black/40 cursor-not-allowed'
                    : 'bg-brutal-white hover:bg-brutal-yellow'
              }\`}
            >
              <div className="text-xs opacity-70 mb-1">FASE {p}</div>
              <div className="text-sm leading-tight">{PHASE_TITLES[p-1]}</div>
            </button>
          ))}
        </div>
      </div>`;
chatContent = chatContent.replace(oldSidebar, newSidebar);


const oldInput = `<form onSubmit={handleFormSubmit} className="max-w-4xl mx-auto flex gap-4 relative">
              <Input 
                ref={inputRef}
                value={localInput} 
                onChange={(e) => setLocalInput(e.target.value)} 
                placeholder="Ketik ide aplikasi Anda di sini..." 
                className="flex-1 !py-4 !text-lg !rounded-full !pl-6 !pr-20"
                disabled={status !== 'idle'}
              />
              <Button 
                type="submit" 
                variant="primary" 
                className="!absolute right-2 top-2 bottom-2 !px-4 !rounded-full !border-2" 
                disabled={status !== 'idle' || !localInput.trim()}
              >
                <PaperPlaneRight weight="bold" className="w-6 h-6" />
              </Button>
            </form>`;

const newInput = `<form onSubmit={handleFormSubmit} className="max-w-4xl mx-auto flex gap-3">
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
            </form>`;
chatContent = chatContent.replace(oldInput, newInput);


const oldEmpty = `<p className="text-lg md:text-xl font-mono text-brutal-black opacity-80 max-w-2xl bg-brutal-yellow p-4 border-4 border-brutal-black shadow-brutal-sm">`;
const newEmpty = `<p className="text-lg md:text-xl font-mono text-brutal-black max-w-2xl bg-brutal-yellow p-6 border-4 border-brutal-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] leading-relaxed font-bold">`;
chatContent = chatContent.replace(oldEmpty, newEmpty);

fs.writeFileSync(chatFile, chatContent);
console.log("UI neatly refined.");
