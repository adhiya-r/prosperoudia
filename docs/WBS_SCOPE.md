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

Status:

- `sebagian sudah tersedia`

### 2. Desain Sistem dan Database

Deliverable:

- ERD awal
- core schema plan
- migration plan
- struktur folder modular

Status:

- `sebagian besar fondasi sudah tersedia`

### 3. Fondasi Aplikasi

Deliverable:

- bootstrap Express
- env/config
- session
- koneksi PostgreSQL
- migration dan seed awal
- blackbox tests dasar

Status:

- `sudah tersedia`

### 4. Autentikasi dan Keamanan

Deliverable:

- login multi-role
- registrasi pelanggan
- password policy
- CSRF protection
- session timeout
- audit log auth events

Status:

- `baru sebagian`

### 5. Master Data

Deliverable:

- CRUD kategori obat
- CRUD supplier
- CRUD obat
- CRUD pelanggan

Status:

- `kategori dan supplier baru sebagian`

### 6. Katalog dan Storefront

Deliverable:

- homepage publik
- katalog obat dari data nyata
- filter, sort, search
- detail produk
- gambar produk

Status:

- `homepage sample sudah ada, sisanya belum`

### 7. Transaksi dan Pesanan

Deliverable:

- cart
- checkout
- metode pembayaran
- konfirmasi pesanan
- order management internal

Status:

- `belum dimulai`

### 8. Resep dan Validasi Klinis

Deliverable:

- upload/pencatatan resep
- verifikasi apoteker
- relasi resep ke order

Status:

- `belum dimulai`

### 9. Inventory dan FIFO

Deliverable:

- batch stok
- mutasi stok
- FIFO
- expiry tracking
- stock threshold alert

Status:

- `schema ada, logic belum`

### 10. Dashboard, Report, dan Monitoring

Deliverable:

- dashboard KPI
- chart penjualan/stok/pendapatan
- export PDF
- error log dashboard
- audit log page
- monitoring page

Status:

- `belum dimulai`

### 11. Notifikasi dan Job Simulation

Deliverable:

- notifikasi status order
- alert stok rendah
- alert expiry
- job queue simulation
- import/report background job simulation

Status:

- `belum dimulai`

### 12. Migrasi, Cutover, dan Evidence

Deliverable:

- migration strategy
- field mapping
- validation checklist
- cutover plan
- rollback plan
- software update simulation
- impact analysis

Status:

- `belum dimulai`

### 13. Dokumentasi Pengguna dan Testing

Deliverable:

- user guide
- FAQ
- troubleshooting guide
- UAT scenario/result
- debugging report

Status:

- `belum dimulai`

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
- stok bisa berubah berdasarkan batch FIFO
- laporan dan notifikasi dasar bisa didemokan

## Catatan Scope Control

- fitur yang tidak mendukung requirement langsung tidak diprioritaskan
- fitur simulasi harus diberi label `simulated`
- dokumen harus selalu mengikuti kondisi implementasi nyata
