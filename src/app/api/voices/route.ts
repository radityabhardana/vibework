import { desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { voiceGenerations, voiceProfiles } from '@/lib/db/schema';
import { toVoiceGenerationDto, toVoiceProfileDto } from '@/lib/voice/repository';

export async function GET() {
  try {
    const profiles = db.select().from(voiceProfiles).orderBy(desc(voiceProfiles.createdAt)).all();
    const generations = db.select().from(voiceGenerations).orderBy(desc(voiceGenerations.createdAt)).limit(20).all();
    return Response.json({
      voices: profiles.map(toVoiceProfileDto),
      generations: generations.map(toVoiceGenerationDto),
    });
  } catch (error: unknown) {
    console.error('Failed to list voices:', error);
    return Response.json({ error: 'Unable to load the voice warehouse.' }, { status: 500 });
  }
}
