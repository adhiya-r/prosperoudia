# Dashboard Integration Plan

Dokumen ini mengatur integrasi dashboard donor di `src/dashboard` ke aplikasi apotek e-commerce `prosperoudia`.

Sumber arahan:

- `src/dashboard/docs/AI_DASHBOARD_INTEGRATION_GUIDE.md`
- studi kasus apotek BNSP
- keputusan user: waktu terbatas, dashboard donor boleh dipakai lebih utuh, dan schema dashboard lama disesuaikan ke schema `prosperoudia`

## 1. Keputusan Terbaru

Dashboard donor akan dipakai sebagai basis backoffice seutuh mungkin.

Pendekatan ini berbeda dari porting modular pelan-pelan. Fokusnya adalah:

- fitur donor cepat hidup
- perubahan dilakukan di layer schema mapping, label, dan route
- storefront publik `prosperoudia` tetap dipertahankan
- warehouse tidak dipetakan menjadi supplier
- menu warehouse dan transfer disembunyikan dulu

## 2. Target Integrasi

Area publik tetap memakai aplikasi `prosperoudia`:

- `/`
- `/medicines/:id`
- `/cart`
- `/checkout`
- `/register`
- order confirmation

Area backoffice memakai pola dashboard donor:

- dashboard chart dan metric
- CRUD internal
- monitoring
- user management
- audit log
- error log
- notifications
- import CSV/XLSX
- export PDF
- report/import job tracking

## 3. Strategi Teknis

Dashboard donor tidak dijalankan sebagai Express app kedua. Yang dipakai adalah route, controller, service, repository, view, dan asset dashboard donor yang ditempel ke aplikasi utama.

Alasan:

- session dan CSRF tetap satu
- database connection tetap satu
- route tidak bentrok
- lebih mudah dijelaskan saat asesmen

Tetapi struktur donor boleh dipertahankan lebih banyak daripada rencana sebelumnya. Controller besar donor boleh dipakai sementara jika mempercepat integrasi.

## 4. Mapping Schema

| Dashboard Donor | Schema Prosperoudia | Strategi |
|---|---|---|
| `products` | `medicines` | Query donor diubah membaca/menulis `medicines` |
| `categories` | `medicine_categories` | Query donor diubah ke kategori obat |
| `suppliers` | `suppliers` | Bisa relatif langsung dipakai |
| `inventory_balances` | agregasi `inventory_batches` | Buat adapter query, bukan tabel lama |
| `stock_transactions` | `stock_movements` | Label jadi pergerakan stok |
| `users` | `users` | Dipakai langsung dengan penyesuaian field |
| `roles` | `roles` | Role donor dimapping ke role apotek |
| `user_roles` | `user_roles` | Dipakai langsung |
| `notifications` | `notifications` | Dipakai langsung jika field cukup |
| `audit_logs` | `audit_logs` | Dipakai langsung jika field cukup |
| `error_logs` | `error_logs` | Dipakai langsung jika field cukup |
| `import_jobs` | `import_jobs` | Sudah ditambahkan di schema utama |
| `report_jobs` | `report_jobs` | Sudah ditambahkan di schema utama |
| `warehouses` | disembunyikan dulu | Tidak dipetakan ke supplier |
| `warehouse_transfers` | disembunyikan dulu | Tidak dipakai di fase cepat |

## 5. Warehouse Decision

Warehouse tidak boleh disamakan dengan supplier.

Keputusan fase cepat:

- menu `Warehouses` disembunyikan
- route warehouse donor tidak diprioritaskan
- menu `Warehouse Transfers` disembunyikan
- logic yang membutuhkan warehouse dibuat fallback atau dilewati
- supplier tetap menjadi pemasok obat

Jika nanti butuh stok multi-lokasi, warehouse bisa direintroduce sebagai `Lokasi Stok`, `Gudang Apotek`, atau `Outlet`.

## 6. Role Mapping

| Donor | Prosperoudia |
|---|---|
| `Admin` | `Admin` |
| `Warehouse Manager` | `Apoteker` |
| `Warehouse Staff` | `Kasir` |
| `Viewer` | tidak dipakai untuk backoffice atau dipetakan ke read-only |

Pelanggan tidak perlu masuk ke dashboard backoffice.

## 7. File Donor Prioritas

### Dipakai cepat

