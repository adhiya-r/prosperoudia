# Scalability Analysis

Dokumen ini menjelaskan bagaimana sistem dapat ditingkatkan ketika jumlah pengguna dan volume transaksi bertambah.

## Tujuan

Analisis ini dibuat untuk menjawab requirement non-fungsional tentang kemampuan sistem menangani peningkatan beban tanpa degradasi performa yang signifikan.

## Kondisi Awal Sistem

Pada fase prototype, sistem diasumsikan melayani:

- 150-200 pasien per hari
- 2.000+ jenis obat
- akses campuran dari pelanggan, admin, apoteker, dan kasir

Beban utama:

- pencarian katalog
- render halaman publik
- login dan session
- CRUD master data
- pembuatan order
- verifikasi resep
- update stok
- pembuatan laporan

## Titik Potensi Bottleneck

### 1. Database Query

Risiko:

- query list obat, order, dan laporan bisa menjadi lambat jika tanpa index dan filter server-side

Mitigasi:

- gunakan index untuk kolom pencarian dan relasi utama
- gunakan pagination server-side
- hindari filtering besar di memory
- pisahkan query operasional dan query laporan bila perlu

### 2. Render Halaman dan Request Aplikasi

Risiko:

- app server menjadi lambat saat banyak request katalog, login, dan dashboard masuk bersamaan

Mitigasi:

- gunakan struktur route/controller/service yang efisien
- hindari business logic berat di controller
- pindahkan pekerjaan berat ke job/background simulation

### 3. File Upload

Risiko:

- upload resep dan gambar obat menambah beban I/O dan storage

Mitigasi:

- batasi ukuran file
- validasi tipe file
- pisahkan storage file dari database
- gunakan object storage pada fase lanjutan

### 4. Report dan Import

Risiko:

- generate PDF besar dan import CSV/Excel dapat mengganggu response UI

Mitigasi:

- jalankan sebagai background job simulation
- simpan status job
- tampilkan progress atau status akhir ke user

### 5. Session dan Concurrency

Risiko:

- ketika instance aplikasi bertambah, session memory tidak lagi aman

Mitigasi:

- simpan session di PostgreSQL atau store terpusat
- desain aplikasi agar tidak bergantung pada state lokal proses

## Strategi Skalabilitas Bertahap

### Tahap 1: Vertical Scaling

Langkah:

- tambah CPU dan RAM app server
- tambah RAM dan storage database server

Kapan dipakai:

- saat beban naik tetapi arsitektur masih single instance

Kelebihan:

- paling cepat
- paling mudah dijelaskan

Kekurangan:

- ada batas kapasitas mesin

### Tahap 2: Optimasi Aplikasi dan Database

Langkah:

- tambahkan index
- optimalkan query Knex/SQL
- cache aset statis
- pastikan pagination dan filtering server-side

Kapan dipakai:

- saat performa list atau laporan mulai turun

### Tahap 3: Pisah Background Processing

Langkah:

- pisahkan import, report, notifikasi, dan update stok berat ke worker/job processor

Kapan dipakai:

- saat proses berat mulai mengganggu response request utama

Kelebihan:

- UI tetap responsif
- lebih sesuai untuk requirement paralel/job queue

### Tahap 4: Horizontal Scaling Aplikasi

Langkah:

- jalankan beberapa instance app server
- tambahkan load balancer
- gunakan session store terpusat

Kapan dipakai:

- saat request publik meningkat tajam

Kekurangan:

- lebih kompleks untuk deployment dan monitoring

## Komponen yang Paling Perlu Dipersiapkan Sejak Awal

### Database Schema

Harus:

- punya foreign key yang jelas
- punya index pada kolom pencarian penting
- mendukung snapshot transaksi

### Inventory Logic

Harus:

- tidak mengandalkan perhitungan stok manual di UI
- semua mutasi stok tercatat

### Order Flow

Harus:

- status order eksplisit
- payment status dipisah dari operational status

### Reporting

Harus:

- diperlakukan terpisah dari request katalog harian bila bebannya besar

## Penilaian Terhadap Stack Saat Ini

Stack `Node.js + Express + PostgreSQL + Knex` masih layak untuk skala klinik ini jika:

- struktur modul dijaga rapi
- query report tidak dibiarkan liar
- import/report berat tidak dijalankan sinkron di request utama
- session tidak hanya mengandalkan memory saat sistem berkembang

## Batasan Prototype

Prototype ini belum ditujukan untuk:

- jutaan request per hari
- multi-region deployment
- event streaming kompleks
- queue infra production-grade penuh

Karena itu, beberapa strategi skalabilitas di dokumen ini adalah `arah peningkatan`, bukan fitur yang semuanya harus langsung diimplementasikan sekarang.

## Kesimpulan

Untuk kebutuhan Klinik Makmur Jaya, sistem ini dapat diskalakan dengan pendekatan bertahap:

1. vertical scaling
2. optimasi query dan pagination
3. background job untuk proses berat
4. horizontal scaling bila diperlukan

Pendekatan ini realistis, cukup untuk requirement studi kasus, dan tetap mudah dijelaskan saat asesmen.
