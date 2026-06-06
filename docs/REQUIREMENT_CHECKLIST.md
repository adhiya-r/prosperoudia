# Requirement Compliance Audit

Audit ini membandingkan kebutuhan pada `13. a.FR.IA.04A. Studi Kasus (Apotek).pdf` dengan working tree Prosperoudia per `2026-06-06`.

Status: `Terpenuhi`, `Parsial`, `Simulasi`, atau `Belum`.

## Ringkasan

| Area | Kondisi |
|---|---|
| Fondasi aplikasi | Berjalan: Express/EJS/PostgreSQL/Knex, modular route-controller-service-repository |
| Alur demo inti | Berjalan: login, katalog, cart, checkout, bukti pembayaran, order, resep, FIFO, dashboard, import, PDF |
| Gap terbesar | customer CRUD penuh, email verification, expiry alert otomatis, queue/payment/sync stok |
| Dokumen wajib PDF | Tersedia; status implementasi tetap dijelaskan jujur |
| Test otomatis | `48/48` lulus pada `2026-06-06` setelah artefak donor ignored dibersihkan; residual audit-log test dicatat di debugging report |

## Modul 1: Autentikasi dan Keamanan

| Requirement | Status | Bukti dan Catatan |
|---|---|---|
| Login multi-level | `Terpenuhi` | Role Admin, Apoteker, Kasir, Pelanggan; route guard backend di `authMiddleware`/`roleMiddleware`; seluruh role dapat mengelola profil pribadi. |
| Registrasi + verifikasi email + validasi data | `Parsial` | Registrasi dan validasi aktif; verifikasi email belum tersedia. |
| bcrypt/Argon2 + validasi kekuatan password | `Parsial` | Password policy aktif, tetapi hashing memakai Node `crypto.scrypt`, bukan bcrypt/Argon2. |
| Proteksi SQL injection, XSS, CSRF | `Parsial` | Knex parameterized query, Helmet, escaping EJS, dan CSRF middleware aktif; CSP dinonaktifkan dan belum ada security regression suite lengkap. |
| Session timeout otomatis | `Terpenuhi` | `SESSION_MAX_AGE_MINUTES` diterapkan pada cookie session. PostgreSQL session store bersifat opsional. |
| Audit log aktivitas | `Parsial` | Auth, profil, user role, checkout, order, dan resep tercatat; belum seluruh CRUD/import/report. |
| Analisis risiko keamanan | `Terpenuhi` | Lihat `docs/SECURITY_RISK_ANALYSIS.md`. |

## Modul 2: Dashboard dan Real-Time Monitoring

| Requirement | Status | Bukti dan Catatan |
|---|---|---|
| Dashboard grafik penjualan, stok, pendapatan | `Parsial` | Dashboard backoffice dan data tren 7 hari aktif; pilihan harian/mingguan/bulanan belum lengkap. |
| Katalog search, filter kategori, sorting harga | `Parsial` | Search/autocomplete dan filter aktif; sorting harga belum lengkap. |
| Detail produk lengkap | `Parsial` | Nama, deskripsi, harga, tipe resep, gambar, dan stok tersedia; komposisi/dosis/efek samping belum lengkap. |
| Upload dan preview gambar | `Terpenuhi` | CRUD obat mendukung upload/ganti gambar dan tampil pada storefront. |
| Real-time notification stok kritis/order baru | `Parsial` | Order/resep/bukti pembayaran/error membuat notifikasi per-user; hover dan dashboard notifikasi dapat membuka item serta tandai baca. Alert stok kritis belum tersambung penuh ke flow apotek. |
| Export laporan PDF visual | `Terpenuhi` | PDF summary memiliki header visual, metric, tabel berwarna, top-selling, low-stock, dan expiry. Proses masih synchronous. |

## Modul 3: Manajemen Data dan Transaksi

| Requirement | Status | Bukti dan Catatan |
|---|---|---|
| CRUD obat, kategori, supplier | `Terpenuhi` | List/create/edit/activate/deactivate/delete tersedia untuk Admin. |
| CRUD pelanggan | `Parsial` | Registrasi, profil, dan manajemen role user tersedia; modul customer bisnis terpisah belum lengkap. |
| CRUD transaksi dan resep | `Parsial` | Create/list/update lifecycle dan review resep tersedia; delete/reversal/history penuh belum ada. |
| Query laporan penjualan, terlaris, expiry, rekap | `Terpenuhi` | Dipakai dashboard dan PDF report melalui Knex/PostgreSQL. |
| Autocomplete dan fuzzy search | `Parsial` | Autocomplete/ranking sederhana tersedia; typo-distance fuzzy penuh belum ada. |
| FIFO stok otomatis | `Terpenuhi` | `inventoryService.allocateOrderStock` memakai batch expiry paling awal saat order diselesaikan; reversal/reservasi belum ada. |
| Pagination, sorting, filtering | `Parsial` | Tersedia pada sebagian backoffice donor, belum konsisten pada seluruh modul apotek. |
| Cart | `Terpenuhi` | Tambah, ubah jumlah, hapus, dan total berbasis session. |
| Checkout + metode pembayaran + konfirmasi | `Simulasi` | Checkout, status pembayaran, bukti pembayaran opsional saat checkout, dan upload bukti setelah checkout tersedia; tanpa payment gateway nyata. |
| Verifikasi resep | `Terpenuhi` | Upload resep, daftar review, preview file, approve/reject, dan histori pelanggan tersedia. |