- `src/dashboard/src/routes/index.js`
- `src/dashboard/src/controllers/dashboardController.js`
- `src/dashboard/src/controllers/masterDataController.js`
- `src/dashboard/src/controllers/operationsController.js`
- `src/dashboard/src/controllers/adminController.js`
- `src/dashboard/src/controllers/systemController.js`
- `src/dashboard/src/services/dashboardService.js`
- `src/dashboard/src/services/productService.js`
- `src/dashboard/src/services/productImportService.js`
- `src/dashboard/src/services/reportExportService.js`
- `src/dashboard/src/services/importJobService.js`
- `src/dashboard/src/services/reportJobService.js`
- `src/dashboard/src/services/notificationService.js`
- `src/dashboard/src/services/auditLogService.js`
- `src/dashboard/src/services/errorLogService.js`
- `src/dashboard/src/repositories`
- `src/dashboard/src/validators`
- `src/dashboard/src/utils/csvParser.js`
- `src/dashboard/src/middlewares/uploadMiddleware.js`
- `src/dashboard/src/views`
- `src/dashboard/public/css`
- `src/dashboard/public/js`

### Disembunyikan dulu

- warehouse routes
- warehouse transfer routes
- warehouse sync jobs
- warehouse views/menu
- warehouse migrations

## 8. Route Plan

Route publik tetap milik storefront.

Route backoffice donor dipasang dengan prefix internal agar tidak bentrok.

Pilihan cepat:

```txt
/dashboard
/dashboard/data
/dashboard/events
/backoffice/products        -> sementara bisa redirect ke /medicines atau langsung donor-adapted medicines
/backoffice/categories
/backoffice/suppliers
/backoffice/stock-transactions
/backoffice/notifications
/backoffice/reports
/backoffice/imports
/backoffice/audit-logs
/backoffice/error-logs
/backoffice/users
/backoffice/monitoring
```

Route donor yang berisiko bentrok dengan storefront tidak dipasang di root.

## 9. Urutan Kerja Paling Cepat

### Tahap 1: Siapkan compatibility layer

1. Migration `import_jobs` sudah ditambahkan.
2. Migration `report_jobs` sudah ditambahkan.
3. Dependency `exceljs`, `pdfkit`, dan `morgan` sudah ditambahkan.
4. Pastikan upload/report directory tersedia.

### Tahap 2: Sembunyikan warehouse dari donor

1. Hapus link warehouse dari sidebar donor.
2. Hapus link warehouse transfer dari sidebar donor.
3. Jangan mount route warehouse/transfer dulu.
4. Pastikan dashboard tetap bisa render tanpa data warehouse.

### Tahap 3: Sesuaikan repository donor ke schema apotek

Urutan repository:

1. `productRepository` -> `medicines`
2. `categoryRepository` -> `medicine_categories`
3. `supplierRepository` -> `suppliers`
4. `inventoryBalanceRepository` -> agregasi `inventory_batches`
5. `stockTransactionRepository` -> `stock_movements`
6. `userRepository` -> `users` + `roles` + `user_roles`

### Tahap 4: Hidupkan fitur bernilai asesmen

Urutan fitur:

1. dashboard chart dan metric
2. import CSV/XLSX obat
3. export PDF laporan
4. audit log
5. error log
6. notification
7. monitoring
8. user management

### Tahap 5: Domain relabeling

Ganti label UI:

- `Products` -> `Obat`
- `Categories` -> `Kategori Obat`
- `Stock Transactions` -> `Pergerakan Stok`
- `Reports` -> `Laporan`
- `Imports` -> `Import Data`
- `Account Management` -> `Manajemen Akun`

Warehouse label tidak diganti menjadi supplier. Menu warehouse disembunyikan.

## 10. Redundansi yang Dibersihkan Setelah Fitur Hidup

Setelah fitur donor yang dipakai sudah pindah/terpasang:

- hapus `src/dashboard/node_modules`
- hapus `src/dashboard/.git`
- hapus `src/dashboard/package.json`
- hapus `src/dashboard/package-lock.json`
- hapus `src/dashboard/knexfile.js`
- hapus `src/dashboard/.env.example`
- hapus `src/dashboard/GITHUB_LINK.txt`
- hapus migrations donor yang tidak dipakai
- hapus routes warehouse/transfer bila tetap tidak diperlukan

Jangan bersihkan terlalu awal sebelum fitur import/export/report hidup.

## 11. Kriteria Sukses Fase Cepat

Fase cepat dianggap berhasil jika:

- storefront publik tetap jalan
- dashboard/backoffice bisa dibuka dari aplikasi utama
- login/session tetap satu
- menu warehouse dan transfer tidak muncul
- data obat/kategori/supplier berasal dari schema `prosperoudia`
- dashboard metric memakai order/stok/obat apotek
- import CSV/XLSX obat berjalan
- export PDF laporan berjalan
- audit/error/notification tercatat

## 12. Tindakan Berikutnya

Langkah langsung berikutnya:

1. sambungkan audit log, error log, dan notification ke flow utama
2. sembunyikan warehouse/transfer dari donor sidebar dan route plan
3. rapikan route backoffice donor agar naming internal konsisten
