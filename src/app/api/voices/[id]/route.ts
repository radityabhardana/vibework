import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { voiceGenerations, voiceProfiles } from '@/lib/db/schema';
import { deleteQwenAudioVoice } from '@/lib/voice/model-studio';
import { deleteGenerationFiles, deleteVoiceFiles } from '@/lib/voice/storage';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return Response.json({ error: 'Invalid voice ID.' }, { status: 400 });

  const profile = db.select().from(voiceProfiles).where(eq(voiceProfiles.id, id)).get();
  if (!profile) return Response.json({ error: 'Voice not found.' }, { status: 404 });

  try {
    if (profile.providerVoiceId) await deleteQwenAudioVoice(profile.providerVoiceId);
    const generations = db.select({ id: voiceGenerations.id }).from(voiceGenerations).where(eq(voiceGenerations.voiceId, id)).all();
    db.transaction(tx => {
      tx.delete(voiceGenerations).where(eq(voiceGenerations.voiceId, id)).run();
      tx.delete(voiceProfiles).where(eq(voiceProfiles.id, id)).run();
    });
    await Promise.all([
      deleteVoiceFiles(id),
      ...generations.map(generation => deleteGenerationFiles(generation.id)),
    ]);
    return Response.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to delete voice:', error);
    const message = error instanceof Error ? error.message : 'Voice deletion failed.';
    return Response.json({ error: message }, { status: 502 });
  }
}
