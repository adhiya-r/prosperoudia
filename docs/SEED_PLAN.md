# Seed Plan

Dokumen ini menjelaskan data awal yang akan dimasukkan setelah migration inti berhasil dijalankan.

## Tujuan

Seed fase pertama harus:

- membuat role dasar untuk asesmen
- menyediakan akun demo internal yang siap dipakai saat implementasi auth selesai
- menyediakan baseline yang konsisten untuk demo dan pengujian manual

## Seed yang Disiapkan

Urutan seed awal:

1. `roles`
2. `demo users`

## Roles

Role yang akan dimasukkan:

- `Admin`
- `Apoteker`
- `Kasir`
- `Pelanggan`

Role `Pelanggan` tetap disiapkan sejak awal agar pemetaan akses tetap konsisten, walau akun pelanggan bisa jadi baru dipakai setelah modul registrasi selesai.

## Demo Users

Akun internal awal:

- Admin
- Apoteker
- Kasir
- Pelanggan demo

## Password Strategy

Untuk fase awal, password demo di-hash memakai util internal berbasis `scrypt` dari Node.js standard library.

Alasan:

- tidak perlu menunggu dependency hashing eksternal dipasang
- cukup aman untuk bootstrap awal
- mudah diganti nanti jika proyek pindah ke `argon2` atau `bcrypt`

Saat modul auth final dibuat, strategi hashing bisa dipertahankan atau dimigrasikan. Jika diganti, seed dan verifikasi password harus ikut diperbarui.

## Tujuan Praktis

Setelah migration dan seed berjalan, proyek harus punya:

- role default
- akun demo untuk login
- relasi `user_roles` aktif

## Langkah Berikutnya

1. jalankan migration
2. jalankan seed
3. implementasikan auth service dan session
4. uji login dengan akun demo
