# Troubleshooting Guide

## Aplikasi Tidak Bisa Berjalan

- Pastikan Node.js 18+ dan PostgreSQL aktif.
- Pastikan `.env` tersedia dan `DATABASE_URL` benar.
- Jalankan `npm install`, `npm run migrate`, lalu `npm run seed`.
- Periksa log terminal untuk error koneksi atau migration.

## Login Gagal

- Gunakan akun demo pada README atau pastikan user aktif.
- Periksa password dan role di tabel `users`/`user_roles`.
- Jika session hilang terus, periksa `SESSION_SECRET`, cookie secure, dan `SESSION_STORE`.

## Muncul Pesan CSRF Tidak Valid

- Muat ulang halaman agar token baru terbentuk.
- Pastikan cookie/session masih aktif.
- Pastikan form menyertakan partial CSRF dan endpoint JSON mengirim token sesuai middleware.

## Akses Ditolak

- Pastikan role sesuai route. Master data hanya Admin; review resep hanya Admin/Apoteker; order internal juga Kasir.
- Logout/login kembali setelah perubahan role agar session diperbarui.

## Katalog atau Dashboard Kosong

- Jalankan migration dan seed.
- Periksa apakah obat aktif dan batch memiliki `quantity_remaining`.
- Periksa koneksi database serta error log.

## Checkout Gagal

- Pastikan cart tidak kosong dan seluruh field wajib terisi.
- Untuk obat resep, unggah file resep dan isi data dokter.
- Referensi file resep harus berupa file upload dari aplikasi atau URL `http/https`; teks bebas akan ditolak.
- Pastikan format upload dan ukuran file sesuai batas Multer.

## Upload Bukti Pembayaran Gagal

- Muat ulang `/orders` agar token CSRF baru terbentuk.
- Pastikan file bertipe gambar atau PDF sesuai batas upload.
- Pastikan order belum `completed` atau `cancelled`.
- Setelah upload berhasil, Kasir dan Admin menerima notifikasi dan bukti tampil pada `/orders/manage`.

## Order Tidak Dapat Diselesaikan

- Status pembayaran harus `paid`.
- Order resep harus sudah direview.
- Pastikan total stok batch cukup; FIFO menolak stok negatif.

## Import CSV/XLSX Gagal

- Gunakan ekstensi `.csv` atau `.xlsx`.
- Cocokkan header dan nilai wajib dengan data mapping.
- Periksa riwayat `import_jobs` dan pesan kegagalan per baris.
- Import berjalan synchronous; hindari file sangat besar pada prototype.

## PDF Gagal Dibuat

- Pastikan proses dapat menulis ke `public/reports/`.
- Periksa data report dan `report_jobs`.
- Periksa error log aplikasi serta ruang disk.

## Gambar Obat/Resep/Avatar Tidak Tampil

- Periksa file pada folder upload dan path yang tersimpan di database.
- Pastikan MIME/extension diizinkan.
- Jangan menghapus file upload secara manual tanpa memperbarui database.
- Jika tombol file tidak muncul di dashboard, path database kemungkinan tidak valid. Unggah ulang file melalui flow aplikasi.

## Notifikasi Tidak Muncul di Dashboard

- Pastikan user login dengan role yang benar.
- Buka `/notifications` untuk daftar lengkap, atau hover icon lonceng pada header/storefront.
- Gunakan tombol `Tandai semua dibaca` jika badge masih muncul setelah semua item dicek.
- Klik item notifikasi untuk membuka target dan menandainya sebagai sudah dibaca.

## Dashboard SSE Tidak Memperbarui Data

- Periksa login internal dan koneksi `GET /dashboard/events`.
- Endpoint saat ini mengirim heartbeat, tetapi tidak semua aksi bisnis sudah menerbitkan event.
- Muat ulang dashboard sebagai fallback.

## Test Gagal

- Jalankan `npm test`.
- Pastikan konfigurasi test tidak memakai database produksi.
- Baca test yang gagal dan periksa apakah perubahan route/view mengubah response yang diharapkan.
