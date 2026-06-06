# Requirement Checklist

Dokumen ini adalah gap analysis antara studi kasus BNSP apotek dan kondisi repo saat ini.

Status yang dipakai:

- `Done`: sudah ada implementasi atau dokumen yang bisa ditunjukkan
- `Partial`: sudah ada fondasi, tetapi belum memenuhi requirement penuh
- `Not Started`: belum ada implementasi atau dokumen yang memadai
- `Simulated`: fitur sengaja disimulasikan untuk kebutuhan demo

Update terakhir: `2026-06-06`

## Ringkasan Cepat

### Fitur

- `Done`: fondasi auth dasar, seed role/user, schema inti, homepage publik, master data kategori dan supplier level awal
- `Partial`: multi-role login, session management, katalog publik, CRUD kategori/supplier/obat, cart, checkout, prescriptions, order management internal, upload gambar, FIFO stok, dashboard internal, monitoring sistem, requirement mapping
- `Not Started`: customers, payments lanjutan, expiry alert, sync stok online-offline

### Dokumen

- `Done`: requirement checklist, module backlog, ERD awal, planning decisions, core schema plan, migration plan, seed plan, project charter, WBS/scope, architecture/topology, server sizing, tools analysis, scalability analysis, migration strategy, data mapping, post-migration validation, rollback plan, cutover plan, software update simulation, impact analysis, third-party components
- `Not Started`: security risk analysis, user guide, FAQ, troubleshooting, UAT, debugging report, API documentation

## 1. Kebutuhan Fungsional

### Modul 1: Autentikasi dan Keamanan

| Kutipan Asli PDF | Requirement PDF | Status | Kondisi Saat Ini | Bukti Saat Ini | Gap Berikutnya |
|---|---|---|---|---|---|
| `a. Sistem login dengan autentikasi multi-level (Admin, Apoteker, Kasir, Pasien/Pelanggan)` | Login multi-level Admin, Apoteker, Kasir, Pasien/Pelanggan | `Partial` | Login session sudah ada, role seed sudah ada, tetapi UI dan permission per role belum lengkap | `auth`, seed roles/users, proteksi route dasar | RBAC per modul, dashboard per role, pembatasan fitur pelanggan vs internal |
| `b. Sistem registrasi pelanggan dengan verifikasi email dan validasi data diri` | Registrasi pelanggan dengan verifikasi email dan validasi data diri | `Partial` | Registrasi pelanggan dasar sudah aktif dengan validasi nama, username, email, phone, dan password; verifikasi email belum ada | `POST /register`, `src/modules/auth`, blackbox auth test | Tambah email verification simulasi/nyata dan perluas profil pelanggan |
| `c. Implementasi password hashing (bcrypt/argon2) dan validasi kekuatan password` | Password hashing dan validasi kekuatan password | `Done` | Hashing aktif dan password policy eksplisit sudah diterapkan pada registrasi pelanggan | `src/shared/utils/password.js`, `src/shared/utils/passwordPolicy.js`, blackbox auth test | Perluas ke reset password saat modul itu dibuat |
| `d. Proteksi terhadap serangan SQL Injection, XSS, dan CSRF` | Proteksi SQL Injection, XSS, dan CSRF | `Partial` | Query memakai Knex dan CSRF middleware sudah aktif di form utama; review XSS dan dokumentasi mitigasi belum lengkap | `src/shared/middlewares/csrfMiddleware.js`, hidden token di form, blackbox auth test | Review XSS, dokumentasikan mitigasi, tambahkan coverage untuk form baru berikutnya |
| `e. Sistem session management dengan timeout otomatis` | Session management dengan timeout otomatis | `Partial` | Session sudah ada, timeout otomatis belum dibuktikan sebagai requirement | `express-session` aktif | Set `cookie.maxAge`, idle timeout policy, bukti test/manual |
| `f. Audit log untuk mencatat seluruh aktivitas pengguna (siapa, kapan, melakukan apa)` | Audit log seluruh aktivitas pengguna | `Not Started` | Tabel audit log sudah ada, belum dipakai di flow aplikasi | migration `audit_logs` | Buat service audit log pada login, CRUD, checkout, verifikasi resep |
| `g. Dokumen analisis risiko keamanan informasi beserta langkah mitigasi` | Analisis risiko keamanan informasi | `Not Started` | Belum ada dokumen | - | Buat dokumen risk analysis dan mitigasi |

