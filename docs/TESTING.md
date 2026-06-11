# TESTING.md - Strategi Pengujian (Testing Strategy)

Dokumen ini mendefinisikan strategi pengujian, kategori tes, dan test case wajib untuk menjamin kesiapan produksi aplikasi SaaS *multi-tenant* Real-Time Kanban.

**Framework Utama:** Vitest (unit & integrasi), Playwright (E2E).

---

## 1. Tenant Isolation Testing (Tahap 2)

Pengujian isolasi penyewa merupakan tulang punggung keamanan aplikasi *multi-tenant*. Seluruh tes ini wajib hijau (*passing*) sebelum fitur Workspace dianggap selesai.

### 1.1. Cross-Tenant Data Access
- Pengguna aktif di `Workspace A` **tidak dapat membaca** data (tasks, columns, activity logs) milik `Workspace B` melalui DAL.
- Pengguna aktif di `Workspace A` **tidak dapat memutasi** data (create, update, delete task/column) di `Workspace B` meskipun mengirim `workspaceId` milik `Workspace B` secara eksplisit.
- `getBoardData(workspaceIdB)` dipanggil oleh anggota `Workspace A` → mengembalikan `{ success: false, error: "UNAUTHORIZED" }`.

### 1.2. Non-Member Access
- Pengguna yang terautentikasi namun **bukan anggota** workspace manapun → ditolak secara mutlak oleh DAL untuk seluruh operasi baca dan tulis, meskipun mereka menggunakan `workspaceId` yang valid.
- DAL tidak boleh mengembalikan data parsial atau *empty array* — harus mengembalikan error eksplisit.

### 1.3. Ownership Boundary
- Owner `Workspace A` **tidak dapat** menghapus, mengubah pengaturan, atau mentransfer kepemilikan `Workspace B`.
- Admin `Workspace A` **tidak dapat** mengelola anggota atau membuat invite link untuk `Workspace B`.

---

## 2. DAL Authorization & Permission Matrix (Tahap 2)

Setiap Server Action di `API.md` harus diuji terhadap **seluruh peran** (Admin/Owner, Member, Viewer) untuk memvalidasi matriks izin.

### 2.1. Workspace Domain
| Action | Admin/Owner | Member | Viewer | Non-Member |
|--------|:-----------:|:------:|:------:|:----------:|
| `createWorkspace` | ✅ Auth User | ✅ Auth User | ✅ Auth User | ❌ |
| `updateWorkspace` | ✅ | ❌ Reject | ❌ Reject | ❌ Reject |
| `deleteWorkspace` | ✅ Owner Only | ❌ Reject | ❌ Reject | ❌ Reject |
| `transferOwnership` | ✅ Owner Only | ❌ Reject | ❌ Reject | ❌ Reject |

### 2.2. Membership Domain
| Action | Admin/Owner | Member | Viewer | Non-Member |
|--------|:-----------:|:------:|:------:|:----------:|
| `createInviteLink` | ✅ | ❌ Reject | ❌ Reject | ❌ Reject |
| `joinWorkspaceViaLink` | ✅ Auth User | ✅ Auth User | ✅ Auth User | ✅ Auth User |
| `removeMember` | ✅ | ❌ Reject | ❌ Reject | ❌ Reject |
| `leaveWorkspace` | ❌ Owner Block | ✅ | ✅ | ❌ Reject |

### 2.3. Column Domain
| Action | Admin/Owner | Member | Viewer | Non-Member |
|--------|:-----------:|:------:|:------:|:----------:|
| `createColumn` | ✅ | ✅ | ❌ Reject | ❌ Reject |
| `updateColumn` | ✅ | ✅ | ❌ Reject | ❌ Reject |
| `moveColumn` | ✅ | ✅ | ❌ Reject | ❌ Reject |
| `deleteColumn` | ✅ | ✅ | ❌ Reject | ❌ Reject |

### 2.4. Task Domain
| Action | Admin/Owner | Member | Viewer | Non-Member |
|--------|:-----------:|:------:|:------:|:----------:|
| `createTask` | ✅ | ✅ | ❌ Reject | ❌ Reject |
| `updateTask` | ✅ | ✅ | ❌ Reject | ❌ Reject |
| `moveTask` | ✅ | ✅ | ❌ Reject | ❌ Reject |
| `assignTask` | ✅ | ✅ | ❌ Reject | ❌ Reject |
| `deleteTask` | ✅ | ✅ | ❌ Reject | ❌ Reject |
| `restoreTask` | ✅ | ✅ | ❌ Reject | ❌ Reject |

> **Aturan Tes:** Setiap sel `❌ Reject` di atas wajib memiliki unit test eksplisit yang memverifikasi DAL mengembalikan `{ success: false }` dan **tidak ada perubahan data** di database.

