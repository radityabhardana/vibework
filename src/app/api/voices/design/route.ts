import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { voiceProfiles } from '@/lib/db/schema';
import { designQwenVoice, deleteQwenDesignedVoice, enrollQwenAudioVoice, QWEN_AUDIO_MODEL, withTemporaryOssAudio } from '@/lib/voice/model-studio';
import { buildVoiceDesignPrompt } from '@/lib/voice/prompt';
import { toVoiceProfileDto } from '@/lib/voice/repository';
import { saveVoiceFile } from '@/lib/voice/storage';
import type { VoiceDesignSettings } from '@/lib/voice/types';

export const maxDuration = 120;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDesignSettings(value: unknown): value is VoiceDesignSettings {
  if (!isRecord(value)) return false;
  return ['male', 'female', 'neutral'].includes(String(value.gender))
    && ['child', 'teen', 'young-adult', 'middle-aged', 'senior'].includes(String(value.age))
    && ['very-low', 'low', 'medium', 'high', 'very-high'].includes(String(value.pitch))
    && ['very-slow', 'slow', 'medium', 'fast', 'very-fast'].includes(String(value.pace))
    && ['warm', 'calm', 'authoritative', 'cheerful', 'dramatic', 'empathetic', 'mysterious'].includes(String(value.tone))
    && ['clear', 'airy', 'velvety', 'raspy', 'breathy', 'resonant', 'crisp'].includes(String(value.texture))
    && ['healthy', 'sleepy', 'tired', 'whispered', 'hoarse', 'excited'].includes(String(value.condition))
    && ['subtle', 'moderate', 'strong'].includes(String(value.intensity))
    && ['narration', 'commercial', 'audiobook', 'assistant', 'character', 'education'].includes(String(value.useCase))
    && typeof value.customInstruction === 'string'
    && value.customInstruction.length <= 400;
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body) || typeof body.name !== 'string' || !body.name.trim() || body.name.length > 80
    || typeof body.language !== 'string' || !body.language.trim() || body.language.length > 20
    || body.consent !== true || !isDesignSettings(body.settings)) {
    return Response.json({ error: 'Invalid voice design request.' }, { status: 400 });
  }

  const name = body.name.trim();
  const language = body.language.trim();
  const settings = body.settings;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const prompt = buildVoiceDesignPrompt(settings);
  db.insert(voiceProfiles).values({
    id,
    name,
    kind: 'designed',
    language,
    targetModel: QWEN_AUDIO_MODEL,
    voicePrompt: prompt,
    settings,
    status: 'designing',
    consentAt: now,
    createdAt: now,
    updatedAt: now,
  }).run();

  let temporaryDesignVoiceId: string | null = null;
  try {
    const design = await designQwenVoice(name, prompt);
    temporaryDesignVoiceId = design.designVoiceId;
    const previewPath = await saveVoiceFile(id, 'preview.wav', design.previewAudio);
    const providerVoiceId = await withTemporaryOssAudio(design.previewAudio, name, signedUrl => enrollQwenAudioVoice(signedUrl, name));
    if (temporaryDesignVoiceId) await deleteQwenDesignedVoice(temporaryDesignVoiceId).catch(() => undefined);
    db.update(voiceProfiles).set({
      providerVoiceId,
      previewAudioPath: previewPath,
      status: 'ready',
      errorMessage: null,
      updatedAt: new Date().toISOString(),
    }).where(eq(voiceProfiles.id, id)).run();
    const profile = db.select().from(voiceProfiles).where(eq(voiceProfiles.id, id)).get();
    return Response.json({ voice: profile ? toVoiceProfileDto(profile) : null }, { status: 201 });
  } catch (error: unknown) {
    console.error('Voice design failed:', error);
    if (temporaryDesignVoiceId) await deleteQwenDesignedVoice(temporaryDesignVoiceId).catch(() => undefined);
    const message = error instanceof Error ? error.message : 'Voice design failed.';
    db.update(voiceProfiles).set({ status: 'failed', errorMessage: message, updatedAt: new Date().toISOString() }).where(eq(voiceProfiles.id, id)).run();
    return Response.json({ error: message, voiceId: id }, { status: 502 });
  }
}
