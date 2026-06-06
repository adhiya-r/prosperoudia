# Tools and Framework Analysis

Dokumen ini menjelaskan pemilihan tools utama untuk prototype asesmen BNSP.

## Tujuan Pemilihan Stack

Stack dipilih berdasarkan kriteria berikut:

- mudah dijelaskan saat asesmen
- cukup cepat untuk implementasi prototype
- mendukung kebutuhan CRUD, auth, report, dan dokumentasi
- tidak terlalu banyak magic framework

## Stack Utama

### 1. Node.js

Fungsi:

- runtime backend aplikasi

Alasan dipilih:

- sesuai dengan proyek referensi sebelumnya
- ekosistem luas untuk web app dan tooling
- mudah dipakai bersama Express dan Knex

Trade-off:

- perlu disiplin struktur proyek karena framework inti minimal

### 2. Express.js

Fungsi:

- framework HTTP server dan routing

Alasan dipilih:

- alur request mudah dijelaskan: route, middleware, controller
- fleksibel untuk aplikasi server-rendered
- cocok untuk arsitektur modular sederhana

Trade-off:

- banyak keputusan arsitektur harus dibuat manual

### 3. EJS

Fungsi:

- template engine untuk server-rendered HTML

Alasan dipilih:

- sederhana
- mudah dipahami untuk asesmen
- cukup untuk dashboard internal dan storefront MVP

Trade-off:

- kurang cocok bila aplikasi frontend sangat interaktif atau SPA

### 4. PostgreSQL

Fungsi:

- database relasional utama

Alasan dipilih:

- kuat untuk relasi data bisnis
- cocok untuk transaksi, report SQL, dan constraint data
- mudah menjelaskan foreign key, unique constraint, dan integritas data

Trade-off:

- perlu desain schema yang rapi sejak awal

### 5. Knex.js

Fungsi:

- query builder dan migration tool

Alasan dipilih:

- query tetap cukup eksplisit
- migration lebih rapi dan versioned
- mengurangi risiko SQL mentah tersebar di banyak file

Trade-off:

- tetap butuh pemahaman SQL yang baik

### 6. Vanilla JavaScript

Fungsi:

- interaksi ringan di sisi client

Alasan dipilih:

- cukup untuk modal login, toggle password, dan perilaku UI dasar
- menghindari kompleksitas framework frontend besar

Trade-off:

- bila interaksi frontend makin kompleks, maintainability bisa turun

### 7. CSS Kustom

Fungsi:

- styling storefront dan dashboard

Alasan dipilih:

- fleksibel untuk menyesuaikan desain asesmen
- menghindari ketergantungan framework UI besar

Trade-off:

- konsistensi desain harus dijaga manual

## Komponen Pendukung yang Sudah Dipakai

### express-session

Fungsi:

- manajemen session login

Alasan:

- cocok untuk auth server-rendered

### connect-pg-simple

Fungsi:

- session store PostgreSQL

Alasan:

- cocok untuk session persistence saat tidak memakai memory store

Catatan:

- di lingkungan lokal saat ini session masih bisa berjalan dengan mode sederhana untuk bootstrap

### dotenv

Fungsi:

- memuat environment variable

Alasan:

- memisahkan konfigurasi dari source code

### helmet

Fungsi:

- hardening HTTP headers dasar

Alasan:

- membantu baseline security

### supertest

Fungsi:

- blackbox HTTP testing

Alasan:

- langsung menguji perilaku route dan response
- cocok untuk bukti pengujian asesmen

### multer, exceljs, dan pdfkit

Fungsi:

- `multer` menangani upload gambar, resep, bukti pembayaran, avatar, dan spreadsheet
- `exceljs` membaca import XLSX
- `pdfkit` membuat laporan PDF visual

Alasan:

- langsung memenuhi kebutuhan multimedia, import spreadsheet, dan export PDF

Catatan:

- import dan report saat ini masih synchronous walaupun lifecycle-nya dicatat sebagai job

### node:crypto scrypt

Fungsi:

- hashing dan verifikasi password tanpa dependency tambahan

Trade-off:

- aman untuk prototype, tetapi teks studi kasus menyebut bcrypt/Argon2 sehingga implementasi perlu diganti atau dijelaskan sebagai deviasi

## Alasan Tidak Memilih Framework Lain

### Laravel

Alasan tidak dipilih:

- sangat kuat, tetapi membawa banyak konsep baru yang harus dijelaskan dalam waktu singkat
- menambah beban istilah seperti Eloquent, Blade, Artisan, Policy, Queue

### Next.js

Alasan tidak dipilih:

- terlalu banyak konsep frontend modern yang tidak perlu untuk prototype asesmen
- kompleksitas App Router dan React server/client boundary tidak memberi nilai langsung pada skema ini

## Kesesuaian Dengan Requirement Studi Kasus

Stack ini cocok untuk:

- login multi-role
- CRUD master data
- katalog dan storefront
- cart dan checkout
- inventory FIFO
- report SQL dan export
- dokumentasi yang explainable

## Risiko dan Mitigasi Awal

### Risiko

- Express terlalu fleksibel sehingga struktur bisa cepat berantakan
- CSS kustom rawan tidak konsisten
- fitur paralel/queue perlu simulasi tambahan karena belum ada worker infra

### Mitigasi

- pakai modular structure sejak awal
- controller tetap tipis
- semua schema lewat migration
- semua keputusan penting dicatat di dokumen planning
- fitur background diperlakukan sebagai `simulation` bila belum production-grade

## Keputusan

Untuk fase prototype asesmen, kombinasi `Node.js + Express.js + EJS + PostgreSQL + Knex.js` adalah pilihan paling seimbang antara kecepatan implementasi, kejelasan arsitektur, dan kemudahan penjelasan saat presentasi.
