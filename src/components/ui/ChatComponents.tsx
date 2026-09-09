'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
    <div className="hidden md:flex flex-col w-64 shrink-0 overflow-y-auto overflow-x-hidden border-r border-white/10 bg-[#050507]">
      {/* Progress rail header */}
      <div className="shrink-0 border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-400">
            Interview Flow
          </span>
          <span aria-hidden className="h-px flex-1 bg-white/10" />
        </div>
        <div className="mt-3 flex items-center gap-1" aria-hidden>
          {[1, 2, 3, 4, 5].map(p => (
            <span
              key={p}
              className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                p <= maxPhase ? 'bg-white/80' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between font-mono text-[10px] tracking-wider text-zinc-500">
          <span>{maxPhase}/5 unlocked</span>
          <span className="text-zinc-600">FASE {activePhaseTab}</span>
        </div>
      </div>

      {/* Phase rows */}
      <div className="flex flex-col py-2">
        {[1, 2, 3, 4, 5].map(p => {
          const locked = p > maxPhase;
          const active = activePhaseTab === p;
          const done = p < maxPhase;
          return (
            <button
              key={p}
              onClick={() => onPhaseChange(p)}
              disabled={locked}
              aria-current={active ? 'step' : undefined}
              className={`group relative flex items-center gap-3 px-4 py-3 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:bg-white/[0.04] ${
                locked ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
              } ${active ? 'bg-white/[0.06]' : !locked ? 'hover:bg-white/[0.03]' : ''}`}
            >
              {active && (
                <span aria-hidden className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 bg-white" />
              )}
              <span
                aria-hidden
                className={`w-7 shrink-0 font-mono text-lg leading-none ${
                  active
                    ? 'font-bold text-white'
                    : 'text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.3)] group-hover:[-webkit-text-stroke:1px_rgba(255,255,255,0.55)]'
                }`}
              >
                0{p}
              </span>
              <span className="min-w-0">
                <span className={`block font-mono text-[9px] uppercase tracking-[0.2em] ${active ? 'text-zinc-300' : 'text-zinc-600'}`}>
                  {done ? 'Selesai' : locked ? 'Terkunci' : `FASE ${p}`}
                </span>
                <span className={`mt-0.5 block truncate font-sans text-sm leading-tight ${active ? 'font-semibold text-white' : 'text-zinc-400'}`}>
                  {PHASE_TITLES[p - 1]}
                </span>
              </span>
            </button>
          );
        })}
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
      <div className="flex flex-col gap-2 mt-4 border-t border-white/10 pt-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] rounded-full border border-white/15 bg-white/5 text-zinc-300 px-3 py-1">
            Pilih Tepat 1
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {options.map((opt, i) => (
            <button
              type="button"
              key={i}
              className="text-left w-full h-full p-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/30 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              onClick={() => onSend(opt)}
              disabled={disabled}
            >
              <div className="flex items-start gap-3">
                <span className="font-mono font-bold text-xs rounded-md bg-white/10 text-white w-6 h-6 flex items-center justify-center shrink-0 transition-colors duration-200 group-hover:bg-white group-hover:text-black">
                  {i + 1}
                </span>
                <span className="font-sans text-xs sm:text-sm text-zinc-200 group-hover:text-white leading-snug mt-0.5 transition-colors">
                  {opt}
                </span>
              </div>
            </button>
          ))}
          {!hideCustom && (
            <button
              type="button"
              className="text-left w-full h-full p-3 rounded-xl border border-dashed border-white/15 bg-white/[0.01] hover:bg-white/[0.05] hover:border-white/30 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              onClick={onCustom}
              disabled={disabled}
            >
              <div className="flex items-start gap-3">
                <span className="font-mono font-bold text-xs rounded-md bg-white/5 text-zinc-400 w-6 h-6 flex items-center justify-center shrink-0">
                  *
                </span>
                <span className="font-sans text-xs sm:text-sm text-zinc-400 hover:text-white leading-snug mt-0.5 transition-colors">
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
    <div className="mt-4 border-t border-white/10 pt-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] rounded-full border border-white/15 bg-white/5 text-zinc-300 px-3 py-1">
          {maxSelections ? `Pilih Maksimal ${maxSelections}` : 'Pilih 1 atau Lebih'}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {options.map((opt, i) => {
          const isSelected = selected.has(i);
          return (
            <button
              type="button"
              key={i}
              className={`text-left w-full h-full p-3 rounded-xl border transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                isSelected
                  ? 'bg-white/[0.10] border-white/40 ring-1 ring-white/20'
                  : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07] hover:border-white/30'
              }`}
              onClick={() => toggleSelect(i)}
              disabled={disabled}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`font-mono font-bold text-xs rounded-md w-6 h-6 flex items-center justify-center shrink-0 transition-colors duration-200 ${
                    isSelected ? 'bg-white text-black' : 'bg-white/10 text-white'
                  }`}
                >
                  {i + 1}
                </span>
                <span className="font-sans text-xs sm:text-sm text-zinc-200 leading-snug mt-0.5">
                  {opt}
                </span>
              </div>
            </button>
          );
        })}
        {!hideCustom && (
          <button
            type="button"
            className="text-left w-full h-full p-3 rounded-xl border border-dashed border-white/15 bg-white/[0.01] hover:bg-white/[0.05] hover:border-white/30 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            onClick={onCustom}
            disabled={disabled}
          >
            <div className="flex items-start gap-3">
              <span className="font-mono font-bold text-xs rounded-md bg-white/5 text-zinc-400 w-6 h-6 flex items-center justify-center shrink-0">
                *
              </span>
              <span className="font-sans text-xs sm:text-sm text-zinc-400 hover:text-white leading-snug mt-0.5 transition-colors">
                Lainnya (Custom)...
              </span>
            </div>
          </button>
        )}
      </div>
      <Button
        type="button"
        variant="primary"
        size="sm"
        disabled={disabled || selected.size === 0}
        onClick={handleSend}
        className="self-end mt-1"
      >
        Kirim Pilihan ({selected.size})
      </Button>
    </div>
  );
}

export function parseMessageOptions(content: string): { options: string[]; cleanText: string } {
  const options: string[] = [];
  const optionRegex = /(?:^|\n)\s*(?:[-*•]|\d+\.)?\s*\[OPTION\]\s*(.+)/gi;
  let match;
  while ((match = optionRegex.exec(content)) !== null) {
    options.push(match[1].trim());
  }
  const cleanText = content.replace(/(?:^|\n)\s*(?:[-*•]|\d+\.)?\s*\[OPTION\]\s*.+/gi, '').trim();
  return { options, cleanText };
}

export function isMultiSelectPrompt(text: string): boolean {
  const detectedMax = extractMaxLimit(text);
  return /\[MULTI[_\s-]SELECT\]/i.test(text) || text.toLowerCase().includes('atau lebih') || (detectedMax !== null && detectedMax > 1);
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
    const parsed = parseMessageOptions(cleanText);
    options.push(...parsed.options);
    cleanText = parsed.cleanText;
  }

  const detectedMax = extractMaxLimit(cleanText);
  const isMultiSelect = isMultiSelectPrompt(cleanText);

  if (/\[MULTI[_\s-]SELECT\]/i.test(cleanText)) {
    cleanText = cleanText.replace(/\[MULTI[_\s-]SELECT\]/gi, '').trim();
  }

  const isUser = message.role === 'user';

  return (
    <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[85%] px-4 py-3 border transition-colors duration-300 ${
          isUser
            ? 'rounded-2xl rounded-tr-sm border-white/15 bg-white/[0.07]'
            : 'rounded-2xl rounded-tl-sm border-white/10 bg-[#0a0a0d]'
        }`}
      >
        <span className={`block mb-2 font-mono text-[9px] uppercase tracking-[0.22em] font-semibold text-zinc-500 ${isUser ? 'text-right' : ''}`}>
          {isUser ? 'You' : 'System Architect'}
        </span>
        <div className="flex flex-col gap-4">
          <div className="font-sans text-sm leading-relaxed text-zinc-100 prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
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
      </div>
      {message.role === 'user' && canUndo && status === 'idle' && (
        <button
          type="button"
          onClick={onUndo}
          className="group flex items-center gap-1.5 mt-1 mr-1 px-3 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all duration-200 text-[11px] font-mono cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <ArrowUUpLeft weight="bold" className="w-3 h-3" />
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <form
        onSubmit={onSubmit}
        className="bg-[#0a0a0d] border border-white/10 rounded-2xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] p-6 sm:p-8 max-w-md w-full flex flex-col gap-5"
      >
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-500 mb-2">
            Final Step
          </div>
          <h3 className="font-sans font-bold text-xl text-white mb-1">Beri Nama Proyek</h3>
          <p className="font-sans text-xs text-zinc-400 leading-relaxed">
            Masukkan nama untuk proyek ini sebelum mengompilasi PRD dan node flowchart.
          </p>
        </div>
        <Input
          autoFocus
          required
          value={projectName}
          onChange={e => onNameChange(e.target.value)}
          placeholder="Contoh: Aplikasi Kasir Pintar"
          className="!bg-black/60"
        />
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            Batal
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={!projectName.trim()}>
            Lanjut Generate &rarr;
          </Button>
        </div>
      </form>
    </div>
  );
}
