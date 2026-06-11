# AUTH_ARCHITECTURE.md - Strategi Autentikasi & Integrasi Realtime

## 1. Authentication Provider: Better Auth
Aplikasi ini dikunci secara final untuk menggunakan **Better Auth** sebagai penyedia layanan identitas (*identity provider*) utama dengan sesi berbasis `httpOnly` cookie.

### Alasan Bisnis & Teknis Pemilihan Better Auth:
- **Pengurangan Ketergantungan Identitas:** Komponen infrastruktur lainnya (Database, Realtime, dan potensi Storage di masa depan) sudah bersandar pada ekosistem Supabase. Dengan memisahkan lapisan identitas ke Better Auth, kita mengurangi kedalaman ketergantungan (*dependency depth*) pada satu vendor. Ini bukan eliminasi *vendor lock-in* secara total — Supabase tetap menjadi tulang punggung data dan *realtime* — melainkan strategi agar **migrasi penyedia autentikasi di masa depan menjadi lebih mudah** tanpa harus membongkar lapisan data.
- **Keamanan Lapis Aplikasi:** Menggunakan sesi `httpOnly` cookie yang kebal terhadap serangan penyisipan skrip (XSS / Cross-Site Scripting), sangat kompatibel dengan lingkungan Next.js *Server Components* dan *Server Actions*.
- **Fleksibilitas Kustomisasi:** Memudahkan integrasi skema kredensial, OAuth (Google, GitHub), dan *magic links* dengan kustomisasi alur antarmuka (UI/UX) yang jauh lebih leluasa dibandingkan komponen bawaan Supabase Auth.

### Service Boundary Diagram
Diagram berikut menggambarkan alur permintaan dari klien hingga ke lapisan data dan *realtime*. Setiap panah merepresentasikan batas layanan (*service boundary*) yang tidak boleh dilompati:

```text
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │  httpOnly Cookie (Better Auth Session)
       ▼
┌─────────────┐
│ Next.js     │
│ Middleware   │  → Redirect cepat (Edge): cek cookie ada/tidak
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│ Server Action /         │
│ Server Component        │  → Validasi sesi Better Auth (Node.js)
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Data Access Layer (DAL) │  → Otorisasi bisnis (role, membership, tenant guard)
│                         │  → Akses database via Drizzle ORM
└──────┬──────────────────┘
       │
       ├──────────────────────────────┐
       ▼                              ▼
┌──────────────┐          ┌───────────────────────┐
│  PostgreSQL  │          │ getRealtimeToken()    │
│  (Supabase)  │          │ → Mint custom JWT     │
└──────────────┘          └───────────┬───────────┘
                                      │  JWT (30–60 min)
                                      ▼
                          ┌───────────────────────┐
                          │ Supabase Realtime      │
                          │ (WebSocket Channel)    │
                          │ → RLS: membership check│
                          └───────────────────────┘
```

**Aturan kunci:** Browser tidak pernah berkomunikasi langsung dengan PostgreSQL atau DAL. Seluruh akses data melewati Server Action/Component → DAL. Koneksi Realtime WebSocket adalah satu-satunya jalur langsung dari browser ke Supabase, dijaga oleh JWT bermasa aktif pendek dan kebijakan RLS.

---

## 2. Strategi JWT Realtime (Jembatan Supabase)
Supabase Realtime (WebSocket) mewajibkan otentikasi menggunakan JWT (*JSON Web Token*) agar kebijakan *Row Level Security* (RLS) PostgreSQL dapat mendeteksi identitas klien untuk saluran penyiaran (*broadcast channel*). Karena lapisan web aplikasi kita memakai *cookie* dari Better Auth, kita menggunakan strategi **Jembatan JWT** (JWT Bridge):

1. **Login Flow:** Klien melakukan *login* via Better Auth. Server membuat `httpOnly` cookie.
2. **Realtime Handshake:** Saat membuka papan Kanban, Klien memanggil Server Action `getRealtimeToken()`.
3. **Token Minting (Server-Side):** Server Action memvalidasi sesi dari cookie. Jika otentikasi sah, Server menerbitkan *custom JWT* instan yang ditandatangani menggunakan `SUPABASE_JWT_SECRET`, memuat klaim `sub` (User ID) dan peran `authenticated`.
4. **Connection:** Token dikembalikan ke Klien. Klien menggunakannya untuk menginisialisasi klien `@supabase/supabase-js` dan berlangganan WebSocket.

