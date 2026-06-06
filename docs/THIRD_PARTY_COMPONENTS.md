# Third Party Components

Dokumen ini mencatat komponen pihak ketiga yang dipakai pada proyek beserta versi, lisensi, dan fungsinya.

## Tujuan

- memenuhi requirement dokumentasi library/komponen pihak ketiga
- memudahkan audit teknis
- membantu penjelasan dependency saat asesmen

## Daftar Komponen Saat Ini

Versi resolved diambil dari `package-lock.json` per `2026-06-06`. Rentang versi yang diminta aplikasi tetap tercatat di `package.json`.

| Komponen | Versi | Lisensi Umum | Fungsi |
|---|---|---|---|
| `express` | `5.2.1` | MIT | framework HTTP server dan routing |
| `ejs` | `3.1.10` | Apache-2.0 / kompatibel OSS | template engine server-rendered |
| `dotenv` | `17.4.2` | BSD-2-Clause | memuat environment variable dari file `.env` |
| `express-session` | `1.19.0` | MIT | manajemen session login |
| `connect-pg-simple` | `10.0.0` | MIT | menyimpan session ke PostgreSQL |
| `helmet` | `8.2.0` | MIT | HTTP security headers dasar |
| `knex` | `3.2.10` | MIT | query builder, transaction, migration, dan seed |
| `pg` | `8.21.0` | MIT | driver PostgreSQL untuk Node.js |
| `multer` | `2.1.1` | MIT | upload gambar obat, resep, bukti pembayaran, avatar, dan file import |
| `exceljs` | `4.4.0` | MIT | membaca file import XLSX |
| `pdfkit` | `0.18.0` | MIT | membuat laporan PDF |
| `morgan` | `1.11.0` | MIT | HTTP request logging pada donor backoffice |
| `supertest` | `7.2.2` | MIT | blackbox HTTP testing |
| `nodemon` | `3.1.14` | MIT | restart server otomatis saat pengembangan |

## Catatan

- hashing password menggunakan modul bawaan Node.js `node:crypto` dengan algoritma `scrypt`, bukan package bcrypt/Argon2
- dependency transitif tidak ditampilkan satu per satu; audit produksi harus memakai SBOM dan vulnerability scanner

## Komponen Sistem Pendukung Non-NPM

| Komponen | Versi | Fungsi |
|---|---|---|
| `Node.js` | `>=18` | runtime aplikasi |
| `PostgreSQL` | sesuai instalasi lokal/server | database relasional |
| `Nginx` | opsional deployment | reverse proxy / static file serving |

## Kriteria Penambahan Komponen Baru

Komponen baru hanya boleh ditambahkan jika:

- mendukung requirement studi kasus langsung
- mengurangi kompleksitas implementasi
- tetap mudah dijelaskan saat asesmen

## Risiko Penggunaan Komponen Pihak Ketiga

- update mayor dapat memecahkan compatibility
- dependency terlalu banyak membuat audit sulit
- lisensi harus tetap dipantau

## Mitigasi

- batasi dependency hanya yang perlu
- dokumentasikan versi yang dipakai
- review impact sebelum upgrade package
