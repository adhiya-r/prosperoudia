# Database Migration Plan

> Artefak pengembangan internal untuk urutan migration schema. Dokumen migrasi data yang diminta studi kasus berada di `docs/MIGRATION_STRATEGY.md`.

Dokumen ini menerjemahkan `core schema` menjadi urutan migration yang aman dan bisa dijalankan secara bertahap.

## Tujuan

Migration fase pertama harus:

- mengikuti dependency foreign key yang benar
- memuat constraint minimum untuk menjaga integritas data
- cukup untuk auth, master data, inventory, prescription, order, dan operational logs

## Urutan Migration

Urutan migration inti:

1. `roles`
2. `users`
3. `user_roles`
4. `customers`
5. `suppliers`
6. `medicine_categories`
7. `medicines`
8. `inventory_batches`
9. `prescriptions`
10. `orders`
11. `order_items`
12. `stock_movements`
13. `notifications`
14. `audit_logs`
15. `error_logs`

## Alasan Urutan

- `roles` harus ada sebelum `user_roles`
- `users` harus ada sebelum tabel yang mereferensikan pelaku aksi
- master data obat harus ada sebelum inventory dan order
- `prescriptions` harus ada sebelum `orders` karena order bisa terkait resep
- `orders` harus ada sebelum `order_items`
- `stock_movements` ditaruh setelah `orders` agar reference ke order bisa dipakai sejak awal

## Constraint Minimum

### Uniqueness

- `roles.name`
- `users.username`
- `users.email`
- `customers.email`
- `suppliers.code`
- `medicine_categories.code`
- `medicines.sku`
- `inventory_batches(medicine_id, batch_number)`
- `orders.order_number`

### Check Constraint

- seluruh harga dan cost tidak boleh negatif
- seluruh quantity stok tidak boleh negatif
- `quantity_remaining <= quantity_received`
- boolean status tetap memakai kolom boolean, bukan string

### Foreign Key

Seluruh relasi inti memakai foreign key eksplisit.

## Enumerasi yang Diterapkan di Schema

### prescriptions.status

- `pending`
- `approved`
- `rejected`

### orders.channel

- `online`
- `counter`

### orders.fulfillment_method

- `pickup`
- `internal`

### orders.status

- `draft`
- `pending_verification`
- `confirmed`
- `completed`
- `cancelled`

### orders.payment_status

- `unpaid`
- `pending`
- `paid`
- `failed`

### stock_movements.movement_type

- `stock_in`
- `stock_out`
- `adjustment`
- `order_allocation`
- `order_reversal`

## Catatan Implementasi

- migration memakai `bigIncrements` untuk primary key inti
- timestamp memakai timezone
- kolom JSON audit/error memakai `jsonb` agar fleksibel
- beberapa index ditambahkan sejak awal pada tabel yang akan sering dicari

## Tabel yang Ditunda

Belum masuk migration awal:

- `shopping_carts`
- `cart_items`
- `customer_addresses`
- `payment_transactions`
- `order_status_histories`
- `report_jobs`
- `import_jobs`
- `sessions`

## Langkah Setelah Migration

1. buat seed `roles`
2. buat seed user demo internal
3. setup auth dan session
4. buat repository per domain

Status:

- seed plan dicatat di `docs/dev/SEED_PLAN.md`
- seed awal tersedia di `database/seeds`
