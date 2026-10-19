# 📌 PapanFokus

<div align="center">
  <p align="center">
    <strong>Aplikasi Manajemen Proyek Kanban Real-Time Berkinerja Tinggi dengan Multi-Tenant Isolation Tingkat Enterprise</strong>
  </p>

  <p align="center">
    <a href="https://papan-fokus.vercel.app">
      <img src="https://img.shields.io/badge/Live%20Demo-👉%20Kunjungi%20Website-blueviolet?style=for-the-badge&logo=vercel" alt="Live Demo" />
    </a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/Next.js%2016-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js 16" />
    <img src="https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/TailwindCSS-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
    <img src="https://img.shields.io/badge/Drizzle%20ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black" alt="Drizzle ORM" />
    <img src="https://img.shields.io/badge/Better%20Auth-FF5D01?style=for-the-badge&logo=security" alt="Better Auth" />
  </p>
</div>

---

## 📖 Tentang PapanFokus

**PapanFokus** adalah platform manajemen tugas kolaboratif berbasis Kanban (*modern Jira/Linear alternative*) yang dibangun untuk tim tangkas yang membutuhkan **kecepatan respons tinggi**, **sinkronisasi instan**, dan **keamanan multi-tenant yang ketat**.

Berbeda dari aplikasi papan Kanban konvensional, PapanFokus dirancang dengan arsitektur **Multi-Tenant Isolation** berlapis pada tingkat basis data (PostgreSQL Row-Level Security) dan Data Access Layer (DAL) terproteksi. Dilengkapi algoritma **Fractional Positioning** untuk pengurutan kartu drag-and-drop tanpa tabrakan data (*collision-free*), sinkronisasi kolaborasi real-time tanpa jeda (*zero-latency broadcast & presence tracking*), serta sistem **Automated Keep-Alive** untuk menjaga keaktifan basis data.

---

## 📸 Tampilan Aplikasi

### Desktop Workspace View
![PapanFokus Kanban Board](public/screenshot-board.png)

### Responsive Mobile View (Dedicated Drawer & Optimized Header)
<img src="public/screenshot-mobile.png" width="320" alt="PapanFokus Mobile View" />

---

## 🚀 Fitur Unggulan

- **⚡ Real-Time Kanban Board:** Pemindahan tugas (*drag-and-drop*) tersinkronisasi instan antar seluruh anggota workspace menggunakan Supabase Realtime WebSocket broadcast server-side (`httpSend`).
- **🔒 Strict Multi-Tenant Isolation:** Setiap workspace terisolasi secara kriptografis dan logis. Pengguna hanya dapat membaca dan memodifikasi data workspace tempat mereka terdaftar melalui validasi ganda (PostgreSQL RLS + DAL server guards).
- **🛡️ Granular Role-Based Access Control (RBAC):** Hak akses spesifik untuk peran **Admin** (pemilik/pengelola), **Member** (kolaborator tugas), dan **Viewer** (akses baca) dengan validasi izin di tingkat transaksi database.
- **🧮 Fractional Positioning Engine:** Pengurutan kartu menggunakan kalkulasi posisi desimal dinamis (`midpoint`) berindeks ascending terurut (`ORDER BY position ASC`) untuk mencegah anomali loncatan kartu dan balapan data (*race conditions*).
- **🌐 Public Landing Page & Instant Demo Guest Access:** Etalase produk interaktif yang dapat diakses publik (`/` dan `/landing-page`) lengkap dengan tombol login instan akun tamu (*one-click demo guest login*) tanpa perlu registrasi mandiri.
- **🔄 Concurrency & Atomic Capacity Guards:** Tautan undangan (*invite links*) dilindungi query SQL atomik bersyarat (`WHERE uses_count < max_uses`) sehingga klaim bersamaan tidak akan melebihi kuota anggota.
- **🌍 Timezone Drift Immunity:** Tanggal tenggat (*due date*) diproses dengan standardisasi timestamp UTC noon (`12:00:00Z`) dan format kalender lokal, mencegah pergeseran tanggal akibat perbedaan zona waktu klien (UTC±).
- **⏰ Supabase Inactivity Prevention (Keep-Alive):** Server Action `pingSupabaseAction`, endpoint `/api/cron/keepalive`, Vercel Cron harian, dan workflow GitHub Actions terjadwal untuk menjaga database Supabase Free Tier tetap aktif dan terhindar dari *auto-pausing* akibat 7 hari inaktivitas.
- **📱 Mobile-First Responsive Design:** Header mobile terintegrasi dengan drawer navigasi animasi Framer Motion, panel detail tugas side-sheet (`w-[85vw]`), dan scrolling bento grid yang mulus.
- **🧪 Comprehensive Automated Testing:** Pengujian unit lengkap (41 Vitest test suites) dan pengujian End-to-End Playwright dengan webServer terintegrasi.

---

## 🛠️ Arsitektur & Tech Stack

