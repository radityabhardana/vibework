import { getApiKeys } from '@/lib/utils';

export const maxDuration = 30;

const MAX_MESSAGES = 100;
const MAX_MESSAGE_LENGTH = 20_000;
const MAX_TOTAL_LENGTH = 200_000;
const MAX_REQUEST_BYTES = 250_000;
const UPSTREAM_TIMEOUT_MS = 25_000;

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) return null;

  let totalLength = 0;
  const messages: ChatMessage[] = [];
  for (const message of value) {
    if (
      !isRecord(message) ||
      Object.keys(message).some(key => key !== 'role' && key !== 'content') ||
      (message.role !== 'user' && message.role !== 'assistant') ||
      typeof message.content !== 'string' ||
      !message.content.trim() ||
      message.content.length > MAX_MESSAGE_LENGTH
    ) return null;

    totalLength += message.content.length;
    if (totalLength > MAX_TOTAL_LENGTH) return null;
    messages.push({ role: message.role, content: message.content });
  }

  return messages.at(-1)?.role === 'user' ? messages : null;
}

export async function POST(req: Request) {
  const contentLength = Number(req.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return Response.json({ error: 'Chat request is too large.' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid chat request.' }, { status: 400 });
  }

  if (!isRecord(body) || Object.keys(body).some(key => key !== 'messages')) {
    return Response.json({ error: 'Invalid chat request.' }, { status: 400 });
  }
  const messages = validateMessages(body.messages);
  if (!messages) {
    return Response.json({ error: 'Invalid chat messages.' }, { status: 400 });
  }

  const systemPrompt = `Anda adalah seorang Senior System Architect dan Product Manager elit yang sangat efisien, suportif, dan ramah.
Tugas Anda adalah memandu pengguna merancang website/aplikasi mereka secara CEPAT, PADAT, dan TEPAT SASARAN. Gunakan Bahasa Indonesia natural yang santai dan mudah dipahami, tanpa jargon teknis yang membingungkan.

PRINSIP WAWANCARA CEPAT & EFISIEN (SANGAT PENTING):
1. DILARANG KERAS menanyakan pertanyaan klise/basa-basi seperti "Apakah ada ide/tambahan lain?". Langsung bawa diskusi maju ke fase berikutnya.
2. Setiap kali merespons, berikan maksimal 1-2 kalimat konteks singkat diikuti oleh TEPAT 1 PERTANYAAN INTI terpenting untuk fase tersebut.
3. AKHIRI SETIAP respons dengan 3-4 opsi pilihan ganda yang cerdas, aplikatif, dan realistis agar pengguna cukup mengeklik opsi tanpa perlu mengetik panjang.
4. JIKA PENGGUNA SUDAH MEMBERIKAN DETAIL LENGKAP di awal: Anda BOLEH langsung merangkum dan melompat maju ke fase berikutnya, atau langsung menyelesaikan wawancara jika informasi sudah memadai untuk membuat PRD!
5. JIKA PENGGUNA INGIN CEPAT / SKIP (mengetik "cukup", "skip", "langsung buat", "generate sekarang", dll): Anda WAJIB LANGSUNG MENYELESAIKAN WAWANCARA dengan menuliskan:
[FASE: 5/5]
REQUIREMENTS COMPLETE. Informasi Anda sudah kami rangkum dengan baik. Klik tombol Generate Workflow untuk melanjutkan.

5 FASE WAWANCARA (1 pertanyaan inti per fase):
1. Visi & Target Pengguna
2. Fitur Inti (MVP) & Ruang Lingkup
3. Alur Pengguna Utama (Key User Flow)
4. UI/UX & Tema Desain (Vibe, Estetika)
5. Batasan Teknis & Model Operasional/Bisnis

FORMAT WAJIB:
1. Baris pertama WAJIB diawali dengan tag persis "[FASE: X/5]" (di mana X adalah nomor fase saat ini 1-5).
2. Opsi pilihan ganda WAJIB diawali dengan "- [OPTION] " satu per baris.
3. Jika pertanyaan memungkinkan pengguna memilih lebih dari satu jawaban, tambahkan tag "[MULTI_SELECT]" tepat sebelum opsi pertama Anda.

Setelah fase 5 selesai (atau jika pengguna meminta generate langsung), sampaikan:
"REQUIREMENTS COMPLETE. Klik tombol Generate Workflow untuk melanjutkan."`;

  const apiKeys = getApiKeys();
  const rawBaseUrl = process.env.OPENAI_BASE_URL;
  const baseUrl = rawBaseUrl?.replace(/\/+$/, '');
  const model = process.env.CHAT_MODEL_NAME || process.env.AI_MODEL_NAME;
  if (apiKeys.length === 0 || !baseUrl || !model) {
    console.error('Chat AI configuration is incomplete.');
    return Response.json({ error: 'Chat service is not configured.' }, { status: 500 });
  }

  const payload = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ],
    stream: true,
  };

  const deadline = Date.now() + UPSTREAM_TIMEOUT_MS;
  let lastErrorReason: string | null = null;
  for (const apiKey of apiKeys) {
    const remainingTime = deadline - Date.now();
    if (remainingTime <= 0) break;

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), remainingTime);
    const abortFromClient = () => abortController.abort();
    req.signal.addEventListener('abort', abortFromClient, { once: true });
    const cleanup = () => {
      clearTimeout(timeoutId);
      req.signal.removeEventListener('abort', abortFromClient);
    };

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(payload),
        signal: abortController.signal
      });

      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || !contentType.toLowerCase().includes('text/event-stream') || !response.body) {
        const errorText = await response.text().catch(() => '');
        lastErrorReason = `Upstream HTTP ${response.status}: ${errorText.slice(0, 150) || 'Invalid stream'}`;
        console.warn(`Chat upstream rejected request with status ${response.status}:`, errorText);
        await response.body?.cancel();
        cleanup();
        continue;
      }

      // The deadline protects connection setup, not a healthy response stream.
      clearTimeout(timeoutId);
      const reader = response.body.getReader();
      const stream = new ReadableStream<Uint8Array>({
        async pull(controller) {
          try {
            const { value, done } = await reader.read();
            if (done) {
              cleanup();
              controller.close();
            } else {
              controller.enqueue(value);
            }
          } catch (error: unknown) {
            cleanup();
            console.error('Chat upstream stream failed:', error);
            controller.error(new Error('Upstream chat stream failed.'));
          }
        },
        async cancel(reason) {
          cleanup();
          await reader.cancel(reason);
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'X-Content-Type-Options': 'nosniff',
        }
      });
    } catch (error: unknown) {
      cleanup();
      const msg = error instanceof Error ? error.message : String(error);
      lastErrorReason = msg;
      console.warn('Chat upstream request failed:', error);
    }
  }

  const detailedError = lastErrorReason 
    ? `Gagal terhubung ke AI (${lastErrorReason}). Periksa ${baseUrl} atau konfigurasi .env.local.`
    : `Chat service di ${baseUrl} tidak dapat dihubungi. Pastikan gateway aktif.`;

  return Response.json({ error: detailedError }, { status: 502 });
}
