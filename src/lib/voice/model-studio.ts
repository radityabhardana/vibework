import OSS from 'ali-oss';
import WebSocket, { type RawData } from 'ws';

export const QWEN_AUDIO_MODEL = 'qwen-audio-3.0-tts-flash';
export const QWEN_VOICE_DESIGN_MODEL = 'qwen3-tts-vd-2026-01-26';

type VoiceConfig = {
  apiKey: string;
  workspaceId: string;
  region: string;
  domain: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readVoiceConfig(): VoiceConfig | null {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  const workspaceId = process.env.DASHSCOPE_WORKSPACE_ID;
  const region = process.env.DASHSCOPE_REGION || 'ap-southeast-1';
  if (!apiKey || !workspaceId) return null;
  if (region !== 'cn-beijing' && region !== 'ap-southeast-1') return null;
  const domain = region === 'cn-beijing'
    ? `${workspaceId}.cn-beijing.maas.aliyuncs.com`
    : `${workspaceId}.ap-southeast-1.maas.aliyuncs.com`;
  return { apiKey, workspaceId, region, domain };
}

function requireVoiceConfig() {
  const config = readVoiceConfig();
  if (!config) throw new Error('Model Studio voice configuration is incomplete.');
  return config;
}

export function getVoiceProviderStatus() {
  const config = readVoiceConfig();
  const ossConfigured = Boolean(
    process.env.ALIYUN_OSS_REGION
    && process.env.ALIYUN_OSS_BUCKET
    && process.env.ALIYUN_OSS_ACCESS_KEY_ID
    && process.env.ALIYUN_OSS_ACCESS_KEY_SECRET
  );
  return {
    configured: Boolean(config && ossConfigured),
    modelStudioConfigured: Boolean(config),
    ossConfigured,
    region: config?.region || process.env.DASHSCOPE_REGION || 'ap-southeast-1',
    cloneModel: QWEN_AUDIO_MODEL,
    designModel: QWEN_VOICE_DESIGN_MODEL,
  };
}

async function customizationRequest(payload: unknown) {
  const config = requireVoiceConfig();
  const response = await fetch(`https://${config.domain}/api/v1/services/audio/tts/customization`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60_000),
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof data === 'object' && data !== null && 'message' in data ? String(data.message) : response.statusText;
    throw new Error(`Model Studio request failed (${response.status}): ${detail}`);
  }
  if (!isRecord(data)) throw new Error('Model Studio returned an invalid response.');
  return data;
}

async function downloadProviderAudio(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Model Studio returned an invalid audio URL.');
  }
  const response = await fetch(parsed, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Model Studio audio download failed (${response.status}).`);
  return Buffer.from(await response.arrayBuffer());
}

async function synthesizeQwenAudioHttp(options: {
  voiceId: string;
  text: string;
  instruction?: string;
  languageHint?: string;
  rate?: number;
  pitch?: number;
}) {
  const config = requireVoiceConfig();
  const response = await fetch(`https://${config.domain}/api/v1/services/audio/tts/SpeechSynthesizer`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: QWEN_AUDIO_MODEL,
      input: {
        text: options.text,
        voice: options.voiceId,
        format: 'mp3',
        sample_rate: 24000,
        rate: Math.min(2, Math.max(0.5, options.rate || 1)),
        pitch: Math.min(2, Math.max(0.5, options.pitch || 1)),
        enable_aigc_tag: true,
        ...(options.languageHint ? { language_hints: [options.languageHint] } : {}),
        ...(options.instruction ? { instruction: options.instruction } : {}),
      },
    }),
    signal: AbortSignal.timeout(90_000),
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok || !isRecord(data)) {
    const detail = isRecord(data) && typeof data.message === 'string' ? data.message : response.statusText;
    throw new Error(`Model Studio synthesis failed (${response.status}): ${detail}`);
  }
  const output = isRecord(data.output) ? data.output : null;
  const audio = isRecord(output?.audio) ? output.audio : null;
  if (typeof audio?.url !== 'string') throw new Error('Model Studio returned no audio URL.');
  return downloadProviderAudio(audio.url);
}

function safeProviderName(name: string, maxLength: number) {
  const normalized = name.replace(/[^a-zA-Z0-9_]/g, '').slice(0, maxLength);
  return normalized || `voice${Date.now().toString().slice(-6)}`;
}

export async function withTemporaryOssAudio<T>(data: Buffer, filename: string, callback: (signedUrl: string) => Promise<T>) {
  const region = process.env.ALIYUN_OSS_REGION;
  const bucket = process.env.ALIYUN_OSS_BUCKET;
  const accessKeyId = process.env.ALIYUN_OSS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_OSS_ACCESS_KEY_SECRET;
  if (!region || !bucket || !accessKeyId || !accessKeySecret) throw new Error('Alibaba OSS configuration is incomplete.');

  const client = new OSS({ region, bucket, accessKeyId, accessKeySecret, secure: true });
  const objectKey = `vibework/voice-enrollment/${crypto.randomUUID()}-${safeProviderName(filename, 24)}.wav`;
  await client.put(objectKey, data);
  try {
    const signedUrl = client.signatureUrl(objectKey, { expires: 15 * 60 });
    return await callback(signedUrl);
  } finally {
    await client.delete(objectKey).catch(() => undefined);
  }
}

