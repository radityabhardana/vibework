import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { voiceProfiles } from '@/lib/db/schema';
import { normalizeVoiceSample } from '@/lib/voice/audio';
import { enrollQwenAudioVoice, QWEN_AUDIO_MODEL, withTemporaryOssAudio } from '@/lib/voice/model-studio';
import { toVoiceProfileDto } from '@/lib/voice/repository';
import { saveVoiceFile } from '@/lib/voice/storage';

export const maxDuration = 120;

export async function POST(request: Request) {
  let body: FormData;
  try {
    body = await request.formData();
  } catch {
    return Response.json({ error: 'Invalid voice upload.' }, { status: 400 });
  }

  const name = body.get('name');
  const language = body.get('language');
  const consent = body.get('consent');
  const audio = body.get('audio');
  if (typeof name !== 'string' || !name.trim() || name.length > 80
    || typeof language !== 'string' || !language.trim() || language.length > 20
    || consent !== 'true'
    || !(audio instanceof File)) {
    return Response.json({ error: 'Name, language, consent, and audio are required.' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.insert(voiceProfiles).values({
    id,
    name: name.trim(),
    kind: 'clone',
    language: language.trim(),
    targetModel: QWEN_AUDIO_MODEL,
    status: 'enrolling',
    consentAt: now,
    createdAt: now,
    updatedAt: now,
  }).run();

  try {
    const normalized = await normalizeVoiceSample(audio);
    const referencePath = await saveVoiceFile(id, 'reference.wav', normalized.audio);
    const providerVoiceId = await withTemporaryOssAudio(normalized.audio, name, signedUrl => enrollQwenAudioVoice(signedUrl, name));
    db.update(voiceProfiles).set({
      providerVoiceId,
      referenceAudioPath: referencePath,
      status: 'ready',
      errorMessage: null,
      updatedAt: new Date().toISOString(),
    }).where(eq(voiceProfiles.id, id)).run();
    const profile = db.select().from(voiceProfiles).where(eq(voiceProfiles.id, id)).get();
    return Response.json({ voice: profile ? toVoiceProfileDto(profile) : null }, { status: 201 });
  } catch (error: unknown) {
    console.error('Voice enrollment failed:', error);
    const message = error instanceof Error ? error.message : 'Voice enrollment failed.';
    db.update(voiceProfiles).set({ status: 'failed', errorMessage: message, updatedAt: new Date().toISOString() }).where(eq(voiceProfiles.id, id)).run();
    return Response.json({ error: message, voiceId: id }, { status: 502 });
  }
}