---

## 3. Invitation Flow Testing (Tahap 2)

Alur undangan memiliki banyak *edge case* yang bisa menjadi kerentanan keamanan:

### 3.1. Happy Path
- Pengguna terautentikasi mengklik invite link valid → bergabung ke workspace dengan peran yang sesuai (`member` / `viewer`).
- Pengguna yang belum teregistrasi mengklik invite link → diarahkan ke halaman registrasi → setelah register, otomatis bergabung ke workspace.

### 3.2. Edge Cases & Security
- **Token kedaluwarsa:** Invite link yang telah melewati `expires_at` (24 jam) → ditolak dengan pesan error eksplisit.
- **Max uses tercapai:** Invite link yang `uses_count >= max_uses` → ditolak.
- **Already member:** Pengguna yang sudah menjadi anggota mengklik invite link → ditolak tanpa membuat duplikasi data `workspace_members`.
- **Token tidak valid:** Token acak / tidak terdaftar → ditolak.
- **Self-invite prevention:** Admin tidak bisa membuat invite link dengan peran `admin` (hanya `member` atau `viewer` yang diizinkan sesuai `API.md`).

### 3.3. Quota Enforcement
- Workspace sudah memiliki 20 anggota → invite link baru tidak bisa digunakan meskipun token masih valid.

---

## 4. Workspace Lifecycle Testing (Tahap 2)

### 4.1. Quota Limits
- Pengguna mencoba membuat workspace ke-6 → ditolak (`Maks. 5 workspace per akun`).
- Workspace mencoba membuat kolom ke-11 → ditolak (`Maks. 10 column per board`).
- Workspace mencoba membuat task ke-1001 → ditolak (`Maks. 1000 task per workspace`).
- Kolom mencoba menerima task ke-101 → ditolak (`Maks. 100 task per column`).

### 4.2. Ownership Transfer
- `transferOwnership(workspaceId, newOwnerId)` → owner lama menjadi Admin, pemilik baru menjadi Owner.
- Transfer ke `newOwnerId` yang bukan anggota aktif workspace → ditolak.
- Transfer ke diri sendiri → ditolak.

### 4.3. Deletion Policy
- **Hard Delete Workspace:** Menghapus workspace → seluruh data terkait (members, columns, tasks, activity logs, invite links) dihapus via CASCADE.
- **Soft Delete Task:** `deleteTask` → `deleted_at` terisi, task tidak muncul di board. `restoreTask` → `deleted_at` di-*null*-kan, task kembali muncul.
- **Restore ke kolom terhapus:** Jika kolom asal task sudah dihapus saat restore → task dipindahkan ke kolom pertama workspace.

### 4.4. Membership Lifecycle
- Owner mencoba `leaveWorkspace` → ditolak (Owner tidak bisa keluar sebelum transfer ownership).
- Member/Viewer `leaveWorkspace` → keanggotaan dihapus, akses dicabut.
- Admin `removeMember` → target member kehilangan akses real-time dan data.
- Workspace hanya tersisa 1 member (Owner) → `leaveWorkspace` ditolak.

### 4.5. Column Minimum Guard
- Workspace hanya memiliki 1 kolom → `deleteColumn` ditolak.

---

## 5. Fractional Positioning Testing (Tahap 3)

### 5.1. Kalkulasi Dasar
- Insert di akhir kolom kosong → posisi `1000`.
- Insert di akhir kolom berisi [1000, 2000] → posisi `3000`.
- Insert antara posisi `1000` dan `2000` → posisi `1500`.
- Insert antara posisi `1000` dan `1500` → posisi `1250`.

### 5.2. Boundary Cases
- Insert di awal kolom (sebelum item pertama `1000`) → posisi `500` (atau `1000 / 2`).
- Insert di antara dua item berposisi sangat dekat (misal `1000.0001` dan `1000.0002`) → posisi midpoint dikalkulasi dengan presisi `DOUBLE PRECISION` yang memadai.

### 5.3. Rebalancing Trigger
- Setelah N kali insert berturut-turut di posisi yang sama, jarak antar-posisi mendekati ambang presisi → rebalancing otomatis ter-*trigger*.
- Setelah rebalancing, seluruh posisi dalam kolom kembali ke kelipatan ribuan yang merata.
- Rebalancing dieksekusi dalam satu `db.transaction()` → jika gagal di tengah jalan, seluruh posisi tidak berubah (*atomicity*).
- Urutan visual kartu **tidak berubah** setelah rebalancing — hanya nilai numerik posisi yang disegarkan.

