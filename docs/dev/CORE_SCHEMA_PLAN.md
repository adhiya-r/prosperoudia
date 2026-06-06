# Core Schema Plan

> Artefak pengembangan internal. Skema aktual ditentukan oleh migration di `database/migrations/`.

Dokumen ini menerjemahkan `ERD awal` menjadi rencana implementasi schema fase pertama. Fokusnya adalah keputusan yang cukup konkret untuk diteruskan menjadi migration PostgreSQL dan repository code.

## Tujuan

Core schema harus memenuhi tiga syarat:

- cukup untuk mendukung alur demo utama
- mudah dijelaskan saat asesmen
- cukup fleksibel untuk penambahan fitur fase berikutnya

## Alur Bisnis yang Harus Didukung

Fase pertama schema harus mendukung alur berikut:

1. user internal login sesuai role
2. admin mengelola kategori, supplier, dan obat
3. pelanggan terdaftar di sistem
4. stok obat masuk sebagai batch dengan tanggal kedaluwarsa
5. pelanggan membuat pesanan
6. jika obat memerlukan resep, pesanan dikaitkan dengan resep
7. apoteker memverifikasi resep
8. pesanan dikonfirmasi
9. stok berkurang berdasarkan batch FIFO
10. sistem mencatat audit log, notifikasi, dan error log

## Entitas Core

### 1. Identity and Access

- `roles`
- `users`
- `user_roles`

Tujuan:

- mendukung login multi-role
- memisahkan identitas user dari assignment role
- memudahkan penambahan role baru bila diperlukan

### 2. Customer and Master Data

- `customers`
- `suppliers`
- `medicine_categories`
- `medicines`

Tujuan:

- menyimpan master data yang paling sering diakses
- menjadi basis katalog dan transaksi

### 3. Inventory

- `inventory_batches`
- `stock_movements`

Tujuan:

- menyimpan stok berdasarkan batch
- mendukung FIFO dan tanggal kedaluwarsa
- menjaga histori mutasi stok tetap auditable

### 4. Clinical Validation

- `prescriptions`

Tujuan:

- menyimpan bukti resep
- memungkinkan verifikasi oleh apoteker

### 5. Commerce

- `orders`
- `order_items`

Tujuan:

- menyimpan transaksi utama
- mendukung order berbasis resep dan non-resep
- menyimpan snapshot item transaksi

### 6. Operational Support

- `notifications`
- `audit_logs`
- `error_logs`

Tujuan:

- notifikasi operasional
- jejak aktivitas
- bukti debugging dan monitoring

## Keputusan Field Penting

### orders

Field penting:

- `channel`
  dipakai untuk membedakan `online` dan `counter`
- `fulfillment_method`
  fase pertama cukup untuk `pickup` dan `internal`
- `status`
  mengatur lifecycle order
- `payment_status`
  dipisahkan dari status order agar status pembayaran tidak tercampur dengan status operasional

### order_items

Field snapshot wajib:

- `medicine_sku_snapshot`
- `medicine_name_snapshot`
- `unit_price`

Alasan:

- histori transaksi tidak boleh berubah ketika master data obat diperbarui

### inventory_batches

Field penting:

- `batch_number`
- `received_at`
- `expired_at`
- `quantity_received`
- `quantity_remaining`
- `unit_cost`

Alasan:

- FIFO tidak bisa dijelaskan dengan baik kalau batch tidak eksplisit

### stock_movements

Field penting:

- `movement_type`
- `reference_type`
- `reference_id`
- `quantity_before`
- `quantity_after`

Alasan:

- mutasi stok harus bisa ditelusuri ke sumbernya

## Enumerasi Awal

### Role names

- `Admin`
- `Apoteker`
- `Kasir`
- `Pelanggan`

Catatan:

Role `Pelanggan` dapat disimpan sebagai role biasa atau diperlakukan khusus di fase aplikasi. Untuk schema fase pertama, role tetap didefinisikan eksplisit agar pemetaan hak akses jelas.

### Prescription status

- `pending`
- `approved`
- `rejected`

### Order status

- `draft`
- `pending_verification`
- `confirmed`
- `completed`
- `cancelled`

### Payment status

- `unpaid`
- `pending`
- `paid`
- `failed`

### Stock movement type

- `stock_in`
- `stock_out`
- `adjustment`
- `order_allocation`
- `order_reversal`

## Constraint Prioritas

Constraint yang wajib ada di migration:

- unique untuk `users.username`
- unique untuk `users.email`
- unique untuk `customers.email` jika dipakai sebagai identitas login pelanggan
- unique untuk `suppliers.code`
- unique untuk `medicine_categories.code`
- unique untuk `medicines.sku`
- quantity dan price tidak boleh negatif
- `quantity_remaining <= quantity_received`
- foreign key wajib untuk semua relasi inti

## Tabel yang Ditunda

Tabel berikut belum masuk migration awal:

- `shopping_carts`
- `cart_items`
- `customer_addresses`
- `payment_transactions`
- `order_status_histories`
- `report_jobs`
- `import_jobs`
- `sessions`

Alasan penundaan:

- belum dibutuhkan untuk membuat alur utama berjalan
- bisa ditambahkan setelah keputusan bisnis detail lebih stabil

## Rencana Setelah Core Schema

Setelah core schema selesai:

1. buat migration dan seed role/user demo
2. implementasikan auth dan session
3. implementasikan master data obat
4. implementasikan inventory batch dan FIFO
5. implementasikan order dan resep

## Kriteria Selesai

Core schema dianggap siap ketika:

- definisi tabel inti sudah final untuk fase pertama
- enumerasi status utama sudah diputuskan
- dependency urutan migration sudah jelas
- tidak ada tabel tambahan yang masih memblokir auth, master data, stok, resep, dan order
