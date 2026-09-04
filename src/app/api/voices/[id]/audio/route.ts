import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { voiceProfiles } from '@/lib/db/schema';
import { readStoredFile } from '@/lib/voice/storage';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return Response.json({ error: 'Invalid voice ID.' }, { status: 400 });

  const profile = db.select().from(voiceProfiles).where(eq(voiceProfiles.id, id)).get();
  if (!profile) return Response.json({ error: 'Voice not found.' }, { status: 404 });

  const kind = new URL(request.url).searchParams.get('kind');
  const filePath = kind === 'reference'
    ? profile.referenceAudioPath
    : profile.previewAudioPath || profile.referenceAudioPath;
  if (!filePath) return Response.json({ error: 'Voice audio is unavailable.' }, { status: 404 });

  try {
    const audio = await readStoredFile(filePath);
    return new Response(new Uint8Array(audio), {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Type': filePath.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav',
      },
    });
  } catch (error: unknown) {
    console.error('Failed to read voice audio:', error);
    return Response.json({ error: 'Voice audio is unavailable.' }, { status: 404 });
  }
}
