# WIP (Belum selesai)
# Prosperoudia

Prototype Sistem E-Commerce Penjualan Obat Berbasis Web untuk studi kasus asesmen BNSP Web Developer di Klinik Makmur Jaya.

Sistem menggunakan arsitektur modular yang mudah dijelaskan saat asesmen:

```txt
route -> middleware -> controller -> service -> repository -> PostgreSQL
```

## Fitur yang Sudah Dapat Didemokan

- login multi-role: Admin, Apoteker, Kasir, dan Pelanggan
- registrasi pelanggan, profil, avatar, dan perubahan password
- katalog obat, pencarian/autocomplete, filter kategori, dan detail obat
- CRUD obat, kategori, supplier, serta manajemen role user
- upload gambar obat dan upload resep
- cart, checkout, bukti pembayaran opsional, konfirmasi, histori pesanan, dan review resep
- manajemen status order dan pemotongan stok FIFO saat order selesai
- dashboard backoffice, SSE endpoint, monitoring, notifikasi per-user, audit log, dan error log dasar
- import obat CSV/XLSX dan export laporan PDF

Status lengkap dan gap implementasi ada di [Requirement Checklist](./docs/REQUIREMENT_CHECKLIST.md).

## Batasan Prototype

- verifikasi email, pembayaran, job queue, dan sinkronisasi stok counter-online belum production-grade
- import dan export memiliki job record, tetapi masih diproses synchronous
- notifikasi in-app tersedia melalui hover/header dan dashboard; alert expiry 30/60/90 hari belum otomatis
- hashing password saat ini menggunakan `scrypt`, bukan bcrypt/Argon2
- subfolder `src/dashboard/` adalah donor backoffice lama yang masih dipakai sebagian; domain warehouse di dalamnya bukan scope utama apotek

## Stack

- Node.js 18+
- Express.js 5
- EJS
- PostgreSQL
- Knex.js
- Vanilla JavaScript dan CSS

## Menjalankan Aplikasi

Prasyarat: Node.js 18+ dan PostgreSQL aktif.

```bash
npm install
cp .env.example .env
npm run migrate
npm run seed
npm run dev
```

Aplikasi tersedia di `http://localhost:3000` dan health check di `GET /health`.

Konfigurasi utama ada di `.env`. Untuk prototype lokal, `SESSION_STORE=memory` dapat dipakai. Untuk deployment yang lebih stabil, gunakan `SESSION_STORE=postgres` dan pastikan tabel session tersedia.

## Akun Demo

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `Admin123!` |
| Apoteker | `apoteker` | `Apoteker123!` |
| Kasir | `kasir` | `Kasir123!` |
| Pelanggan | `pelanggan` | `Pelanggan123!` |

## Route Demo Utama

| Alur | Route |
|---|---|
| Storefront | `/` |
| Login / registrasi | `/login`, `/register` |
| Dashboard internal | `/dashboard` |
| Master obat/kategori/supplier | `/medicines`, `/categories`, `/suppliers` |
| Cart dan checkout | `/cart`, `/checkout` |
| Pesanan pelanggan | `/orders` |
| Manajemen order internal | `/orders/manage` |
| Review resep | `/prescriptions/review` |
| Notifikasi | `/notifications` |
| Import obat | `/system/imports/medicines` |
| Laporan PDF | `/system/reports` |
| Monitoring | `/system/monitoring` |

## Pengujian

```bash
npm test
```

Test mencakup auth, cart, checkout, upload proof/resep, master data, obat, manajemen order, review resep, dan FIFO inventory.

## Dokumentasi

Mulai dari [Indeks Dokumentasi](./docs/README.md). Dokumen yang langsung mendukung FR.IA.04A berada di `docs/`, sedangkan rencana dan catatan pengembangan internal berada di `docs/dev/`.
