import { getApiKeys } from '@/lib/utils';

const configuredTimeout = Number(process.env.AI_GENERATION_TIMEOUT_MS);
// Generic generation calls remain bounded below the route limit; schema uses
// the explicit 70-second policy below because its source payload is larger.
const GENERATION_TIMEOUT_MS = Number.isFinite(configuredTimeout)
  ? Math.min(45_000, Math.max(10_000, configuredTimeout))
  : 35_000;
// Leave headroom below the 90-second project-generation route limit for request
// parsing, validation, and the atomic database write after provider generation.
const TOTAL_GENERATION_BUDGET_MS = 80_000;
export const SCHEMA_GENERATION_TIMEOUT_MS = 70_000;
export const SCHEMA_GENERATION_MAX_TOKENS = 2560;
export const SCHEMA_GENERATION_TIMEOUT_RESPONSE = {
  error: 'Schema generation timed out before anything was saved.',
  code: 'GENERATION_TIMEOUT',
  operation: 'schema',
  retryable: true,
  persisted: false,
} as const;

export class AiGenerationTimeoutError extends Error {
  constructor() {
    super('AI generation timed out within the total provider budget of 80 seconds. Please retry.');
    this.name = 'AiGenerationTimeoutError';
  }
}

function extractFirstJsonObject(str: string): string {
  const startIdx = str.indexOf('{');
  if (startIdx === -1) return str;

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let i = startIdx; i < str.length; i++) {
    const char = str[i];

    if (inString) {
      if (char === '\\' && !isEscaped) {
        isEscaped = true;
      } else {
        if (char === '"' && !isEscaped) {
          inString = false;
        }
        isEscaped = false;
      }
    } else {
      if (char === '"') {
        inString = true;
      } else if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          return str.slice(startIdx, i + 1);
        }
      }
    }
  }

  return str.slice(startIdx);
}

export const REQUIRED_PRD_SECTIONS = [
  'Problem & Context',
  'Goals & Non-Goals',
  'Target Users & Jobs',
  'Scope, MVP & Out of Scope',
  'Prioritized Functional Requirements & Acceptance Criteria',
  'Key User Journeys & UX States',
  'Domain/Data Entities & Relationships',
  'Integration & API Assumptions',
  'Non-Functional Requirements',
  'Analytics & Success Metrics',
  'Risks & Dependencies',
  'Open Questions & Assumptions',
  'Release & Rollout Considerations',
] as const;

type PrdResult = {
  name: string;
  description: string;
  targetUser: string;
  coreFeatures: string;
  mvpConstraints: string;
  monetizationModel: string;
  documentContent: string;
};

function hasRequiredPrdSections(documentContent: string) {
  return REQUIRED_PRD_SECTIONS.every(section => {
    const escapedSection = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^##\\s+(?:\\d+[.)]?\\s+)?${escapedSection}\\s*$`, 'im').test(documentContent);
  });
}

function isProductionReadyPRD(value: unknown): value is PrdResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const candidate = value as Record<string, unknown>;
  const requiredFields: Array<keyof PrdResult> = [
    'name',
    'description',
    'targetUser',
    'coreFeatures',
    'mvpConstraints',
    'monetizationModel',
    'documentContent',
  ];

  return requiredFields.every(field => typeof candidate[field] === 'string' && candidate[field].trim().length > 0)
    && hasRequiredPrdSections(candidate.documentContent as string);
}

export function synthesizeFallbackPRD(chatHistory: string): PrdResult {
  const lines = chatHistory.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const userLines = lines
    .filter(l => /^user:/i.test(l))
    .map(l => l.replace(/^user:\s*/i, '').trim());

  const primaryIdea = userLines[0] || 'Aplikasi Web & Mobile Terintegrasi';
  const words = primaryIdea.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  const name = words.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Vibework System';
  const description = primaryIdea.length > 120 ? primaryIdea.slice(0, 117) + '...' : primaryIdea;

  const targetUser = userLines[1] || 'Pengguna utama yang mengalami masalah ini dan operator yang mengelola hasilnya.';
  const coreFeatures = userLines.length > 1
    ? userLines.slice(1).map(u => `- ${u}`).join('\n')
    : `- Alur utama untuk menyelesaikan masalah inti\n- Penyimpanan status dan riwayat yang dapat ditinjau\n- Akses operator untuk menangani pengecualian`;

  const mvpConstraints = `- MVP mencakup satu alur utama dan peran minimum yang diperlukan\n- Jangan menambahkan integrasi eksternal sebelum kontrak dan kebutuhan akses disepakati\n- Data harus dapat diekspor atau dimigrasikan tanpa kehilangan status penting`;

  const monetizationModel = 'Model bisnis belum ditentukan; validasi willingness-to-pay atau nilai operasional sebelum memilih pricing.';

  const documentContent = `# Product Requirements Document (PRD)

## Problem & Context
**Project Name:** ${name}
**Description:** ${description}
- **Problem:** Pengguna membutuhkan cara yang lebih jelas dan dapat ditindaklanjuti untuk menyelesaikan kebutuhan yang dirangkum dalam brief.
- **Context:** Detail di bawah berasal dari brief; asumsi yang belum tervalidasi ditandai pada bagian open questions.

## Goals & Non-Goals
- **Goals:** Selesaikan alur inti dengan status yang dapat dilacak, kurangi pekerjaan manual, dan sediakan dasar yang aman untuk iterasi.
- **Non-goals:** Multi-region, otomasi berisiko tinggi, dan integrasi tambahan di luar alur MVP sebelum ada validasi kebutuhan.

## Target Users & Jobs
- **Primary user:** ${targetUser}
- **Job to be done:** Memulai kebutuhan, menerima hasil/status yang jelas, lalu menyelesaikan atau menyerahkan pengecualian.
- **Operator/admin job:** Mengawasi status, memperbaiki kegagalan, dan mengelola akses tanpa melihat data yang tidak diperlukan.

## Scope, MVP & Out of Scope
- **In scope:** Alur utama, autentikasi dan otorisasi minimum, persistensi status, penanganan gagal, serta audit event penting.
- **MVP:**
${coreFeatures}

## Prioritized Functional Requirements & Acceptance Criteria
1. **P0 — Jalankan alur inti:** Pengguna dapat memulai, mengubah input yang valid, dan melihat status hasil. **Acceptance:** happy path selesai; input invalid ditolak dengan pesan yang dapat diperbaiki; refresh tidak menghilangkan status tersimpan.
2. **P0 — Kelola akses:** Sistem membatasi data dan aksi sesuai peran. **Acceptance:** pengguna tanpa izin menerima respons aman dan tidak dapat membaca atau mengubah resource milik pihak lain.
3. **P1 — Tangani pengecualian:** Pengguna dapat retry aman atau menyerahkan kasus ke operator. **Acceptance:** kegagalan dapat diidentifikasi, tidak membuat duplikasi, dan meninggalkan riwayat yang dapat ditelusuri.
4. **P1 — Observability:** Operator dapat mencari status proses dan event penting. **Acceptance:** event memiliki actor, action, resource, waktu, dan correlation identifier tanpa secret.

## Key User Journeys & UX States
- **Journey utama:** Masuk/identifikasi → masukkan kebutuhan → validasi → proses → tinjau hasil → konfirmasi atau koreksi.
- **Loading:** tampilkan status proses dan cegah submit ganda; sediakan cancel bila operasi mendukung pembatalan.
- **Empty:** jelaskan belum ada data dan tampilkan aksi pertama yang relevan.
- **Error:** jelaskan dampak dan langkah pemulihan; jangan tampilkan stack trace, token, atau data sensitif.

## Domain/Data Entities & Relationships
- **User/Actor:** identitas dan peran; memiliki banyak session atau request.
- **Workspace/Organization:** batas kepemilikan dan akses; memiliki banyak user dan resource.
- **Request/Task:** input, status, actor, timestamps, dan idempotency key; terkait satu workspace.
- **Result/Event:** keluaran atau perubahan status; terkait request dan dicatat dalam audit trail.
- Relationship dan cardinality final harus dikonfirmasi sebelum migrasi schema.

## Integration & API Assumptions
- Endpoint menggunakan kontrak versioned, schema validation, auth context, idempotency untuk mutasi, dan error code yang stabil.
- Provider eksternal dianggap unavailable atau partial-failure; timeout, rate limit, retry policy, dan webhook signature harus ditetapkan per integrasi.
- Jangan menganggap delivery webhook, ordering event, atau format provider sebagai guaranteed tanpa dokumentasi/contract test.

## Non-Functional Requirements
- **Security/privacy:** least privilege, TLS saat transit, secret di secret store, validasi input, audit akses, minimisasi data, retention dan deletion policy yang terdokumentasi.
- **Accessibility:** keyboard support, focus yang terlihat, semantic labels, kontras memadai, dan pesan error yang terhubung ke field.
- **Performance:** ukur latency dan error rate pada alur inti; hindari pekerjaan blocking dan sediakan pagination untuk collection.
- **Reliability:** operasi mutasi idempotent, observability tanpa data sensitif, dan recovery path yang terdokumentasi.

## Analytics & Success Metrics
- Instrument event request_started, request_completed, request_failed, handoff_or_retry, dan outcome utama dengan actor/resource yang dianonimkan bila perlu.
- Success metrics: completion rate alur inti, time-to-complete, failure/recovery rate, repeat usage, dan operator resolution rate.
- Tetapkan baseline, target, window pengukuran, dan privacy review sebelum dashboard dianggap authoritative.

## Risks & Dependencies
- **Risks:** kebutuhan brief belum tervalidasi, kualitas input bervariasi, provider timeout/rate limit, akses data berlebih, dan scope creep.
- **Dependencies:** keputusan auth/roles, schema dan retention, provider contract, observability, serta owner untuk support dan incident response.
- Mitigasi awal: spike kontrak, threat modeling, fixture edge case, feature flag, dan runbook pemulihan.

## Open Questions & Assumptions
- Siapa decision maker dan owner operasi setelah launch?
- Data apa yang sensitif, berapa lama disimpan, dan di wilayah mana diproses?
- Apakah integrasi/provider, SLA, volume, dan kebutuhan offline sudah ditentukan?
- Asumsi saat ini: MVP memakai satu alur utama, satu deployment region, dan operator dapat menangani pengecualian secara manual.

## Release & Rollout Considerations
- Rilis bertahap di balik feature flag dengan migration yang backward-compatible dan rollback plan yang diuji.
- Mulai dari internal/pilot cohort, pantau error, completion, latency, dan feedback; perluas akses hanya setelah acceptance dan privacy checks lulus.
- Siapkan support runbook, audit/log retention, incident owner, changelog, dan komunikasi perubahan sebelum general availability.

## Summary Fields
**Project Name:** ${name}
**Operating model:** ${monetizationModel}
**Constraints:**
${mvpConstraints}
`;

  return {
    name,
    description,
    targetUser,
    coreFeatures,
    mvpConstraints,
    monetizationModel,
    documentContent,
  };
}