### Modul 2: Dashboard dan Real-Time Monitoring

| Kutipan Asli PDF | Requirement PDF | Status | Kondisi Saat Ini | Bukti Saat Ini | Gap Berikutnya |
|---|---|---|---|---|---|
| `a. Dashboard utama dengan grafik dan chart interaktif menampilkan ringkasan penjualan harian/mingguan/bulanan, stok obat, dan pendapatan` | Dashboard dengan grafik penjualan, stok, pendapatan | `Partial` | Dashboard internal sudah ada dengan metric cards, chart interaktif tren order/revenue, low stock, order terbaru, stock movement, notifikasi, dan error log; periodisasi masih 7 hari tetap | `src/modules/dashboard`, `views/pages/dashboard.ejs`, `public/js/dashboard.js` | Tambah filter harian/mingguan/bulanan dan pecah per role bila perlu |
| `b. Katalog obat berbasis web dengan fitur pencarian, filter kategori (obat resep, obat bebas, suplemen, alat kesehatan), dan sorting harga` | Katalog obat dengan pencarian, filter kategori, sorting harga | `Partial` | Homepage publik sudah menarik data obat nyata, search suggestion sudah aktif, dan filter kategori sudah bisa diklik; sorting harga belum ada | `home`, `medicines`, `public/js/home.js`, seed demo medicines | Tambah sorting harga dan tuning ranking pencarian |
| `c. Halaman detail produk dengan informasi lengkap: nama obat, deskripsi, komposisi, dosis, efek samping, harga, dan ketersediaan stok` | Detail produk lengkap | `Partial` | Halaman detail obat publik sudah ada, menampilkan gambar bila tersedia dan stok tersedia hasil agregasi batch, tetapi atribut farmasi lanjutan belum lengkap | `pages/medicines/show`, `modul medicines`, agregasi `inventory_batches` | Lengkapi atribut lanjutan dan notifikasi stok/expiry |
| `d. Galeri produk dengan fitur upload dan preview gambar obat (multimedia)` | Upload dan preview gambar obat | `Partial` | Upload gambar obat sudah ada di master data dan hasilnya tampil di katalog/detail, tetapi belum ada edit/delete image | `multipart upload medicines`, storefront image render | Tambah edit/delete dan validasi operasional lanjutan |
| `e. Real-time notification ketika ada perubahan stok kritis atau pesanan baru masuk` | Real-time notification stok kritis atau pesanan baru | `Not Started` | Belum ada realtime/near realtime | - | Buat notifikasi in-app dan strategi polling/SSE |
| `f. Export laporan penjualan dalam format PDF dengan elemen visual (logo klinik, grafik, tabel berwarna)` | Export laporan penjualan PDF visual | `Partial` | Route backoffice laporan sudah ada, PDF summary apotek bisa digenerate ke `public/reports`, dan hasil dicatat ke `report_jobs`; jenis report masih baru satu | `src/modules/reports`, `src/views/pages/system/reports/index.ejs`, `database/migrations/202606060003_create_report_jobs.js` | Tambah variasi report dan filter periode |

### Modul 3: Manajemen Data dan Transaksi (CRUD + SQL)

