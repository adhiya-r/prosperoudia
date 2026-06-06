# Panduan Pengguna

Panduan ini menggunakan data demo dari `database/seeds/02_demo_users.js`.

## Pasien/Pelanggan

1. Buka `/` untuk melihat katalog.
2. Gunakan pencarian atau kategori untuk menemukan obat, lalu buka detail produk.
3. Tambahkan obat ke cart dan ubah jumlah di `/cart`.
4. Login atau registrasi sebelum checkout.
5. Pada `/checkout`, pilih pemenuhan dan metode pembayaran. Bukti pembayaran dapat diunggah saat checkout, tetapi tidak wajib.
6. Jika ada obat resep, unggah file resep yang valid dan isi data dokter.
7. Setelah submit, lihat konfirmasi dan pantau status pada `/orders`.
8. Jika bukti pembayaran belum diunggah saat checkout, gunakan tombol upload pada `/orders`.
9. Pantau hasil review resep pada `/prescriptions`.
10. Buka icon lonceng di header untuk melihat notifikasi, membuka item, atau menandai semua sudah dibaca.
11. Ubah data akun, password, atau avatar melalui menu profil.

Catatan: pembayaran dan verifikasi email masih berupa alur prototype, bukan integrasi eksternal nyata.

## Admin

1. Login sebagai `admin`.
2. Gunakan `/dashboard` untuk melihat ringkasan order, pendapatan, low-stock, notifikasi, dan error.
3. Kelola kategori di `/categories`, supplier di `/suppliers`, dan obat di `/medicines`.
4. Kelola role pengguna di `/system/users`.
5. Pantau dan ubah status order di `/orders/manage`; bukti pembayaran dapat dilihat dari tabel dan detail order.
6. Review resep di `/prescriptions/review`; file resep dan bukti pembayaran terkait tampil sebagai preview inline.
7. Import obat CSV/XLSX melalui `/system/imports/medicines`.
8. Generate PDF melalui `/system/reports`.
9. Pantau resource melalui `/system/monitoring`.
10. Buka `/notifications` untuk melihat notifikasi dashboard, membuka item, atau menandai semua sudah dibaca.
11. Buka **Profil Saya** dari footer sidebar untuk mengubah identitas, nomor HP, password, dan foto profil.

## Apoteker

1. Login sebagai `apoteker`.
2. Buka `/prescriptions/review`.
3. Periksa preview file resep dan data dokter.
4. Setujui atau tolak dengan alasan yang jelas.
5. Gunakan reminder bila pelanggan perlu diberi tahu atau kasir perlu mengecek pembayaran.
6. Pantau order internal di `/orders/manage`.
7. Gunakan **Profil Saya** untuk mengelola akun pribadi tanpa bantuan Admin.

## Kasir

1. Login sebagai `kasir`.
2. Buka `/orders/manage`.
3. Cek kolom dan preview bukti pembayaran sebelum mengubah pembayaran menjadi `paid`.
4. Gunakan reminder bila pelanggan belum menyertakan bukti pembayaran.
5. Perbarui status pembayaran dan order sesuai transaksi.
6. Tandai order selesai hanya jika pembayaran `paid`; stok FIFO akan dipotong saat order selesai.
7. Gunakan **Profil Saya** untuk mengelola akun pribadi tanpa bantuan Admin.

## Alur Demo 30-45 Menit

1. Tunjukkan storefront, search, detail, cart, dan checkout sebagai Pelanggan.
2. Login Apoteker untuk review resep.
3. Tunjukkan notifikasi pelanggan/kasir dan bukti pembayaran.
4. Login Kasir/Admin untuk menyelesaikan order dan menunjukkan FIFO.
5. Tunjukkan dashboard, import, report PDF, monitoring, audit/error log.
6. Tutup dengan requirement checklist dan batasan simulasi.
