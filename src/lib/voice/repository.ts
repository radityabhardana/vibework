import type { voiceGenerations, voiceProfiles } from '@/lib/db/schema';
import type { VoiceDesignSettings, VoiceGenerationDto, VoiceProfileDto } from '@/lib/voice/types';

type VoiceProfileRow = typeof voiceProfiles.$inferSelect;
type VoiceGenerationRow = typeof voiceGenerations.$inferSelect;

export function toVoiceProfileDto(profile: VoiceProfileRow): VoiceProfileDto {
  return {
    id: profile.id,
    name: profile.name,
    kind: profile.kind as VoiceProfileDto['kind'],
    language: profile.language,
    provider: profile.provider,
    providerVoiceId: profile.providerVoiceId,
    targetModel: profile.targetModel,
    voicePrompt: profile.voicePrompt,
    settings: profile.settings as VoiceDesignSettings | null,
    status: profile.status,
    errorMessage: profile.errorMessage,
    hasReference: Boolean(profile.referenceAudioPath),
    hasPreview: Boolean(profile.previewAudioPath),
    createdAt: profile.createdAt,
  };
}

export function toVoiceGenerationDto(generation: VoiceGenerationRow): VoiceGenerationDto {
  return {
    id: generation.id,
    voiceId: generation.voiceId,
    text: generation.text,
    instruction: generation.instruction,
    status: generation.status,
    audioUrl: generation.outputAudioPath ? `/api/voice-generations/${generation.id}/audio` : null,
    createdAt: generation.createdAt,
  };
}
