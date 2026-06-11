# DEPLOYMENT.md - Strategi Rilis, Operasi, dan Arsitektur Penskalaan

---

## 1. Platform Infrastructure

### Compute & Hosting
- **Frontend & API (Serverless):** Di-*deploy* menggunakan **Vercel**. Menangani Next.js App Router, SSR, Server Components, dan Server Actions. Region: **Singapore (`sin1`)** untuk latensi optimal pengguna Asia Tenggara.
- **Database & Realtime Engine:** Di-*host* menggunakan **Supabase** (PostgreSQL Engine & WebSocket Broadcaster). Region: dipilih sedekat mungkin dengan Vercel region (**Southeast Asia**) untuk meminimalisir latensi jaringan antar-layanan.

### Infrastructure Diagram
```text
┌──────────────────────────────────────────────────────┐
│                    Vercel (sin1)                      │
│  ┌─────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Edge    │  │ Server       │  │ Server Actions  │ │
│  │ Middle- │→ │ Components   │→ │ (Mutations)     │ │
│  │ ware    │  │ (SSR/Read)   │  │                 │ │
│  └─────────┘  └──────────────┘  └────────┬────────┘ │
└──────────────────────────────────────────┼──────────┘
                                           │
                    Supavisor (port 6543)   │
                    Transaction Mode       │
                                           ▼
┌──────────────────────────────────────────────────────┐
│              Supabase (Southeast Asia)               │
│  ┌──────────────┐  ┌─────────────────────────────┐  │
│  │ PostgreSQL   │  │ Supabase Realtime            │  │
│  │ (Data Store) │  │ (WebSocket Broadcast)        │  │
│  └──────────────┘  └─────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

## 2. Database Connection Strategy

### Connection Pooling
Lingkungan *Serverless* yang bersifat *ephemeral* rentan terhadap lonjakan koneksi basis data. Aturan koneksi dikunci sebagai berikut:

| Konteks | Mode Koneksi | Port | Alasan |
|---------|-------------|------|--------|
| Server Actions & Server Components | **Supavisor (Transaction Mode)** | `6543` | Mencegah *connection exhaustion*. Setiap invokasi serverless mendapatkan koneksi dari pool, bukan membuka koneksi baru. |
| Drizzle ORM Migrations (`drizzle-kit migrate`) | **Koneksi Langsung** | `5432` | DDL statements (`CREATE TABLE`, `ALTER`) tidak kompatibel dengan pooler mode `transaction`. Migrasi membutuhkan koneksi *session-level* penuh. |
| Supabase Realtime (WebSocket) | **Koneksi Supabase Native** | N/A | Dikelola oleh `@supabase/supabase-js`. Tidak melewati Supavisor. |

### Implikasi Transaction Mode
- **Prepared Statements:** Tidak didukung oleh Supavisor `transaction` mode. Pastikan Drizzle ORM dikonfigurasi tanpa `prepare: true` pada koneksi pooled.
- **Session-level Settings:** Perintah seperti `SET search_path` tidak persisten antar-kueri karena koneksi di-*recycle*. Gunakan *schema-qualified names* secara eksplisit jika diperlukan.

---

## 3. Environment Management

### Definisi Environment
Aplikasi beroperasi pada **3 lingkungan terisolasi** yang dilarang saling berbagi sumber daya database:

| Environment | Supabase Project | Vercel Environment | Tujuan |
|-------------|------------------|-------------------|--------|
| **Development** | Project terpisah (atau lokal via Docker) | `development` | Pengembangan fitur dan eksperimen lokal. |
| **Staging** | Project terpisah | `preview` | Pengujian integrasi, QA, dan validasi migrasi sebelum production. |
| **Production** | Project terpisah (Plan Pro) | `production` | Lingkungan pengguna akhir. |

### Environment Variables
Seluruh *environment variable* vital wajib divalidasi saat *startup* menggunakan **Zod** (Fail-Fast). Aplikasi gagal *boot* jika konfigurasi tidak lengkap:

```typescript
// src/shared/config/env.ts
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(32),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'staging', 'production']),
});
```

Aturan ketat:
1. **Tidak ada *secret* yang di-*hardcode*** dalam kode sumber. Seluruhnya disimpan di Vercel Environment Variables.
2. **Setiap environment memiliki set variabel sendiri** yang menunjuk ke Supabase project yang benar.
3. **`SUPABASE_JWT_SECRET` dan `DATABASE_URL`** tidak boleh muncul di log, error message, atau respons HTTP.

---

## 4. CI/CD Pipeline

### Alur Deployment
```text
Developer → git push → Vercel Build → Preview Deployment
                                          │
                              ┌───────────┴───────────┐
                              │   Automated Checks    │
                              │  • TypeScript compile  │
                              │  • Lint (ESLint)       │
                              │  • Unit tests (Vitest) │
                              │  • Env var validation  │
                              └───────────┬───────────┘
                                          │ ✅ All pass
                                          ▼
                              Merge to main branch
                                          │
                                          ▼
                              Production Deployment
