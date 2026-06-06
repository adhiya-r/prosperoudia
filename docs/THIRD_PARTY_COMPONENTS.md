# Third Party Components

Dokumen ini mencatat komponen pihak ketiga yang dipakai pada proyek beserta versi, lisensi, dan fungsinya.

## Tujuan

- memenuhi requirement dokumentasi library/komponen pihak ketiga
- memudahkan audit teknis
- membantu penjelasan dependency saat asesmen

## Daftar Komponen Saat Ini

| Komponen | Versi | Lisensi Umum | Fungsi |
|---|---|---|---|
| `express` | `5.1.0` | MIT | framework HTTP server dan routing |
| `ejs` | `3.1.10` | Apache-2.0 / kompatibel OSS | template engine server-rendered |
| `dotenv` | `17.2.1` | BSD-2-Clause | memuat environment variable dari file `.env` |
| `express-session` | `1.18.2` | MIT | manajemen session login |
| `connect-pg-simple` | `10.0.0` | MIT | menyimpan session ke PostgreSQL |
| `helmet` | `8.1.0` | MIT | HTTP security headers dasar |
| `knex` | `3.1.0` | MIT | query builder dan migration tool |
| `pg` | `8.16.3` | MIT | driver PostgreSQL untuk Node.js |
| `supertest` | `7.1.1` | MIT | blackbox HTTP testing |

## Catatan

- versi di atas diambil dari `package.json`
- lisensi umum ditulis untuk kebutuhan dokumentasi awal prototype
- sebelum final submission, lisensi dapat diverifikasi lagi terhadap package metadata jika diperlukan

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
