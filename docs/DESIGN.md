# DESIGN.md - Real-Time Collaborative Project Management (Mini-Jira/Trello)

Dokumen ini merangkum seluruh panduan desain visual, sistem interaksi, arsitektur pengalaman pengguna (UX), serta keputusan antarmuka teknis yang telah dikunci untuk fase MVP aplikasi.

---

## 📄 Filosofi Desain MVP
Tujuan utama dari desain aplikasi ini adalah menghadirkan pengalaman kolaborasi *real-time* yang cepat, responsif, dan tanpa hambatan. Antarmuka dirancang secara **Minimalis & Fungsional**, di mana elemen visual "menghilang" agar pengguna dapat sepenuhnya berfokus pada konten utama—yaitu mengelola proyek, memindahkan tugas, dan berkolaborasi secara produktif tanpa distraksi kosmetik yang berlebihan.

---

## 1. Sistem Desain & Tema (Design System & Theming)
Mengadopsi standar visual kelas dunia untuk SaaS B2B modern (seperti Linear atau GitHub) untuk menjamin kecepatan eksekusi dan keandalan aksesibilitas.

* **Framework & Komponen:** `shadcn/ui` + `Tailwind CSS`.
* **Palet Warna:** Menggunakan warna netral bawaan (`Zinc` atau `Slate`) dengan satu warna aksen primer minimalis untuk menandakan elemen interaktif utama.
* **Mode Tampilan:** Dukungan *Dark Mode* dan *Light Mode* aktif secara bawaan (*native*) sejak awal pengembangan untuk kenyamanan mata *developer* dan *power users*.
* **Kontras & Aksesibilitas:** Menjamin kontras warna teks dan latar belakang memenuhi standar WCAG untuk keterbacaan yang optimal.

---

## 2. Struktur Tata Letak & Navigasi (Layout & Navigation)
Menghadirkan keseimbangan terbaik antara efisiensi ruang kerja papan Kanban dengan kemudahan akses kontrol tingkat *Workspace*.

* **Navigasi Utama (Bilah Sisi):** Menggunakan *Fixed Left Sidebar* (Bilah Sisi Kiri Tetap) untuk menampung *Workspace Switcher*, daftar anggota, tautan undangan, dan akses log aktivitas.
* **Fitur Kontrol Ruang:** Sisi kiri dirancang agar bisa disembunyikan (*collapsible*). Saat sidebar ditutup, papan Kanban mendapatkan ruang visual 100% untuk fokus maksimal selama *sprint*.
* **Top Header:** Navigasi atas dibuat sangat ringan (*lightweight*) khusus untuk aksi kontekstual dari *workspace* yang sedang aktif (misalnya: *presence avatars* dan tombol aksi cepat).

---

## 3. Pengalaman Papan Kanban (Kanban Board Experience)
Memastikan lingkungan papan kerja tetap kokoh, konsisten, dan informatif terlepas dari seberapa banyak kolom atau tugas yang dibuat oleh tim.

* **Pengelolaan Kolom:** Menggunakan Lebar Kolom Tetap (*Fixed Width Columns* sekitar 288px - 320px) dipadukan dengan gulir horizontal (*Horizontal Scroll*). Pendekatan ini mencegah kartu tergencet menjadi sempit saat kolom bertambah banyak.
* **Sticky Column Header:** Bagian atas kolom tetap menempel (*sticky*) ketika daftar tugas di-scroll secara vertikal, memastikan pengguna tidak kehilangan konteks tahapan tugas.
* **Analitik MVP Instan:** Setiap *header* kolom mencakup Penghitung Tugas (*Task Counter*) terintegrasi untuk menyajikan informasi beban kerja secara instan (contoh: `In Progress (4)`).

---

## 4. Hierarki Visual Kartu Tugas (Task Card UI)
Menyederhanakan penyajian data di halaman depan sekaligus mempermudah akses ke detail informasi tanpa mengisolasi pengguna.

* **Tampilan Permukaan (Card Face):** Kartu pada papan hanya menampilkan detail esensial untuk meminimalisir kepadatan visual: Judul Tugas (*Task Title*) dan Avatar Penerima Tugas (*Assignee Avatar*).
* **Tampilan Detail:** Saat kartu diklik, detail tugas akan terbuka melalui panel geser samping kanan (**Side Sheet / Right Drawer**) menggunakan komponen `Sheet` dari `shadcn/ui`.
* **UX Konteks Spasial:** Dengan panel samping, pengguna dapat membaca deskripsi mendalam atau melihat riwayat aktivitas tanpa kehilangan pandangan terhadap papan Kanban di latar belakang. Pengguna tetap tersadar penuh jika ada pergerakan real-time dari rekan tim lain.

---

## 5. Umpan Balik Visual Drag-and-Drop (DnD Visual Feedback)
Memberikan sensasi interaksi taktil yang presisi, solid, dan meyakinkan memanfaatkan pustaka `dnd-kit`.