| Kutipan Asli PDF | Requirement PDF | Status | Kondisi Saat Ini | Bukti Saat Ini | Gap Berikutnya |
|---|---|---|---|---|---|
| `a. CRUD lengkap untuk data: Obat, Kategori Obat, Supplier, Pelanggan, Transaksi Penjualan, dan Resep` | CRUD Obat | `Partial` | Modul obat sudah ada di level list + create, termasuk upload gambar dasar, belum CRUD penuh | modul `medicines` | Tambah detail internal, edit, delete, toggle active |
| `a. CRUD lengkap untuk data: Obat, Kategori Obat, Supplier, Pelanggan, Transaksi Penjualan, dan Resep` | CRUD Kategori Obat | `Partial` | Baru list + create | modul `categories` | Tambah detail, edit, delete, toggle active |
| `a. CRUD lengkap untuk data: Obat, Kategori Obat, Supplier, Pelanggan, Transaksi Penjualan, dan Resep` | CRUD Supplier | `Partial` | Baru list + create | modul `suppliers` | Tambah detail, edit, delete, toggle active |
| `a. CRUD lengkap untuk data: Obat, Kategori Obat, Supplier, Pelanggan, Transaksi Penjualan, dan Resep` | CRUD Pelanggan | `Not Started` | Modul belum dibuat | migration table `customers` | Buat customers module |
| `a. CRUD lengkap untuk data: Obat, Kategori Obat, Supplier, Pelanggan, Transaksi Penjualan, dan Resep` | CRUD Transaksi Penjualan | `Partial` | Order sudah bisa dibuat dari checkout, ada halaman konfirmasi, dan order management internal dasar sudah ada | modul `orders`, `orders/manage` | Tambah filter, histori perubahan status, dan operasi internal lanjutan |
| `a. CRUD lengkap untuk data: Obat, Kategori Obat, Supplier, Pelanggan, Transaksi Penjualan, dan Resep` | CRUD Resep | `Partial` | Modul review resep sudah ada, file resep sudah bisa diunggah saat checkout, tetapi belum CRUD penuh pelanggan/internal | modul `prescriptions`, checkout resep | Tambah upload/entri pelanggan, histori review, dan pengelolaan internal lanjutan |
| `b. Implementasi query SQL untuk laporan penjualan, stok terlaris, obat mendekati kadaluarsa, dan rekap transaksi` | Query laporan penjualan | `Not Started` | Belum ada query report | - | Buat report SQL |
| `b. Implementasi query SQL untuk laporan penjualan, stok terlaris, obat mendekati kadaluarsa, dan rekap transaksi` | Query stok terlaris | `Not Started` | Belum ada | - | Buat report SQL |
| `b. Implementasi query SQL untuk laporan penjualan, stok terlaris, obat mendekati kadaluarsa, dan rekap transaksi` | Query obat mendekati kadaluarsa | `Not Started` | Belum ada | `inventory_batches` table | Buat report SQL |
| `b. Implementasi query SQL untuk laporan penjualan, stok terlaris, obat mendekati kadaluarsa, dan rekap transaksi` | Rekap transaksi | `Not Started` | Belum ada | - | Buat query summary |
| `c. Algoritma pencarian obat dengan fitur autocomplete dan fuzzy search` | Autocomplete dan fuzzy search obat | `Partial` | Search suggestion maksimal 5 hasil sudah ada dengan ranking sederhana dan pencocokan nama/SKU/kategori; typo-distance penuh belum ada | `GET /search/suggestions`, `medicineService.listSearchSuggestions`, `public/js/home.js` | Tambah fuzzy distance yang lebih kuat dan bobot ranking |
| `d. Algoritma perhitungan stok otomatis berbasis FIFO (First In First Out) untuk mengelola obat berdasarkan tanggal kadaluarsa` | FIFO stok berdasarkan batch/kadaluwarsa | `Partial` | Inventory service FIFO sudah ada dan dipakai saat order diselesaikan dari order management, tetapi belum ada reversal/reservasi/alert expiry | `src/modules/inventory`, `stock_movements`, order completion flow | Tambah reversal, reservasi stok, dan expiry/threshold alerts |
| `e. Pagination, sorting, dan filtering data dengan performa optimal` | Pagination, sorting, filtering optimal | `Partial` | Belum konsisten di semua modul | sebagian list sederhana | Tambah server-side pagination/filter/sort |
| `f. Fitur keranjang belanja (cart): tambah, hapus, ubah jumlah, dan hitung total harga` | Cart: tambah, hapus, ubah jumlah, hitung total | `Partial` | Session cart dasar sudah ada dan sudah terhubung ke checkout, tetapi belum ada stok reservasi | modul `orders/cart` | Tambah stok reservasi dan persistence cart pelanggan |
| `g. Proses checkout dengan pilihan metode pembayaran dan konfirmasi pesanan` | Checkout + metode pembayaran + konfirmasi pesanan | `Partial` | Checkout dasar, metode pembayaran sederhana, konfirmasi order, dan status management internal dasar sudah ada, tetapi belum ada payment processing lanjutan | modul `orders`, `orders/manage` | Tambah payment flow dan histori status |
| `h. Sistem verifikasi resep dokter untuk obat-obatan yang memerlukan resep` | Verifikasi resep dokter | `Partial` | Review resep oleh apoteker/admin sudah ada untuk order resep dan file resep dasar sudah bisa diunggah, tetapi histori lengkap belum ada | modul `prescriptions`, checkout resep | Tambah histori review dan notifikasi ke pelanggan |

