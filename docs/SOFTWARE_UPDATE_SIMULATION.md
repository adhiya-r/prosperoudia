# Software Update Simulation

Dokumen ini menjelaskan simulasi pembaruan perangkat lunak tanpa merusak fitur yang sudah berjalan.

## Tujuan

- menunjukkan bahwa perubahan fitur dilakukan terkontrol
- membuktikan penggunaan version control sebagai bagian dari proses update
- memberi jalur penjelasan saat asesmen

## Skenario Simulasi

Contoh skenario pembaruan:

- sistem awal hanya punya master data kategori dan supplier
- pembaruan menambahkan homepage publik, modal login, dan perbaikan validasi form

Atau skenario berikutnya:

- menambahkan modul medicines tanpa merusak auth dan master data yang sudah ada

## Prinsip Pembaruan

- perubahan dilakukan di branch terpisah
- perubahan diuji sebelum digabung
- perubahan didokumentasikan
- bila gagal, perubahan bisa dibatalkan atau di-rollback

## Alur Simulasi Update

### 1. Identifikasi Perubahan

Contoh:

- fitur baru: katalog obat
- perubahan existing: validasi supplier lebih ketat

### 2. Buat Branch

Contoh nama branch:

- `feat/medicines-module`
- `feat/public-storefront`
- `fix/supplier-validation`

### 3. Implementasi dan Testing

- ubah kode pada modul terkait
- jalankan blackbox test
- lakukan manual check pada fitur terdampak

### 4. Review Dampak

- apakah auth terdampak
- apakah schema berubah
- apakah UI internal terdampak
- apakah seed/demo data perlu diubah

### 5. Merge

- gabungkan branch setelah verifikasi

### 6. Catat Perubahan

- fitur yang ditambah
- file yang berubah
- test yang dijalankan
- risiko sisa

## Bukti Version Control yang Diharapkan

Yang dapat ditunjukkan saat asesmen:

- riwayat commit
- nama branch fitur
- perubahan file terkait
- test sebelum/sesudah

## Contoh Template Catatan Update

- tanggal update
- tujuan update
- modul terdampak
- schema berubah atau tidak
- test yang dijalankan
- hasil update

## Risiko Saat Update

- perubahan memecahkan fitur lama
- validasi lama menjadi tidak cocok
- struktur schema tidak sinkron
- seed/test tidak lagi valid

## Mitigasi

- update dilakukan per modul
- jalankan regression test dasar
- dokumentasikan impact analysis
- siapkan rollback code dan database bila perlu

## Catatan Asesmen

Untuk prototype, simulasi update dianggap valid bila:

- alur Git jelas
- perubahan fitur dapat dijelaskan
- ada bukti test atau verifikasi
- ada penjelasan risiko dan rollback

Dokumen ini harus dibaca bersama:

- `docs/IMPACT_ANALYSIS.md`
- `docs/ROLLBACK_PLAN.md`
