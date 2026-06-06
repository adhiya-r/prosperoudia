# Rollback Plan

Dokumen ini mendefinisikan langkah rollback bila migrasi atau cutover gagal.

## Tujuan

- memastikan sistem dapat kembali ke kondisi aman
- mencegah operasional klinik berhenti total
- memberi jalur pemulihan yang jelas untuk asesmen

## Kondisi yang Memicu Rollback

Rollback dipertimbangkan bila terjadi salah satu kondisi berikut:

- data hasil migrasi tidak lengkap secara signifikan
- relasi data penting rusak
- stok awal tidak akurat
- login atau transaksi dasar gagal setelah cutover
- error aplikasi kritis muncul dan tidak bisa diperbaiki cepat

## Prinsip Rollback

- rollback harus cepat
- rollback mengutamakan kesinambungan operasional
- backup sebelum migrasi wajib tersedia
- rollback tidak dilakukan sebagian tanpa catatan yang jelas

## Komponen yang Harus Diamankan Sebelum Migrasi

Sebelum migrasi/cutover:

- backup database target
- salinan file spreadsheet sumber
- export data hasil staging bila ada
- catatan versi kode yang dipakai

## Strategi Rollback yang Direkomendasikan

Untuk prototype asesmen:

- rollback utama dilakukan dengan mengembalikan database ke backup sebelum migrasi
- operasional kembali ke data lama/manual bila sistem baru belum valid

## Langkah Rollback

### 1. Stop Aktivitas Input Baru

- hentikan sementara input ke sistem baru
- informasikan bahwa migrasi/cutover ditahan

### 2. Identifikasi Sumber Masalah

- cek apakah masalah ada pada mapping, import, schema, atau aplikasi

### 3. Putuskan Level Rollback

Pilihan:

- rollback sebagian pada data tertentu
- rollback penuh ke backup sebelum migrasi

### 4. Jalankan Pemulihan

- restore database dari backup
- verifikasi service aplikasi
- verifikasi login dasar
- verifikasi data kembali ke kondisi aman

### 5. Kembali ke Mode Operasional Aman

- bila perlu, gunakan pencatatan manual sementara
- jadwalkan ulang migrasi setelah perbaikan

## Peran Saat Rollback

### Tim Teknis

- restore backup
- cek aplikasi dan database
- dokumentasikan penyebab kegagalan

### Admin Klinik

- memverifikasi data master minimum kembali aman

### Apoteker / Kasir

- memverifikasi bahwa operasional dasar dapat dilanjutkan

## Bukti Rollback untuk Asesmen

Yang bisa ditunjukkan:

- existence backup sebelum migrasi
- checklist rollback
- catatan restore
- bukti verifikasi ulang setelah rollback

## Catatan

Untuk fase asesmen, rollback dapat bersifat `simulated rollback`, selama:

- trigger rollback dijelaskan
- langkah rollback didokumentasikan
- bukti restore/checklist tersedia

Namun jangan menyebutnya rollback production penuh bila belum diuji di lingkungan produksi.