| Layer | Teknologi | Deskripsi |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16 (App Router)** | Rendering SSR/RSC berkecepatan tinggi dengan Turbopack compiler, Server Actions, dan Route Proxy |
| **Runtime UI** | **React 19 & Tailwind CSS** | Antarmuka mode gelap premium, Shadcn UI / Radix Primitives, dan Lucide Icons |
| **Database** | **PostgreSQL (Supabase)** | Managed PostgreSQL dengan Row-Level Security (RLS) dan pooling koneksi |
| **ORM & DDL** | **Drizzle ORM & Drizzle Kit** | Type-safe schema builder dan migrasi SQL idempoten |
| **Authentication** | **Better Auth** | Autentikasi berbasis sesi aman (email/password & akun demo tamu terproteksi) |
| **Realtime Engine** | **Supabase Realtime (WebSockets)** | Server-side broadcast via service role `httpSend` & presence sync |
| **Drag & Drop** | **`@dnd-kit/core` & `@dnd-kit/sortable`** | Interaksi drag-and-drop berbasis pointer dengan performa 60 FPS |
| **State & Cache** | **TanStack React Query v5** | Optimistic UI updates, automatic query cache invalidation, dan rollback guard |
| **Testing** | **Vitest & Playwright** | Unit testing untuk DAL/algoritma dan E2E browser testing multi-role |

---

## ⚙️ Panduan Instalasi Lokal

### Prasyarat
- **Node.js** v20+ atau LTS terbaru
- Akun **Supabase** (atau instans PostgreSQL lokal)

### Langkah-langkah

1. **Kloning Repositori**
   ```bash
   git clone https://github.com/twiners212/papan-fokus.git
   cd PapanFokus
   ```

2. **Instalasi Dependensi**
   ```bash
   npm install
   ```

3. **Konfigurasi Environment Variable**
   Salin file template `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
   Lengkapi variabel environment di `.env.local`:
   ```env
   # PostgreSQL Connection (Supabase Transaction Pooler / Direct)
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

   # Supabase API & Realtime Credentials
   SUPABASE_URL="https://[PROJECT-REF].supabase.co"
   SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   SUPABASE_JWT_SECRET="your-jwt-secret-key-at-least-32-chars"
   NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

   # Better Auth Security
   BETTER_AUTH_SECRET="your-better-auth-secret-string"
   BETTER_AUTH_URL="http://localhost:3000"

   # Guest Demo Account
   GUEST_PASSWORD="Password123!"
   NEXT_PUBLIC_GUEST_PASSWORD="Password123!"

   # Cron Secret (Optional, untuk proteksi endpoint /api/cron/*)
   CRON_SECRET="your-secure-cron-secret-token"
   ```

4. **Sinkronisasi / Migrasi Database**
   PapanFokus menyediakan skrip migrasi SQL idempoten di direktori `supabase/migrations/`:
   ```bash
   # Opsi A: Sinkronisasi skema langsung via Drizzle Kit (Rekomendasi Cepat)
   npm run db:push

   # Opsi B: Menggunakan Supabase CLI
   npx supabase db push
   ```

5. **Mulai Server Development**
   ```bash
   npm run dev
   ```
   Buka peramban Anda di [http://localhost:3000](http://localhost:3000).

---

## 📦 Skrip Perintah yang Tersedia

| Perintah | Deskripsi |
| :--- | :--- |
| `npm run dev` | Menjalankan server pengembangan Next.js lokal |
| `npm run build` | Mengompilasi aplikasi untuk lingkungan produksi menggunakan Turbopack |
| `npm run start` | Menjalankan server aplikasi hasil build produksi |
| `npm run lint` | Menjalankan linter ESLint (0 errors, 0 warnings policy) |
| `npm test` | Menjalankan seluruh pengujian unit Vitest (41 test suites) |
| `npm run test:watch` | Menjalankan Vitest dalam mode watch interaktif |
| `npm run test:e2e` | Menjalankan pengujian otomatis End-to-End dengan Playwright |
| `npm run db:push` | Mendorong perubahan skema Drizzle langsung ke PostgreSQL |
| `npm run db:generate`| Menghasilkan file migrasi SQL baru dari skema TypeScript |

---

## ⏰ Otomatisasi Supabase Keep-Alive

Untuk mencegah database Supabase Free Tier dinonaktifkan (*auto-paused/frozen*) akibat tidak adanya trafik selama 7 hari berturut-turut, PapanFokus dilengkapi 3 mekanisme otomatis:
1. **Server Action:** [`pingSupabaseAction()`](src/actions/supabase-actions.ts) yang menjalankan query database `SELECT 1` dan ping HTTP REST gateway dengan metrik latensi.
2. **Vercel Cron:** Jadwal otomatis harian pada pukul 12:00 UTC melalui [`vercel.json`](vercel.json) menuju endpoint `/api/cron/keepalive`.
3. **GitHub Actions:** Workflow terjadwal [`.github/workflows/supabase-keepalive.yml`](.github/workflows/supabase-keepalive.yml) yang berjalan otomatis setiap 3 hari sekali dan dapat dipicu secara manual (*workflow_dispatch*).

---

## 📄 Lisensi
Proyek ini dilisensikan di bawah [MIT License](LICENSE).

---
*Dibuat dengan dedikasi untuk performa, skalabilitas, dan rekayasa perangkat lunak modern.*
