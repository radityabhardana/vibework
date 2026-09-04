import type { VoiceDesignSettings } from '@/lib/voice/types';

const LABELS: Record<string, string> = {
  male: 'male', female: 'female', neutral: 'androgynous',
  child: 'child aged 8 to 12', teen: 'teenager', 'young-adult': 'young adult', 'middle-aged': 'middle-aged adult', senior: 'senior adult',
  'very-low': 'very low', low: 'low', medium: 'medium', high: 'high', 'very-high': 'very high',
  'very-slow': 'very slow', slow: 'slow', fast: 'fast', 'very-fast': 'very fast',
};

function label(value: string) {
  return LABELS[value] || value.replaceAll('-', ' ');
}

export function buildVoiceDesignPrompt(settings: VoiceDesignSettings) {
  const parts = [
    `An original ${label(settings.age)} ${label(settings.gender)} voice`,
    `with a ${label(settings.pitch)} pitch and ${label(settings.pace)} speaking pace`,
    `${label(settings.tone)} emotional delivery`,
    `${label(settings.texture)} vocal texture`,
  ];
  if (settings.condition !== 'healthy') {
    parts.push(`${label(settings.intensity)} ${label(settings.condition)} vocal condition performed naturally`);
  }
  if (settings.useCase) parts.push(`suited for ${label(settings.useCase)}`);
  if (settings.customInstruction.trim()) parts.push(settings.customInstruction.trim());
  return `${parts.join(', ')}. Clear articulation, stable identity, natural breathing, and no imitation of any known person.`.slice(0, 2048);
}

export function buildSynthesisInstruction(settings: Partial<VoiceDesignSettings>) {
  const parts: string[] = [];
  if (settings.tone) parts.push(`Use a ${label(settings.tone)} tone`);
  if (settings.pace) parts.push(`speak at a ${label(settings.pace)} pace`);
  if (settings.pitch) parts.push(`keep a ${label(settings.pitch)} pitch`);
  if (settings.texture) parts.push(`use a ${label(settings.texture)} texture`);
  if (settings.condition && settings.condition !== 'healthy') {
    parts.push(`perform a ${label(settings.intensity || 'moderate')} ${label(settings.condition)} condition naturally`);
  }
  if (settings.customInstruction?.trim()) parts.push(settings.customInstruction.trim());
  return parts.join('. ').slice(0, 800);
}
