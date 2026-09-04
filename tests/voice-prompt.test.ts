import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSynthesisInstruction, buildVoiceDesignPrompt } from '../src/lib/voice/prompt';
import type { VoiceDesignSettings } from '../src/lib/voice/types';

const settings: VoiceDesignSettings = {
  gender: 'neutral',
  age: 'young-adult',
  pitch: 'low',
  pace: 'slow',
  tone: 'warm',
  texture: 'resonant',
  condition: 'hoarse',
  intensity: 'subtle',
  useCase: 'narration',
  customInstruction: 'Use natural Indonesian articulation.',
};

test('builds an original voice-design prompt from controlled settings', () => {
  const prompt = buildVoiceDesignPrompt(settings);
  assert.match(prompt, /young adult androgynous voice/);
  assert.match(prompt, /subtle hoarse vocal condition/);
  assert.match(prompt, /no imitation of any known person/);
});

test('omits healthy vocal conditions from synthesis instructions', () => {
  const instruction = buildSynthesisInstruction({ ...settings, condition: 'healthy' });
  assert.doesNotMatch(instruction, /healthy/);
  assert.match(instruction, /warm tone/);
  assert.match(instruction, /natural Indonesian articulation/);
});