### Risiko Keamanan & Kompromi MVP
Pembuatan *custom JWT* dilakukan dengan menandatanganinya secara langsung menggunakan rahasia inti `SUPABASE_JWT_SECRET` dari *server* Next.js.
- **Risiko Keamanan:** Aplikasi utama memiliki `SUPABASE_JWT_SECRET` yang memberinya kekuatan mutlak untuk menerbitkan JWT dengan klaim hak akses apapun ke database Supabase. Jika *secret* ini terekspos karena kerentanan *server*, peretas bisa menembus batas RLS database sepenuhnya.
- **Catatan Kompromi:** Pendekatan ini diterima **hanya untuk skala MVP** demi kecepatan pengembangan. Risiko dimitigasi oleh fakta bahwa `SUPABASE_JWT_SECRET` hanya berada di sisi *server* (tidak pernah terkirim ke klien) dan dilindungi oleh *environment variable* Vercel.
- **Mitigasi Jangka Panjang:** Pada fase penskalaan, mekanisme ini wajib ditinjau ulang (misalnya menerapkan *Key Rotation* ketat, memindahkan otorisasi ke proxy WebSocket khusus, atau menggunakan mekanisme otorisasi JWT terdesentralisasi pihak ketiga).

### Realtime Token Lifecycle
Berikut adalah siklus hidup lengkap token JWT Realtime yang wajib diimplementasikan:

1. **Masa Aktif:** Realtime JWT diterbitkan dengan masa aktif pendek: **30–60 menit** (dikonfigurasi via klaim `exp` saat *minting*).
2. **Proactive Refresh:** Klien wajib memanggil ulang `getRealtimeToken()` **sebelum** token kedaluwarsa. Implementasi menggunakan `setTimeout` yang dikalkulasi dari `exp` token dikurangi *buffer* aman (misalnya 5 menit sebelum kedaluwarsa).
3. **Expired/Invalid Token:** Jika token kedaluwarsa atau ditolak oleh Supabase Realtime, koneksi WebSocket **wajib diputus** dan dibuat ulang (*reconnect*) menggunakan token baru hasil pemanggilan `getRealtimeToken()`.
4. **Session Invalid (Cascading Logout):** Jika pemanggilan `getRealtimeToken()` gagal karena sesi Better Auth sudah tidak valid (cookie kedaluwarsa, sesi dicabut, atau pengguna di-*kick*), klien **wajib** menjalankan alur berikut secara berurutan:
   - Melakukan *logout* otomatis dari sisi klien.
   - Membersihkan seluruh *cache* sensitif (`queryClient.clear()`).
   - Mengarahkan (*redirect*) pengguna ke halaman *login*.

### Realtime Channel Authorization Flow
Autentikasi (siapa pengguna ini?) dan otorisasi saluran (bolehkah pengguna ini mengakses *workspace* ini?) adalah **dua proses yang terpisah**. JWT yang valid tidak otomatis memberikan akses ke semua *workspace*:

1. Klien meminta *subscribe* ke channel `workspace:{workspaceId}` menggunakan JWT Realtime.
2. Supabase Realtime memverifikasi tanda tangan dan masa aktif JWT → **Autentikasi** (identitas terkonfirmasi).
3. Kebijakan RLS PostgreSQL mengevaluasi apakah `auth.uid()` (dari klaim `sub` JWT) terdaftar sebagai anggota di tabel `workspace_members` untuk `workspaceId` yang diminta → **Otorisasi** (hak akses terkonfirmasi).
4. Jika *membership* tidak valid (pengguna bukan anggota *workspace* tersebut), *subscription* **ditolak** meskipun JWT secara kriptografis sah.
5. Satu JWT dapat digunakan untuk berlangganan ke beberapa channel *workspace* yang berbeda, selama pengguna terdaftar sebagai anggota di masing-masing *workspace* tersebut.

### Security Assumptions
Asumsi keamanan berikut menjadi dasar (*threat model*) seluruh arsitektur autentikasi MVP:

1. **Environment variables** (`SUPABASE_JWT_SECRET`, `DATABASE_URL`, kredensial Better Auth) tidak pernah terekspos ke sisi klien. Dikelola eksklusif oleh Vercel *server runtime*.
2. **`SUPABASE_JWT_SECRET`** hanya tersedia pada *server runtime* Next.js. Tidak pernah di-*bundle* ke kode klien, tidak disimpan di *localStorage*, dan tidak dikirim melalui respons HTTP.
3. **HTTPS wajib digunakan** di seluruh *environment* produksi. Koneksi *plaintext* HTTP tidak diizinkan.
4. **Cookie Better Auth** dikonfigurasi dengan atribut `Secure` + `HttpOnly` + `SameSite=Lax` (minimum), memastikan cookie hanya dikirim melalui HTTPS dan tidak dapat diakses oleh JavaScript sisi klien.
5. **JWT Realtime tidak pernah disimpan di database** atau *persistent storage* apapun. Token hanya hidup di memori klien selama sesi aktif.
6. **JWT Realtime hanya digunakan untuk koneksi WebSocket** ke Supabase Realtime. Token ini tidak boleh digunakan untuk mengakses Supabase REST API, Storage API, atau endpoint lain di luar *channel subscription*.

