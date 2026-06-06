# Migration Strategy

Dokumen ini menjelaskan strategi migrasi dari sistem manual/spreadsheet ke sistem e-commerce apotek.

## Tujuan

Migrasi dilakukan untuk memindahkan data penting dari pencatatan manual ke sistem baru tanpa kehilangan integritas data inti.

Target migrasi awal:

- master data obat
- kategori obat
- supplier
- pelanggan
- stok awal per batch

## Sumber Data Lama

Sistem lama diasumsikan terdiri dari:

- spreadsheet master obat
- spreadsheet supplier
- spreadsheet pelanggan
- spreadsheet stok awal
- catatan transaksi manual

Catatan:

- data transaksi historis tidak harus seluruhnya dimigrasikan pada fase awal prototype
- fokus utama adalah data operasional yang dibutuhkan untuk mulai berjalan

## Prinsip Migrasi

- migrasi dilakukan bertahap
- data dibersihkan sebelum diimpor
- migrasi master data dilakukan lebih dulu daripada stok dan transaksi
- hasil migrasi harus divalidasi
- selalu tersedia rollback plan

## Ruang Lingkup Migrasi Fase Awal

Masuk migrasi:

- kategori obat
- supplier
- master obat
- pelanggan aktif
- stok awal batch

Ditunda atau opsional:

- transaksi lama lengkap
- histori resep lama
- histori notifikasi
- histori audit log lama

## Urutan Migrasi

Urutan yang direkomendasikan:

1. kategori obat
2. supplier
3. master obat
4. pelanggan
5. stok awal per batch
6. verifikasi hasil import

Alasan:

- obat bergantung pada kategori dan supplier
- stok batch bergantung pada master obat

## Tahapan Migrasi

### 1. Persiapan Data

Aktivitas:

- kumpulkan file spreadsheet sumber
- tentukan template kolom standar
- identifikasi data duplikat, kosong, atau tidak valid
- tetapkan kode unik untuk kategori, supplier, dan obat bila belum ada

### 2. Data Cleansing

Aktivitas:

- rapikan penulisan nama obat
- normalisasi satuan dan kategori
- pastikan format harga numerik
- pastikan email pelanggan valid bila dipakai login
- pisahkan stok berdasarkan batch dan tanggal kedaluwarsa bila data tersedia

### 3. Mapping

Aktivitas:

- petakan setiap kolom lama ke field database baru
- tentukan default value untuk field yang belum ada di sistem lama

Rujukan:

- lihat `docs/DATA_MAPPING.md`

### 4. Import Bertahap

Aktivitas:

- import kategori
- import supplier
- import obat
- import pelanggan
- import stok batch awal

### 5. Validasi Pasca-Migrasi

Aktivitas:

- bandingkan jumlah record
- cek field wajib
- cek relasi foreign key
- cek stok total terhadap data sumber
- cek sample data acak

Rujukan:

- lihat `docs/POST_MIGRATION_VALIDATION.md`

### 6. Sign-Off Internal

Aktivitas:

- admin memverifikasi master data
- apoteker memverifikasi obat dan kategori klinis
- kasir memverifikasi kesiapan stok awal

## Strategi Eksekusi Migrasi

Untuk prototype asesmen, strategi yang direkomendasikan:

- lakukan migrasi dalam mode `offline cutover`
- hentikan input manual sementara
- impor data final
- validasi
- buka akses sistem baru

Alasan:

- lebih mudah dijelaskan
- mengurangi risiko konflik data antara sistem lama dan sistem baru

## Risiko Migrasi

Risiko utama:

- data duplikat
- field penting kosong
- kategori tidak konsisten
- stok batch tidak akurat
- harga atau satuan tertulis tidak seragam
- pelanggan tanpa email/nomor HP yang valid

Mitigasi:

- cleansing sebelum import
- template mapping baku
- validasi record wajib
- review sampling oleh admin/apoteker

## Keputusan Migrasi Prototype

Untuk asesmen, migrasi boleh disimulasikan dengan:

- file CSV/Excel contoh
- proses import yang terdokumentasi
- bukti sebelum dan sesudah import
- validasi hasil import

Namun simulasi harus diberi label `simulated migration`, bukan diklaim migrasi produksi penuh.

## Kriteria Selesai

Migrasi fase awal dianggap berhasil bila:

- master data inti berhasil masuk
- stok awal berhasil dimuat
- relasi obat, kategori, dan supplier valid
- jumlah record hasil import sesuai ekspektasi
- hasil validasi pasca-migrasi lolos
