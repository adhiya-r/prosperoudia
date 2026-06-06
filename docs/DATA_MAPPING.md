# Data Mapping

Dokumen ini memetakan struktur data manual/spreadsheet ke tabel inti sistem baru.

## Tujuan

- memberi panduan import
- memastikan field lama tidak salah tempat
- membantu validasi pasca-migrasi

## 1. Kategori Obat

Sumber lama contoh:

- `Kategori`
- `Keterangan`

Tujuan baru:

- tabel `medicine_categories`

| Kolom Lama | Field Baru | Wajib | Catatan |
|---|---|---|---|
| Kode Kategori | `code` | Ya | Jika belum ada, dibuat saat cleansing |
| Nama Kategori | `name` | Ya | Contoh: Obat Bebas, Vitamin & Suplemen |
| Keterangan | `description` | Tidak | Opsional |
| Status Aktif | `is_active` | Tidak | Default `true` bila kosong |

## 2. Supplier

Sumber lama contoh:

- `Kode Supplier`
- `Nama Supplier`
- `Telepon`
- `Email`
- `Alamat`

Tujuan baru:

- tabel `suppliers`

| Kolom Lama | Field Baru | Wajib | Catatan |
|---|---|---|---|
| Kode Supplier | `code` | Ya | Harus unik |
| Nama Supplier | `name` | Ya | Nama resmi pemasok |
| Telepon | `phone` | Tidak | Dinormalisasi angka |
| Email | `email` | Tidak | Validasi format email |
| Alamat | `address` | Tidak | Teks alamat supplier |
| Status Aktif | `is_active` | Tidak | Default `true` |

## 3. Obat

Sumber lama contoh:

- `Kode Obat`
- `Nama Obat`
- `Kategori`
- `Supplier`
- `Harga Jual`
- `Harga Beli`
- `Satuan`
- `Deskripsi`
- `Komposisi`
- `Dosis`
- `Efek Samping`
- `Resep`

Tujuan baru:

- tabel `medicines`

| Kolom Lama | Field Baru | Wajib | Catatan |
|---|---|---|---|
| Kode Obat | `sku` | Ya | Harus unik |
| Nama Obat | `name` | Ya | Nama tampilan produk |
| Kategori | `category_id` | Ya | Mapping via `medicine_categories.code/name` |
| Supplier | `supplier_id` | Ya | Mapping via `suppliers.code/name` |
| Harga Jual | `sell_price` | Ya | Nilai numerik |
| Harga Beli | `purchase_price` | Tidak | Bila field tersedia di schema final |
| Satuan | `unit_label` | Tidak | Contoh: strip, botol, tube |
| Deskripsi | `description` | Tidak | Konten katalog |
| Komposisi | `composition` | Tidak | Detail farmasi |
| Dosis | `dosage` | Tidak | Detail farmasi |
| Efek Samping | `side_effects` | Tidak | Detail farmasi |
| Obat Resep | `is_prescription_required` | Ya | Mapping dari Ya/Tidak |
| Status Aktif | `is_active` | Tidak | Default `true` |

## 4. Pelanggan

Sumber lama contoh:

- `Nama`
- `Email`
- `Nomor HP`
- `Alamat`

Tujuan baru:

- tabel `customers`

| Kolom Lama | Field Baru | Wajib | Catatan |
|---|---|---|---|
| Nama Pelanggan | `full_name` | Ya | Nama lengkap |
| Email | `email` | Ya jika untuk login | Harus unik bila dipakai login |
| Nomor HP | `phone` | Ya | Validasi format |
| Alamat | `address` | Tidak | Bisa jadi alamat utama default |
| Status Aktif | `is_active` | Tidak | Default `true` |

## 5. Stok Awal Batch

Sumber lama contoh:

- `Kode Obat`
- `Batch`
- `Tanggal Masuk`
- `Tanggal Kedaluwarsa`
- `Jumlah`
- `Sisa`
- `Harga Beli`

Tujuan baru:

- tabel `inventory_batches`

| Kolom Lama | Field Baru | Wajib | Catatan |
|---|---|---|---|
| Kode Obat | `medicine_id` | Ya | Mapping via `medicines.sku` |
| Nomor Batch | `batch_number` | Ya | Harus unik per obat |
| Tanggal Masuk | `received_at` | Ya | Format tanggal valid |
| Tanggal Kedaluwarsa | `expired_at` | Ya | Wajib untuk FIFO berbasis expiry |
| Jumlah Diterima | `quantity_received` | Ya | Numerik |
| Sisa Stok | `quantity_remaining` | Ya | Tidak boleh > quantity_received |
| Harga Beli per Unit | `unit_cost` | Tidak | Bila tersedia |

## Default Value yang Direkomendasikan

Default value saat data lama tidak lengkap:

- `is_active = true`
- `description = null`
- `email = null` bila tidak wajib untuk modul tertentu

Catatan:

- field yang penting untuk login pelanggan tidak sebaiknya diisi default palsu
- lebih baik ditandai invalid lalu dibersihkan

## Aturan Mapping Penting

- mapping kategori dan supplier tidak boleh mengandalkan nama bebas bila ada kode unik
- semua harga diubah ke numerik tanpa simbol `Rp`
- semua quantity diubah ke integer/decimal sesuai kebutuhan schema
- status `Ya/Tidak` diubah ke boolean

## Catatan

Dokumen ini adalah mapping awal untuk asesmen. Bila struktur spreadsheet final berubah, mapping harus diperbarui sebelum import dijalankan.