export function synthesizeFallbackFlowchart(prdContent: string) {
  const nodes = [
    { id: 'landing', label: 'Landing & Onboarding', description: 'Halaman pengenalan produk, value proposition, dan tombol login/registrasi' },
    { id: 'auth', label: 'Autentikasi & Akun', description: 'Alur pendaftaran, verifikasi, dan manajemen sesi pengguna' },
    { id: 'dashboard', label: 'Dashboard Utama', description: 'Pusat navigasi, ringkasan metrik, dan akses cepat fitur inti' },
    { id: 'workspace', label: 'Ruang Kerja Fitur', description: 'Alur interaksi fungsionalitas utama aplikasi sesuai spesifikasi PRD' },
    { id: 'analytics', label: 'Laporan & Riwayat', description: 'Tinjauan status, riwayat transaksi, dan laporan aktivitas' },
    { id: 'settings', label: 'Pengaturan & Profil', description: 'Konfigurasi preferensi, notifikasi, dan pengelolaan hak akses' }
  ];

  const edges = [
    { source: 'landing', target: 'auth', label: 'Daftar / Masuk' },
    { source: 'auth', target: 'dashboard', label: 'Autentikasi Berhasil' },
    { source: 'dashboard', target: 'workspace', label: 'Buka Fitur Inti' },
    { source: 'workspace', target: 'analytics', label: 'Simpan / Selesai' },
    { source: 'analytics', target: 'dashboard', label: 'Kembali ke Dashboard' },
    { source: 'dashboard', target: 'settings', label: 'Kelola Profil' },
    { source: 'settings', target: 'dashboard', label: 'Kembali' }
  ];

  return { nodes, edges };
}

export function synthesizeFallbackADR(prdContent: string) {
  return {
    frontendStack: 'Next.js 16 (App Router), React 19, Tailwind CSS, TypeScript',
    backendStack: 'Next.js Route Handlers, Node.js runtime, Drizzle ORM',
    database: 'SQLite (better-sqlite3) untuk latensi ultra-cepat / PostgreSQL siap migrasi',
    deployment: 'Vercel Platform / Docker Container',
    adrDocument: `# Architecture Decision Record (ADR)

## Context
Aplikasi membutuhkan fondasi arsitektur modern yang responsif, modular, dan terstruktur rapi untuk mempermudah pengembangan lanjutan oleh AI coding agent maupun tim engineer manusia.

## Decision
1. **Frontend**: Next.js 16 App Router dengan React Server Components (RSC) untuk performa render optimal dan SEO kuat.
2. **Styling**: Tailwind CSS untuk sistem token yang konsisten dan pemeliharaan antarmuka yang bersih.
3. **Backend & Database**: Next.js Route Handlers yang dikombinasikan dengan Drizzle ORM untuk type-safe queries.
4. **Data Validation**: Defensive typing dan skema validasi ketat pada setiap payload endpoint.

## Consequences
- Kecepatan pemuatan tinggi dengan latensi render minimal.
- Kemudahan integrasi ke berbagai AI coding assistants berkat struktur repositori yang terstandarisasi.
`
  };
}

export function synthesizeFallbackAgentsMd(prdContent: string, adrContent: string) {
  return {
    agentsDocument: `# Project Mission & Identity
Anda adalah Senior AI Pair Programmer untuk proyek ini. Tugas Anda adalah membangun fitur aplikasi secara modular, type-safe, dan sesuai dengan spesifikasi PRD & ADR.

## Architecture & Tech Stack Rules
- Gunakan Next.js App Router dengan TypeScript secara konsisten.
- Gunakan Tailwind CSS untuk antarmuka yang bersih dan responsif.
- Pastikan semua route handler melakukan validasi defensif pada input data.

## AI Confidence Guardrails & Anti-Hallucination
- CRITICAL GUARDRAIL: Ketika membangun atau memodifikasi alur data otomatis, JANGAN PERNAH mengabaikan batas kepercayaan AI. Jika data rusak atau konteks tidak terbaca, sistem WAJIB membatalkan aksi dan beralih ke kondisi netral yang aman.

## Code Standards & Implementation Hygiene
- Jangan gunakan kode pura-pura (placeholder/stub) pada fungsi inti.
- Pertahankan penanganan error yang jelas dan tipe data eksplisit.
- Selalu uji endpoint dan komponen sebelum menyelesaikan pekerjaan.
`
  };
}

