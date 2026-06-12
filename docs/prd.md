# DOKUMEN KEBUTUHAN PRODUK (PRD) - Real-Time Collaborative Project Management (Mini-Jira/Trello)

**Nama Produk:** Real-Time Collaborative Project Management (Mini-Jira/Trello) **Fase:** Peluncuran Minimum Viable Product (MVP) **Target Rilis:** Versi 1.0 

### 1. Problem Statement (Masalah yang Diselesaikan)

* Tim sering mengalami tumpang tindih pengerjaan tugas karena aplikasi manajemen tidak diperbarui secara instan.


* Antarmuka aplikasi sering terasa lambat (*loading* terus-menerus) akibat metode *pulling* data tradisional.


* Kurangnya batasan isolasi data yang aman pada aplikasi yang berat di sisi klien (*frontend-heavy*).



### 2. Target User (Pengguna)

* 
**Pengguna Utama:** Tim *software development* (Agile) berskala kecil hingga menengah.


* 
**Pengguna Sekunder:** Pekerja lepas (*freelancer*) yang berkolaborasi dengan klien, dan manajer internal untuk pelacakan operasional harian.



### 3. Goal Bisnis & Teknis

* 
**User Goal:** Menghadirkan antarmuka visual responsif yang tersinkronisasi antar-layar secara instan tanpa mengharuskan pengguna melakukan *refresh* halaman.


* 
**Technical Goal:** Mengimplementasikan arsitektur *Full-Stack TypeScript* yang *type-safe* dengan target latensi pembaruan UI di bawah 100ms menggunakan pendekatan *Optimistic Updates*.



### 4. Success Metrics MVP (Metrik Keberhasilan)

* **Technical Success:**
* 
*Real-time sync* berhasil berjalan pada 3+ klien/perangkat secara bersamaan.


* 
*Optimistic update* bekerja instan tanpa mengharuskan *refresh* halaman.




* **Product Success:**
* Pengguna berhasil membuat *workspace* baru.


* Pengguna berhasil mengundang anggota tim.


* Pengguna dapat memindahkan *task* secara *real-time*.





### 5. User Journey & Invitation Flow

* 
**Akses & Autentikasi:** Developer melakukan *login* dengan kredensial secara aman.


* **Alur Undangan (*Invitation Flow*):**
* 
**Kasus A (Belum Punya Akun):** Pengguna mengklik *link* undangan ➔ Melakukan Registrasi ➔ Langsung diarahkan (*Join*) ke dalam *Workspace*.


* 
**Kasus B (Sudah Login):** Pengguna mengklik *link* undangan ➔ Otomatis tervalidasi dan langsung diarahkan (*Join*) ke dalam *Workspace*.




* 
**Masuk Tanpa Hambatan:** Halaman *Board* terbuka instan tanpa *loading spinner* berkat *Server-Side Rendering*.


* 
**Empty State (Onboarding Mulus):** Saat *workspace* baru pertama kali dibuat, sistem otomatis membuatkan 3 kolom *default*: *Backlog*, *In Progress*, dan *Done* untuk mengurangi friksi pengguna.


* 
**Interaksi Instan:** Saat pengguna memindahkan kartu ke kolom lain, UI langsung berubah secara lokal (*Optimistic Updates*).


* 
**Kolaborasi Real-Time:** Di saat yang sama, rekan tim di lokasi lain melihat pergeseran kartu secara visual di layar mereka tanpa perlu memuat ulang halaman (*WebSocket Broadcast*).



### 6. Fitur MVP, Limitasi & Batasan Fungsional

* 
**Standardisasi Terminologi:** **Workspace** digunakan sebagai entitas wadah proyek dan kolaborasi. Istilah **Board** secara eksklusif hanya merujuk pada antarmuka visual (UI) Kanban.


* 
**Autentikasi & Keamanan:** Registrasi, *login*, manajemen sesi, serta perlindungan privasi menggunakan *Data Access Layer* (DAL) sebagai otorisasi utama dan *Row Level Security* (RLS) minimal sebagai pertahanan tambahan untuk Realtime.


* 
**Manajemen CRUD & Ownership:** Pembuatan *Workspace*, kolom Kanban, dan manajemen tugas. **Owner** berhak mentransfer kepemilikan (*Board Ownership Transfer*) kepada *member* lain.


* **Workspace Plan & Limit (Anti-Abuse):**
* Maksimal 5 *Workspace* per akun.


* Maksimal 20 *Member* per *Workspace*.


* Maksimal 1.000 *Task* per *Workspace*.


* Maksimal 10 *Column* per *Board*.


* Maksimal **100 Task per Column**.




