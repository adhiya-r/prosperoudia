# Planning Decisions

> Artefak pengembangan internal untuk mencatat keputusan implementasi.

Dokumen ini mencatat keputusan perencanaan proyek beserta alasan dan dampaknya. Tujuannya agar keputusan arsitektur, scope, dan implementasi tidak hanya dibahas di chat, tetapi juga terdokumentasi di repo.

## Format

Setiap keputusan dicatat dengan:

- tanggal
- keputusan
- alasan
- dampak implementasi
- tindak lanjut

---

## 2026-06-06 - Integrasi Dashboard Donor sebagai Backoffice

### Keputusan

Folder donor `src/dashboard` digunakan sebagai sumber fitur backoffice, tetapi tidak dijalankan sebagai aplikasi Express kedua. Fitur yang relevan dipindahkan bertahap ke struktur modular `prosperoudia`.

### Alasan

- storefront apotek dan checkout sudah punya model domain sendiri
- dashboard donor punya fitur generic yang dibutuhkan asesmen, seperti monitoring, import CSV/XLSX, export PDF, audit log, error log, notification, chart, dan manajemen akun
- menjalankan dua aplikasi Express dalam satu repo akan membuat route, session, static asset, dan migration lebih sulit dijelaskan

### Dampak Implementasi

- area publik tetap di `/`
- area internal tetap di route backoffice seperti `/dashboard`, `/system/*`, `/orders/manage`, `/medicines`, `/categories`, dan `/suppliers`
- file donor dipakai sebagai referensi implementasi dan sumber logic, bukan sebagai aplikasi nested permanen
- folder donor akan dibersihkan setelah fitur yang dipakai selesai dipindahkan

### Tindak Lanjut

Gunakan `docs/dev/DASHBOARD_INTEGRATION_PLAN.md` sebagai acuan integrasi.

---

## 2026-06-05 - Kembangkan Core Schema Dulu

### Keputusan

Skema database akan dikembangkan bertahap.

Fase pertama memakai `core schema` yang mencakup entitas inti untuk menjalankan alur utama e-commerce apotek. Skema tambahan yang belum benar-benar dibutuhkan tidak dipaksakan masuk pada iterasi pertama.

### Alasan

Pendekatan ini dipilih karena:

- requirement asesmen menuntut prototype yang bisa dijelaskan dan didemokan, bukan sistem production-grade penuh
- beberapa keputusan domain belum final, misalnya kapan stok dikurangi, bagaimana cart disimpan, dan bagaimana detail pembayaran dicatat
- memaksakan skema lengkap terlalu awal berisiko menghasilkan tabel yang belum terpakai atau salah asumsi
- skema inti lebih mudah dipahami, diuji, dan dijelaskan saat presentasi asesor

### Dampak Implementasi

Fase pertama akan fokus pada entitas inti berikut:

- `users`
- `roles`
- `user_roles`
- `customers`
- `suppliers`
- `medicine_categories`
- `medicines`
- `inventory_batches`
- `stock_movements`
- `prescriptions`
- `orders`
- `order_items`
- `notifications`
- `audit_logs`
- `error_logs`

Entitas tambahan seperti di bawah ini ditunda sampai ada kebutuhan implementasi yang jelas:

- `shopping_carts`
- `cart_items`
- `payment_transactions`
- `customer_addresses`
- `order_status_histories`
- `report_jobs`
- `import_jobs`
- `sessions`

### Tindak Lanjut

Langkah berikutnya:

1. finalisasi definisi `core schema`
2. ubah ERD awal menjadi versi `core schema` yang lebih tegas
3. buat migration untuk entitas inti
4. lanjut ke auth, role, session, dan seed demo

Status:

- ERD inti diperjelas di `docs/ERD_INITIAL.md`
- rencana implementasi skema inti dicatat di `docs/dev/CORE_SCHEMA_PLAN.md`
- urutan migration dan scaffold migration dicatat di `docs/dev/DATABASE_MIGRATION_PLAN.md` dan `database/migrations`
- seed awal dicatat di `docs/dev/SEED_PLAN.md` dan `database/seeds`

---

## 2026-06-05 - Stack Dipilih: Express + EJS + PostgreSQL + Knex

### Keputusan

Stack utama proyek adalah:

- Node.js
- Express.js
- EJS
- PostgreSQL
- Knex.js

### Alasan

Stack ini dipilih karena:

- paling dekat dengan proyek referensi asesmen sebelumnya
- alur arsitekturnya mudah dijelaskan
- menghindari framework dengan terlalu banyak magic
- cukup kuat untuk kebutuhan auth, CRUD, laporan, monitoring, dan dokumentasi asesmen

### Dampak Implementasi

- arsitektur akan mengikuti pola `route -> middleware -> controller -> service -> repository -> database`
- aplikasi akan cenderung server-rendered terlebih dahulu
- dependency tambahan hanya dimasukkan jika mendukung requirement langsung

### Tindak Lanjut

Langkah berikutnya:

1. siapkan skeleton modular
2. tambahkan konfigurasi database dan migration
3. implementasikan modul auth terlebih dahulu

---

## 2026-06-05 - Modularisasi Wajib Sejak Awal

### Keputusan

Controller besar akan dihindari sejak awal. Target per file controller adalah sekitar 200-400 LOC bila praktis.

### Alasan

- proyek referensi sebelumnya menunjukkan risiko controller 2000+ LOC
- modul yang terpisah lebih mudah dijelaskan dan diuji
- pemisahan domain mengurangi risiko file menjadi terlalu campur aduk

### Dampak Implementasi

Setiap domain utama akan dipisah menjadi modul sendiri, misalnya:

- `auth`
- `medicines`
- `inventory`
- `prescriptions`
- `orders`
- `reports`

Business logic tidak boleh menumpuk di controller.

### Tindak Lanjut

Langkah berikutnya:

1. pertahankan struktur modul di `src/modules`
2. saat implementasi, pindahkan shaping data ke presenter atau view model
3. audit ukuran file controller secara berkala