### Modul 4: Sistem Notifikasi dan Alert

| Kutipan Asli PDF | Requirement PDF | Status | Kondisi Saat Ini | Bukti Saat Ini | Gap Berikutnya |
|---|---|---|---|---|---|
| `a. Alert otomatis ketika stok obat di bawah minimum threshold (email dan/atau in-app notification)` | Alert stok di bawah minimum threshold | `Not Started` | Belum ada | migration `notifications` | Tambah stock alert |
| `b. Notifikasi otomatis kepada apoteker ketika ada obat mendekati tanggal kadaluarsa (30/60/90 hari sebelumnya)` | Alert obat mendekati kadaluarsa 30/60/90 hari | `Not Started` | Belum ada | `inventory_batches.expired_at` | Buat expiry alert logic |
| `c. Notifikasi kepada pelanggan terkait status pesanan (dikonfirmasi, diproses, siap diambil/dikirim)` | Notifikasi status pesanan pelanggan | `Not Started` | Belum ada | - | Buat order status notification |
| `d. Notifikasi error/exception pada aplikasi yang dikirim ke admin` | Notifikasi error/exception ke admin | `Not Started` | Logging dan pengiriman ke admin belum berjalan | migration `error_logs`, `notifications` | Tambah error log service + auto notification |
| `e. Dashboard log error dengan kategorisasi severity (critical, warning, info)` | Dashboard log error dengan severity | `Partial` | Panel error log dengan severity sudah tampil di dashboard internal, tetapi belum ada service pencatatan error otomatis | `views/pages/dashboard.ejs`, `src/modules/dashboard/dashboardService.js` | Sambungkan middleware logging dan severity classification otomatis |

### Modul 5: Pemrosesan Paralel dan Manajemen Pesanan