```

### Database Migration Strategy
Migrasi database **tidak dijalankan otomatis** saat deployment Vercel. Alur migrasi dikunci sebagai berikut:

1. Developer menjalankan `drizzle-kit generate` secara lokal untuk menghasilkan file migrasi SQL.
2. File migrasi di-*commit* ke *version control*.
3. **Sebelum deployment production**, developer menjalankan `drizzle-kit migrate` secara manual terhadap database staging terlebih dahulu untuk validasi.
4. Setelah validasi berhasil, migrasi dijalankan terhadap database production menggunakan koneksi langsung (port `5432`).
5. Deployment Vercel dilanjutkan setelah migrasi database selesai.

> **Aturan:** Tidak ada perubahan skema manual langsung ke database production. Seluruh perubahan wajib melewati file migrasi Drizzle ORM yang tersimpan di *version control*.

### Rollback Strategy
- **Kode Aplikasi:** Vercel mendukung *instant rollback* ke deployment sebelumnya melalui dashboard. Gunakan fitur ini jika deployment baru menyebabkan regresi.
- **Database Schema:** Rollback skema wajib dilakukan melalui file migrasi baru (*forward-only migration*). Tidak ada mekanisme `drizzle-kit rollback` otomatis. Migrasi yang merusak data (*destructive migration*) wajib diuji di staging terlebih dahulu.

---

## 5. Observability & Monitoring

### Error Tracking
- **Sentry** diintegrasikan untuk menangkap *unhandled exceptions*, *server action errors*, dan *client-side crashes*.
- Konfigurasi Sentry wajib mencakup *source maps upload* saat build agar *stack traces* di production dapat dibaca.
- `console.log` **dilarang** pada kode production. Gunakan *structured logging* melalui utilitas terpusat.

### Health Check Endpoint
Buat endpoint `GET /api/health` yang memvalidasi konektivitas sistem:

```typescript
// Respons 200 jika semua layanan terjangkau
{
  "status": "healthy",
  "database": "connected",    // SELECT 1 berhasil
  "timestamp": "2026-06-04T12:00:00Z"
}

