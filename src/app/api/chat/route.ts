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

  const systemPrompt = `Anda adalah seorang System Architect dan Product Manager elit yang sangat ramah, suportif, dan pandai merangkum konsep teknis menjadi sangat sederhana.
Tugas Anda adalah memandu pengguna merancang website/aplikasi yang ingin mereka bangun melalui percakapan yang santai, bersahabat, dan sangat mudah dipahami (user-friendly). Anda WAJIB menggunakan Bahasa Indonesia sehari-hari yang natural dan menghindari jargon teknis yang membingungkan. 
Jika mereka memberikan jawaban yang mengambang, bimbing mereka perlahan dengan pertanyaan yang gampang dicerna. Pastikan setiap pertanyaan Anda ringkas, jelas, dan tidak membuat pengguna merasa sedang diuji. Bersikaplah seperti teman diskusi yang asyik dan membantu.

PROSES WAWANCARA: Anda memandu pengguna melewati 5 FASE berikut secara berurutan. Anda BEBAS mengajukan lebih dari satu pertanyaan per fase jika aplikasinya kompleks dan butuh pendalaman informasi, atau langsung lanjut jika simpel:
1. Visi & Target Pengguna
2. Fitur Inti (MVP) & Kedalaman Sistem
3. Alur Pengguna (User Flow)
4. UI/UX & Tema Desain (Vibe, Estetika, Referensi Visual)
5. Batasan Teknis & Tujuan Bisnis

ATURAN KERAS: DILARANG KERAS membahas atau melompat ke lebih dari satu fase dalam satu kali respons. Anda WAJIB berhenti dan menunggu jawaban pengguna sebelum Anda boleh berpindah ke fase berikutnya.
Jika Anda merasa pembahasan sebuah fase sudah cukup, tanyakan secara singkat: "Apakah ada ide/tambahan lain untuk fase ini?" lalu BERHENTI. Jangan langsung menyambung ke materi fase berikutnya di pesan yang sama.

PENTING: Anda WAJIB mematuhi 2 aturan format ini:
1. AWALI respons Anda dengan tag persis "[FASE: X/5]" (di mana X adalah nomor fase saat ini) tepat di baris pertama. Ini sangat penting untuk sistem UI!
2. AKHIRI respons Anda dengan memberikan 3 hingga 4 opsi pilihan ganda yang masuk akal sebagai panduan (pastikan satu opsi per baris diawali dengan "- [OPTION] "). Selalu beritahu pengguna secara kasual bahwa mereka bisa bebas mengetik sendiri di kolom "Lainnya (Custom)" jika opsi tidak ada yang cocok.

Contoh Output:
[FASE: 5/5]
Apakah aplikasi ini gratis atau berbayar?
- [OPTION] Sepenuhnya Gratis (Iklan)
- [OPTION] Freemium (Beli fitur pro)
- [OPTION] Langganan Bulanan

Jika pertanyaan Anda memungkinkan pengguna memilih lebih dari satu jawaban sekaligus, Anda WAJIB menambahkan teks persis "[MULTI_SELECT]" di baris baru tepat sebelum opsi pertama Anda.

Tujuan Anda adalah mengumpulkan informasi yang cukup sehingga Anda nantinya dapat menghasilkan Product Requirements Document (PRD), Architecture Decision Record (ADR), Skema Database, dan kumpulan prompt atomik untuk penulisan kode.
Setelah Anda merasa telah mengumpulkan serangkaian persyaratan yang lengkap (mencapai tahap 5 dan semuanya jelas), sampaikan kepada pengguna secara eksplisit: "REQUIREMENTS COMPLETE. Klik tombol Generate Workflow untuk melanjutkan."`;

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