| Kutipan Asli PDF | Requirement PDF | Status | Kondisi Saat Ini | Bukti Saat Ini | Gap Berikutnya |
|---|---|---|---|---|---|
| `a. Fitur pemrosesan pesanan secara paralel sehingga beberapa pesanan dapat diproses bersamaan tanpa bottleneck pada sistem` | Pemrosesan pesanan paralel | `Not Started` | Belum ada | - | Simulasikan order worker/queue |
| `b. Batch import data obat dari file CSV/Excel dengan proses paralel untuk pembaruan katalog` | Batch import obat CSV/Excel dengan proses paralel | `Partial` | Alur upload import obat backoffice sudah ada, file CSV/XLSX diparse, obat dibuat atau diperbarui, kategori dan supplier bisa dibuat otomatis, stok awal dibentuk sebagai batch, dan hasil dicatat ke `import_jobs`; belum ada worker paralel sungguhan | `database/migrations/202606060002_create_import_jobs.js`, `src/modules/imports`, `src/views/pages/system/imports/medicines.ejs` | Tambah worker paralel atau simulasinya dan template import resmi |
| `c. Background job untuk generate laporan penjualan besar tanpa mengganggu respons UI` | Background job generate laporan besar | `Partial` | Job record laporan sudah dipakai saat generate PDF dari UI backoffice, tetapi pemrosesannya masih synchronous request-response | `src/modules/reports/reportExportService.js`, `src/modules/reports/reportJobService.js`, `src/views/pages/system/reports/index.ejs` | Pindahkan ke worker atau simulasi queue terpisah |
| `d. Implementasi job queue untuk pemrosesan pembayaran dan update stok secara otomatis` | Job queue pembayaran dan update stok otomatis | `Not Started` | Belum ada | - | Buat job record + processor simulation |
| `e. Sinkronisasi stok real-time antara penjualan di counter (offline) dan penjualan online` | Sinkronisasi stok counter dan online | `Not Started` | Belum ada | schema stok ada | Buat stock sync strategy |

## 2. Kebutuhan Non-Fungsional dan Dokumen