* 
**Aturan Kolom Default:** *Default columns* dapat diubah nama dan urutannya, namun *Workspace* **wajib memiliki minimal satu column** (tombol hapus dinonaktifkan jika hanya tersisa 1 kolom).


* **Batasan Entitas "Task" (Ketat untuk MVP):**
* Atribut tugas murni dibatasi pada: `id`, `title`, `description` (opsional), `status/column`, `assignee` (opsional), `position`, `created_at`, `updated_at`, dan `deleted_at`.


* Atribut ekstensi (seperti *due date* dan *label/tag*) ditunda.


* 
**Aturan Assignee:** Satu *task* hanya dapat memiliki maksimal **satu assignee aktif** untuk menyederhanakan skema MVP.




* **Kebijakan Penghapusan (Deletion Policy):**
* 
**Task:** Menggunakan mekanisme **Soft Delete** (`deleted_at TIMESTAMP`) agar aman di-*restore* dan menjaga integritas audit log.


* **Workspace:** Menggunakan mekanisme **Hard Delete**. Bersifat permanen (menyapu bersih relasi data) dan **hanya dapat dilakukan oleh Owner** melalui tahap konfirmasi ketat.




* 
**Conflict Resolution:** Menggunakan mekanisme **Last Write Wins (LWW)**. Jika terjadi konflik modifikasi bersamaan, `updated_at` terbaru akan dianggap valid, dan klien pengguna lain akan melakukan *auto re-sync*.


* 
**Tampilan UI Kanban:** Kartu di *board* utama bersifat minimalis, hanya menampilkan `title` dan avatar `assignee`. `description` diakses lewat *modal/drawer pop-up*.


* 
**Interaksi Papan Utama:** Fungsionalitas *Drag-and-Drop* disinkronisasi instan.



### 7. Data & Entity Model

* 
**`users`**: Tabel profil dasar dari sistem otentikasi.


* **`workspaces`**: Wadah kolaborasi tim. Wajib memiliki atribut **`owner_id`**. Memiliki atribut **`slug`** (*custom URL*, cth: `acme-team`) sehingga URL menjadi *human-readable* dan *SEO-friendly*.


* 
**`workspace_members`**: Tabel relasi untuk mengatur keanggotaan dan acuan RLS.


* 
**`invite_links` (Keamanan Undangan):** Tabel yang mengatur masa berlaku tautan dengan atribut: `workspace_id`, `role`, `token`, `expires_at`, dan `max_uses`.


* 
**`columns`**: Penyimpan hierarki status Kanban.


* **`tasks`**: Entitas manajemen kerja. Menggunakan skema *Fractional Positioning* (tipe `DOUBLE PRECISION` pada atribut `position`). Menerapkan *Soft Delete*.


* **`activity_logs`**: Mencatat log kolaborasi. Diterapkan kebijakan **Retention 90 hari** agar *database* tidak membengkak di masa depan.



### 8. Role, Permission Matrix & Membership Lifecycle

*Role* ditentukan mutlak oleh Admin di awal sebelum URL undangan di-*generate*. Untuk menyederhanakan MVP, **Admin** diasumsikan setara dengan **Owner** pada sistem izin (pemisahan hierarki *Owner* vs *Admin* dialokasikan ke masa depan).

| Aksi | Admin (Owner) | Member | Viewer |
| --- | --- | --- | --- |
| Lihat Board | ✅ | ✅ | ✅

 |
| Buat Task | ✅ | ✅ | ❌

 |
| Edit Task | ✅ | ✅ | ❌

 |
| Hapus Task | ✅ | ✅ | ❌

 |
| Drag Task | ✅ | ✅ | ❌

 |
| Kelola Member | ✅ | ❌ | ❌

 |
| Kelola Workspace | ✅ | ❌ | ❌

 |
| <br>*(Matriks ini diimplementasikan sebagai logika otorisasi di Data Access Layer / DAL. RLS hanya digunakan minimal untuk perlindungan saluran Realtime.)* 

 |  |  |  |

**Siklus Keanggotaan (Membership Lifecycle):**

* Anggota (*Workspace member*) diizinkan untuk keluar dari *workspace* secara mandiri.


* Admin memiliki hak wewenang untuk menghapus *member* dari *workspace*.


* 
*Owner* **mutlak tidak dapat keluar** dari *workspace* sebelum mentransfer *ownership* kepada orang lain.



### 9. Notifikasi & Log Aktivitas

* 
**In-app Notification:** Notifikasi *in-app* (ikon lonceng) dipicu secara terbatas hanya saat interaksi *direct attention* (contoh: pengguna diundang ke *workspace* baru atau secara eksplisit di-*assign* ke *task*).