### 5.4. Cross-Column Move
- `moveTask` dari Kolom A ke Kolom B → `column_id` diperbarui, `workspace_id` tetap sinkron dengan workspace milik Kolom B (validasi `DATABASE.md` §6.1).
- Setelah move, task muncul di Kolom B dengan posisi yang benar relatif terhadap `beforeTaskId` dan `afterTaskId`.

---

## 6. Data Integrity Testing (Tahap 3)

### 6.1. Denormalized workspace_id Consistency
- Setiap kali `moveTask` dieksekusi antar-kolom, verifikasi bahwa `tasks.workspace_id` selalu identik dengan `columns.workspace_id` dari kolom target.
- Tidak ada skenario di mana `tasks.workspace_id ≠ columns.workspace_id` setelah mutasi selesai.

### 6.2. Soft Delete Integrity
- Task yang sudah di-*soft delete* (`deleted_at IS NOT NULL`) **tidak muncul** di hasil `getBoardData()`.
- Task yang sudah di-*soft delete* **tidak bisa** di-*update*, di-*move*, atau di-*assign* — hanya `restoreTask` yang diizinkan.
- Jumlah task counter di header kolom **tidak menghitung** task yang di-*soft delete*.

### 6.3. Transaction Atomicity
- Jika salah satu operasi dalam `moveTask` (update `column_id`, update `position`, update `workspace_id`) gagal → seluruh operasi di-*rollback*, tidak ada perubahan parsial.
- Broadcast real-time **tidak terkirim** jika transaksi gagal (*phantom broadcast prevention*).

---

## 7. Optimistic UI & Cache Rollback Testing (Tahap 4)

### 7.1. Rollback pada Server Failure
- Klien memindahkan task (UI langsung berubah via *optimistic update*) → Server Action mengembalikan `{ success: false }` → UI **harus rollback** ke posisi semula tanpa *refresh*.
- Klien membuat task baru (card muncul instan) → Server gagal → card **hilang** dari UI dan *Toast error* ditampilkan.
- Klien mengedit judul task (judul berubah instan) → Server gagal → judul **kembali** ke nilai sebelumnya.

### 7.2. Cache Consistency
- Setelah rollback, state TanStack Query cache **identik** dengan state database (tidak ada *stale data* tersisa).
- `onSettled` TanStack Query selalu mem-*refetch* data terbaru dari server, terlepas dari sukses atau gagalnya mutasi.

---

## 8. Real-Time Synchronization Testing (Tahap 4)

### 8.1. Event Propagation
- Klien A melakukan `moveTask` → Klien B menerima event `TASK_MOVED` dan card berpindah kolom secara visual tanpa *refresh*.
- Klien A melakukan `createTask` → Klien B melihat card baru muncul di kolom yang benar.
- Klien A melakukan `deleteTask` → Klien B melihat card menghilang dari board.

### 8.2. Echo Effect Prevention
- Klien A melakukan `moveTask` → Klien A **tidak menerima** event broadcast-nya sendiri (deduplikasi via `mutationId`).
- Jika deduplikasi gagal, UI **tidak flickering** atau menampilkan duplikasi visual.

### 8.3. Reconnection & Full Re-sync
- WebSocket terputus selama 10 detik → saat *reconnect*, board di-*refresh* otomatis dan menampilkan state terbaru dari database.
- Reconnection *debounce*: koneksi yang naik-turun cepat (flapping) **tidak** memicu *request storm* (jeda minimal 5 detik antar re-sync).

### 8.4. Channel Authorization
- Pengguna yang bukan anggota workspace → subscription ke channel `workspace:{id}` **ditolak** oleh RLS.
- Pengguna yang di-*remove* dari workspace saat sedang terhubung → subscription **terputus**, board tidak bisa diakses.

---

## 9. Concurrent Operations & LWW Testing (Tahap 4)

### 9.1. Simultaneous Task Move
- Klien A dan Klien B memindahkan **task yang sama** secara simultan ke kolom yang berbeda → hasil akhir ditentukan oleh transaksi database yang *commit* terakhir (LWW). Kedua klien akhirnya melihat posisi yang konsisten setelah re-sync.

### 9.2. Simultaneous Task Edit
- Klien A dan Klien B mengedit judul **task yang sama** secara simultan → perubahan terakhir yang berhasil di-*commit* menjadi sumber kebenaran. Klien yang "kalah" melihat judul berubah ke versi pemenang setelah event re-sync.

### 9.3. Concurrent Column Operations
- Klien A menghapus kolom yang sedang diisi task oleh Klien B → `deleteColumn` **ditolak** karena kolom masih memiliki task, ATAU task dipindahkan terlebih dahulu (tergantung aturan bisnis yang dipilih).

---

## 10. End-to-End Testing (Tahap 6)

**Framework:** Playwright.