---

## 3. Authorization Principle
RLS (Row Level Security) PostgreSQL **bukan** sumber kebenaran utama (*Source of Truth*) untuk otorisasi aplikasi ini.

Prinsip otorisasi dikunci sebagai berikut:
1. **Seluruh keputusan akses bisnis** — termasuk validasi peran (*role*), keanggotaan (*membership*), kepemilikan (*ownership*), dan izin operasi (*permissions*) — **diproses secara eksklusif di dalam Data Access Layer (DAL)** menggunakan logika TypeScript dan kueri Drizzle ORM.
2. **RLS hanya berfungsi sebagai lapisan pertahanan tambahan** (*defense-in-depth*) untuk dua tujuan terbatas:
   - Menjaga gerbang langganan (*subscription*) WebSocket Supabase Realtime agar pengguna luar tidak bisa menguping saluran *workspace* yang bukan miliknya.
   - Menyediakan *database boundary protection* minimal sebagai jaring pengaman jika terjadi *bug* di lapisan aplikasi.
3. **Tidak ada fitur aplikasi yang boleh bergantung sepenuhnya pada RLS** untuk menentukan hak akses bisnis. Jika RLS dinonaktifkan, logika otorisasi DAL harus tetap mampu menolak seluruh akses yang tidak sah secara mandiri.
4. **Logika *permission* dilarang tersebar** ke dalam kebijakan RLS PostgreSQL secara tidak konsisten. Satu-satunya tempat untuk mendefinisikan dan menegakkan aturan izin adalah DAL.

---

## 4. DAL Security Rule
Data Access Layer (DAL) adalah **satu-satunya batas resmi (*boundary*)** untuk seluruh interaksi dengan database. Aturan ini bersifat absolut dan tanpa pengecualian:

1. **Route Handler (`/api/*`)** tidak boleh mengakses Drizzle ORM secara langsung.
2. **Server Actions** tidak boleh mengakses Drizzle ORM secara langsung.
3. **React Server Components** tidak boleh mengakses Drizzle ORM secara langsung.
4. Seluruh akses database **wajib melewati fungsi DAL domain terkait**.

**Pola yang Dilarang:**
```typescript
// ❌ DILARANG — akses langsung ke Drizzle ORM dari Server Action / Route Handler
const result = await db.select().from(tasks).where(eq(tasks.id, taskId));
```

**Pola yang Wajib:**
```typescript
// ✅ WAJIB — melewati DAL yang menangani otorisasi dan validasi
const result = await tasksDAL.getTask(taskId, workspaceId, userId);
```

Dengan menegakkan aturan ini, seluruh validasi otorisasi, isolasi *tenant*, dan sanitasi kueri terjamin terpusat di satu titik kontrol tanpa kemungkinan terlewat.

---

## 5. Tenant Isolation Guard
Isolasi penyewa (*Tenant Isolation*) merupakan lapisan keamanan sentral paling krusial bagi sebuah aplikasi SaaS *multi-tenant*. Kebocoran silang atau tumpang tindih data antar-*workspace* adalah cacat fatal yang tidak dapat ditoleransi.

Aturan ketat berikut ditetapkan untuk Data Access Layer (DAL):
1. Seluruh operasi DAL (kueri, mutasi, penghapusan) **wajib menerima parameter eksplisit `workspaceId`**.
2. Seluruh operasi DAL **wajib memvalidasi keanggotaan pengguna (*membership check*)** terhadap *workspace* tersebut sebelum membaca atau mengubah data apapun.
3. Tidak ada satu pun kueri yang diizinkan beroperasi hanya dengan modal `taskId`, `columnId`, atau `boardId` tanpa penyertaan validasi konteks `workspaceId`.

**Pola Arsitektur yang Benar (Wajib Ditiru):**
```typescript
getTask(taskId: string, workspaceId: string, userId: string)
moveTask(taskId: string, workspaceId: string, userId: string, payload: MovePayload)
updateTask(taskId: string, workspaceId: string, userId: string, payload: UpdatePayload)
```
Dengan pola ini, sekalipun `taskId` berhasil disadap atau ditebak oleh peretas, permintaan manipulasi pasti **ditolak** jika `workspaceId` tidak sesuai (mencegah *IDOR*) atau jika `userId` saat ini bukan bagian dari anggota sah *workspace* tersebut.

