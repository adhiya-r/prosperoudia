# Prosperoudia

Prototype aplikasi web e-commerce apotek untuk studi kasus BNSP Web Developer:

- Klinik Makmur Jaya
- Penjualan obat berbasis web
- Multi-role: Admin, Apoteker, Kasir, Pasien/Pelanggan

## Fokus Proyek

Proyek ini dioptimalkan untuk kebutuhan asesmen:

- arsitektur mudah dijelaskan
- fitur inti bisa didemokan
- dokumen pendukung lengkap
- implementasi modular dan tidak berlebihan

## Stack yang Dipilih

- Node.js
- Express.js
- EJS
- PostgreSQL
- Knex.js
- Vanilla JavaScript
- CSS

## Target Arsitektur

Alur utama:

```txt
route -> middleware -> controller -> service -> repository -> database
                         |
                         -> viewModel/presenter
```

Struktur utama:

```txt
src/
  modules/
  shared/
  config/
  routes/
```

## Dokumen Awal

- [Requirement Checklist](./docs/REQUIREMENT_CHECKLIST.md)
- [Module Backlog](./docs/MODULE_BACKLOG.md)
- [Initial ERD](./docs/ERD_INITIAL.md)
- [Planning Decisions](./docs/PLANNING_DECISIONS.md)
- [Dashboard Integration Plan](./docs/DASHBOARD_INTEGRATION_PLAN.md)

## Status Saat Ini

Fondasi awal proyek sudah disiapkan:

- checklist requirement BNSP
- backlog modul
- ERD awal
- skeleton Express modular

Implementasi berikutnya:

1. finalisasi skema database
2. setup auth dan session
3. migration dan seed demo
4. master data obat, kategori, supplier, pelanggan