async function callQwen(
  systemPrompt: string,
  userPrompt: string,
  options: { maxTokens?: number; timeoutMs?: number; temperature?: number } = {}
) {
  const apiKeys = getApiKeys();

  if (apiKeys.length === 0) {
    throw new Error("No API keys configured.");
  }

  const payload = {
    model: process.env.WORKFLOW_MODEL_NAME || process.env.AI_MODEL_NAME || 'alims-intl/deepseek-v4-flash',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 4096,
    stream: false,
  };

  const baseUrl = (process.env.OPENAI_BASE_URL || '').replace(/\/+$/, '');
  const timeoutLimit = options.timeoutMs ?? GENERATION_TIMEOUT_MS;
  const deadline = Date.now() + TOTAL_GENERATION_BUDGET_MS;
  let lastError: Error | null = null;

  for (const apiKey of apiKeys) {
    if (Date.now() >= deadline) break;

    // Retry up to 2 attempts per key on transient timeouts/resets
    for (let attempt = 1; attempt <= 2; attempt++) {
      const remainingTime = deadline - Date.now();
      if (remainingTime <= 0) break;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), Math.min(timeoutLimit, remainingTime));
      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          throw new Error(`HTTP Error ${response.status}: ${errText.slice(0, 300)}`);
        }

        const rawBody = await response.text();
        let data: unknown;
        try {
          data = JSON.parse(rawBody);
        } catch {
          const jsonMatch = extractFirstJsonObject(rawBody);
          data = JSON.parse(jsonMatch);
        }

        if (!data || typeof data !== 'object' || !('choices' in data) || !Array.isArray(data.choices)) {
          throw new Error('AI provider returned an invalid response structure.');
        }
        const choice = data.choices[0];
        if (!choice || typeof choice !== 'object' || !('message' in choice) || !choice.message || typeof choice.message !== 'object') {
          throw new Error('AI provider returned no message choice.');
        }
        const message = choice.message as Record<string, unknown>;
        let textContent = typeof message.content === 'string' ? message.content : '';
        if (!textContent && typeof message.reasoning_content === 'string') {
          textContent = message.reasoning_content;
        }
        if (!textContent.trim()) throw new Error('AI provider returned an empty message.');
        
        // Extract exact JSON object
        const cleanText = extractFirstJsonObject(textContent.trim());

        try {
          return JSON.parse(cleanText);
        } catch {
          const repaired = cleanText
            .replace(/,\s*([}\]])/g, '$1')
            .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]+/g, ' ');
          try {
            return JSON.parse(repaired);
          } catch {
            // If unescaped newlines within string values caused the error, escape them
            const escaped = repaired.replace(/(?<=:\s*"[^"]*)\r?\n(?=[^"]*")/g, '\\n');
            return JSON.parse(escaped);
          }
        }
      } catch (error: unknown) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        lastError = normalizedError.name === 'AbortError' ? new AiGenerationTimeoutError() : normalizedError;
        if (lastError instanceof AiGenerationTimeoutError) {
          break; // Don't waste another cycle if upstream timed out; proceed to the next key
        }
        if (attempt < 2) {
          const retryDelay = Math.min(800, Math.max(0, deadline - Date.now()));
          if (retryDelay > 0) {
            await new Promise(r => setTimeout(r, retryDelay));
          }
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }
  }

  if (Date.now() >= deadline) {
    throw new AiGenerationTimeoutError();
  }

  const caughtError = lastError as Error | null;
  if (caughtError instanceof AiGenerationTimeoutError) throw caughtError;
  const message = caughtError?.message || 'Connection error';
  throw new Error(`Gagal memanggil AI Service (${message}). Periksa apakah gateway di ${baseUrl || 'endpoint'} sudah aktif.`);
}


export async function generatePRD(chatHistory: string) {
  const systemPrompt = `You are an expert Product Manager and System Architect. Analyze the interview transcript and produce a concise, production-ready PRD.

Use direct Indonesian or neutral English. Ground decisions in the transcript. If information is missing, state a practical assumption or open question; do not invent customer evidence, numbers, SLAs, legal claims, or implementation details as facts. Make requirements testable and prioritize them as P0/P1/P2. Keep every section high-density and avoid filler.

Return ONLY one valid JSON object: no markdown code fence, commentary, or extra keys. Preserve this exact schema and keep the two list fields as Markdown strings, not arrays:
{
  "name": "Short project name, max 3 words",
  "description": "One-sentence problem/value description",
  "targetUser": "Detailed target audience",
  "coreFeatures": "Markdown bullet-list STRING of prioritized MVP features",
  "mvpConstraints": "Markdown bullet-list STRING of scope and technical constraints",
  "monetizationModel": "Monetization or operating model; state if undecided",
  "documentContent": "Markdown PRD using the required sections below"
}

documentContent MUST contain these exact, standalone level-2 Markdown headings, each followed by concrete, brief content (put guidance in the body, not on the heading line):
## Problem & Context — problem, evidence/context available, and boundaries.
## Goals & Non-Goals — outcomes and explicit exclusions.
## Target Users & Jobs — primary/secondary users and jobs to be done.
## Scope, MVP & Out of Scope — MVP capabilities and exclusions.
## Prioritized Functional Requirements & Acceptance Criteria — numbered P0/P1/P2 requirements; each has observable acceptance criteria.
## Key User Journeys & UX States — key journeys plus explicit loading, empty, and error behavior.
## Domain/Data Entities & Relationships — entities, ownership, lifecycle, and relationships/cardinality where known.
## Integration & API Assumptions — endpoint/provider boundaries, payload/auth/idempotency/error assumptions, and unknowns.
## Non-Functional Requirements — actionable security, privacy, accessibility, performance, reliability, and observability requirements without fake targets.
## Analytics & Success Metrics — events, metric definitions, baseline/target gaps, and privacy considerations.
## Risks & Dependencies — risk, impact, mitigation, and external/internal dependencies.
## Open Questions & Assumptions — unresolved decisions and clearly labeled assumptions.
## Release & Rollout Considerations — readiness checks, migration/rollback, feature flags, pilot/rollout, and operations.

Do not omit a required heading because the transcript is short. The document may be compact, but it must be actionable for design, engineering, QA, security review, analytics, and release planning.`;

  try {
    const result = await callQwen(systemPrompt, chatHistory, { maxTokens: 4096 });
    if (!isProductionReadyPRD(result)) {
      throw new Error('AI provider returned a PRD without the required contract or sections.');
    }
    return result;
  } catch (err) {
    console.warn('generatePRD primary LLM failed, using intelligent fallback synthesizer:', err);
    return synthesizeFallbackPRD(chatHistory);
  }
}

export async function generateADR(prdContent: string) {
  const systemPrompt = `You are an expert System Architect. 
Based on the provided Product Requirements Document (PRD), choose the best technology stack and generate an Architecture Decision Record (ADR).
Keep the specifications high-density, actionable, and concise.
You MUST return ONLY a valid JSON object. Do not include markdown \`\`\`json codeblocks.
Schema:
{
  "frontendStack": "e.g., Next.js, React, React Native",
  "backendStack": "e.g., Node.js, Next.js API, Python",
  "database": "e.g., PostgreSQL, SQLite, MongoDB",
  "deployment": "e.g., Vercel, AWS, Fly.io",
  "adrDocument": "A detailed Markdown document explaining the architecture choices, diagrams if possible, and rationale based on the PRD."
}`;
  try {
    return await callQwen(systemPrompt, prdContent, { maxTokens: 3072 });
  } catch (err) {
    console.warn('generateADR primary LLM failed, using fallback synthesizer:', err);
    return synthesizeFallbackADR(prdContent);
  }
}

export async function generateSchema(prdContent: string, adrContent: string) {
  const systemPrompt = `You are an expert Database Designer and API Architect. Generate only the MVP database schema and API contract grounded in the PRD and ADR.

Database schema requirements: include MVP entities only; for each table include columns and types, primary keys, foreign keys, nullability, unique constraints, indexes, and relationships/cardinality.
API requirements: include endpoints needed for the core user journey, with compact request and response shapes, method, path, and a short purpose.

Return ONLY one valid JSON object with this exact shape:
{
  "dbSchema": "Compact Markdown schema specification",
  "apiContract": { "endpoints": [ { "method": "GET", "path": "/api/...", "description": "...", "req": {}, "res": {} } ] }
}

Do not include examples, tutorials, filler prose, or repeated explanations. Do not add non-MVP entities or speculative endpoints. Do not include markdown code fences around the JSON.`;
  return callQwen(
    systemPrompt,
    `PRD:\n${prdContent}\n\nADR:\n${adrContent}`,
    { maxTokens: SCHEMA_GENERATION_MAX_TOKENS, timeoutMs: SCHEMA_GENERATION_TIMEOUT_MS },
  );
}

