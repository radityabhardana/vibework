export type VoiceKind = 'clone' | 'designed';

export type VoiceDesignSettings = {
  gender: 'male' | 'female' | 'neutral';
  age: 'child' | 'teen' | 'young-adult' | 'middle-aged' | 'senior';
  pitch: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  pace: 'very-slow' | 'slow' | 'medium' | 'fast' | 'very-fast';
  tone: string;
  texture: string;
  condition: string;
  intensity: 'subtle' | 'moderate' | 'strong';
  useCase: string;
  customInstruction: string;
};

export type VoiceProfileDto = {
  id: string;
  name: string;
  kind: VoiceKind;
  language: string;
  provider: string;
  providerVoiceId: string | null;
  targetModel: string;
  voicePrompt: string | null;
  settings: VoiceDesignSettings | null;
  status: string;
  errorMessage: string | null;
  hasReference: boolean;
  hasPreview: boolean;
  createdAt: string | null;
};

export type VoiceGenerationDto = {
  id: string;
  voiceId: string;
  text: string;
  instruction: string | null;
  status: string;
  audioUrl: string | null;
  createdAt: string | null;
};