| Kutipan Asli PDF | Requirement PDF | Status | Kondisi Saat Ini | File Bukti | Gap Berikutnya |
|---|---|---|---|---|---|
| `a. Anda wajib menyusun dokumen arsitektur perangkat keras...` | Dokumen arsitektur hardware/topology diagram | `Done` | Sudah ada topologi logis dan arsitektur target sederhana | `docs/ARCHITECTURE_TOPOLOGY.md` | Nanti bisa ditambah diagram visual bila diperlukan |
| `b. Spesifikasi minimum server: prosesor, RAM, storage, bandwidth...` | Spesifikasi minimum server | `Done` | Sudah ada rekomendasi minimum dan rekomendasi nyaman | `docs/SERVER_SPECIFICATION.md` | Nanti sinkronkan dengan skenario deployment final |
| `a. Anda wajib menganalisis dan mendokumentasikan pemilihan tools, library, komponen, dan framework...` | Analisis tools/framework | `Done` | Sudah ada analisis pemilihan stack dan trade-off | `docs/TOOLS_FRAMEWORK_ANALYSIS.md` | Nanti tambah versi tool saat final |
| `b. Analisis skalabilitas: bagaimana sistem dapat menangani peningkatan jumlah pengguna...` | Analisis skalabilitas | `Done` | Sudah ada analisis bottleneck, scaling path, dan mitigasi | `docs/SCALABILITY_ANALYSIS.md` | Nanti kaitkan dengan implementasi report/import/job aktual |
| `c. Dokumentasi library/komponen pihak ketiga yang digunakan (versi, lisensi, fungsi)` | Dokumentasi library pihak ketiga (versi/lisensi/fungsi) | `Done` | Sudah ada daftar dependency utama, versi, lisensi, dan fungsi | `docs/THIRD_PARTY_COMPONENTS.md` | Nanti sinkronkan jika package berubah |
| `a. Anda harus mensimulasikan skenario migrasi dari sistem manual... termasuk: strategi migrasi data obat, mapping field, validasi data pasca-migrasi, dan rollback plan` | Strategi migrasi dari sistem manual/spreadsheet | `Done` | Sudah ada strategi migrasi bertahap dari spreadsheet/manual | `docs/MIGRATION_STRATEGY.md` | Nanti tambahkan evidence simulasi import |
| `a. Anda harus mensimulasikan skenario migrasi dari sistem manual... termasuk: strategi migrasi data obat, mapping field, validasi data pasca-migrasi, dan rollback plan` | Data mapping migrasi | `Done` | Sudah ada mapping field utama ke schema inti | `docs/DATA_MAPPING.md` | Nanti sinkronkan dengan schema final |
| `a. Anda harus mensimulasikan skenario migrasi dari sistem manual... termasuk: strategi migrasi data obat, mapping field, validasi data pasca-migrasi, dan rollback plan` | Validasi pasca-migrasi | `Done` | Sudah ada checklist validasi hasil import | `docs/POST_MIGRATION_VALIDATION.md` | Nanti tambahkan hasil validasi aktual |
| `a. Anda harus mensimulasikan skenario migrasi dari sistem manual... termasuk: strategi migrasi data obat, mapping field, validasi data pasca-migrasi, dan rollback plan` | Rollback plan | `Done` | Sudah ada langkah rollback dan trigger utama | `docs/ROLLBACK_PLAN.md` | Nanti kaitkan dengan cutover plan |
| `b. Menyusun dokumen cutover plan yang mencakup: timeline, checklist pra-cutover, langkah cutover, dan verifikasi pasca-cutover` | Cutover plan | `Done` | Sudah ada timeline, checklist, langkah cutover, dan verifikasi | `docs/CUTOVER_PLAN.md` | Nanti tambahkan evidence simulasi cutover |
| `c. Mensimulasikan skenario pembaharuan (update) perangkat lunak... termasuk penggunaan version control (Git)` | Simulasi software update + Git | `Done` | Sudah ada alur update berbasis branch, test, dan merge | `docs/SOFTWARE_UPDATE_SIMULATION.md` | Nanti tambahkan contoh update aktual |
| `d. Menyusun analisis dampak perubahan (impact analysis)...` | Impact analysis | `Done` | Sudah ada analisis dampak lintas modul | `docs/IMPACT_ANALYSIS.md` | Nanti kaitkan dengan perubahan fitur aktual |
| `a. Menyusun panduan pengguna (user guide)...` | User guide | `Not Started` | Belum ada | - | Buat panduan pengguna |
| `b. Menyusun FAQ (Frequently Asked Questions) minimal 10 pertanyaan...` | FAQ minimal 10 | `Not Started` | Belum ada | - | Buat FAQ |
| `c. Menyediakan dokumentasi API (jika ada endpoint API) untuk integrasi dengan sistem lain` | API documentation jika ada endpoint API | `Not Started` | Belum ada | - | Buat jika nanti ada API |
| `d. Menyusun troubleshooting guide untuk masalah umum...` | Troubleshooting guide | `Not Started` | Belum ada | - | Buat troubleshooting doc |
| `g. Dokumen analisis risiko keamanan informasi beserta langkah mitigasi` | Analisis risiko keamanan informasi | `Not Started` | Belum ada | - | Buat dokumen risk analysis dan mitigasi |
| `UAT/result tidak tertulis eksplisit sebagai judul dokumen di PDF, tetapi dibutuhkan sebagai bukti asesmen/demo` | UAT scenario dan result | `Not Started` | Belum ada | - | Buat UAT doc |
| `Debugging report tidak tertulis eksplisit sebagai judul dokumen di PDF, tetapi dibutuhkan sebagai bukti asesmen/demo` | Debugging report | `Not Started` | Belum ada | - | Buat debugging report |
| `Requirement turunan untuk pelacakan kepatuhan awal internal repo` | Requirement checklist / compliance awal | `Done` | Sudah ada dokumen mapping awal | `docs/REQUIREMENT_CHECKLIST.md` | Nanti finalisasi dengan bukti implementasi |
| `Requirement turunan untuk perencanaan implementasi repo` | Module backlog | `Done` | Sudah ada backlog modul | `docs/MODULE_BACKLOG.md` | Update progres per sprint/modul |
| `Requirement turunan untuk perancangan data inti` | ERD / skema awal | `Done` | Sudah ada ERD dan boundary fase inti | `docs/ERD_INITIAL.md`, `docs/CORE_SCHEMA_PLAN.md` | Nanti upgrade ke ERD final |
| `Requirement turunan untuk pencatatan keputusan arsitektur dan scope` | Planning decisions | `Done` | Keputusan arsitektur awal sudah didokumentasikan | `docs/PLANNING_DECISIONS.md` | Terus update tiap keputusan penting |
| `Requirement turunan untuk implementasi urutan migrasi database repo` | Migration plan database | `Done` | Urutan migrasi inti sudah didokumentasikan | `docs/MIGRATION_PLAN.md` | Tambah evidence hasil migrasi saat final |
| `Requirement turunan untuk dataset demo awal` | Seed plan | `Done` | Strategi seed demo awal sudah ada | `docs/SEED_PLAN.md` | Tambah demo dataset bisnis |
| `Requirement turunan untuk ringkasan proyek` | Project charter | `Done` | Sudah ada dokumen charter proyek awal | `docs/PROJECT_CHARTER.md` | Nanti sinkronkan dengan progres final |
| `Requirement turunan untuk pemecahan scope kerja` | WBS / scope document | `Done` | Sudah ada WBS dan pembagian paket kerja utama | `docs/WBS_SCOPE.md` | Nanti update status tiap paket kerja |