## Modul 4: Notifikasi dan Alert

| Requirement | Status | Bukti dan Catatan |
|---|---|---|
| Alert stok di bawah threshold | `Parsial` | Low-stock tampil di dashboard/report; pembuatan notifikasi otomatis belum konsisten pada mutasi stok apotek. |
| Alert expiry 30/60/90 hari | `Parsial` | Query batch <=90 hari tersedia pada report; notifikasi otomatis 30/60/90 belum ada. |
| Notifikasi status pesanan pelanggan | `Terpenuhi untuk prototype` | Pelanggan, Admin, Apoteker, dan Kasir memiliki notifikasi per-user; item bisa dibuka individual, ditandai baca otomatis, dan ditandai semua baca. |
| Notifikasi exception ke Admin | `Parsial` | Error critical dicatat dan memicu notifikasi Admin; klasifikasi masih sederhana. |
| Dashboard error log severity | `Parsial` | Error log tampil di dashboard/route donor; drill-down dan coverage belum lengkap. |

## Modul 5: Pemrosesan Paralel dan Pesanan

| Requirement | Status | Bukti dan Catatan |
|---|---|---|
| Pesanan diproses paralel | `Parsial` | Request database dapat berjalan concurrent, tetapi belum ada worker khusus dan pengujian beban. |
| Batch import CSV/XLSX paralel | `Simulasi` | Import CSV/XLSX dan `import_jobs` aktif, tetapi proses masih synchronous. |
| Background report job | `Simulasi` | `report_jobs` mencatat lifecycle, tetapi PDF dibuat dalam request yang sama. |
| Queue pembayaran dan update stok | `Belum` | Belum ada payment worker/queue apotek. |
| Sinkronisasi stok counter-online | `Belum` | PostgreSQL menjadi sumber stok tunggal, tetapi workflow counter offline/sync belum dibuat. |

## Kebutuhan Non-Fungsional dan Dokumen

| Requirement PDF | Status | Dokumen |
|---|---|---|
| Arsitektur hardware/topologi | `Terpenuhi` | `ARCHITECTURE_TOPOLOGY.md` |
| Spesifikasi minimum server | `Terpenuhi` | `SERVER_SPECIFICATION.md` |
| Analisis tools/framework | `Terpenuhi` | `TOOLS_FRAMEWORK_ANALYSIS.md` |
| Analisis skalabilitas | `Terpenuhi` | `SCALABILITY_ANALYSIS.md` |
| Library pihak ketiga: versi/lisensi/fungsi | `Terpenuhi` | `THIRD_PARTY_COMPONENTS.md` |
| Strategi migrasi, mapping, validasi, rollback | `Terpenuhi` | `MIGRATION_STRATEGY.md`, `DATA_MAPPING.md`, `POST_MIGRATION_VALIDATION.md`, `ROLLBACK_PLAN.md` |
| Cutover plan | `Terpenuhi` | `CUTOVER_PLAN.md` |
| Simulasi software update dengan Git | `Terpenuhi` | `SOFTWARE_UPDATE_SIMULATION.md` |
| Impact analysis | `Terpenuhi` | `IMPACT_ANALYSIS.md` |
| User guide | `Terpenuhi` | `USER_GUIDE.md` |
| FAQ minimal 10 | `Terpenuhi` | `FAQ.md` |
| API documentation | `Terpenuhi` | `API_DOCUMENTATION.md` |
| Troubleshooting guide | `Terpenuhi` | `TROUBLESHOOTING_GUIDE.md` |

Dokumen pendukung UAT, debugging, dan quality gate tersedia di `UAT_SCENARIO_RESULT.md`, `DEBUGGING_REPORT.md`, dan `QUALITY_CHECKLIST.md`.

## Prioritas Berikutnya

1. Implementasikan verifikasi email simulasi dan ganti hashing ke Argon2/bcrypt agar sesuai teks PDF.
2. Sambungkan low-stock/expiry alert otomatis ke mutasi stok dan notifikasi per-user.
3. Lengkapi customer CRUD, pagination/filter, serta audit log seluruh aksi penting.
4. Tambahkan simulasi worker untuk import, report, payment, dan sinkronisasi stok.
5. Eksekusi UAT dan tutup residual defect pada debugging report.
