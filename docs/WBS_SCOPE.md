# WBS and Scope

Dokumen ini memecah pekerjaan proyek ke paket kerja yang bisa diimplementasikan dan didokumentasikan.

## Prinsip Scope

- fokus ke requirement studi kasus BNSP
- utamakan fitur yang bisa didemokan
- setiap paket kerja harus punya bukti implementasi atau dokumen

## Work Breakdown Structure

### 1. Inisiasi dan Perencanaan

Deliverable:

- requirement checklist
- project charter
- planning decisions
- module backlog

Status: `selesai untuk prototype`

### 2. Desain Sistem dan Database

Deliverable:

- ERD awal
- core schema plan
- migration plan
- struktur folder modular

Status: `selesai untuk prototype`; ERD tetap perlu diperbarui jika schema berubah

### 3. Fondasi Aplikasi

Deliverable:

- bootstrap Express
- env/config
- session
- koneksi PostgreSQL
- migration dan seed awal
- blackbox tests dasar

Status: `selesai`

### 4. Autentikasi dan Keamanan

Deliverable:

- login multi-role
- registrasi pelanggan
- password policy
- CSRF protection
- session timeout
- audit log auth events

Status: `parsial`; verifikasi email dan hardening produksi belum tersedia

### 5. Master Data

Deliverable:

- CRUD kategori obat
- CRUD supplier
- CRUD obat
- CRUD pelanggan

Status: `parsial`; obat/kategori/supplier lengkap, customer bisnis belum lengkap

### 6. Katalog dan Storefront

Deliverable:

- homepage publik
- katalog obat dari data nyata
- filter, sort, search
- detail produk
- gambar produk

Status: `parsial`; katalog/search/filter/detail/gambar aktif, sorting harga belum lengkap

### 7. Transaksi dan Pesanan

Deliverable:

- cart
- checkout
- metode pembayaran
- konfirmasi pesanan
- order management internal

Status: `parsial`; cart/checkout/order management aktif, bukti pembayaran dapat diunggah, pembayaran gateway masih simulasi

### 8. Resep dan Validasi Klinis

Deliverable:

- upload/pencatatan resep
- verifikasi apoteker
- relasi resep ke order

Status: `selesai untuk prototype`; upload, preview, dan review resep aktif

### 9. Inventory dan FIFO

Deliverable:

- batch stok
- mutasi stok
- FIFO
- expiry tracking
- stock threshold alert

Status: `parsial`; FIFO aktif saat order selesai, reversal/reservasi/alert expiry belum lengkap

### 10. Dashboard, Report, dan Monitoring

Deliverable:

- dashboard KPI
- chart penjualan/stok/pendapatan
- export PDF
- error log dashboard
- audit log page
- monitoring page

Status: `parsial`; dashboard, PDF, monitoring, error log aktif, audit/error page masih mengandalkan donor

### 11. Notifikasi dan Job Simulation

Deliverable:

- notifikasi status order/resep/bukti pembayaran
- alert stok rendah
- alert expiry
- job queue simulation
- import/report background job simulation

Status: `parsial/simulasi`; notifikasi per-user aktif untuk flow utama, job record aktif, worker queue dan alert otomatis belum lengkap

### 12. Migrasi, Cutover, dan Evidence

Deliverable:

- migration strategy
- field mapping
- validation checklist
- cutover plan
- rollback plan
- software update simulation
- impact analysis

Status: `selesai sebagai dokumen`; evidence simulasi aktual masih perlu dikumpulkan

### 13. Dokumentasi Pengguna dan Testing

Deliverable:

- user guide
- FAQ
- troubleshooting guide
- UAT scenario/result
- debugging report

Status: `parsial`; user guide, FAQ, troubleshooting tersedia, UAT/debugging report masih berjalan

## Scope Prioritas

### Prioritas 1

- auth multi-role
- medicines
- katalog
- cart
- checkout
- orders
- prescriptions
- inventory FIFO

### Prioritas 2

- dashboard
- notifications
- reports
- audit log
- error log

### Prioritas 3

- import/export
- queue/job simulation
- monitoring
- sync counter vs online

## Definisi MVP Asesmen

MVP dianggap cukup untuk lanjut ke dokumen final bila:

- guest bisa melihat katalog
- pelanggan bisa login atau daftar
- admin bisa kelola master data inti
- pelanggan bisa membuat pesanan
- apoteker bisa memverifikasi resep
- kasir/admin bisa mengecek bukti pembayaran
- stok bisa berubah berdasarkan batch FIFO
- laporan dan notifikasi dasar bisa didemokan

## Catatan Scope Control

- fitur yang tidak mendukung requirement langsung tidak diprioritaskan
- fitur simulasi harus diberi label `simulated`
- dokumen harus selalu mengikuti kondisi implementasi nyata