// Respons 503 jika ada layanan yang gagal
{
  "status": "degraded",
  "database": "unreachable",
  "timestamp": "2026-06-04T12:00:00Z"
}
```

### Alerting (MVP)
- **Vercel:** Aktifkan *deployment failure notifications* via email/Slack.
- **Supabase:** Aktifkan *database health alerts* dan *connection pool usage alerts* dari dashboard Supabase.
- **Sentry:** Konfigurasi *alert rules* untuk lonjakan error rate yang melebihi ambang batas (misalnya: >10 errors/menit).

---

## 6. Backup & Disaster Recovery

### Database Backup
- **Supabase PITR (Point-in-Time Recovery):** Wajib diaktifkan pada project production (tersedia di plan **Pro**). Memungkinkan pemulihan database ke titik waktu manapun dalam 7 hari terakhir.
- **Daily Logical Backup:** Supabase secara otomatis membuat backup harian. Pastikan fitur ini aktif dan terverifikasi.

### Recovery Targets (MVP)
| Metrik | Target | Catatan |
|--------|--------|---------|
| **RPO** (Recovery Point Objective) | ≤ 1 jam | Data maksimal yang boleh hilang saat insiden. Dijamin oleh PITR. |
| **RTO** (Recovery Time Objective) | ≤ 2 jam | Waktu maksimal untuk memulihkan layanan. Termasuk restore database + redeploy aplikasi. |

### Runbook Pemulihan Darurat
1. **Data Corruption / Accidental Delete:**
   - Gunakan PITR Supabase untuk restore ke titik waktu sebelum insiden.
   - Validasi integritas data setelah restore.
   - Redeploy aplikasi jika diperlukan.
2. **Supabase Total Outage:**
   - Aplikasi beralih ke mode *read-only* (menampilkan *toast*: "Layanan sedang mengalami gangguan").
   - Monitor status di [status.supabase.com](https://status.supabase.com).
3. **Vercel Total Outage:**
   - Monitor status di [vercel-status.com](https://vercel-status.com).
   - Tidak ada failover tersedia di MVP. Tunggu pemulihan platform.

---

## 7. Security Hardening

### Wajib MVP
- **Rate Limiting:** Terapkan pembatasan trafik melalui Vercel Edge Middleware pada jalur rawan:
  - `/api/auth/*` — mencegah brute-force login.
  - `/api/health` — mencegah abuse endpoint.
  - Server Actions yang melakukan mutasi — mencegah spam.
- **Security Headers:** Konfigurasi header keamanan HTTP berikut melalui `next.config.js`:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- **Dependency Audit:** Jalankan `npm audit` sebagai bagian dari CI pipeline. Blokir deployment jika ditemukan kerentanan tingkat *critical*.

### Sebelum Production
- **Content Security Policy (CSP):** Terapkan CSP header yang membatasi sumber skrip, style, dan koneksi WebSocket hanya ke domain yang diizinkan.
- **CORS Policy:** Pastikan Supabase project production hanya menerima request dari domain production yang sah.

---

## 8. Realtime Reliability

### Degradation Strategy
Supabase Realtime bisa mengalami downtime atau pembatasan (*throttling*). Perilaku aplikasi saat Realtime tidak tersedia:

1. **Board tetap berfungsi.** Pengguna masih bisa membuat, mengedit, dan memindahkan task melalui Server Actions + Optimistic UI. Data tetap tersimpan di database.
2. **Sinkronisasi antar-klien berhenti.** Pengguna lain tidak melihat perubahan secara instan hingga mereka melakukan *refresh* atau *window focus* (di mana TanStack Query `refetchOnWindowFocus: true` memicu re-fetch).
3. **Indikator visual:** Tampilkan *banner* non-intrusif di top header: *"Sinkronisasi real-time sedang terganggu. Perubahan tetap tersimpan."*
4. **Auto-recovery:** Klien terus mencoba *reconnect* ke Supabase Realtime. Saat berhasil, *Full Re-sync* dieksekusi secara otomatis.

### Supabase Realtime Limits (Awareness)
- **Concurrent connections:** Tergantung plan Supabase. Monitor usage di dashboard.
- **Messages per second:** Tergantung plan. Untuk MVP dengan ≤20 user/workspace, limit ini tidak akan tercapai.

---

## 9. Offline & Recovery Strategy

### Fase MVP: Full Re-sync
- Bila saluran WebSocket terputus dan klien terdeteksi *offline*, klien membuang seluruh *cache* (`queryClient.invalidateQueries()`) dan menarik ulang data dari server segera setelah koneksi pulih.
- Implementasi wajib menggunakan *debounce* (jeda minimal 5 detik) agar koneksi tidak stabil tidak memicu *request storm*.
- Referensi teknis lengkap: lihat [AUTH_ARCHITECTURE.md §6 — Failure & Recovery Scenarios](file:///c:/Users/radit/.gemini/antigravity/scratch/PapanFokus/AUTH_ARCHITECTURE.md).

### Fase Masa Depan (Documented for Architecture Readiness)
Untuk evolusi arsitektur di masa depan, sistem dirancang agar bisa berkembang menuju kemampuan luring:
- **Mutation Queue:** Menyimpan antrean mutasi *client-side* di *IndexedDB* saat luring.
- **Background Sync:** Memutar ulang (*replay*) antrean mutasi ke backend saat koneksi pulih.
- **Conflict Resolution (Lanjut):** Transisi dari LWW ke CRDT atau *vector clocks* jika kebutuhan kolaborasi luring menjadi nyata.

> **Catatan:** Fitur-fitur di atas **bukan** bagian dari MVP. Didokumentasikan di sini agar arsitektur awal tidak menutup jalan evolusi.

---

## 10. Cost Awareness

### Billing Alerts (Wajib Diaktifkan)
- **Vercel:** Set *spending limit* dan *email alert* di dashboard Vercel untuk mencegah lonjakan biaya akibat traffic spike tak terduga.
- **Supabase:** Aktifkan *usage alerts* untuk database size, egress bandwidth, dan realtime connections.

### Cost Drivers Utama
| Layanan | Cost Driver | Mitigasi |
|---------|-------------|----------|
| Vercel | Jumlah *serverless function invocations* dan *bandwidth* | Gunakan `force-dynamic` hanya pada halaman board. Halaman statis (landing, auth) menggunakan ISR/static. |
| Supabase | Database compute size dan realtime concurrent connections | Pilih compute size yang tepat. Monitor connection pool usage. |
| Sentry | Jumlah *events* per bulan | Konfigurasi *sample rate* (misalnya 0.5 untuk development, 1.0 untuk production). Filter noise events. |

---

## 11. Architecture Decisions

| # | Keputusan | Nilai Final | ADR |
|---|-----------|-------------|-----|
| 1 | **Hosting Platform** | Vercel (compute) + Supabase (data + realtime). Serverless PaaS untuk zero-ops MVP. | ADR-101 |
| 2 | **Connection Strategy** | Supavisor `transaction` mode (port `6543`). Koneksi langsung hanya untuk migrasi. | ADR-102 |
| 3 | **Environment Isolation** | 3 environment terisolasi (dev, staging, production) dengan Supabase project terpisah. | ADR-103 |
| 4 | **Migration Strategy** | Forward-only via Drizzle ORM. Manual execution sebelum deployment. Tidak ada auto-migrate di CI. | ADR-104 |
| 5 | **Observability** | Sentry (error tracking) + structured logging + `/api/health` endpoint. | ADR-105 |
| 6 | **Backup & DR** | Supabase PITR (Pro plan). RPO ≤ 1 jam, RTO ≤ 2 jam. | ADR-106 |
| 7 | **Realtime Degradation** | Graceful degradation ke TanStack Query polling (`refetchOnWindowFocus`). Board tetap fungsional tanpa realtime. | ADR-107 |
| 8 | **Offline Strategy (MVP)** | Full Re-sync. Mutation queue dan CRDT ditunda ke post-MVP. | ADR-108 |
