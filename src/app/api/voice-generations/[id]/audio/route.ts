import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { voiceGenerations } from '@/lib/db/schema';
import { readStoredFile } from '@/lib/voice/storage';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return Response.json({ error: 'Invalid generation ID.' }, { status: 400 });

  const generation = db.select().from(voiceGenerations).where(eq(voiceGenerations.id, id)).get();
  if (!generation?.outputAudioPath || generation.status !== 'ready') {
    return Response.json({ error: 'Generated audio is unavailable.' }, { status: 404 });
  }

  try {
    const audio = await readStoredFile(generation.outputAudioPath);
    return new Response(new Uint8Array(audio), {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `inline; filename="voice-${id}.mp3"`,
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error: unknown) {
    console.error('Failed to read generated audio:', error);
    return Response.json({ error: 'Generated audio is unavailable.' }, { status: 404 });
  }
}
