# Initial ERD

ERD awal ini adalah versi `core schema` untuk fase pertama implementasi. Fokusnya bukan kelengkapan e-commerce penuh, tetapi fondasi yang cukup kuat untuk:

- auth dan role
- master data obat
- stok berbasis batch dan FIFO
- resep
- pesanan
- audit, notifikasi, dan error log

Skema tambahan akan ditambahkan setelah alur inti stabil.

## Asumsi Fase Pertama

- pelanggan memiliki satu alamat utama di tabel `customers`
- cart belum menjadi tabel khusus; fase pertama boleh memakai session atau langsung order draft
- pembayaran masih cukup direpresentasikan oleh kolom status di `orders`
- pengiriman belum menjadi modul penuh; pemenuhan pesanan difokuskan ke alur dasar pickup atau penyelesaian internal
- stok akan dipotong saat order dikonfirmasi atau diproses final, bukan saat item baru masuk cart

## Entitas Utama

### users

- id
- full_name
- username
- email
- password_hash
- phone
- is_active
- last_login_at
- created_at
- updated_at

### roles

- id
- name
- display_name

### user_roles

- id
- user_id
- role_id
- is_active
- assigned_at

### customers

- id
- full_name
- email
- phone
- address
- identity_number
- date_of_birth
- is_active
- created_at
- updated_at

### suppliers

- id
- code
- name
- phone
- email
- address
- is_active

### medicine_categories

- id
- code
- name
- description
- is_active

### medicines

- id
- sku
- name
- brand_name
- category_id
- supplier_id
- description
- composition
- dosage
- dosage_form
- strength
- side_effects
- unit_price
- requires_prescription
- minimum_stock_threshold
- image_path
- is_active

### inventory_batches

- id
- medicine_id
- batch_number
- received_at
- expired_at
- quantity_received
- quantity_remaining
- unit_cost
- source_type
- source_id
- created_at

### stock_movements

- id
- medicine_id
- batch_id
- movement_type
- quantity
- quantity_before
- quantity_after
- unit_cost
- reference_type
- reference_id
- notes
- performed_by
- occurred_at

### prescriptions

- id
- customer_id
- uploaded_by_user_id
- doctor_name
- prescription_number
- image_path
- status
- reviewed_notes
- verified_by_user_id
- verified_at
- rejection_reason
- created_at

### orders

- id
- order_number
- customer_id
- prescription_id
- channel
- fulfillment_method
- status
- payment_status
- payment_method
- payment_proof_path
- payment_proof_uploaded_at
- subtotal_amount
- discount_amount
- shipping_amount
- total_amount
- notes
- placed_at
- confirmed_at
- cancelled_at
- completed_at

### order_items

- id
- order_id
- medicine_id
- medicine_sku_snapshot
- medicine_name_snapshot
- quantity
- unit_price
- total_price

### notifications

- id
- user_id
- severity
- title
- message
- entity_type
- entity_id
- is_read
- created_at

### audit_logs

- id
- user_id
- user_role
- action
- entity_type
- entity_id
- old_value_json
- new_value_json
- ip_address
- user_agent
- created_at

### error_logs

- id
- severity
- message
- stack_trace
- request_path
- request_method
- user_id
- ip_address
- user_agent
- metadata_json
- created_at

## Relasi Inti

```txt
users -> user_roles -> roles
customers -> prescriptions
customers -> orders
suppliers -> medicines
medicine_categories -> medicines
medicines -> inventory_batches
medicines -> stock_movements
prescriptions -> orders
orders -> order_items
users -> audit_logs
users -> error_logs
users -> notifications
```

## Catatan Desain

- FIFO akan memakai `inventory_batches.quantity_remaining`, bukan hanya saldo total.
- Obat resep memakai `medicines.requires_prescription`.
- Verifikasi resep dipisah dari order agar alurnya jelas saat demo.
- `orders` dan `stock_movements` dipisah agar histori stok tetap auditable.
- Counter sale dan online sale dibedakan melalui `orders.channel`.
- `order_items` menyimpan snapshot SKU, nama obat, dan harga agar histori transaksi tetap konsisten walau master data obat berubah.
- `stock_movements.reference_type` dan `reference_id` dipakai untuk melacak asal mutasi seperti import, adjustment, order, atau manual correction.
- `prescriptions.status` minimal mendukung `pending`, `approved`, dan `rejected`.
- `orders.status` minimal mendukung `draft`, `pending_verification`, `confirmed`, `completed`, dan `cancelled`.
- `orders.payment_status` minimal mendukung `unpaid`, `pending`, `paid`, dan `failed`.

## Boundary Fase Pertama

Yang masuk fase pertama:

- auth dan role internal
- data pelanggan
- data supplier, kategori, obat
- stok batch dan mutasi stok
- resep
- order dan item order
- audit log, error log, notification

Yang sengaja ditunda:

- cart terpisah berbasis tabel
- transaksi pembayaran terpisah
- banyak alamat pelanggan
- shipment atau delivery tracking terpisah
- job table untuk report/import
- status history table

## Dependency Implementasi

Urutan implementasi yang disarankan dari skema ini:

1. `roles`, `users`, `user_roles`
2. `customers`
3. `suppliers`, `medicine_categories`, `medicines`
4. `inventory_batches`, `stock_movements`
5. `prescriptions`
6. `orders`, `order_items`
7. `notifications`, `audit_logs`, `error_logs`

## Kandidat Tambahan

Entitas di bawah ini belum wajib dibuat di iterasi pertama, tetapi kemungkinan akan diperlukan:

- `shopping_carts`
- `cart_items`
- `customer_addresses`
- `order_status_histories`
- `payment_transactions`
- `faq_entries`
- `report_jobs`
- `import_jobs`
- `sessions`
- `password_reset_tokens`
