# Fix 5 Bug Penting Vibework

Source: reviewer analysis (ses_00c1aa3b5ffeZ8CpCB4VZE3EJv), user memilih "Semua bug penting sekaligus".

## Target

Membenahi tanpa mengubah perilaku bisnis:
1. Cascade FK tidak aktif (orphan data)
2. Gating ADR salah (ADR terkunci permanen)
3. Non-JSON error crash di ProjectWorkspace
4. Undo 409 tidak selaras dengan state klien
5. Halaman `/projects` mati (dead code ProjectCardClient + actions.ts tidak punya pemanggil)

## Checklist

- [ ] PRAGMA foreign_keys=ON di `src/lib/db/index.ts`
- [ ] Gating ADR: `disabled: !appFlowchart` -> `disabled: !prd`
- [ ] Helper `readApiError` di ProjectWorkspace, dipakai di 4 route generate-*
- [ ] Undo 409 -> re-sync pesan dari `GET /api/chat/session/[id]`
- [ ] `/projects` jadi halaman list + delete (pakai ProjectCardClient + actions.ts)
- [ ] `npm run typecheck`, `npm run lint`, `npm test` hijau

## 1. Aktifkan foreign_keys (`src/lib/db/index.ts`)

SQLite defaultnya `foreign_keys=OFF`, jadi semua `onDelete: 'cascade'` di
`schema.ts` (prds/adrs/schemas/atomic_prompts/app_flowcharts/chatSessions/
chatMessages/roadmap_nodes/user_quiz_attempts/voice_*_generations) tidak jalan.
`deleteProjectAction` dan `learn/delete` hanya menghapus induk -> orphans.

Perubahan:
```ts
const sqlite = new Database(path.join(process.cwd(), 'vibework.db'));
sqlite.pragma('foreign_keys = ON');
export const db = drizzle(sqlite, { schema });
```

Catatan: better-sqlite3 sinkron, pragma per-koneksi — hanya perlu diset sekali di
modul ini karena semua akses lewat `db` dari sini.

Verifikasi: `npm run typecheck`; manual: hapus roadmap di `/learn`, jalankan
`SELECT COUNT(*) FROM roadmap_nodes` harus 0 untuk roadmap tsb.

Risiko: DB lama mungkin sudah berisi orphans; fix ini hanya mencegah baru.
(bersihkan orphans secara manual bila mau, di luar scope.)

## 2. Gating ADR (`src/components/ui/ProjectWorkspace.tsx:212`)

Route ADR (`api/projects/generate-adr/route.ts:49-52`) hanya butuh PRD, tapi UI
mengunci tombol sampai flowchart ada (`disabled: !appFlowchart`). Regenerate PRD
menghapus flowchart (`api/projects/generate/route.ts:165`) -> tombol ADR terkunci
selamanya. Ganti dependensi UI menyamai route.

```ts
disabled: !prd
```

Verifikasi: typecheck; manual: project tanpa flowchart, tombol ADR harus aktif.

Catatan: rantai logic (edges) di ReactFlow biarkan apa adanya (kosmetik).
Rute UI: PRD -> ADR -> Schema -> Prompts tetap; flowchart node tetap ada di tengah.

## 3. Non-JSON error (`src/components/ui/ProjectWorkspace.tsx`)

4 tempat `throw new Error((await res.json()).error)` (baris 76, 94, 112, 130)
crash bila body error bukan JSON (mis. HTML 504 dari platform/horizontal pod).

Tambahkan helper (di atas komponen):
```ts
async function readApiError(response: Response, fallback = 'Generation failed.') {
  try {
    const data: unknown = await response.json();
    if (typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string') {
      return data.error;
    }
  } catch {
    // non-JSON/malformed body — pakai fallback
  }
  return fallback;
}
```
Ganti keempat `throw new Error((await res.json()).error)` menjadi
`throw new Error(await readApiError(res))`.

Verifikasi: typecheck. (Pola ini sudah dipakai di `InterviewChat.tsx:35-50`.)

