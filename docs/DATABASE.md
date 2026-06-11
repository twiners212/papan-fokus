# DATABASE.md

Dokumen ini mendefinisikan arsitektur basis data, skema tabel PostgreSQL, relasi entitas, strategi pengindeksan, kebijakan retensi data, serta mekanisme otorisasi dan integritas data untuk MVP Aplikasi SaaS Real-Time Kanban (Mini-Jira/Trello Clone) menggunakan Drizzle ORM dan Supabase.

---

## 1. Spesifikasi Teknis & Konvensi Penamaan

### Stack Teknologi Data
* **Database Engine:** PostgreSQL (Hosted via Supabase)
* **Object-Relational Mapping (ORM):** Drizzle ORM (TypeScript Native)
* **Authentication Engine:** Better Auth (Sesi berbasis tabel/cookie)
* **Real-time Engine:** Supabase Realtime (WebSocket Broadcast & Listen)

### Konvensi Penamaan (Naming Conventions)
1. **Nama Tabel:** Menggunakan format jamak (*plural*) dan huruf kecil penuh (`snake_case`), contoh: `users`, `workspaces`, `tasks`.
2. **Nama Kolom:** Menggunakan format `snake_case` di tingkat database PostgreSQL. Drizzle ORM akan memetakan secara otomatis ke format `camelCase` di level aplikasi TypeScript.
3. **Primary Key (PK):** Kolom pengenal tunggal menggunakan tipe data `UUID` dengan *default value* `gen_random_uuid()`, kecuali pada tabel perantara (*junction table*) yang menerapkan *Composite Primary Key*.
4. **Foreign Key (FK):** Dinamai dengan format `entity_name_id` (contoh: `workspace_id` yang mereferensikan tabel `workspaces`).
5. **Waktu (Timestamps):** Kolom waktu wajib menggunakan tipe `TIMESTAMPTZ` (Timestamp dengan Timezone) untuk menjamin akurasi sinkronisasi data seluruh wilayah pengguna secara real-time.

---

## 2. Definisi Tipe Data Kustom (PostgreSQL Custom ENUMs)

Untuk menjamin integritas data mutlak pada level basis data serta mendukung *Type-Safety* penuh via `pgEnum()` di Drizzle ORM, kita menetapkan tipe kustom berikut:

### 2.1. `workspace_role_enum`
Mendefinisikan hak akses peran dalam sebuah workspace.
* **Nilai:** `'admin'`, `'member'`, `'viewer'`

### 2.2. `notification_type_enum`
Kategori pesan notifikasi *in-app* untuk pengguna.
* **Nilai:** `'INVITED_TO_WORKSPACE'`, `'TASK_ASSIGNED'`

### 2.3. `activity_type_enum`
Jenis aksi operasional bisnis yang dicatat untuk jejak audit feeding aktivitas.
* **Nilai:** `'TASK_CREATED'`, `'TASK_UPDATED'`, `'TASK_MOVED'`, `'TASK_ASSIGNED'`, `'TASK_UNASSIGNED'`, `'TASK_DELETED'`, `'TASK_RESTORED'`, `'COLUMN_CREATED'`, `'COLUMN_UPDATED'`, `'COLUMN_MOVED'`, `'COLUMN_DELETED'`, `'WORKSPACE_UPDATED'`, `'OWNERSHIP_TRANSFERRED'`, `'MEMBER_JOINED'`, `'MEMBER_REMOVED'`, `'MEMBER_LEFT'`

---

## 3. Skema Tabel dan Kamus Data (MVP Final)

MVP ini dikunci dengan **8 entitas inti** yang dirancang ramping, aman, serta dioptimalkan khusus untuk efisiensi beban kerja kolaborasi *real-time*.

### 3.1. `users`
Menyimpan data profil dasar pengguna yang terautentikasi dan terintegrasi dengan Better Auth.

| Nama Kolom | Tipe Data | Atribut | Keterangan / Batasan |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY | Pengenal unik pengguna (Sinkronisasi Better Auth). |
| `email` | `VARCHAR(255)` | NOT NULL, UNIQUE | Alamat email aktif untuk autentikasi. |
| `name` | `VARCHAR(255)` | NOT NULL | Nama lengkap tampilan (*display name*) pengguna. |
| `avatar_url` | `TEXT` | NULLABLE | Tautan URL gambar profil pengguna. |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | Waktu registrasi akun pertama kali. |