### 10.1. Authentication & Onboarding Flow
- Register akun baru → verifikasi redirect ke dashboard.
- Login dengan kredensial valid → verifikasi akses dashboard.
- Login dengan kredensial salah → verifikasi pesan error ditampilkan.
- Klik invite link → register → otomatis masuk ke workspace yang benar.

### 10.2. Kanban Board Operations
- Buat workspace baru → verifikasi 3 kolom default (Backlog, In Progress, Done) muncul.
- Buat task baru → verifikasi card muncul di kolom yang benar.
- Drag task dari Kolom A ke Kolom B → verifikasi card berpindah posisi.
- Klik card → verifikasi Side Sheet terbuka dengan detail task.
- Edit judul task di Side Sheet → verifikasi perubahan tersimpan.

### 10.3. Team Collaboration
- Buat invite link → salin URL → buka di browser incognito → register → verifikasi user bergabung ke workspace.
- Admin menghapus member → verifikasi member kehilangan akses.

### 10.4. Empty States
- Workspace baru tanpa task → verifikasi CTA "Buat Tugas Pertama" ditampilkan.
- Workspace tanpa member selain owner → verifikasi CTA "Salin Tautan Undangan Tim" ditampilkan.

---

## 11. Security Testing (Tahap 6)

### 11.1. Input Validation (Zod Bypass)
- Server Action menerima payload tanpa field wajib → ditolak oleh Zod.
- Server Action menerima `workspaceId` dengan format non-UUID → ditolak oleh Zod.
- Server Action menerima `title` dengan panjang > 255 karakter → ditolak oleh Zod.
- Server Action menerima payload dengan field tambahan yang tidak diharapkan → field tambahan di-*strip* atau ditolak.

### 11.2. IDOR (Insecure Direct Object Reference)
- Pengguna mengirim `taskId` milik workspace lain ke `updateTask` → ditolak oleh DAL Tenant Guard.
- Pengguna mengirim `columnId` milik workspace lain ke `moveTask` → ditolak oleh DAL Tenant Guard.

### 11.3. Invite Link Abuse
- Brute-force token invite link (random strings) → seluruh percobaan ditolak, tidak ada informasi bocor tentang keberadaan token.
- Invite link yang sudah kedaluwarsa diklik berulang kali → tetap ditolak, counter `uses_count` tidak bertambah.

---

## 12. Performance Testing (Tahap 6)

### 12.1. NFR Validation
- **Board Load Time:** `getBoardData()` untuk workspace berisi 10 kolom × 100 task (1000 task total) selesai dalam **< 2 detik**.
- **Optimistic Update Latency:** Perpindahan task via drag-and-drop terlihat instan di UI dalam **< 100ms**.
- **Real-time Sync Latency:** Event broadcast dari Klien A sampai ke Klien B dalam **< 500ms**.

### 12.2. Stress Test (Boundary)
- Board dengan 10 kolom dan 100 task per kolom → render tanpa lag, scroll horizontal lancar.
- 5 pengguna simultan memindahkan task di board yang sama → tidak ada data corruption, semua klien akhirnya konsisten.

---

## Prioritas Implementasi (Ringkasan)

| Prioritas | Area | Tahap | Alasan |
|-----------|------|-------|--------|
| 🔴 P0 | Tenant Isolation (§1) | 2 | Satu bug = kebocoran data antar-tenant. |
| 🔴 P0 | DAL Authorization (§2) | 2 | Permission matrix harus tervalidasi sebelum fitur lain dibangun di atasnya. |
| 🔴 P0 | Invitation Flow (§3) | 2 | Invite link yang tidak divalidasi = akses tidak sah. |
| 🔴 P0 | Workspace Lifecycle (§4) | 2 | Quota dan deletion policy harus benar sejak awal. |
| 🟠 P1 | Fractional Positioning (§5) | 3 | Ordering rusak menghancurkan UX Kanban. |
| 🟠 P1 | Data Integrity (§6) | 3 | Denormalisasi tanpa DB constraint butuh tes sebagai penjaga. |
| 🟡 P2 | Optimistic UI Rollback (§7) | 4 | Harus diuji saat TanStack Query mutations diimplementasikan. |
| 🟡 P2 | Realtime Sync (§8) | 4 | Harus diuji saat WebSocket integration selesai. |
| 🟡 P2 | Concurrent Ops (§9) | 4 | Harus diuji saat realtime + DnD bekerja bersamaan. |
| 🔵 P3 | E2E Flows (§10) | 6 | Full journey testing sebelum production launch. |
| 🔵 P3 | Security Testing (§11) | 6 | Hardening pass sebelum production launch. |
| 🔵 P3 | Performance Testing (§12) | 6 | Validasi NFR sebelum production launch. |