* 
**Konsistensi Event Log & Real-time:** Sistem tidak mencatat aksi pasif (*scroll*, buka papan). Daftar lengkap event *Activity Log* dan *Real-Time Broadcast* didefinisikan secara otoritatif di `API.md` §4 dan §5. Berikut adalah **5 Event Inti Task** yang paling sering terjadi:


1. `TASK_CREATED`
2. `TASK_UPDATED`
3. `TASK_MOVED`
4. `TASK_ASSIGNED`
5. 
`TASK_DELETED` 

*(Sistem juga menangani event Column, Membership, dan Workspace. Lihat `API.md` untuk daftar lengkap.)*





### 10. Reporting & Analitik

Tidak disediakan antarmuka *dashboard* terpisah untuk meminimalisasi *context switching*. Metrik dirangkum di UI *Board* secara *native*:

* 
**Penghitung Tugas:** Total angka dipasang di *header* setiap kolom.


* 
**Progress Bar:** Rasio penyelesaian diukur dari jumlah tugas di kolom *Done* yang direpresentasikan dalam bentuk bilah progres di atas layar proyek.


* 
**Widget Aktivitas Harian:** Teks singkat ditarik dari `activity_logs` (cth: "5 tugas selesai hari ini") di area *sidebar*.



### 11. Integrasi

* 
**Fokus Utama (MVP):** 0 (Nol) integrasi pihak ketiga demi menjaga stabilitas inti fitur MVP.


* 
**Opsional MVP:** Webhook satu-arah untuk mengirim status *event* aktivitas ke *channel* Slack/Discord.



### 12. Technical Stack

* 
**Frontend:** Next.js 14+ (App Router, SSR, Server Actions).


* 
**Styling & UI:** shadcn/ui + TailwindCSS.


* 
**Drag-and-Drop Library:** `@dnd-kit`.


* 
**State Management & Caching:** TanStack Query (React Query) untuk *optimistic updates*, *cache management*, dan *server state synchronization*.


* 
**Database & ORM:** PostgreSQL (via Supabase) + Drizzle ORM.


* 
**Authentication:** Better Auth (Sesi berbasis *httpOnly cookies*).


* 
**Real-Time Engine:** `@supabase/supabase-js` (*Custom Channel Broadcasts*). Penyiaran eksklusif oleh Server Actions setelah transaksi database sukses.


* 
**Hosting:** Vercel.



### 13. Arsitektur Tambahan (Real-Time & NFR)

* 
**Real-Time Events Explicit Flow:** Terdapat 5 *event* siaran. Alurnya: Client A memutasi data ➔ Eksekusi DB via Server Action ➔ Supabase Realtime dipicu ➔ Penyiaran *payload* via WebSocket ke Client B, C, D ➔ Klien otomatis men-*sync* layar (*local cache*) secara instan.


* 
**Error Handling Optimistic Update:** Apabila mutasi DB dari *Server Action* gagal, sistem diwajibkan: melakukan *Rollback* state lokal ➔ memunculkan komponen *Toast Error* ➔ mere-sinkronisasi data secara otomatis dengan server.


* 
**Positioning Strategy:** *Task order* menggunakan mekanisme *fractional positioning*. Detail implementasi dan mitigasi (*rebalancing*) dikelola di dokumen teknis arsitektur terpisah.


* **Non-Functional Requirements (NFR):**
* 
**Data Consistency:** *Client* wajib melakukan *full re-sync* (menarik ulang data dari server) apabila kehilangan koneksi *real-time* dan berhasil terkoneksi kembali.


* 
*Board Load Time:* < 2 detik.


* 
*Real-time Sync:* < 500ms (antar *client*).


* 
*Optimistic Update:* < 100ms latensi persepsi.


* 
*Drag-and-Drop Framerate:* Stabil di 60 FPS.


* 
*Availability:* 99% SLA.





### 14. Future Roadmap

1. Migrasi ke implementasi algoritma **LexoRank** penuh untuk *drag-and-drop* skala berat.


2. Fitur unggah dokumen/lampiran (*file uploads*) yang terintegrasi dengan Supabase Storage Buckets.


3. Notifikasi eksternal via Email / *Push notifications*.


4. Dasbor analitik terpisah untuk pemantauan *Velocity*, *Cycle Time*, dan *Workload* tim.


5. Integrasi fungsional dua arah dengan platform luar (Slack OAuth, GitHub, Google Drive).


6. 
**Integrasi Pembayaran / Payment Gateway (SaaS Billing)** untuk transisi ke model bisnis komersial publik.


7. Pemisahan Hierarki *Role* (Memisahkan fungsionalitas murni antara *Owner* dan *Admin*).
