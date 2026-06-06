# Server Specification

Dokumen ini memberi rekomendasi spesifikasi minimum server untuk prototype e-commerce apotek Klinik Makmur Jaya.

## Dasar Asumsi

Asumsi yang dipakai:

- klinik melayani `150-200 pasien per hari`
- inventaris sekitar `2.000+ jenis obat`
- mayoritas traffic berupa:
  - pencarian katalog
  - login
  - akses dashboard internal
  - transaksi order
  - verifikasi resep

Prototype ini belum menargetkan skala marketplace besar, tetapi harus cukup stabil untuk asesmen dan simulasi operasional.

## Spesifikasi Minimum yang Direkomendasikan

### 1. Application Server

Rekomendasi minimum:

- CPU: `2 vCPU`
- RAM: `4 GB`
- Storage: `40-60 GB SSD`
- Network: `100 Mbps`

Fungsi:

- menjalankan Node.js + Express
- melayani halaman publik dan internal
- menangani session, render page, dan logika transaksi

### 2. Database Server

Rekomendasi minimum:

- CPU: `2 vCPU`
- RAM: `4 GB`
- Storage: `60-100 GB SSD`
- Network: `100 Mbps`

Fungsi:

- menyimpan transaksi, stok, master data, log, dan data pelanggan

Catatan:

- storage database lebih besar dari app karena menyimpan data operasional utama
- SSD direkomendasikan untuk performa query dan transaksi

## Spesifikasi yang Disarankan untuk Lebih Nyaman

### Application Server

- CPU: `4 vCPU`
- RAM: `8 GB`
- Storage: `80 GB SSD`

### Database Server

- CPU: `4 vCPU`
- RAM: `8 GB`
- Storage: `120 GB SSD`

Alasan:

- memberi ruang lebih untuk query report
- lebih aman untuk background job report/import
- lebih longgar saat file upload dan log bertambah

## Kebutuhan Storage

Komponen storage utama:

- source code dan dependency aplikasi
- database PostgreSQL
- gambar obat
- file resep
- bukti pembayaran
- file export PDF/CSV
- log aplikasi
- backup database

Estimasi kebutuhan awal:

- aplikasi + dependency: `1-3 GB`
- database awal: `2-10 GB`
- file resep, bukti pembayaran, dan gambar: `10-20 GB`
- log + export + buffer operasional: `5-10 GB`

Karena itu total `40-100 GB SSD` masih realistis untuk fase awal.

## Kebutuhan Bandwidth

Untuk prototype:

- koneksi `100 Mbps` cukup

Alasan:

- mayoritas transaksi berbasis form dan halaman server-rendered
- file upload resep, bukti pembayaran, dan gambar obat masih ukuran sedang
- belum ada streaming atau traffic media berat

Jika traffic meningkat:

- tingkatkan bandwidth
- optimalkan cache file statis
- pindahkan file storage ke layanan khusus

## Sistem Operasi dan Software Dasar

Rekomendasi:

- OS: `Linux Server` seperti Ubuntu Server LTS
- Reverse proxy: `Nginx`
- Runtime: `Node.js LTS`
- Database: `PostgreSQL`

Alasan:

- stabil
- umum dipakai
- mudah dijelaskan dalam asesmen

## Backup dan Availability Minimum

Untuk kebutuhan asesmen, minimal:

- backup database harian
- backup file upload berkala
- restart service yang terdokumentasi

Untuk target lebih aman:

- simpan backup di lokasi terpisah
- uji restore secara berkala

## Catatan Penting

- Untuk demo lokal, app dan database boleh berjalan pada satu mesin pengembangan.
- Untuk dokumen arsitektur target, pemisahan `application server` dan `database server` tetap lebih tepat.
- Spesifikasi ini ditujukan untuk prototype operasional skala klinik, bukan untuk e-commerce nasional skala besar.

## Kesimpulan

Spesifikasi minimum `2 vCPU + 4 GB RAM` untuk app server dan database server sudah cukup untuk memulai. Jika ingin ruang lebih aman untuk report, import, dan logging, spesifikasi `4 vCPU + 8 GB RAM` per server lebih disarankan.
