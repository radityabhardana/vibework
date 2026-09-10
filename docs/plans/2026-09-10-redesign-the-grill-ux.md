# Implementation Plan: Redesign The Grill UX & Architecture Studio

Merespons masukan desain terkait **The Grill** (Architecture Studio):
1. **Sidebar Header**: Menghilangkan pill badge canggung `3 specs` yang menumpuk di samping judul dan merapikan layout sidebar.
2. **Completed Spec State ("Buka Workspace")**: Mengubah banner atas yang tipis dan membosankan menjadi **Executive Architecture Dossier Hero Card** yang megah, berbobot, dengan tombol CTA utama **"Buka Project Workspace ↗"** berpola *button-in-button* bercahaya.
3. **Tactile Studio Composer & Input Text Box**: Merombak total kotak teks input brief menjadi composer premium berbasis teknik *Double-Bezel (Doppelrand)*, menghapus karakter ASCII `+` yang mengganggu, menambahkan chip parameter arsitektur interaktif, indikator kedalaman prompt, dan tombol dispatch yang taktil.

---

## User Review Required

> [!IMPORTANT]
> - **State Proyek Selesai**: Ketika pengguna membuka sesi arsitektur yang sudah selesai digenerate (`projectId` ada), tampilan utama akan langsung menyambut pengguna dengan **Executive Dossier Card** (nama proyek, ringkasan deliverables: PRD, Flowchart Tree, AGENTS.md, ADR, dan tombol utama **"Buka Project Workspace"**). Kotak edit brief tetap tersedia di bawahnya dalam mode *collapsible/secondary* jika pengguna ingin melakukan variasi atau regenerasi.
> - **Sidebar Cleaner & Focused**: Counter jumlah spesifikasi (`{sessions.length} specs`) dihapus dari header atas The Grill dan dipindahkan secara halus ke header list `Recent Specs (3)` agar header utama tetap bersih, elegan, dan proporsional.

---

## Proposed Changes

### 1. Engine Sidebar
#### [MODIFY] [EngineSidebar.tsx](file:///c:/projects/website/vibework/src/components/ui/EngineSidebar.tsx)
- **Hapus Counter Canggung**: Hapus `<span className="rounded-full ...">{sessions.length} specs</span>` dari baris header atas di sebelah judul The Grill.
- **Header Bersih & Proporsional**: Pertahankan ikon sparkle putih elegan + teks `The Grill` dan sub-label `Architecture Studio`.
- **Integrasi Counter ke Section History**: Tambahkan badge minimalis pada header section: `Recent Specs · {sessions.length}` sehingga posisinya relevan dan kontekstual.
- **Tombol "+ New Architecture Spec"**: Berikan sentuhan tactile dengan hover border halus dan icon yang selaras.
- **List Item Sessions**: Perjelas status bullet (hijau terang ber-glow untuk spec yang memiliki workspace ready, abu-abu lembut untuk draft) dan efek hover kontras.

---

### 2. Completed Architecture State ("Buka Workspace")
#### [MODIFY] [IdeaStudio.tsx](file:///c:/projects/website/vibework/src/components/ui/IdeaStudio.tsx)
- **Hapus Banner Tipis Biasa**: Ganti alert banner 1 baris yang ada saat ini (`Proyek ini telah memiliki dokumen spesifikasi...`).
- **Bangun Executive Architecture Dossier Card**:
  - Menggunakan struktur **Double-Bezel (Doppelrand)**: outer shell dengan hairlines border putih halus dan inner card bertingkat kedalaman tinggi.
  - **Status Beacon**: Pulsing emerald radar dot + badge `SPECIFICATION COMPLETED & READY`.
  - **Nama & Ringkasan Proyek**: Menampilkan nama proyek yang dihasilkan secara tebal dan deskripsi arsitekturnya.
  - **Deliverable Artifacts Grid (4 Pilar)**:
    1. `Interactive Flowchart Tree` (Visual app flow & interactive nodes)
    2. `Product Requirements (PRD)` (User stories, MVP scope & constraints)
    3. `AI Agent Guardrails` (AGENTS.md & master system rules)
    4. `Architecture Decisions (ADR)` (Frontend, backend, DB & tech stack)
  - **Grand Primary CTA ("Button-in-Button")**:
    - Tombol utama berukuran penuh / lebar dengan label **"Buka Project Workspace"** dan inner circular badge berikon panah (`ArrowUpRight`) yang meluncur ke kanan-atas saat di-hover.
    - Dilengkapi efek ambient glow dan tactile active scale (`active:scale-[0.98]`).
  - **Secondary Quick Action**:
    - Tombol alternatif **"Lihat Flowchart Visual ↗"** untuk langsung menuju tab visual flowchart.
  - **Refine & Re-architect Drawer**:
    - Bagian composer tetap dapat dibuka/diakses di bawah dossier card jika pengguna ingin menyesuaikan ide dan meregenerasi arsitektur.