* **State Terangkat (Lifted/Dragging):** Kartu yang sedang ditarik akan mendapatkan peningkatan skala yang sangat halus (`scale: 1.03`), transisi yang mulus, kursor berubah menjadi `grabbing`, serta efek bayangan tebal (*heavy drop-shadow*) untuk menyimulasikan efek elevasi (terangkat mendekati pengguna).
* **Sorotan Batas (Border Highlight):** Kartu mempertahankan orientasi lurus (tidak miring/skew) untuk menjaga kesan profesional, namun batas kartu diberi warna aksen tipis.
* **Area Target Peletakan (Placeholder):** Area tujuan pendaratan kartu ditandai dengan kotak bergaris luar putus-putus (*dashed border*) berlatar pudar yang presisi mengikuti radius sudut (*border-radius*) kartu tugas asli.

---

## 6. Indikator Kolaborasi Real-Time & Notifikasi
Menjaga lingkungan kerja tetap tenang (*Calm UI*) tanpa mengorbankan aspek keterbukaan data instan dari `Supabase Realtime`.

* **Kehadiran Tim (Presence):** Menampilkan tumpukan avatar (*Avatar Stack*) di *Top Header* untuk menunjukkan siapa saja rekan kerja yang sedang aktif di papan tersebut secara langsung.
* **Status Terkunci (Locked/Editing State):** Jika seorang pengguna sedang membuka panel detail tugas tertentu untuk mengeditnya, sebuah indikator avatar kecil miliknya akan muncul pada kartu tersebut di papan pengguna lainnya. Ini mencegah konflik penyuntingan ganda.
* **Transisi Mulus:** Kartu yang dipindahkan oleh rekan tim di latar belakang bergeser secara halus secara otomatis tanpa efek kilatan (*flash*) warna yang agresif.
* **Penanganan Masalah Jaringan:** Komponen `Toast` dari `shadcn/ui` di pojok kanan bawah digunakan secara eksklusif hanya untuk mengomunikasikan kegagalan sinkronisasi, gangguan koneksi, atau peringatan sistem yang kritis.

---

## 7. Responsivitas & Aksesibilitas Mobile (Mobile Strategy)
Mengutamakan efisiensi pengembangan dengan pendekatan *Desktop-First* tanpa memotong kemampuan fitur utama di perangkat genggam.

* **Layout Mobile:** Menggunakan sistem *Swipeable Horizontal Scroll*.
* **Perilaku Tampilan:** Tampilan kolom dipertahankan persis seperti desktop namun dioptimasi agar satu kolom penuh (lebar sekitar `w-[85vw]`) mendominasi layar ponsel. Pengguna cukup menggeser (*swipe*) layar ke kiri/kanan untuk berpindah kolom.
* **Fungsionalitas Penuh:** Fitur pemindahan kartu (*drag-and-drop*) tetap diaktifkan di layar sentuh dengan mengonfigurasi *Touch Sensor* bawaan dari `dnd-kit`. Optimasi antarmuka khusus mobile (seperti tumpukan vertikal akordion) ditunda untuk fase pasca-MVP.

---

## 8. Kondisi Kosong & Pengalaman Pengguna Baru (Empty States & FTUE)
Memastikan aplikasi tetap komunikatif, interaktif, dan ramah pengguna sejak menit pertama penggunaan guna menghindari kebingungan.

* **Prinsip Utama:** Menolak halaman kosong buntu (*dead ends*). Setiap kondisi kosong harus memberikan pandangan petunjuk dan arah langkah berikutnya yang jelas.
* **Elemen Visual:** Menggunakan kombinasi teks panduan tipis serta ikon minimalis dari pustaka `Lucide` (bawaan *shadcn/ui*) tanpa memuat file gambar eksternal yang berat.
* **Penerapan Kasus Khusus:**
    * **Workspace Baru:** Menampilkan ilustrasi papan kosong dengan tombol aksi (*Call to Action* / CTA) yang menonjol: `"Buat Tugas Pertama"`.
    * **Belum Ada Anggota:** Menampilkan area kolaborator yang kosong disertai tombol cepat: `"Salin Tautan Undangan Tim"`.
    * **Hasil Pencarian Kosong:** Memberikan pesan `"Tidak ada tugas yang cocok dengan kata kunci Anda"` disertai opsi untuk mereset filter/pencarian dalam satu klik.
    * **Log Aktivitas Kosong:** Menampilkan teks informatif: `"Belum ada riwayat aktivitas. Mulai buat atau pindahkan tugas untuk melihat perkembangan di sini"`.

---

## 9. Penanganan Pemuatan & UI Optimistik (Loading, Skeleton & Optimistic UI)
Mengoptimalkan persepsi kecepatan aplikasi agar terasa instan bagi pengguna dengan memotong waktu tunggu visual menggunakan kapabilitas `TanStack Query`.

