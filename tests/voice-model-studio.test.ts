import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_QWEN_AUDIO_MODEL,
  getProfileSynthesisModel,
  resolveQwenAudioModel,
} from '../src/lib/voice/model-studio';

test('defaults new voice enrollments to Qwen Audio TTS Plus', () => {
  assert.equal(resolveQwenAudioModel(undefined), DEFAULT_QWEN_AUDIO_MODEL);
  assert.equal(resolveQwenAudioModel('qwen-audio-3.0-tts-plus'), 'qwen-audio-3.0-tts-plus');
});

test('accepts Flash only when explicitly configured and rejects unknown models', () => {
  assert.equal(resolveQwenAudioModel('qwen-audio-3.0-tts-flash'), 'qwen-audio-3.0-tts-flash');
  assert.equal(resolveQwenAudioModel('qwen-audio-3.0-tts-ultra'), null);
});

test('preserves the stored Flash model for existing voice profiles', () => {
  assert.equal(getProfileSynthesisModel('qwen-audio-3.0-tts-flash'), 'qwen-audio-3.0-tts-flash');
});
