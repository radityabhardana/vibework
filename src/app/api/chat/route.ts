import { getApiKeys } from '@/lib/utils';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

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

  if (apiKeys.length === 0) {
    return new Response(JSON.stringify({ error: "No API keys configured." }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const payload = {
    model: 'qwen-plus',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ],
    stream: true,
  };

  let lastError: any;

  for (const apiKey of apiKeys) {
    try {
      // Direct raw fetch to Dashscope's Chat Completions API
      const response = await fetch(`${process.env.OPENAI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP Error ${response.status}: ${errorText}`);
      }

      // Check for Dashscope's quirk where they return 200 OK but send a JSON error instead of an event stream
      // We check if the content-type is application/json. If it is, it's definitely an error because we requested a stream.
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(`Dashscope API Error: ${JSON.stringify(errorData)}`);
      }

      // If we got here, it's a valid stream. Proxy the response body directly to the client.
      // We must create a new Response object to ensure Next.js handles the readable stream properly.
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
    } catch (err: any) {
      console.warn("API Key failed, falling back...", err.message || err);
      lastError = err;
    }
  }

  // If we reach here, all keys failed
  return new Response(
    JSON.stringify({ error: 'All API keys failed.', details: lastError?.message || 'Unknown error' }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}