* **Pemuatan Awal (Initial Loading):** Menggunakan komponen `Skeleton` dari `shadcn/ui` yang diintegrasikan secara *native* pada berkas `loading.tsx` milik Next.js App Router saat memuat data pertama kali.
* **Optimistic UI:** Semua aksi utama pengguna—termasuk *Create Task*, *Move Task* (perubahan kolom), dan *Update Task*—menggunakan teknik *Optimistic Updates* lewat fungsi `onMutate`. Antarmuka berubah secara instan seketika aksi dilakukan, sementara sinkronisasi database berjalan di latar belakang. Jika server gagal merespons, state UI otomatis dikembalikan (*rollback*).
* **Anti-Toast Fatigue:** Komponen *Toast* sukses tidak akan dimunculkan untuk aksi yang bersifat repetitif (seperti sukses memindahkan kartu atau sukses membuat tugas), karena UI yang terupdate instan sudah menjadi indikator keberhasilan yang cukup bagi pengguna.

---

## 10. Pengalaman Formulir & Validasi (Form & Validation Experience)
Memaksimalkan kenyamanan pengguna saat melakukan entri data melalui arsitektur formulir yang aman dan berbasis pintasan keyboard.

* **Metode Validasi:** Dilakukan secara langsung di dalam baris (*Inline Validation*) secara *real-time* memanfaatkan integrasi `react-hook-form` dan `Zod`.
* **Penempatan Error:** Pesan kesalahan/validasi diposisikan tepat di bawah komponen *input/field* yang bermasalah dengan teks berwarna merah kontras yang tegas untuk penanganan cepat.
* **Loading State Tombol:** Saat formulir sedang dikirim (*submitting*), tombol *Submit* otomatis masuk ke kondisi nonaktif (*disabled*) dan menampilkan indikator animasi berputar (*loading spinner*) untuk mencegah penekanan ganda.
* **Dukungan Pintasan Keyboard (Keyboard Shortcuts):**
    * `Enter` (pada area input teks satu baris): Menyimpan data formulir (*Submit*).
    * `Esc` (Escape): Menutup modal atau panel *Side Sheet/Drawer* detail tugas secara instan tanpa menyimpan perubahan yang belum ter-submit.
    * `Cmd + K` atau `Ctrl + K`: Direncanakan sebagai pembuka *Command Palette* global di fase pasca-MVP untuk navigasi super cepat antartugas.

---

## 11. Status Izin & Visibilitas (Permission & Visibility States)
Memastikan manajemen hak akses terintegrasi mulus dalam antarmuka tanpa merusak tata letak atau menyebabkan kebingungan.

* **Konsistensi Antarmuka:** Pengguna dengan peran *Owner* maupun *Member* pada dasarnya menggunakan struktur UI (tata letak) yang sama persis.
* **Penanganan Aksi Terbatas:** Alih-alih menampilkan tombol dalam status mati (*disabled*) untuk aksi yang tidak diizinkan, tombol tersebut sepenuhnya **disembunyikan (hidden)** dari pandangan pengguna yang tidak memiliki hak akses (contoh: tombol *Delete Workspace* tidak akan terlihat oleh *Member*). Hal ini mengurangi beban kognitif dan *clutter* visual.
* **Konsistensi Status State:** Status pemuatan (*loading*) dan kesalahan (*error*) tetap dirancang konsisten untuk semua peran, memastikan standar pengalaman yang merata.

---

## 12. Panduan Pergerakan & Animasi (Motion & Animation Guidelines)
Menetapkan aturan gerak (animasi) global agar aplikasi terasa hidup, responsif, dan profesional tanpa menjadi lambat.

* **Fungsional, Bukan Dekoratif:** Animasi hanya digunakan ketika memiliki nilai fungsional (memberikan umpan balik visual atau mempertahankan konteks transisi). Animasi dekoratif murni sangat dihindari.
* **Durasi & Easing:**
    * **Durasi Standar:** 150ms – 200ms agar terasa "snappy" (cepat dan tegas).
    * **Easing:** Mengandalkan fungsi *easing* bawaan dari `shadcn/ui` dan `Tailwind CSS` (seperti `ease-in-out` atau `ease-out`) agar pergerakan terasa natural.
* **Cakupan Animasi:** Penggunaan animasi secara ketat dibatasi untuk interaksi berikut:
    1. **Drag & Drop:** Saat mengangkat, menggeser, dan meletakkan kartu.
    2. **Drawer/Modal:** Transisi buka/tutup (Panel Samping).
    3. **Sidebar Collapse:** Pergeseran saat bilah sisi dibuka/ditutup.
    4. **Toast Notifikasi:** Muncul dan hilangnya pesan peringatan.
    5. **Skeleton Loading:** Efek denyut (*pulse*) saat memuat data awal.