export async function generateAtomicPrompts(prdContent: string, adrContent: string, schemaContent: string) {
  const systemPrompt = `You are an expert AI Coding Manager. 
Based on the PRD, ADR, and Database Schema, break down the project implementation into a CONCISE implementation plan of "Atomic Prompts" (AT MOST 10 prompts, covering only the core MVP flow). Each prompt will be given to a Junior AI Coder to implement.
Respond with the JSON immediately and keep it compact: at most 10 prompts (core MVP flow only), one short plain-text sentence per field (title <= 8 words, every other field <= 25 words), no markdown inside fields.
You MUST return ONLY a valid JSON object. Do not include markdown \`\`\`json codeblocks.
The JSON must have this exact schema:
{
  "prompts": [
    {
      "title": "Short title, e.g., Setup Project",
      "context": "Context for the AI coder",
      "task": "Specific task instruction",
      "constraints": "Important constraints (e.g., use Tailwind, no classes)",
      "format": "Expected output format",
      "dependencies": ["List of previous prompt titles this depends on"],
      "executionOrder": 1
    }
  ]
}`;
  // ponytail: 2048 caps decode time inside the shared 80s budget (~10 concise prompts fit with headroom); raise when real plans legitimately need more.
  return callQwen(systemPrompt, `PRD:\n${prdContent}\n\nADR:\n${adrContent}\n\nSCHEMA:\n${schemaContent}`, { maxTokens: 2048 });
}

export async function generateAppFlowchart(prdContent: string) {
  const systemPrompt = `You are an expert UX Designer and System Analyst.
Based on the provided Product Requirements Document (PRD), generate a logical flowchart of the Application's User Journey and Business Logic (e.g. Splash Screen -> Login -> Dashboard -> Add Transaction).
You MUST return ONLY a valid JSON object. Do not include markdown \`\`\`json codeblocks.
CRITICAL RULES:
1. The graph MUST be fully connected. No disconnected nodes (e.g. Login MUST connect to Dashboard on success).
2. Ensure cyclical paths (like going back to a previous screen) are logically correct and explicitly stated in edges.
3. Keep the node IDs simple and lowercase (e.g., 'login', 'home', 'settings').
4. Every node MUST have a non-empty description, and every edge MUST have a non-empty label.

The JSON must have this exact schema:
{
  "nodes": [
    { "id": "login", "label": "Login Screen", "description": "User enters credentials" }
  ],
  "edges": [
    { "source": "login", "target": "dashboard", "label": "On Success" }
  ]
}`;
  try {
    return await callQwen(systemPrompt, `PRD:\n${prdContent}`, { maxTokens: 2560 });
  } catch (err) {
    console.warn('generateAppFlowchart primary LLM failed, using fallback synthesizer:', err);
    return synthesizeFallbackFlowchart(prdContent);
  }
}

export async function generateAgentsMd(prdContent: string, adrContent: string) {
  const systemPrompt = `You are a Principal AI Agent Architect and DevOps Lead.
Based on the provided Product Requirements Document (PRD) and Architecture Decision Record (ADR), generate a complete, high-quality AGENTS.md file.
This file serves as the strict operating manual for AI coding agents (such as Cursor, Windsurf, Claude Code, Antigravity, GitHub Copilot) working in this project's repository.

MANDATORY SECTIONS TO INCLUDE IN THE MARKDOWN:
1. # Project Mission & Identity (Role definition of the AI pair programmer)
2. ## Architecture & Tech Stack Rules (Strict conventions based on the ADR)
3. ## AI Confidence Guardrails & Anti-Hallucination
   - CRITICAL GUARDRAIL: When building or modifying aggressive, automated, or critical data flows, NEVER allow automated modes to unconditionally override AI confidence or safety guardrails. If data is corrupted, context is missing, or confidence is low, the agent MUST abort the action and fall back to a safe neutral state.
4. ## Code Standards & Implementation Hygiene
   - No placeholders, mock-only shortcuts, or code truncation.
   - Strict typing, explicit error boundaries, and defensive API validation.
5. ## Directory Conventions & Key File Architecture
6. ## Testing & Verification Commands

You MUST return ONLY a valid JSON object. Do not include markdown \`\`\`json codeblocks.
Schema:
{
  "agentsDocument": "A complete, beautifully formatted Markdown string of the AGENTS.md document."
}`;
  try {
    return await callQwen(systemPrompt, `PRD:\n${prdContent}\n\nADR:\n${adrContent}`, { maxTokens: 3584 });
  } catch (err) {
    console.warn('generateAgentsMd primary LLM failed, using fallback synthesizer:', err);
    return synthesizeFallbackAgentsMd(prdContent, adrContent);
  }
}

export function compileMasterPromptMd(params: {
  projectName: string;
  prdContent?: string | null;
  adrContent?: string | null;
  dbSchema?: string | null;
  apiContract?: any;
  agentsDocument?: string | null;
  prompts?: Array<{
    title: string;
    context: string;
    task: string;
    constraints: string;
    format: string;
    dependencies?: string[] | null;
    executionOrder: number;
  }> | null;
}): string {
  const { projectName, prdContent, adrContent, dbSchema, apiContract, agentsDocument, prompts } = params;
  const safePrompts = prompts || [];

  let doc = `# Master Execution Prompt: ${projectName}\n\n`;
  doc += `> Generated by Vibework Studio. This document contains the master briefing and step-by-step atomic prompts to build the project with any AI coding agent.\n\n`;

  if (agentsDocument) {
    doc += `## 🤖 AI Agent Directive & Guardrails\n\n${agentsDocument.trim()}\n\n---\n\n`;
  }

  if (adrContent) {
    doc += `## 🏛️ Architecture & Tech Stack (ADR)\n\n${adrContent.trim()}\n\n---\n\n`;
  }

  if (dbSchema) {
    doc += `## 🗄️ Database Schema & Contract\n\n${dbSchema.trim()}\n\n`;
    if (apiContract && Array.isArray(apiContract.endpoints)) {
      doc += `### API Endpoints\n\n\`\`\`json\n${JSON.stringify(apiContract.endpoints, null, 2)}\n\`\`\`\n\n`;
    }
    doc += `---\n\n`;
  }

  if (safePrompts.length > 0) {
    doc += `## ⚡ Step-by-Step Atomic Prompts\n\n`;
    doc += `Execute each prompt in order in your coding assistant:\n\n`;
    safePrompts.forEach((p) => {
      doc += `### Prompt ${p.executionOrder}: ${p.title}\n\n`;
      doc += `**Context:** ${p.context}\n\n`;
      doc += `**Task:** ${p.task}\n\n`;
      doc += `**Constraints:** ${p.constraints}\n\n`;
      doc += `**Expected Output:** ${p.format}\n\n`;
      if (p.dependencies && p.dependencies.length > 0) {
        doc += `**Dependencies:** ${p.dependencies.join(', ')}\n\n`;
      }
      doc += `---\n\n`;
    });
  } else if (prdContent) {
    doc += `## 📋 Product Requirements Document (PRD)\n\n${prdContent.trim()}\n\n`;
  }

  return doc.trim();
}

export function isMachineLearningTopic(topic: string) {
  const normalized = topic.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return /\b(?:machine learning|data science|ml|mlops)\b/.test(normalized);
}

export function createRoadmapSlug(topic: string) {
  return topic.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 80) || 'topic';
}