#### [MODIFY] [page.tsx (engine/[id])](file:///c:/projects/website/vibework/src/app/engine/%5Bid%5D/page.tsx)
- Ambil data proyek dari tabel `projects` jika `session.projectId` ada (nama proyek, deskripsi, tanggal dibuat).
- Teruskan props `projectData` ke komponen `<IdeaStudio />` agar Executive Dossier Card dapat menampilkan nama proyek aslinya secara akurat.

---

### 3. Tactile Studio Composer & Input Text Area
#### [MODIFY] [IdeaStudio.tsx](file:///c:/projects/website/vibework/src/components/ui/IdeaStudio.tsx)
- **Bersihkan Gimmick Blueprint**: Hapus karakter ASCII `+` pada 4 sudut dan label `Fig. 02 — Brief`.
- **Implementasi Double-Bezel Architecture**:
  - **Outer Frame**: `rounded-3xl p-2 bg-white/[0.025] border border-white/10 shadow-[0_25px_80px_-20px_rgba(0,0,0,0.85)] ring-1 ring-white/5 focus-within:border-white/25 focus-within:ring-white/10 transition-all duration-300`.
  - **Inner Core**: `rounded-[1.25rem] bg-gradient-to-b from-[#0a0a0d] to-[#050507] border border-white/5 p-4 sm:p-5 flex flex-col gap-3`.
- **Header Bar Internal Composer**:
  - Label badge `STUDIO BRIEF COMPOSER` dengan micro-dot indikator status.
  - Indikator kualitas / kedalaman prompt dinamis:
    - `< 40 karakter`: `Ide Singkat`
    - `40–120 karakter`: `Deskripsi Baik`
    - `> 120 karakter`: `Detail & Siap Diarsitekturkan ✨`
- **Textarea Tipografi & Sensasi Mengetik**:
  - Tinggi nyaman (5 baris), font responsif, leading lega, placeholder komunikatif yang menginspirasi:
    `"Jelaskan aplikasi yang ingin Anda bangun: apa masalah utamanya, siapa target penggunanya, fitur inti MVP, serta preferensi teknis atau integrasi (AI, Database, Payment, WhatsApp)..."`
- **Architecture Constraint Chips (Tactile Toggles)**:
  - Tampilkan opsi instan di atas toolbar:
    - Platform: `Web SaaS`, `Mobile App`, `AI Agent Workflow`, `Internal Tool`
    - Stack / Engine: `Next.js + Supabase`, `React Native`, `Python / FastAPI`
  - Mengklik chip akan langsung menyematkan konteks arsitektur ke brief secara elegan dengan feedback visual aktif.
- **Action Toolbar & Primary Dispatch Button**:
  - Tombol preferensi laci (Target Pengguna & Tech Stack kustom) yang lebih terpadu dan rapi.
  - Tombol submit dengan pola **Button-in-Button**:
    - Teks: `Rancang Arsitektur & Spec`
    - Nested trailing icon circular capsule dengan panah animasi.

---

## Verification Plan

### Automated Tests
1. Jalankan test suite:
   ```powershell
   npm run test
   ```
2. Jalankan pemeriksaan tipe TypeScript:
   ```powershell
   npm run typecheck
   ```

### Manual Verification
1. **Verifikasi Sidebar**:
   - Buka `http://localhost:20130/engine`.
   - Pastikan header sidebar bersih: tidak ada lagi pill canggung `3 specs` yang menumpuk di sebelah judul.
   - Pastikan `Recent Specs` menampilkan hitungan rapi (misal: `Recent Specs · 3`).
2. **Verifikasi Input Text Area (Composer Baru)**:
   - Cek area composer: Double-Bezel bersih tanpa tanda plus ASCII, tipografi kontras, chip platform dapat diklik, indikator kedalaman prompt merespons saat mengetik.
3. **Verifikasi Completed Spec State ("Buka Workspace")**:
   - Klik salah satu sesi di sidebar yang sudah memiliki proyek selesai (misal: sesi yang sudah di-generate).
   - Pastikan muncul **Executive Architecture Dossier Card**:
     - Menampilkan nama proyek, status siap, 4 badge deliverable (PRD, Tree, AGENTS, ADR).
     - Tombol megah **"Buka Project Workspace ↗"** dengan hover glowing.
     - Klik tombol dan pastikan navigasi langsung menuju `/projects/[id]` berjalan lancar.