export async function enrollQwenAudioVoice(sampleUrl: string, name: string) {
  const data = await customizationRequest({
    model: 'voice-enrollment',
    input: {
      action: 'create_voice',
      target_model: QWEN_AUDIO_MODEL,
      prefix: safeProviderName(name, 10),
      url: sampleUrl,
    },
  });
  const output = isRecord(data.output) ? data.output : null;
  const voiceId = output?.voice_id;
  if (typeof voiceId !== 'string' || !voiceId) throw new Error('Model Studio did not return a cloned voice ID.');
  return voiceId;
}

export async function designQwenVoice(name: string, voicePrompt: string) {
  const previewText = 'Welcome to Vibework Voice Studio. This clear reference recording preserves a stable voice identity for future narration and multilingual speech.';
  const data = await customizationRequest({
    model: 'qwen-voice-design',
    input: {
      action: 'create',
      target_model: QWEN_VOICE_DESIGN_MODEL,
      preferred_name: safeProviderName(name, 16),
      voice_prompt: voicePrompt,
      preview_text: previewText,
      language: 'en',
    },
    parameters: { sample_rate: 24000, response_format: 'wav' },
  });
  const output = isRecord(data.output) ? data.output : null;
  const previewAudio = isRecord(output?.preview_audio) ? output.preview_audio : null;
  const previewData = previewAudio?.data;
  const designVoiceId = output?.voice;
  if (typeof previewData !== 'string' || !previewData) throw new Error('Model Studio did not return voice design preview audio.');
  return {
    previewAudio: Buffer.from(previewData, 'base64'),
    designVoiceId: typeof designVoiceId === 'string' ? designVoiceId : null,
  };
}

export async function deleteQwenAudioVoice(voiceId: string) {
  await customizationRequest({
    model: 'voice-enrollment',
    input: { action: 'delete_voice', voice_id: voiceId },
  });
}

export async function deleteQwenDesignedVoice(voiceId: string) {
  await customizationRequest({
    model: 'qwen-voice-design',
    input: { action: 'delete', voice: voiceId },
  });
}

function asBuffer(data: RawData) {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (Array.isArray(data)) return Buffer.concat(data);
  throw new Error('Model Studio returned an unsupported audio frame.');
}

export function synthesizeQwenAudio(options: {
  voiceId: string;
  text: string;
  instruction?: string;
  languageHint?: string;
  rate?: number;
  pitch?: number;
}) {
  const config = requireVoiceConfig();
  if (config.region === 'cn-beijing') return synthesizeQwenAudioHttp(options);
  const taskId = crypto.randomUUID();
  const chunks: Buffer[] = [];

  return new Promise<Buffer>((resolve, reject) => {
    const socket = new WebSocket(`wss://${config.domain}/api-ws/v1/inference`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    });
    let settled = false;
    const timeout = setTimeout(() => finish(new Error('Model Studio synthesis timed out.')), 90_000);

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket.close();
      if (error) reject(error);
      else if (chunks.length === 0) reject(new Error('Model Studio returned no audio.'));
      else resolve(Buffer.concat(chunks));
    };

    socket.on('open', () => {
      socket.send(JSON.stringify({
        header: { action: 'run-task', task_id: taskId, streaming: 'duplex' },
        payload: {
          task_group: 'audio',
          task: 'tts',
          function: 'SpeechSynthesizer',
          model: QWEN_AUDIO_MODEL,
          parameters: {
            text_type: 'PlainText',
            voice: options.voiceId,
            format: 'mp3',
            sample_rate: 24000,
            volume: 50,
            rate: Math.min(2, Math.max(0.5, options.rate || 1)),
            pitch: Math.min(2, Math.max(0.5, options.pitch || 1)),
            enable_aigc_tag: true,
            ...(options.languageHint ? { language_hints: [options.languageHint] } : {}),
            ...(options.instruction ? { instruction: options.instruction } : {}),
          },
          input: {},
        },
      }));
    });

    socket.on('message', (data, isBinary) => {
      if (isBinary) {
        chunks.push(asBuffer(data));
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(data.toString());
      } catch {
        finish(new Error('Model Studio returned an invalid WebSocket event.'));
        return;
      }
      if (!isRecord(parsed) || !isRecord(parsed.header)) {
        finish(new Error('Model Studio returned an invalid WebSocket event.'));
        return;
      }
      const header = parsed.header;
      const event = header.event;
      if (event === 'task-started') {
        socket.send(JSON.stringify({
          header: { action: 'continue-task', task_id: taskId, streaming: 'duplex' },
          payload: { input: { text: options.text } },
        }));
        socket.send(JSON.stringify({
          header: { action: 'finish-task', task_id: taskId, streaming: 'duplex' },
          payload: { input: {} },
        }));
      } else if (event === 'task-finished') {
        finish();
      } else if (event === 'task-failed') {
        finish(new Error(typeof header.error_message === 'string' ? header.error_message : 'Model Studio synthesis failed.'));
      }
    });
    socket.on('error', error => finish(error));
    socket.on('close', () => {
      if (!settled) finish(new Error('Model Studio closed the connection before synthesis completed.'));
    });
  });
}
