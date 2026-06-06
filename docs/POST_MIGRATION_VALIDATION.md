# Post Migration Validation

Dokumen ini mendefinisikan validasi yang harus dilakukan setelah data dimigrasikan dari spreadsheet/manual ke sistem baru.

## Tujuan

- memastikan data hasil import dapat dipakai operasional
- mendeteksi kesalahan mapping lebih awal
- memberi bukti bahwa migrasi tidak hanya dijalankan, tetapi juga diverifikasi

## Prinsip Validasi

- validasi dilakukan segera setelah import
- validasi mencakup kuantitas data dan kualitas data
- validasi dilakukan oleh kombinasi tim teknis dan user bisnis

## Checklist Validasi Umum

### A. Jumlah Record

Periksa:

- jumlah kategori hasil import
- jumlah supplier hasil import
- jumlah obat hasil import
- jumlah pelanggan hasil import
- jumlah batch stok hasil import

Kriteria:

- hasil import harus sama atau sesuai dengan record sumber setelah cleansing

### B. Kelengkapan Field Wajib

Periksa:

- semua kategori punya `code` dan `name`
- semua supplier punya `code` dan `name`
- semua obat punya `sku`, `name`, `category_id`, `supplier_id`
- semua batch punya `medicine_id`, `batch_number`, `expired_at`, `quantity_received`

Kriteria:

- tidak ada field wajib yang kosong

### C. Validitas Relasi

Periksa:

- semua obat terhubung ke kategori valid
- semua obat terhubung ke supplier valid
- semua batch terhubung ke obat valid

Kriteria:

- tidak ada orphan record

### D. Validitas Nilai

Periksa:

- harga tidak negatif
- quantity tidak negatif
- `quantity_remaining <= quantity_received`
- tanggal kedaluwarsa valid
- email valid untuk pelanggan/supplier yang memakai email

Kriteria:

- semua rule dasar lolos

### E. Sampling Manual

Periksa sample:

- 10 obat acak
- 5 supplier acak
- 5 pelanggan acak
- 10 batch stok acak

Kriteria:

- data pada sistem cocok dengan spreadsheet sumber

## Validasi Bisnis

### Admin

Memverifikasi:

- kategori dan supplier tampil benar
- data master obat bisa dipakai di UI

### Apoteker

Memverifikasi:

- kategori klinis masuk akal
- obat resep dan non-resep terklasifikasi benar
- data batch dan expiry masuk akal

### Kasir

Memverifikasi:

- stok awal cukup konsisten untuk transaksi
- harga jual tampil sesuai kebutuhan operasional

## Bukti Validasi yang Disarankan

Untuk asesmen, bukti validasi dapat berupa:

- screenshot jumlah record sebelum dan sesudah
- query SQL pengecekan
- checklist manual yang ditandatangani/simulasikan
- catatan issue hasil validasi

## Contoh Query Validasi

Contoh pemeriksaan:

- hitung total kategori
- hitung total supplier
- hitung total obat
- cari obat tanpa kategori
- cari batch dengan `quantity_remaining > quantity_received`
- cari obat tanpa supplier

Catatan:

- query final dapat dimasukkan ke dokumen terpisah atau lampiran

## Kriteria Lulus Validasi

Migrasi dianggap lolos bila:

- jumlah record sesuai ekspektasi
- field wajib lengkap
- relasi valid
- tidak ada pelanggaran rule dasar
- sampling manual diterima user bisnis

## Jika Validasi Gagal

Langkah:

1. identifikasi tabel/field bermasalah
2. telusuri sumber spreadsheet
3. perbaiki cleansing atau mapping
4. ulangi import yang relevan
5. jalankan validasi ulang

Jika gagal besar:

- aktifkan rollback plan

Rujukan:

- lihat `docs/ROLLBACK_PLAN.md`