### 3.2. `workspaces`
Papan proyek utama (*Project Board*). Penghapusan entitas ini menerapkan metode **Hard Delete** (Cascade menghapus otomatis semua data anak).

| Nama Kolom | Tipe Data | Atribut | Keterangan / Batasan |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY | Pengenal unik workspace. Default: `gen_random_uuid()`. |
| `name` | `VARCHAR(100)` | NOT NULL | Nama dari workspace atau papan proyek. |
| `slug` | `VARCHAR(100)` | NOT NULL, UNIQUE | Digunakan untuk kebutuhan routing URL ramah pengguna (e.g., `/acme-team`). |
| `description` | `TEXT` | NULLABLE | Penjelasan deskripsi opsional mengenai board kerja. |
| `owner_id` | `UUID` | NOT NULL, FOREIGN KEY | Mereferensikan `users.id`. Diperlukan untuk transfer kepemilikan. |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | Waktu pembuatan awal workspace. |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | Waktu modifikasi terakhir data workspace. |

### 3.3. `workspace_members`
Tabel *junction* untuk mengelola relasi keanggotaan pengguna di dalam satu workspace beserta peran aksenya.

| Nama Kolom | Tipe Data | Atribut | Keterangan / Batasan |
| :--- | :--- | :--- | :--- |
| `workspace_id` | `UUID` | COMPOSITE PK, FK | Mereferensikan `workspaces.id` (`ON DELETE CASCADE`). |
| `user_id` | `UUID` | COMPOSITE PK, FK | Mereferensikan `users.id` (`ON DELETE CASCADE`). |
| `role` | `workspace_role_enum` | NOT NULL | Peran akses terikat: `admin`, `member`, atau `viewer`. |
| `joined_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | Waktu pengguna resmi bergabung ke dalam board. |

### 3.4. `invite_links`
Token tautan undangan eksternal untuk mendaftarkan pengguna baru dengan hak peran otomatis dan pembatasan kuota klik.

| Nama Kolom | Tipe Data | Atribut | Keterangan / Batasan |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY | Pengenal unik baris data tautan undangan. |
| `workspace_id` | `UUID` | NOT NULL, FOREIGN KEY | Mereferensikan `workspaces.id` (`ON DELETE CASCADE`). |
| `token` | `VARCHAR(255)` | NOT NULL, UNIQUE | Token string acak pada URL kustom undangan. |
| `role` | `workspace_role_enum` | NOT NULL | Peran otomatis yang didapatkan pengguna baru (`member` / `viewer`). |
| `max_uses` | `INTEGER` | NOT NULL | Batas kuota maksimal klaim tautan undangan. |
| `uses_count` | `INTEGER` | NOT NULL, DEFAULT 0 | Jumlah klaim sukses yang telah berjalan. |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | Waktu kedaluwarsa link (maksimal 24 jam sesuai PRD). |
| `created_by` | `UUID` | NOT NULL, FOREIGN KEY | Mereferensikan `users.id` sebagai Admin pembuat. |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | Waktu pembuatan tautan undangan. |

### 3.5. `columns`
Kolom status alur kerja Kanban board (e.g., Todo, In Progress, Done).

| Nama Kolom | Tipe Data | Atribut | Keterangan / Batasan |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY | Pengenal unik lajur kolom status. |
| `workspace_id` | `UUID` | NOT NULL, FOREIGN KEY | Mereferensikan `workspaces.id` (`ON DELETE CASCADE`). |
| `name` | `VARCHAR(100)` | NOT NULL | Judul nama kolom status alur kerja. |
| `position` | `DOUBLE PRECISION` | NOT NULL | Nilai posisi pecahan untuk drag-and-drop urutan kolom. |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | Waktu pembuatan kolom status. |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | Waktu modifikasi nama/posisi lajur kolom. |

### 3.6. `tasks`
Kartu tugas individual dalam Kanban board. Tabel ini sengaja di-**denormalisasi ringan** dengan menyertakan `workspace_id` secara langsung demi performa isolasi *multi-tenant* dan efisiensi RLS Realtime. Menerapkan pola **Soft Delete**.

| Nama Kolom | Tipe Data | Atribut | Keterangan / Batasan |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY | Pengenal unik kartu tugas. |
| `workspace_id` | `UUID` | NOT NULL, FOREIGN KEY | Mereferensikan `workspaces.id` (`ON DELETE CASCADE`). Denormalisasi performa. |
| `column_id` | `UUID` | NOT NULL, FOREIGN KEY | Mereferensikan `columns.id` (`ON DELETE RESTRICT`). |
| `title` | `VARCHAR(255)` | NOT NULL | Judul nama kartu tugas. |
| `description` | `TEXT` | NULLABLE | Deskripsi rincian konteks tugas. |
| `position` | `DOUBLE PRECISION` | NOT NULL | Nilai posisi pecahan untuk drag-and-drop tugas di dalam kolom. |
| `assignee_id` | `UUID` | NULLABLE, FOREIGN KEY | Mereferensikan `users.id`. Maksimal 1 assignee aktif (PRD). |
| `created_by` | `UUID` | NOT NULL, FOREIGN KEY | Mereferensikan `users.id` sebagai pencipta tugas awal (audit trail). |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | Waktu penciptaan tugas. |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | Waktu interaksi mutasi terakhir pada kartu tugas. |
| `deleted_at` | `TIMESTAMPTZ` | NULLABLE | Penanda waktu soft-delete. Jika terisi, dianggap terhapus dari board. |

> 🛑 **Aturan Sinkronisasi Penting:** Kehadiran dua kolom relasional (`column_id` dan `workspace_id`) pada satu tabel mewajibkan pengawalan integritas data secara ketat di level aplikasi (*DAL/Service Layer*). Lihat **Poin 6** untuk detail protokol mutasi wajib.

### 3.7. `activity_logs`
Mencatat rekam riwayat audit (*audit trail*) kolaborasi tim untuk asupan feed real-time.

| Nama Kolom | Tipe Data | Atribut | Keterangan / Batasan |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY | Pengenal unik log aktivitas. |
| `workspace_id` | `UUID` | NOT NULL, FOREIGN KEY | Mereferensikan `workspaces.id` (`ON DELETE CASCADE`). |
| `actor_id` | `UUID` | NOT NULL, FOREIGN KEY | Mereferensikan `users.id` sebagai pelaku mutasi bisnis. |
| `action_type` | `activity_type_enum` | NOT NULL | Jenis mutasi terdaftar (e.g., `TASK_MOVED`). |
| `entity_id` | `UUID` | NOT NULL | ID objek target pengerjaan (ID task atau ID column). |
| `details` | `JSONB` | NULLABLE | Metadata dinamis pendukung (e.g., `{ "prev": 1000, "new": 1500 }`). |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | Waktu mutasi aksi dieksekusi. |

> 🕒 **Kebijakan Retensi Data Otomatis:** Tabel `activity_logs` dikonfigurasi dengan *Retention Awareness*. Data log lama akan dihapus otomatis dari basis data setelah melewati masa **90 hari** menggunakan skrip pembersih terjadwal (*Scheduled Cleanup Job* seperti `pg_cron` PostgreSQL atau Vercel Cron) via kueri: `DELETE WHERE created_at < NOW() - INTERVAL '90 days';`.

### 3.8. `notifications`
Penyimpanan notifikasi *in-app* permanen untuk menjamin pengguna yang sedang *offline* tidak kehilangan informasi penugasan penting.

| Nama Kolom | Tipe Data | Atribut | Keterangan / Batasan |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY | Pengenal unik baris notifikasi. |
| `user_id` | `UUID` | NOT NULL, FOREIGN KEY | Mereferensikan `users.id` sebagai entitas **penerima** notifikasi. |
| `type` | `notification_type_enum` | NOT NULL | Jenis kategori notifikasi (e.g., `TASK_ASSIGNED`). |
| `content` | `TEXT` | NOT NULL | Konten teks pesan notifikasi untuk UI render. |
| `is_read` | `BOOLEAN` | NOT NULL, DEFAULT `false`| Status penanda baca oleh pengguna terkait. |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | Waktu notifikasi didistribusikan. |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | Waktu perubahan status keterbacaan (pelacakan interaksi). |

---

## 4. Strategi Pengindeksan (Indexing Plan)

Untuk mengeliminasi risiko kelambatan akibat pencarian menyeluruh (*Full Table Scan*), indeks B-Tree berikut wajib diimplementasikan murni di luar indeks otomatis Primary Key bawaan:

### 4.1. Indeks Validasi Keanggotaan & Otorisasi RLS Realtime Fast-Lookup
* `CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);`
  * *Paling krusial untuk mengevaluasi otorisasi cepat saluran WebSocket Realtime dari Supabase yang mencocokkan ID pengguna.*
* `CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);`
  * *Mempercepat penarikan relasi daftar tim di dalam satu board tertentu.*

### 4.2. Indeks Urutan Komponen Board (Ordering Component Indexes)
* `CREATE INDEX idx_columns_workspace_position ON columns(workspace_id, position);`
  * *Composite Index untuk mempercepat query rendering kolom Kanban secara terurut.*
* `CREATE INDEX idx_tasks_column_position ON tasks(column_id, position) WHERE deleted_at IS NULL;`
  * *Composite Index parsial yang mengabaikan tugas berstatus soft-deleted, menjamin pemuatan barisan kartu tugas berjalan super-cepat.*

### 4.3. Indeks Operasional & Pencarian Cepat (Lookup Indexes)
* `CREATE INDEX idx_workspaces_slug ON workspaces(slug);`
  * *Mempercepat pemuatan data papan kerja berdasarkan parameter slug di Next.js App Router.*
* `CREATE INDEX idx_tasks_workspace_id ON tasks(workspace_id) WHERE deleted_at IS NULL;`
  * *Mendukung lookup performa tinggi untuk aturan RLS satu lajur anti-join.*
* `CREATE INDEX idx_invite_links_token ON invite_links(token);`
  * *Mempercepat verifikasi token saat link undangan diklik.*
* `CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);`
  * *Composite Index guna mengoptimalkan perhitungan jumlah angka unread badge notifikasi lonceng pengguna.*
* `CREATE INDEX idx_tasks_assignee ON tasks(assignee_id) WHERE deleted_at IS NULL;`
  * *Membantu mempercepat pemuatan pintasan fitur "Tugas Saya".*

---

## 5. Strategi Urutan Drag & Drop (Ordering Mechanics)

Aplikasi menerapkan pengurutan berbasis **Fractional Positioning (Mid-point)** menggunakan kolom bertipe **`DOUBLE PRECISION`** pada entitas `columns` dan `tasks` demi menjaga fungsionalitas kolaboratif waktu nyata tetap stabil.

### Implementasi Teknis
1. Item baru yang masuk di bagian akhir deret akan diberikan posisi bulat kelipatan ribuan merata (e.g., `1000`, `2000`, `3000`).
2. Apabila sebuah kartu tugas disisipkan di antara item berposisi `1000` dan `2000`, perhitungan matematika dasar dijalankan pada *backend/service layer* untuk mencari titik tengah:
   $$\text{Posisi Baru} = \frac{1000 + 2000}{2} = 1500$$
3. Jika kartu disisipkan kembali di atasnya, nilainya menjadi `1250`, selanjutnya `1125`, dan seterusnya secara fraksional pecahan.

### Benefit Desain Arsitektur Real-Time
* **Kompleksitas Query $O(1)$:** Operasi perpindahan kartu murni hanya memicu **satu kueri `UPDATE`** pada baris data kartu yang bersangkutan.
* **Bebas Bulk Update:** Menghilangkan keharusan menggeser atau memperbarui massal nilai urutan posisi kartu-kartu lain di bawahnya.
* **Reduksi Konflik Data:** Memangkas habis potensi terjadinya *race condition* atau tabrakan sinkronisasi antar-klien ketika beberapa pengguna memindahkan kartu di board yang sama secara simultan.

### Strategi Rebalancing
Apabila jarak pecahan desimal antar kartu sudah terlalu sempit hingga mendekati ambang presisi terkecil yang diizinkan sistem, lapisan logika aplikasi (*service layer*) otomatis mengeksekusi rutin **Rebalancing**. Operasi ini dijalankan dalam satu lingkup **PostgreSQL Transaction** terisolasi untuk mengatur ulang dan meratakan kembali seluruh posisi kartu pada kolom/board tersebut kembali ke kelipatan ribuan yang rapi.

---

## 6. Aturan Integritas Data & Protokol Mutasi Aplikasi (DAL/Service Layer)

Karena tabel `tasks` menerapkan denormalisasi dengan menyimpan `workspace_id` secara langsung (demi efisiensi RLS dan skalabilitas kueri), sistem memiliki risiko anomali data jika terjadi kondisi *split-brain*. Oleh karena itu, arsitektur mengunci **Aturan Integritas Mutlak** berikut di level aplikasi:

### 6.1. Aturan Validasi Inti
> 🛡️ **`tasks.workspace_id` harus selalu sama dengan `columns.workspace_id` dari kolom tempat ia berada.**

Basis data PostgreSQL tidak dibebani oleh *database triggers* kompleks atau *composite foreign keys* yang rumit untuk memvalidasi hal ini, melainkan sepenuhnya dikawal secara imperatif di dalam lapisan **Data Access Layer (DAL)** menggunakan Drizzle ORM.

### 6.2. Protokol Pemindahan Tugas (Task Drag-and-Drop Action)
Ketika sebuah tugas dipindahkan antar-kolom (`moveTask`), *Server Action* atau *Service Layer* wajib mengeksekusi dua langkah sinkronisasi ini:
1. **Mengubah `column_id`** tugas ke ID kolom target.
2. **Menyinkronkan `workspace_id`** tugas dengan menarik nilai `workspace_id` milik kolom target tersebut.

### 6.3. Kewajiban Transaksi (Atomicity Guard)
Sesuai dengan `ARCHITECTURE.md` (Poin 18), seluruh rangkaian operasi di atas **wajib dibungkus di dalam Drizzle Transaction (`db.transaction()`)**. Penyiaran data *real-time broadcast* ke Supabase hanya boleh dipicu *setelah* transaksi database dinyatakan sukses berkomitmen (*commit*). Hal ini menjamin prinsip *All-or-Nothing* dan mencegah terjadinya *phantom broadcast* atau data anomali jika operasi gagal di tengah jalan.

---

## 7. Arsitektur Keamanan, Otorisasi, dan Row Level Security (RLS)

Sesuai dengan cetak biru **Opsi A** yang tercantum dalam kesepakatan `ARCHITECTURE.md`, terdapat batas demarkasi yang tegas antara otorisasi mutasi data bisnis dan otorisasi penyiaran (*real-time WebSocket broadcasting*).

### 7.1. Otorisasi Utama via DAL (Data Access Layer)
Seluruh operasi manipulasi atau penulisan data bisnis (`INSERT`, `UPDATE`, `DELETE`) **tidak menggunakan PostgreSQL RLS**. Hak akses dan batasan izin komputasi dievaluasi sepenuhnya di sisi server Next.js menggunakan pola **Data Access Layer (DAL)** berbasis TypeScript dan Drizzle ORM sebelum kueri dikirimkan ke server database.

Matriks otorisasi level aplikasi (DAL) berbasis peran (*Role-Based*) dikunci sebagai berikut:
* **Admin / Owner Workspace:** Akses penuh konfigurasional workspace, pemicuan transfer kepemilikan, pembuatan kuota `invite_links`, manajemen eliminasi keanggotaan tim, serta kontrol penuh modifikasi `columns` dan `tasks`.
* **Member Workspace:** Diizinkan melakukan operasional harian Kanban board secara bebas, meliputi pembuatan, pengubahan, mutasi seret-lepas (*fractional positioning*), dan penghapusan logis (*soft-delete*) pada entitas `tasks` dan `columns`. Diblokir dari akses konfigurasi internal workspace.
* **Viewer Workspace:** Hanya memiliki izin baca (*Read-Only*) pada seluruh aset data papan proyek. Seluruh kueri mutasi diblokir total di level DAL.
* **Personal Data Identity:** Untuk entitas profil `users` dan pengelolaan status `notifications`, mutasi di level DAL diproteksi ketat hanya diizinkan apabila `session.user.id == target_user_id`.

### 7.2. Kebijakan RLS Minimal untuk Jalur Supabase Realtime
PostgreSQL Row Level Security (RLS) diaktifkan secara minimal **hanya pada tabel yang terhubung langsung dengan sinkronisasi penyiaran WebSocket aktif** (`columns`, `tasks`, `activity_logs`, dan `notifications`).

Tujuannya murni sebagai gerbang keamanan jaringan Supabase Realtime agar pengguna luar tidak dapat menguping (*listen/subscribe*) saluran penyiaran di luar koordinat board mereka sendiri. Karena kita menerapkan denormalisasi kolom `workspace_id` langsung pada tabel `tasks`, kueri evaluasi RLS menjadi sangat datar, cepat, dan terbebas dari *nested table subqueries / join* berat:
