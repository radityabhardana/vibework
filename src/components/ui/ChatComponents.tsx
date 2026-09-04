'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ArrowUUpLeft } from '@phosphor-icons/react';
import ReactMarkdown from 'react-markdown';

export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export function extractMaxLimit(text: string): number | null {
  const lower = text.toLowerCase();
  // If the text explicitly mentions "atau lebih" or "minimal", don't treat "pilih 1" as an upper bound
  const hasOpenEnded = /(?:atau lebih|minimal|sekurang-kurangnya)/.test(lower);

  const match = lower.match(/(?:maksimal|maks|max|tepat|hingga|tidak lebih dari|tidak boleh lebih dari|maksimum)\s+(\d+|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh)/);
  let numStr = null;
  if (match) {
    numStr = match[1];
  } else if (!hasOpenEnded) {
    const match2 = lower.match(/pilih\s+(?:tepat\s+)?(\d+|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh)(?!\s+(?:atau\s+lebih|ke\s+atas))/);
    if (match2) {
      numStr = match2[1];
    }
  }

  if (numStr) {
    const map: Record<string, number> = {
      'satu': 1, 'dua': 2, 'tiga': 3, 'empat': 4, 'lima': 5,
      'enam': 6, 'tujuh': 7, 'delapan': 8, 'sembilan': 9, 'sepuluh': 10
    };
    const parsed = parseInt(numStr, 10);
    if (!isNaN(parsed)) return parsed;
    return map[numStr] || null;
  }

  return null;
}

export function PhaseSidebar({ activePhaseTab, maxPhase, onPhaseChange }: {
  activePhaseTab: number;
  maxPhase: number;
  onPhaseChange: (phase: number) => void;
}) {
  const PHASE_TITLES = [
    "Visi & Target Pengguna",
    "Fitur Inti (MVP)",
    "Alur Pengguna (User Flow)",
    "UI/UX & Desain",
    "Bisnis & Teknis"
  ];

  return (
    <div className="hidden md:flex flex-col w-72 shrink-0 overflow-y-auto overflow-x-hidden border-r-4 border-brutal-black bg-brutal-white">
      <h2 className="font-sans font-black text-2xl uppercase text-brutal-white px-6 py-5 bg-brutal-black tracking-widest shrink-0">
        Interview Flow
      </h2>
      <div className="flex flex-col w-full">
        {[1, 2, 3, 4, 5].map(p => (
          <button
            key={p}
            onClick={() => onPhaseChange(p)}
            disabled={p > maxPhase}
            className={`w-full text-left p-5 border-b-4 border-brutal-black font-mono font-bold transition-all ${
              activePhaseTab === p
                ? 'bg-brutal-blue text-brutal-white pl-8'
                : p > maxPhase
                  ? 'bg-brutal-white/40 text-brutal-black/40 cursor-not-allowed'
                  : 'bg-brutal-white hover:bg-brutal-yellow'
            }`}
          >
            <div className="text-xs opacity-70 mb-1">FASE {p}</div>
            <div className="text-sm leading-tight">{PHASE_TITLES[p - 1]}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function MessageOptions({
  options,
  isMultiSelect,
  maxSelections,
  onSend,
  disabled,
  hideCustom,
  onCustom
}: {
  options: string[];
  isMultiSelect: boolean;
  maxSelections: number | null;
  onSend: (val: string) => void;
  disabled: boolean;
  hideCustom: boolean;
  onCustom: () => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const toggleSelect = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) {
      next.delete(i);
    } else {
      if (maxSelections !== null && next.size >= maxSelections) {
        return;
      }
      next.add(i);
    }
    setSelected(next);
  };

  const handleSend = () => {
    if (selected.size === 0) return;
    const vals = Array.from(selected).sort().map(i => options[i]);
    onSend(vals.join(', '));
  };

  if (!isMultiSelect) {
    return (
      <div className="flex flex-col gap-2 mt-6 border-t-2 border-brutal-black/10 pt-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-xs font-bold uppercase bg-brutal-yellow border-2 border-brutal-black px-2 py-1">
            PILIH TEPAT 1
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {options.map((opt, i) => (
            <button
              type="button"
              key={i}
              className="text-left w-full h-full p-4 border-4 border-brutal-black bg-brutal-white hover:bg-brutal-yellow hover:-translate-y-1 hover:shadow-brutal transition-all disabled:opacity-50 disabled:pointer-events-none group"
              onClick={() => onSend(opt)}
              disabled={disabled}
            >
              <div className="flex items-start gap-3">
                <span className="font-sans font-black text-brutal-white bg-brutal-black px-2 py-0.5 shrink-0 h-fit text-sm">
                  {i + 1}
                </span>
                <span className="font-mono text-sm md:text-base font-bold leading-tight mt-0.5">
                  {opt}
                </span>
              </div>
            </button>
          ))}
          {!hideCustom && (
            <button
              type="button"
              className="text-left w-full h-full p-4 border-4 border-brutal-black bg-brutal-white hover:bg-brutal-yellow hover:-translate-y-1 hover:shadow-brutal transition-all disabled:opacity-50 disabled:pointer-events-none"
              onClick={onCustom}
              disabled={disabled}
            >
              <div className="flex items-start gap-3">
                <span className="font-sans font-black text-brutal-white bg-brutal-black px-2 py-0.5 shrink-0 h-fit text-sm">
                  *
                </span>
                <span className="font-mono text-sm md:text-base font-bold leading-tight mt-0.5">
                  Lainnya (Custom)...
                </span>
              </div>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 border-t-2 border-brutal-black/10 pt-4 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-bold uppercase bg-brutal-yellow border-2 border-brutal-black px-2 py-1">
          {maxSelections ? `PILIH MAKSIMAL ${maxSelections}` : 'PILIH 1 ATAU LEBIH'}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {options.map((opt, i) => {
          const isSelected = selected.has(i);
          return (
            <button
              type="button"
              key={i}
              className={`text-left w-full h-full p-4 border-4 border-brutal-black transition-all disabled:opacity-50 disabled:pointer-events-none ${isSelected ? 'bg-brutal-blue text-brutal-white shadow-brutal translate-x-1 -translate-y-1' : 'bg-brutal-white hover:bg-brutal-yellow'}`}
              onClick={() => toggleSelect(i)}
              disabled={disabled}
            >
              <div className="flex items-start gap-3">
                <span className={`font-sans font-black px-2 py-0.5 shrink-0 h-fit text-sm ${isSelected ? 'bg-brutal-white text-brutal-blue' : 'bg-brutal-black text-brutal-white'}`}>
                  {i + 1}
                </span>
                <span className="font-mono text-sm md:text-base font-bold leading-tight mt-0.5">
                  {opt}
                </span>
              </div>
            </button>
          );
        })}
        {!hideCustom && (
          <button
            type="button"
            className="text-left w-full h-full p-4 border-4 border-brutal-black bg-brutal-white hover:bg-brutal-yellow transition-all disabled:opacity-50 disabled:pointer-events-none"
            onClick={onCustom}
            disabled={disabled}
          >
            <div className="flex items-start gap-3">
              <span className="font-sans font-black text-brutal-white bg-brutal-black px-2 py-0.5 shrink-0 h-fit text-sm">
                *
              </span>
              <span className="font-mono text-sm md:text-base font-bold leading-tight mt-0.5">
                Lainnya (Custom)...
              </span>
            </div>
          </button>
        )}
      </div>
      <Button
        type="button"
        variant="primary"
        disabled={disabled || selected.size === 0}
        onClick={handleSend}
        className="self-end"
      >
        Kirim Pilihan ({selected.size})
      </Button>
    </div>
  );
}

export function MessageBubble({ message, status, onSend, onUndo, showCustomInput, onShowCustom, isActionable, canUndo }: {
  message: Message;
  status: string;
  onSend: (val: string) => void;
  onUndo: () => void;
  showCustomInput: boolean;
  onShowCustom: () => void;
  isActionable: boolean;
  canUndo: boolean;
}) {
  let cleanText = message.content;
  cleanText = cleanText.replace(/\[(?:FASE|PROGRESS):\s*\d+\/\d+\]/gi, '').trim();

  const options: string[] = [];

  if (message.role === 'assistant') {
    const optionRegex = /-\s*\[OPTION\]\s*(.+)/g;
    let match;
    while ((match = optionRegex.exec(message.content)) !== null) {
      options.push(match[1].trim());
    }
    cleanText = cleanText.replace(/-\s*\[OPTION\]\s*.+/g, '').trim();
  }

  const detectedMax = extractMaxLimit(cleanText);
  const isMultiSelect = /\[MULTI_SELECT\]/i.test(cleanText) || cleanText.toLowerCase().includes('atau lebih') || (detectedMax !== null && detectedMax > 1);

  if (/\[MULTI_SELECT\]/i.test(cleanText)) {
    cleanText = cleanText.replace(/\[MULTI_SELECT\]/gi, '').trim();
  }

  return (
    <div className={`flex flex-col gap-1 ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
      <Card
        bg={message.role === 'user' ? 'blue' : 'white'}
        className={`max-w-[80%] !p-4 ${message.role === 'user' ? 'rounded-tl-2xl' : 'rounded-tr-2xl'}`}
      >
        <span className="font-sans font-black text-xs uppercase opacity-70 block mb-2">
          {message.role === 'user' ? 'You' : 'Architect'}
        </span>
        <div className="flex flex-col gap-4">
          <div className={`font-mono leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-strong:font-black ${
            message.role === 'user'
              ? 'text-brutal-white prose-p:text-brutal-white prose-headings:text-brutal-white prose-strong:text-brutal-white'
              : 'text-brutal-black prose-p:text-brutal-black prose-headings:text-brutal-black prose-strong:text-brutal-black'
          }`}>
            <ReactMarkdown>{cleanText}</ReactMarkdown>
          </div>

          {message.role === 'assistant' && options.length > 0 && isActionable && (
            <MessageOptions
              options={options}
              isMultiSelect={isMultiSelect}
              maxSelections={detectedMax}
              disabled={status !== 'idle'}
              hideCustom={showCustomInput}
              onSend={onSend}
              onCustom={onShowCustom}
            />
          )}
        </div>
      </Card>
      {message.role === 'user' && canUndo && status === 'idle' && (
        <button
          type="button"
          onClick={onUndo}
          className="group flex items-center gap-1.5 mt-1 mr-2 px-3 py-1 border-2 border-brutal-black bg-brutal-white hover:bg-brutal-yellow hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all text-xs font-mono font-bold text-brutal-black cursor-pointer"
        >
          <ArrowUUpLeft weight="bold" className="w-3.5 h-3.5" />
          <span>Tarik Jawaban</span>
        </button>
      )}
    </div>
  );
}

export function NamePromptModal({ projectName, onNameChange, onSubmit, onCancel }: {
  projectName: string;
  onNameChange: (name: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brutal-black/70 backdrop-blur-sm p-4">
      <form onSubmit={onSubmit} className="bg-brutal-yellow border-4 border-brutal-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 max-w-md w-full flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
        <div>
          <h3 className="font-sans font-black text-2xl uppercase mb-2">Beri Nama Project</h3>
          <p className="font-mono text-sm opacity-80">Masukkan nama untuk project ini sebelum membuat PRD dan Workflow.</p>
        </div>
        <Input
          autoFocus
          value={projectName}
          onChange={e => onNameChange(e.target.value)}
          placeholder="Contoh: Aplikasi Kasir Super"
          className="!bg-brutal-white"
        />
        <div className="flex gap-4 justify-end mt-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Batal
          </Button>
          <Button type="submit" variant="primary">
            Lanjut Generate &rarr;
          </Button>
        </div>
      </form>
    </div>
  );
}
