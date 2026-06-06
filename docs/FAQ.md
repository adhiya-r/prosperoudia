# FAQ Prosperoudia

## 1. Siapa yang dapat menggunakan sistem?

Admin, Apoteker, Kasir, dan Pasien/Pelanggan dengan hak akses backend yang berbeda.

## 2. Apakah pelanggan wajib login untuk melihat katalog?

Tidak. Login baru wajib saat checkout dan membuka data akun.

## 3. Bagaimana membeli obat yang memerlukan resep?

Tambahkan obat ke cart, lalu unggah file resep valid dan isi data dokter saat checkout.

## 4. Siapa yang memverifikasi resep?

Admin atau Apoteker melalui `/prescriptions/review`.

## 5. Kapan stok obat berkurang?

Stok dipotong dengan FIFO ketika order diubah menjadi `completed`.

## 6. Apa yang terjadi jika stok tidak cukup?

Penyelesaian order ditolak agar stok batch tidak menjadi negatif.

## 7. Metode pembayaran apa yang tersedia?

Pilihan pembayaran tersedia pada checkout, tetapi pemrosesan payment gateway masih simulasi.

## 8. Apakah pelanggan harus mengunggah bukti pembayaran saat checkout?

Tidak wajib. Pelanggan dapat mengunggah bukti pembayaran saat checkout atau setelah checkout melalui `/orders`.

## 9. Apakah status pesanan dapat dipantau pelanggan?

Ya, melalui `/orders` dan notifikasi pada icon lonceng.

## 10. Apakah data obat dapat diimpor dari spreadsheet?

Ya, Admin dapat mengimpor CSV/XLSX melalui `/system/imports/medicines`.

## 11. Apakah laporan dapat diekspor?

Ya, Admin dapat menghasilkan PDF summary melalui `/system/reports`.

## 12. Apakah sistem memberi alert stok rendah dan expiry?

Low-stock dan expiry muncul di dashboard/report, tetapi notifikasi expiry otomatis 30/60/90 hari belum lengkap.

## 13. Apakah notifikasi benar-benar real-time?

Notifikasi in-app tersedia untuk order, resep, bukti pembayaran, reminder, dan error tertentu. Endpoint SSE tersedia untuk dashboard, tetapi tidak semua event apotek sudah memicu push otomatis.

## 14. Bagaimana keamanan password?

Password di-hash menggunakan `scrypt` dan harus memenuhi password policy. Penggunaan Argon2/bcrypt masih menjadi gap terhadap teks PDF.

## 15. Bagaimana reset data demo?

Jalankan migration dan seed sesuai kebutuhan. Tindakan ini mengubah data database dan harus dilakukan hanya pada lingkungan demo.

## 16. Apakah aplikasi siap dipakai di produksi?

Belum. Aplikasi adalah prototype asesmen dan masih membutuhkan hardening keamanan, worker queue, backup, observability, dan UAT produksi.