## 4. Undo 409 tidak selaras (`src/components/ui/InterviewChat.tsx`)

`handleUndo` (baris 282-319): saat server tolak undo karena pesan berubah
(`409 stale`, `api/chat/message/route.ts:166-168`), state klien `messages` tidak
disinkronkan ulang -> percakapan UI tidak konsisten dengan DB sampai reload.

Fix: saat `response.status === 409` dan ada `sessionId`, re-fetch pesan dari
`GET /api/chat/session/[id]` (route sudah ada, `session/[id]/route.ts:8-31`) lalu
`setMessages(...)` dengan peta `{id, role, content}`, setelah itu tetap throw error.

Implementasi (di dalam catch / sebelum throw):
```ts
if (response.status === 409 && sessionId) {
  try {
    const res = await fetch(`/api/chat/session/${sessionId}`, { cache: 'no-store' });
    if (res.ok) {
      const data: unknown = await res.json();
      const messagesArr = typeof data === 'object' && data !== null && 'messages' in data
        ? data.messages : null;
      if (Array.isArray(messagesArr)) {
        setMessages(messagesArr.map((m: unknown) => {
          const rec = typeof m === 'object' && m !== null ? m as Record<string, unknown> : {};
          return {
            id: String(rec.id),
            role: rec.role === 'assistant' ? 'assistant' as const : 'user' as const,
            content: String(rec.content),
          };
        }));
      }
    }
  } catch {
    // refresh gagal — biarkan error asli ditampilkan
  }
}
```

Verifikasi: typecheck; manual: tab pola undo cepat saat pesan sudah berganti ->
daftar pesan tersinkron (bukan hang sampai reload).

Catatan: jangan refresh sesi / history title; hanya pesan.

## 5. Halaman `/projects` (`src/app/projects/page.tsx` + actions.ts)

Saat ini `page.tsx` cuma `redirect('/engine')`; `ProjectCardClient.tsx` dan
`actions.ts` tidak dipanggil di mana pun -> tidak ada cara menghapus project.

Jadikan server component list (pola sudah ada di `engine/layout.tsx`):
```tsx
import { connection } from 'next/server';
import Link from 'next/link';
import { db } from '@/lib/db';
import { projects, prds } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import ProjectCardClient from './ProjectCardClient';

async function fetchProjects() {
  return db.select({
    id: projects.id,
    name: projects.name,
    description: projects.description,
    status: projects.status,
    createdAt: projects.createdAt,
    hasPrd: sql`EXISTS(SELECT 1 FROM prds WHERE prds.project_id = ${projects.id})`,
  }).from(projects).orderBy(desc(projects.createdAt), desc(projects.updatedAt)).all();
}

export default async function ProjectsListPage() {
  await connection();
  const list = await fetchProjects();
  // header + grid ProjectCardClient + empty state + back-to-dashboard
}
```

`actions.ts` (sudah ada): `deleteProjectAction` sudah `revalidatePath('/projects')`
dan `revalidatePath('/')` — dengan halaman list sungguhan, revalidation bekerja.
Ubah `confirm()` di `ProjectCardClient` ke bahasa Indonesia agar selaras dengan app
lain, dan tambah `router.refresh()` setelah delete (client-side UX).

Catatan proyek tanpa PRD: tampilkan semua project (bukan hanya yang punya PRD).
Tambahkan "hasPrd" sebagai badge bila mau; minimal tampilkan `status`.

Verifikasi: `/projects` menampilkan daftar, tombol trash menghapus (cascade via
fix #1) dan list ter-update.

## 6. Verifikasi menyeluruh

```
npm run typecheck
npm run lint
npm test
npm run build   # opsional; route baru + server component harus aman
```

## Out of scope

- Auth/rate-limit, "generate semua" pipeline, menghapus `scripts/*.js`,
  `test_eth.ts`, `local.db`, simetri model AI chat vs workflow — bukan bug yg dipilih.