---

## 6. Failure & Recovery Scenarios
Bagian ini mendefinisikan perilaku sistem yang **wajib diimplementasikan** untuk setiap skenario kegagalan. Engineer tidak perlu merancang ulang respons error — cukup ikuti alur yang sudah ditetapkan.

### Realtime Disconnect
Koneksi WebSocket terputus karena gangguan jaringan atau *server restart*:
1. Klien mendeteksi status saluran berubah menjadi `closed` atau `errored`.
2. Klien melakukan *reconnect* otomatis menggunakan mekanisme bawaan `@supabase/supabase-js`.
3. Saat *reconnect*, klien memanggil `getRealtimeToken()` untuk mendapatkan token baru jika token sebelumnya sudah mendekati kedaluwarsa.
4. Setelah koneksi WebSocket berhasil terhubung kembali, klien **wajib** mengeksekusi *Full Re-sync* board (`queryClient.invalidateQueries()`) untuk menarik kebenaran terbaru dari database.
5. Implementasi wajib menggunakan *debounce* (jeda minimal 5 detik) agar koneksi tidak stabil tidak memicu lonjakan permintaan (*request storm*).

### Session Revoked
Sesi Better Auth dicabut (admin menghapus sesi, pengguna *logout* di perangkat lain, atau cookie kedaluwarsa):
1. Pemanggilan `getRealtimeToken()` gagal karena validasi sesi *server-side* menolak cookie.
2. Klien mendeteksi kegagalan dan menjalankan alur *Cascading Logout*:
   - Menutup koneksi WebSocket (`channel.unsubscribe()`).
   - Membersihkan seluruh *cache* sensitif (`queryClient.clear()`).
   - Mengarahkan pengguna ke halaman *login*.
3. Pesan *Toast* ditampilkan: *"Sesi Anda telah berakhir. Silakan login kembali."*

### Invalid Workspace Membership
Pengguna dihapus dari *workspace* oleh Admin sementara pengguna tersebut masih terhubung:
1. Kebijakan RLS Supabase Realtime menolak *subscription* yang aktif karena *membership check* gagal.
2. Klien menerima event `MEMBER_REMOVED` (jika broadcast berhasil terkirim sebelum penolakan) atau mengalami kegagalan *channel subscription*.
3. Klien **wajib**:
   - Menutup koneksi WebSocket untuk *workspace* tersebut.
   - Membersihkan *cache* data *workspace* yang bersangkutan.
   - Mengarahkan pengguna ke halaman daftar *workspace* (`/dashboard`).
4. Pesan *Toast* ditampilkan: *"Anda tidak lagi memiliki akses ke workspace ini."*

---

## 7. Architecture Decisions
Bagian ini bertindak sebagai *Single Source of Truth* (Sumber Kebenaran Utama) dari seluruh keputusan operasional identitas, otorisasi, dan keamanan data. Keputusan ini **sudah dikunci** untuk eksekusi:

| # | Keputusan | Nilai Final | ADR |
|---|-----------|-------------|-----|
| 1 | **Authentication Provider** | Better Auth. Data identitas disimpan di database aplikasi sendiri untuk mengurangi ketergantungan pada lapisan identitas vendor tunggal. | ADR-001 |
| 2 | **Session Strategy** | Sesi berbasis database + `httpOnly` cookie (`Secure`, `HttpOnly`, `SameSite=Lax`). Dikelola penuh oleh Better Auth di lingkungan Next.js App Router. | ADR-002 |
| 3 | **Realtime Authentication Strategy** | Custom JWT Bridge. Token bermasa aktif 30–60 menit, diterbitkan oleh Server Action `getRealtimeToken()`, ditandatangani menggunakan `SUPABASE_JWT_SECRET` (kompromi MVP yang terkendali). | ADR-003 |
| 4 | **Authorization Principle** | App-Level Authorization (Logic-Driven). Seluruh keputusan akses bisnis (role, membership, ownership) diproses eksklusif di DAL. RLS hanya berfungsi sebagai pertahanan tambahan untuk Realtime dan *database boundary protection*. | ADR-004 |
| 5 | **DAL Security Rule** | DAL adalah satu-satunya *boundary* resmi untuk akses database. Route Handler, Server Actions, dan Server Components dilarang mengakses Drizzle ORM secara langsung. | ADR-005 |
| 6 | **Tenant Isolation Strategy** | Isolasi tingkat fungsi DAL (Tenant Isolation Guard). Setiap pemanggilan fungsi wajib memvalidasi tripel identitas: `Entity ID` + `Workspace ID` + `User ID (Session)`. | ADR-006 |