## 3. Checklist Demo Minimum

Daftar ini berguna untuk asesmen 30-45 menit.

| Demo Item | Status | Catatan |
|---|---|---|
| Guest membuka homepage publik | `Done` | Sudah ada |
| Login multi-role | `Partial` | Login ada, role behavior belum lengkap |
| Registrasi pelanggan | `Partial` | Registrasi akun pelanggan dasar sudah aktif, verifikasi email belum ada |
| CRUD kategori | `Partial` | Baru list + create |
| CRUD supplier | `Partial` | Baru list + create |
| CRUD obat | `Partial` | Baru list + create |
| Katalog + detail obat | `Partial` | Katalog sudah bisa pakai data obat, detail publik sudah ada |
| Cart dan checkout | `Partial` | Cart session, checkout dasar, dan konfirmasi order sudah ada; payment flow lanjutan belum ada |
| Verifikasi resep | `Partial` | Review resep apoteker sudah ada, upload file resep sudah ada, histori lengkap belum ada |
| FIFO stok | `Partial` | FIFO sudah memotong batch saat order diselesaikan, tetapi belum ada reversal/reservasi/alert |
| Dashboard penjualan/stok | `Partial` | Dashboard internal sudah menampilkan metric, chart tren order/revenue, low stock, notifikasi, dan error log; filter periode belum ada |
| Alert stok rendah / expiry | `Not Started` | Belum ada |
| PDF report | `Partial` | Report PDF summary apotek dan riwayat job sudah ada, jenis report masih terbatas |
| Import CSV/XLSX | `Partial` | Route backoffice import obat dan job history sudah ada, tetapi belum ada worker paralel dan template file resmi |
| Audit log | `Not Started` | Table ada, flow belum ada |
| Error log | `Not Started` | Table ada, flow belum ada |
| Dokumen migrasi, cutover, rollback, UAT | `Partial` | Dokumen migrasi, cutover, dan rollback sudah ada; UAT belum dibuat |

## 4. Prioritas Implementasi Berikutnya

Urutan realistis untuk mengejar requirement inti:

1. `medicines` + katalog obat nyata + detail produk
2. `customers/registration` + validasi data + password policy
3. `cart + checkout + orders`
4. `prescriptions` + verifikasi resep
5. `expiry tracking + stock alerts + stock reversal/reservasi`
6. `dashboard + reports + notifications + audit/error logs`
7. `import/export + job simulation + sync stok`
8. dokumen asesmen yang masih kosong