function createFallbackRoadmap(topic: string, language: string) {
  const cleanTopic = topic.trim();
  const capTopic = cleanTopic.charAt(0).toUpperCase() + cleanTopic.slice(1);
  const slug = createRoadmapSlug(cleanTopic);
  const isIndonesian = language !== 'en';
  const localize = (indonesian: string, english: string) => isIndonesian ? indonesian : english;

  if (!isIndonesian && isMachineLearningTopic(cleanTopic)) {
    return {
      title: "Machine Learning & AI Engineering Roadmap",
      description: "Complete, step-by-step roadmap from absolute basics (Math & Python) to Supervised Learning, Deep Learning, Transformers, and MLOps Production.",
      sections: [
        {
          sectionName: "1. Introduction & Mathematical Foundations",
          order: 1,
          groups: [
            {
              groupName: "Basics & Prerequisites",
              side: "left",
              topics: [
                {
                  nodeId: "ml_what_is",
                  title: "What is Machine Learning?",
                  description: "Overview of ML paradigms: Supervised, Unsupervised, & Reinforcement Learning.",
                  category: "required",
                  prerequisites: [],
                  contentMarkdown: "# What is Machine Learning?\n\nMachine learning is a subset of artificial intelligence focused on building systems that learn from data to improve performance without explicit programming.\n\n### Core Paradigms:\n- **Supervised Learning**: Learning with labeled data (Regression & Classification).\n- **Unsupervised Learning**: Finding hidden patterns in unlabeled data (Clustering & Dimensionality Reduction).\n- **Reinforcement Learning**: Agent learning through trial, reward, and punishment.",
                  quiz: [
                    {
                      id: "q1",
                      question: "Which ML paradigm uses labeled input-output data pairs?",
                      options: ["Supervised Learning", "Unsupervised Learning", "Reinforcement Learning", "Self-Organizing Maps"],
                      correctAnswerIndex: 0,
                      explanation: "Supervised learning relies on labeled training data pairs."
                    }
                  ]
                },
                {
                  nodeId: "ml_math_linear_algebra",
                  title: "Linear Algebra for ML",
                  description: "Vectors, matrices, dot products, eigenvalues, and eigenvectors.",
                  category: "required",
                  prerequisites: ["ml_what_is"],
                  contentMarkdown: "# Linear Algebra in Machine Learning\n\nLinear algebra provides the mathematical language for vector spaces and matrix operations used in neural networks and ML models.\n\n### Key Concepts:\n- **Vectors & Matrices**: High-dimensional data representation.\n- **Dot Products & Matrix Multiplication**: Weight transforms and projections.\n- **Eigenvalues & Eigenvectors**: Principal component analysis (PCA).",
                  quiz: [
                    {
                      id: "q2",
                      question: "What mathematical structure represents weights and dataset features in ML?",
                      options: ["Matrices & Tensors", "Scalar integers", "Strings", "Linked Lists"],
                      correctAnswerIndex: 0,
                      explanation: "Matrices and Tensors are used to store and transform feature matrices and model weights."
                    }
                  ]
                },
                {
                  nodeId: "ml_math_calculus",
                  title: "Calculus & Optimization",
                  description: "Derivatives, partial derivatives, gradients, and Gradient Descent.",
                  category: "required",
                  prerequisites: ["ml_math_linear_algebra"],
                  contentMarkdown: "# Calculus & Gradient Descent\n\nCalculus is essential for understanding how machine learning algorithms optimize loss functions.\n\n### Key Concepts:\n- **Gradients**: Direction of steepest ascent.\n- **Gradient Descent**: Iteratively updating weights to minimize loss (`W = W - alpha * grad`).\n- **Learning Rate (alpha)**: Step size during optimization.",
                  quiz: [
                    {
                      id: "q3",
                      question: "What does the gradient of a loss function represent?",
                      options: ["Direction of steepest increase in loss", "The accuracy score", "The number of parameters", "The dataset size"],
                      correctAnswerIndex: 0,
                      explanation: "The gradient points in the direction of the steepest increase; gradient descent moves in the opposite direction."
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          sectionName: "2. Python & Data Preprocessing",
          order: 2,
          groups: [
            {
              groupName: "Python Ecosystem & EDA",
              side: "right",
              topics: [
                {
                  nodeId: "ml_python_numpy_pandas",
                  title: "Python, NumPy & Pandas",
                  description: "Data manipulation, vectorized arrays, and DataFrame operations.",
                  category: "required",
                  prerequisites: ["ml_what_is"],
                  contentMarkdown: "# Python Data Stack\n\nPython is the industry standard language for Machine Learning.\n\n### Essential Libraries:\n- **NumPy**: Fast N-dimensional array processing.\n- **Pandas**: DataFrame manipulation, filtering, and aggregation.\n- **Matplotlib / Seaborn**: Exploratory Data Analysis (EDA) visualization.",
                  quiz: [
                    {
                      id: "q4",
                      question: "Which library is primary for fast N-dimensional numerical array calculations in Python?",
                      options: ["NumPy", "Django", "Requests", "Flask"],
                      correctAnswerIndex: 0,
                      explanation: "NumPy provides high-performance vector and array computations."
                    }
                  ]
                },
                {
                  nodeId: "ml_data_preprocessing",
                  title: "Feature Scaling & Encoding",
                  description: "Handling missing values, One-Hot Encoding, StandardScaler, and MinMax.",
                  category: "required",
                  prerequisites: ["ml_python_numpy_pandas"],
                  contentMarkdown: "# Feature Engineering & Cleaning\n\nRaw data must be cleaned and transformed before feeding it into ML algorithms.\n\n### Key Steps:\n- **Categorical Encoding**: One-Hot Encoding vs Label Encoding.\n- **Feature Scaling**: StandardScaler (mean=0, std=1) & MinMax (0 to 1).\n- **Missing Values**: Mean/Median imputation.",
                  quiz: [
                    {
                      id: "q5",
                      question: "Why is Feature Scaling necessary for gradient-based ML algorithms?",
                      options: [
                        "It prevents features with large numeric scales from dominating model training",
                        "It deletes missing rows",
                        "It converts text into audio",
                        "It encrypts the dataset"
                      ],
                      correctAnswerIndex: 0,
                      explanation: "Feature scaling ensures balanced gradient updates across all features."
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          sectionName: "3. Classical Supervised Learning",
          order: 3,
          groups: [
            {
              groupName: "Regression & Classification",
              side: "left",
              topics: [
                {
                  nodeId: "ml_linear_logistic_regression",
                  title: "Linear & Logistic Regression",
                  description: "Ordinary Least Squares, Sigmoid function, Cost functions, and L1/L2 Regularization.",
                  category: "required",
                  prerequisites: ["ml_data_preprocessing"],
                  contentMarkdown: "# Linear & Logistic Regression\n\n- **Linear Regression**: Predicts continuous numerical values (`y = WX + b`).\n- **Logistic Regression**: Predicts probabilities for binary classification using the Sigmoid function (`1 / (1 + e^-z)`).\n- **Regularization**: L1 (Lasso) for feature selection, L2 (Ridge) for preventing overfitting.",
                  quiz: [
                    {
                      id: "q6",
                      question: "What function maps linear outputs into a 0 to 1 probability range for Logistic Regression?",
                      options: ["Sigmoid Function", "ReLU Function", "Linear Identity", "Step Function"],
                      correctAnswerIndex: 0,
                      explanation: "The Sigmoid function maps real numbers to probabilities between 0 and 1."
                    }
                  ]
                },
                {
                  nodeId: "ml_decision_trees_ensembles",
                  title: "Decision Trees & Random Forests",
                  description: "Gini Impurity, Information Gain, Bagging, and Ensemble Learning.",
                  category: "required",
                  prerequisites: ["ml_linear_logistic_regression"],
                  contentMarkdown: "# Decision Trees & Ensemble Methods\n\n- **Decision Trees**: Tree structures making decisions based on feature thresholds (Gini impurity / Entropy).\n- **Random Forests**: Ensemble of decision trees trained on random subsets of data and features (Bagging).",
                  quiz: [
                    {
                      id: "q7",
                      question: "How does a Random Forest reduce variance and overfitting compared to a single Decision Tree?",
                      options: [
                        "By averaging predictions across multiple random decision trees (Bagging)",
                        "By dropping all non-linear features",
                        "By using a single linear line",
                        "By increasing tree depth infinitely"
                      ],
                      correctAnswerIndex: 0,
                      explanation: "Random Forest combines predictions from multiple trees trained on bootstrapped data subsets."
                    }
                  ]
                },
                {
                  nodeId: "ml_boosting_xgboost",
                  title: "Gradient Boosting (XGBoost, LightGBM)",
                  description: "Boosting mechanisms, sequential error correction, XGBoost, and LightGBM.",
                  category: "recommended",
                  prerequisites: ["ml_decision_trees_ensembles"],
                  contentMarkdown: "# Gradient Boosting Machines\n\nBoosting trains trees sequentially, where each new tree focuses on correcting the errors made by previous trees.\n\n### Leading Frameworks:\n- **XGBoost**: Extreme Gradient Boosting with regularization.\n- **LightGBM**: Fast leaf-wise tree growth.\n- **CatBoost**: Optimized for categorical data.",
                  quiz: [
                    {
                      id: "q8",
                      question: "What is the key difference between Bagging (Random Forest) and Boosting (XGBoost)?",
                      options: [
                        "Bagging trains trees independently in parallel; Boosting trains trees sequentially to correct prior errors",
                        "Bagging uses neural networks",
                        "Boosting only works on unlabelled data",
                        "Bagging requires GPU hardware"
                      ],
                      correctAnswerIndex: 0,
                      explanation: "Boosting works sequentially, fitting each new model to residual errors of prior models."
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          sectionName: "4. Unsupervised Learning & Clustering",
          order: 4,
          groups: [
            {
              groupName: "Clustering & Dimensionality Reduction",
              side: "right",
              topics: [
                {
                  nodeId: "ml_kmeans_clustering",
                  title: "K-Means & DBSCAN Clustering",
                  description: "Group unlabelled data, Elbow Method, Silhouette Score, and Density Clustering.",
                  category: "required",
                  prerequisites: ["ml_data_preprocessing"],
                  contentMarkdown: "# Clustering Algorithms\n\n- **K-Means**: Partitions data into K clusters based on centroid distance.\n- **DBSCAN**: Density-based clustering that discovers arbitrary shapes and isolates noise points.",
                  quiz: [
                    {
                      id: "q9",
                      question: "Which metric is commonly used to find the optimal number of clusters (K) in K-Means?",
                      options: ["Elbow Method / Inertia", "Accuracy Score", "Confusion Matrix", "Learning Rate"],
                      correctAnswerIndex: 0,
                      explanation: "The Elbow Method plots inertia against K to identify the point of diminishing returns."
                    }
                  ]
                },
                {
                  nodeId: "ml_pca_dimensionality_reduction",
                  title: "PCA & Dimensionality Reduction",
                  description: "Principal Component Analysis, Variance Explanation, t-SNE, and UMAP.",
                  category: "recommended",
                  prerequisites: ["ml_kmeans_clustering"],
                  contentMarkdown: "# Principal Component Analysis (PCA)\n\nPCA projects high-dimensional datasets onto lower-dimensional orthogonal components while preserving maximum variance.",
                  quiz: [
                    {
                      id: "q10",
                      question: "What is the primary goal of PCA in machine learning?",
                      options: [
                        "Reducing feature dimensions while preserving maximum data variance",
                        "Labeling unlabelled data automatically",
                        "Increasing model training time",
                        "Adding random noise"
                      ],
                      correctAnswerIndex: 0,
                      explanation: "PCA compresses high-dimensional data into orthogonal components with minimal loss of variance."
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          sectionName: "5. Deep Learning & Neural Networks",
          order: 5,
          groups: [
            {
              groupName: "Deep Learning Foundations",
              side: "left",
              topics: [
                {
                  nodeId: "ml_neural_networks_mlp",
                  title: "Perceptrons & Neural Networks",
                  description: "Multilayer Perceptron (MLP), Activation functions (ReLU, Softmax), Backpropagation.",
                  category: "required",
                  prerequisites: ["ml_linear_logistic_regression"],
                  contentMarkdown: "# Deep Learning & Neural Networks\n\nNeural networks consist of stacked layers of artificial neurons that learn non-linear representations.\n\n### Key Components:\n- **Layers**: Input, Hidden, and Output layers.\n- **Activation Functions**: ReLU, Leaky ReLU, Softmax, Sigmoid.\n- **Backpropagation**: Computing gradients using the chain rule.",
                  quiz: [
                    {
                      id: "q11",
                      question: "Which algorithm computes gradients of the loss function with respect to neural network weights?",
                      options: ["Backpropagation", "K-Means", "Decision Tree Split", "PCA"],
                      correctAnswerIndex: 0,
                      explanation: "Backpropagation applies the calculus chain rule backward from output to input layers."
                    }
                  ]
                },
                {
                  nodeId: "ml_pytorch_tensorflow",
                  title: "PyTorch & Deep Learning Frameworks",
                  description: "Tensors, Autograd, Model creation, Loss functions, and PyTorch Training Loops.",
                  category: "required",
                  prerequisites: ["ml_neural_networks_mlp"],
                  contentMarkdown: "# PyTorch Ecosystem\n\nPyTorch is the premier deep learning framework in research and industry.\n\n```python\nimport torch\nimport torch.nn as nn\n\nclass SimpleMLP(nn.Module):\n    def __init__(self):\n        super().__init__()\n        self.fc = nn.Linear(784, 10)\n    def forward(self, x):\n        return self.fc(x)\n```",
                  quiz: [
                    {
                      id: "q12",
                      question: "Which PyTorch module handles automatic differentiation for gradient calculation?",
                      options: ["torch.autograd", "torch.csv", "torch.json", "torch.web"],
                      correctAnswerIndex: 0,
                      explanation: "torch.autograd tracks graph operations and automatically computes gradients."
                    }
                  ]
                },
                {
                  nodeId: "ml_cnn_computer_vision",
                  title: "Convolutional Neural Networks (CNNs)",
                  description: "Convolutions, Pooling, Filters, ResNet architectures, and Computer Vision.",
                  category: "recommended",
                  prerequisites: ["ml_pytorch_tensorflow"],
                  contentMarkdown: "# Convolutional Neural Networks\n\nCNNs extract spatial hierarchies of visual features using convolutional kernels and pooling operations.",
                  quiz: [
                    {
                      id: "q13",
                      question: "What is the primary function of Max Pooling layers in CNNs?",
                      options: [
                        "Downsampling feature maps to reduce spatial size and parameter count",
                        "Increasing image resolution",
                        "Adding text labels to images",
                        "Creating artificial noise"
                      ],
                      correctAnswerIndex: 0,
                      explanation: "Max Pooling reduces feature map dimensions while preserving dominant features."
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          sectionName: "6. Modern AI & Transformers (LLMs)",
          order: 6,
          groups: [
            {
              groupName: "Transformers & LLMs",
              side: "right",
              topics: [
                {
                  nodeId: "ml_transformers_attention",
                  title: "Attention Mechanisms & Transformers",
                  description: "Self-Attention, Multi-Head Attention, Positional Encodings, Transformer Architecture.",
                  category: "required",
                  prerequisites: ["ml_pytorch_tensorflow"],
                  contentMarkdown: "# Transformer Architecture\n\nThe Transformer model (\"Attention Is All You Need\") revolutionized AI by replacing recurrent connections with Self-Attention.\n\n### Formula:\n`Attention(Q, K, V) = softmax((Q * K^T) / sqrt(d_k)) * V`",
                  quiz: [
                    {
                      id: "q14",
                      question: "What key mechanism allows Transformers to process all tokens in parallel?",
                      options: ["Self-Attention Mechanism", "Sequential Recurrence", "Max Pooling", "Linear Regression"],
                      correctAnswerIndex: 0,
                      explanation: "Self-Attention allows parallel token interaction without sequential step-by-step loops."
                    }
                  ]
                },
                {
                  nodeId: "ml_llm_fine_tuning",
                  title: "LLMs, LoRA & PEFT Fine-Tuning",
                  description: "Pre-training vs Fine-tuning, Parameter-Efficient Fine-Tuning (LoRA, QLoRA), RAG.",
                  category: "recommended",
                  prerequisites: ["ml_transformers_attention"],
                  contentMarkdown: "# Large Language Models & LoRA\n\n- **Pre-training**: Training on trillions of tokens.\n- **LoRA (Low-Rank Adaptation)**: Freezes base weights and injects trainable rank decomposition matrices.\n- **RAG (Retrieval-Augmented Generation)**: Connecting LLMs with external Vector Databases.",
                  quiz: [
                    {
                      id: "q15",
                      question: "What is the main benefit of LoRA (Low-Rank Adaptation) when fine-tuning LLMs?",
                      options: [
                        "Dramatically reduces GPU memory requirements by updating only low-rank matrices",
                        "Deletes model weights",
                        "Slows down training intentionally",
                        "Disables attention heads"
                      ],
                      correctAnswerIndex: 0,
                      explanation: "LoRA freezes original parameters and updates small low-rank adapter matrices."
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          sectionName: "7. MLOps & Production Deployment",
          order: 7,
          groups: [
            {
              groupName: "MLOps & Model Serving",
              side: "left",
              topics: [
                {
                  nodeId: "ml_mlops_tracking_evaluation",
                  title: "MLOps, Experiment Tracking & Evaluation",
                  description: "MLflow, Weights & Biases, Optuna hyperparameter tuning, Data Drift monitoring.",
                  category: "required",
                  prerequisites: ["ml_pytorch_tensorflow"],
                  contentMarkdown: "# MLOps & Experiment Tracking\n\nProduction ML requires tracking experiments, code versions, metrics, and dataset lineages using tools like MLflow or W&B.",
                  quiz: [
                    {
                      id: "q16",
                      question: "What tool is commonly used to track metrics, parameters, and model artifacts during training?",
                      options: ["MLflow / Weights & Biases", "HTML5", "CSS Flexbox", "Postman"],
                      correctAnswerIndex: 0,
                      explanation: "MLflow and W&B log training parameters, loss curves, and model weights."
                    }
                  ]
                },
                {
                  nodeId: "ml_deployment_serving",
                  title: "Model Serving & Production Deployment",
                  description: "FastAPI serving, ONNX Runtime, TensorRT, Docker containerization, Triton server.",
                  category: "required",
                  prerequisites: ["ml_mlops_tracking_evaluation"],
                  contentMarkdown: "# Model Deployment & Serving\n\nConvert PyTorch/TensorFlow models to ONNX or TensorRT format and deploy REST/gRPC endpoints using Docker and FastAPI.",
                  quiz: [
                    {
                      id: "q17",
                      question: "Which format is widely used for cross-platform neural network model export and inference acceleration?",
                      options: ["ONNX (Open Neural Network Exchange)", "JPEG", "MP3", "CSV"],
                      correctAnswerIndex: 0,
                      explanation: "ONNX allows models trained in PyTorch/TensorFlow to run optimized on various hardware runtimes."
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };
  }

  return {
    title: localize(`Roadmap Pembelajaran ${capTopic}`, `${capTopic} Learning Roadmap`),
    description: localize(
      `Roadmap bertahap untuk mempelajari ${capTopic} dari konsep dasar hingga penerapan produksi.`,
      `A step-by-step roadmap for learning ${capTopic}, from core concepts to production use.`
    ),
    sections: [
      {
        sectionName: localize(`1. Pengenalan ${capTopic}`, `1. Introduction to ${capTopic}`),
        order: 1,
        groups: [{
          groupName: localize('Dasar dan Gambaran Umum', 'Foundations and Overview'),
          side: 'left',
          topics: [{
            nodeId: `${slug}_foundations`,
            title: localize(`Dasar-Dasar ${capTopic}`, `${capTopic} Foundations`),
            description: localize(`Definisi, tujuan, dan penggunaan utama ${cleanTopic}.`, `The definition, purpose, and primary uses of ${cleanTopic}.`),
            category: 'required',
            prerequisites: [],
            contentMarkdown: localize(
              `# Dasar-Dasar ${capTopic}\n\nMulailah dengan memahami tujuan, istilah utama, dan masalah yang diselesaikan oleh ${cleanTopic}. Hubungkan konsep tersebut dengan contoh nyata agar pembelajaran tidak berhenti pada teori.\n\n### Fokus utama\n- Definisi dan ruang lingkup\n- Kasus penggunaan umum\n- Istilah dan prasyarat penting`,
              `# ${capTopic} Foundations\n\nStart by understanding the purpose, core vocabulary, and problems solved by ${cleanTopic}. Connect each concept to a real example so learning goes beyond theory.\n\n### Key focus\n- Definition and scope\n- Common use cases\n- Essential terms and prerequisites`
            ),
            quiz: [{
              id: 'q1',
              question: localize(`Apa langkah awal terbaik untuk mempelajari ${capTopic}?`, `What is the best first step when learning ${capTopic}?`),
              options: [
                localize('Memahami konsep inti dan menghubungkannya dengan contoh nyata', 'Understand the core concepts and connect them to real examples'),
                localize('Menghafal istilah tanpa praktik', 'Memorize terms without practice'),
                localize('Langsung melewati semua dasar', 'Skip every foundational topic'),
                localize('Menghindari dokumentasi', 'Avoid documentation'),
              ],
              correctAnswerIndex: 0,
              explanation: localize('Dasar yang kuat membuat praktik dan materi lanjutan lebih mudah dipahami.', 'Strong foundations make practice and advanced material easier to understand.'),
            }],
          }],
        }],
      },
      {
        sectionName: localize('2. Konsep Inti', '2. Core Concepts'),
        order: 2,
        groups: [{
          groupName: localize('Mekanisme Utama', 'Core Mechanics'),
          side: 'right',
          topics: [{
            nodeId: `${slug}_core`,
            title: localize('Komponen dan Cara Kerja', 'Components and Mechanics'),
            description: localize('Pelajari komponen utama, interaksi, dan alur kerjanya.', 'Learn the main components, interactions, and workflow.'),
            category: 'required',
            prerequisites: [`${slug}_foundations`],
            contentMarkdown: localize(
              `# Komponen dan Cara Kerja\n\nUraikan ${cleanTopic} menjadi komponen yang lebih kecil. Pelajari tanggung jawab setiap komponen, bagaimana data bergerak, serta batas antarkomponen.\n\n### Latihan\n- Gambar alur sederhana\n- Jelaskan setiap komponen dengan kata-kata sendiri\n- Identifikasi kegagalan yang mungkin terjadi`,
              `# Components and Mechanics\n\nBreak ${cleanTopic} into smaller components. Learn each component's responsibility, how data moves, and where boundaries exist.\n\n### Practice\n- Draw a simple flow\n- Explain each component in your own words\n- Identify likely failure modes`
            ),
            quiz: [{
              id: 'q2',
              question: localize('Apa yang paling membantu memahami sebuah sistem?', 'What most helps when learning how a system works?'),
              options: [
                localize('Memahami tanggung jawab dan interaksi setiap komponen', 'Understand each component responsibility and interaction'),
                localize('Mengabaikan aliran data', 'Ignore data flow'),
                localize('Menghapus semua batas komponen', 'Remove every component boundary'),
                localize('Menghindari penanganan kesalahan', 'Avoid error handling'),
              ],
              correctAnswerIndex: 0,
              explanation: localize('Interaksi dan batas komponen menjelaskan perilaku sistem secara keseluruhan.', 'Component interactions and boundaries explain the behavior of the whole system.'),
            }],
          }],
        }],
      },
      {
        sectionName: localize('3. Praktik Terarah', '3. Guided Practice'),
        order: 3,
        groups: [{
          groupName: localize('Proyek Kecil', 'Small Project'),
          side: 'left',
          topics: [{
            nodeId: `${slug}_practice`,
            title: localize('Bangun Proyek Pertama', 'Build a First Project'),
            description: localize('Terapkan konsep inti dalam proyek kecil yang dapat diuji.', 'Apply the core concepts in a small, testable project.'),
            category: 'required',
            prerequisites: [`${slug}_core`],
            contentMarkdown: localize(
              `# Proyek Pertama\n\nPilih satu masalah kecil yang dapat diselesaikan dengan ${cleanTopic}. Tentukan hasil yang terukur, bangun versi paling sederhana, lalu uji dan perbaiki secara bertahap.\n\n### Langkah\n- Batasi ruang lingkup\n- Buat hasil minimum yang berfungsi\n- Tambahkan pengujian dan catatan`,
              `# First Project\n\nChoose one small problem that ${cleanTopic} can solve. Define a measurable result, build the simplest version, then test and improve it incrementally.\n\n### Steps\n- Limit the scope\n- Produce a minimum working result\n- Add tests and notes`
            ),
            quiz: [{
              id: 'q3',
              question: localize('Bagaimana memulai proyek belajar yang efektif?', 'How should an effective learning project begin?'),
              options: [
                localize('Dengan ruang lingkup kecil dan hasil yang dapat diuji', 'With a small scope and a testable result'),
                localize('Dengan semua fitur sekaligus', 'With every feature at once'),
                localize('Tanpa tujuan yang jelas', 'Without a clear goal'),
                localize('Tanpa menguji hasil', 'Without testing the result'),
              ],
              correctAnswerIndex: 0,
              explanation: localize('Ruang lingkup kecil mempercepat umpan balik dan memperjelas kemajuan.', 'A small scope accelerates feedback and makes progress visible.'),
            }],
          }],
        }],
      },
      {
        sectionName: localize('4. Kesiapan Produksi', '4. Production Readiness'),
        order: 4,
        groups: [{
          groupName: localize('Kualitas dan Operasional', 'Quality and Operations'),
          side: 'right',
          topics: [{
            nodeId: `${slug}_production`,
            title: localize('Keamanan, Pengujian, dan Pemantauan', 'Security, Testing, and Monitoring'),
            description: localize('Siapkan solusi yang aman, teruji, dan dapat dipantau.', 'Prepare a secure, tested, and observable solution.'),
            category: 'recommended',
            prerequisites: [`${slug}_practice`],
            contentMarkdown: localize(
              `# Kesiapan Produksi\n\nSebelum digunakan secara nyata, solusi ${cleanTopic} perlu diuji, diamankan, dan dipantau. Dokumentasikan cara penerapan dan pemulihan agar perubahan dapat dilakukan dengan aman.\n\n### Daftar periksa\n- Pengujian otomatis\n- Pemeriksaan keamanan\n- Log, metrik, dan rencana pemulihan`,
              `# Production Readiness\n\nBefore real use, a ${cleanTopic} solution must be tested, secured, and monitored. Document deployment and recovery so changes can be made safely.\n\n### Checklist\n- Automated tests\n- Security checks\n- Logs, metrics, and a recovery plan`
            ),
            quiz: [{
              id: 'q4',
              question: localize('Apa yang wajib dilakukan sebelum penerapan produksi?', 'What is required before a production deployment?'),
              options: [
                localize('Pengujian, pemeriksaan keamanan, dan pemantauan', 'Testing, security checks, and monitoring'),
                localize('Menonaktifkan semua log', 'Disable all logs'),
                localize('Membuka kredensial rahasia', 'Expose secret credentials'),
                localize('Melewati tinjauan perubahan', 'Skip change review'),
              ],
              correctAnswerIndex: 0,
              explanation: localize('Ketiga hal tersebut mengurangi risiko dan membantu mendeteksi masalah.', 'These controls reduce risk and help detect problems.'),
            }],
          }],
        }],
      },
    ],
  };
}


export async function generateLearningRoadmap(
  topic: string,
  grillContext?: { familiarity?: string; goals?: string[]; focusText?: string; level?: string },
  language: string = 'id'
) {
  const langPrompt = language === 'en'
    ? `CRITICAL LANGUAGE RULE: Output ALL text (roadmap title, description, section names, group names, topic titles, descriptions, contentMarkdown micro-lessons, and quiz questions) ENTIRELY IN ENGLISH.`
    : `CRITICAL LANGUAGE RULE: Output ALL text (roadmap title, description, section names, group names, topic titles, descriptions, contentMarkdown micro-lessons, and quiz questions) ENTIRELY IN BAHASA INDONESIA.`;

  let personalizationInstructions = '';
  if (grillContext) {
    const goalsStr = Array.isArray(grillContext.goals) && grillContext.goals.length > 0 
      ? grillContext.goals.join(', ') 
      : (grillContext.level || 'General Mastery');

    personalizationInstructions = `
USER PERSONALIZATION CONTEXT:
- Self Familiarity / Current Understanding: ${grillContext.familiarity || 'Belum paham sama sekali (Beginner)'}
- Primary Learning Goals (Multiple Selected): ${goalsStr}
- Specific Focus / Preferences: ${grillContext.focusText || 'None specified'}

CRITICAL PERSONALIZATION INSTRUCTION:
Tailor the roadmap sections, topic selection, and micro-lessons to directly reflect the user's familiarity level (${grillContext.familiarity || 'Beginner'}), primary learning goals (${goalsStr}), and specific focus (${grillContext.focusText}).`;
  }

  const systemPrompt = `You are an elite Educational Curriculum Director and Senior Technical Specialist.
Generate a comprehensive, highly granular, and structured learning roadmap for the topic requested by the user, modeled EXACTLY after high-quality visual roadmaps like roadmap.sh.
${langPrompt}
${personalizationInstructions}

CRITICAL ARCHITECTURAL RULES:
1. ABSOLUTE BASICS FIRST: Section 1 MUST ALWAYS start with the absolute fundamentals (e.g. "1. Introduction", containing "What is [Topic]?", "Why it matters?", "Applications & Uses").
2. GRANULAR TOPICS: Create 12 to 16 specific, actionable topic nodes (e.g. break concepts down into specific tools, platforms, or fundamentals).
3. SECTIONS & GROUPS: Group topics into 4 to 6 sequential Sections (e.g., "1. Introduction", "2. Core Fundamentals", "3. Development & Tooling", "4. Advanced Topics & Security").
4. CONCISE & FAST: Keep \`contentMarkdown\` concise (100-150 words per topic with key bullet points) and provide 1-2 sharp multiple choice quiz questions per topic.
5. DEPENDENCIES: Root topics in Section 1 MUST have empty prerequisites \`[]\`. Advanced topics list prerequisite topic IDs.

You MUST return ONLY a valid JSON object starting with { and ending with }. Do not include markdown \`\`\`json wrappers.

The JSON schema MUST be:
{
  "title": "Comprehensive Title (e.g. Blockchain Developer Roadmap)",
  "description": "Step-by-step roadmap from absolute basics to advanced mastery.",
  "sections": [
    {
      "sectionName": "1. Introduction to Blockchain",
      "order": 1,
      "groups": [
        {
          "groupName": "Basics & Overview",
          "side": "left",
          "topics": [
            {
              "nodeId": "intro_what_is",
              "title": "What is Blockchain?",
              "description": "Core concept of distributed ledger technology.",
              "category": "required",
              "prerequisites": [],
              "contentMarkdown": "# What is Blockchain?\\n\\nBlockchain is a decentralized digital ledger...",
              "quiz": [
                {
                  "id": "q1",
                  "question": "What is the primary characteristic of a blockchain ledger?",
                  "options": ["Centralized control", "Immutable & Decentralized", "Temporary storage", "Private by default"],
                  "correctAnswerIndex": 1,
                  "explanation": "Blockchain data is decentralized and immutable once written."
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}`;

  try {
    return await callQwen(systemPrompt, `Generate a complete, granular roadmap.sh style learning roadmap for: ${topic}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('AI generation failed or quota exceeded, using intelligent fallback roadmap:', message);
    return createFallbackRoadmap(topic, language);
  }
}
