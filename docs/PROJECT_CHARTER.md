# Project Charter

## Identitas Proyek

- Nama proyek: `Prosperoudia`
- Judul studi kasus: `Sistem E-Commerce Penjualan Obat Berbasis Web pada Klinik Makmur Jaya`
- Skema: `BNSP Web Developer`
- Tipe proyek: `assessment prototype`

## Latar Belakang

Klinik Makmur Jaya masih mengelola penjualan obat, verifikasi resep, dan pemantauan stok secara manual. Kondisi ini memunculkan risiko kesalahan transaksi, keterlambatan restock, kesulitan analisis penjualan, dan hambatan pembelian obat secara daring.

Prototype ini dibangun untuk menunjukkan solusi berbasis web yang:

- mendukung penjualan obat online
- membantu pengelolaan stok dan resep
- memberi ringkasan operasional bagi manajemen
- dapat dijelaskan dan didemokan dalam asesmen 30-45 menit

## Tujuan Proyek

Tujuan utama:

- membangun prototype web e-commerce apotek yang mencakup requirement utama studi kasus BNSP
- menghasilkan dokumen teknis dan non-teknis yang dibutuhkan asesmen
- menyiapkan demo flow yang stabil dan mudah dijelaskan

Tujuan terukur:

- tersedia login multi-role `Admin`, `Apoteker`, `Kasir`, dan `Pelanggan`
- tersedia katalog obat, cart, checkout, dan verifikasi resep
- tersedia pengelolaan stok berbasis batch dan FIFO
- tersedia dashboard, notifikasi, laporan, audit log, dan error log
- tersedia dokumen migrasi, cutover, rollback, UAT, dan panduan pengguna

## Ruang Lingkup

Masuk ruang lingkup:

- aplikasi web server-rendered untuk internal dan pelanggan
- pengelolaan master data obat, kategori, supplier, pelanggan
- alur katalog, cart, checkout, pembayaran simulasi, dan pesanan
- verifikasi resep untuk obat tertentu
- inventaris batch, expiry tracking, FIFO, dan stock alert
- dashboard, report export, notifikasi, audit log, error log, monitoring
- dokumen asesmen BNSP

Di luar ruang lingkup fase prototype:

- payment gateway production
- integrasi email/SMS production
- mobile app native
- pengiriman pihak ketiga production
- infrastruktur high-availability production

## Stakeholder

Stakeholder utama:

- Manajemen Klinik Makmur Jaya
- Admin
- Apoteker
- Kasir
- Pasien/Pelanggan
- Asesor BNSP

## Deliverable

Deliverable utama:

- prototype aplikasi web yang berjalan
- seed/demo data
- source code modular
- migration dan seed database
- blackbox test dasar
- paket dokumen asesmen
- skenario demo presentasi

## Kriteria Keberhasilan

Proyek dianggap berhasil bila:

- alur demo utama dapat dijalankan tanpa blocker besar
- fitur inti requirement dapat ditunjukkan walau sebagian bersifat simulasi
- kandidat dapat menjelaskan arsitektur, schema, alur data, dan alasan stack
- dokumen asesmen utama tersedia dan konsisten dengan implementasi

## Asumsi

- prototype diprioritaskan untuk explainability, bukan production readiness penuh
- beberapa fitur dapat disimulasikan bila jalur produksinya didokumentasikan jujur
- deployment production penuh tidak menjadi target fase ini

## Risiko Awal

- scope terlalu lebar untuk waktu asesmen
- implementasi fitur lebih cepat daripada penyusunan dokumen
- terlalu banyak fitur simulasi tanpa bukti alur yang jelas
- UI berkembang lebih cepat daripada domain logic inti

## Strategi Eksekusi

Urutan tinggi:

1. fondasi schema, auth, role, session
2. master data dan katalog obat
3. transaksi, resep, inventory FIFO
4. dashboard, notifikasi, report, logging
5. migrasi, UAT, cutover, dokumentasi final
