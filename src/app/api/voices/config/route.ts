import { getVoiceProviderStatus } from '@/lib/voice/model-studio';

export async function GET() {
  return Response.json(getVoiceProviderStatus());
}
