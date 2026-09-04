import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { voiceGenerations, voiceProfiles } from '@/lib/db/schema';
import { QWEN_AUDIO_MODEL, synthesizeQwenAudio } from '@/lib/voice/model-studio';
import { buildSynthesisInstruction } from '@/lib/voice/prompt';
import { toVoiceGenerationDto } from '@/lib/voice/repository';
import { saveGenerationFile } from '@/lib/voice/storage';
import type { VoiceDesignSettings } from '@/lib/voice/types';

export const maxDuration = 120;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function languageHint(language: string) {
  const hint = language.toLowerCase().split(/[-_]/)[0];
  return ['zh', 'en', 'fr', 'de', 'ja', 'ko', 'ru', 'pt', 'th', 'id', 'vi', 'es', 'it', 'ms', 'fil', 'ar'].includes(hint)
    ? hint
    : undefined;
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body) || typeof body.voiceId !== 'string' || !UUID_PATTERN.test(body.voiceId)
    || typeof body.text !== 'string' || !body.text.trim() || body.text.length > 3000
    || (body.rate !== undefined && (typeof body.rate !== 'number' || body.rate < 0.5 || body.rate > 2))
    || (body.pitch !== undefined && (typeof body.pitch !== 'number' || body.pitch < 0.5 || body.pitch > 2))) {
    return Response.json({ error: 'Invalid voice generation request.' }, { status: 400 });
  }
  const profile = db.select().from(voiceProfiles).where(eq(voiceProfiles.id, body.voiceId)).get();
  if (!profile || profile.status !== 'ready' || !profile.providerVoiceId) {
    return Response.json({ error: 'The selected voice is not ready.' }, { status: 409 });
  }

  const runtimeSettings = isRecord(body.settings) ? body.settings as Partial<VoiceDesignSettings> : {};
  const instruction = buildSynthesisInstruction(runtimeSettings);
  const id = crypto.randomUUID();
  db.insert(voiceGenerations).values({
    id,
    voiceId: profile.id,
    text: body.text.trim(),
    instruction,
    model: QWEN_AUDIO_MODEL,
    status: 'processing',
  }).run();

  try {
    const audio = await synthesizeQwenAudio({
      voiceId: profile.providerVoiceId,
      text: body.text.trim(),
      instruction,
      languageHint: languageHint(profile.language),
      rate: typeof body.rate === 'number' ? body.rate : 1,
      pitch: typeof body.pitch === 'number' ? body.pitch : 1,
    });
    const outputAudioPath = await saveGenerationFile(id, audio);
    db.update(voiceGenerations).set({ outputAudioPath, status: 'ready', errorMessage: null }).where(eq(voiceGenerations.id, id)).run();
    const generation = db.select().from(voiceGenerations).where(eq(voiceGenerations.id, id)).get();
    return Response.json({ generation: generation ? toVoiceGenerationDto(generation) : null }, { status: 201 });
  } catch (error: unknown) {
    console.error('Voice synthesis failed:', error);
    const message = error instanceof Error ? error.message : 'Voice synthesis failed.';
    db.update(voiceGenerations).set({ status: 'failed', errorMessage: message }).where(eq(voiceGenerations.id, id)).run();
    return Response.json({ error: message, generationId: id }, { status: 502 });
  }
}
