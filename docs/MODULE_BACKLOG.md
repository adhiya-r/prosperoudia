# Module Backlog

Dokumen ini mendefinisikan modul utama, batas tanggung jawab, dan urutan implementasi.

## Prinsip

- controller tipis
- service untuk business logic
- repository untuk query database
- validator untuk validasi input
- presenter/view-model untuk shaping data EJS

## Modul

### auth

Tanggung jawab:

- login
- logout
- registrasi pelanggan
- session
- password policy
- CSRF

### users

Tanggung jawab:

- user internal
- role assignment
- aktivasi/nonaktif user
- profil user

### medicines

Tanggung jawab:

- CRUD obat
- detail obat
- upload gambar
- search, filter, sort
- atribut farmasi dasar

### categories

Tanggung jawab:

- CRUD kategori obat

### suppliers

Tanggung jawab:

- CRUD supplier

### customers

Tanggung jawab:

- data pelanggan
- profil pelanggan
- validasi identitas dasar

### prescriptions

Tanggung jawab:

- upload / pencatatan resep
- verifikasi apoteker
- relasi resep ke pesanan

### inventory

Tanggung jawab:

- batch stok
- FIFO
- stok masuk/keluar
- threshold minimum
- kedaluwarsa
- sinkronisasi stok

### orders

Tanggung jawab:

- cart
- checkout
- order lifecycle
- item pesanan
- status pesanan

### payments

Tanggung jawab:

- metode pembayaran
- konfirmasi pembayaran
- simulasi payment processing

### dashboard

Tanggung jawab:

- ringkasan KPI
- grafik
- ringkasan stok
- ringkasan pesanan

### reports

Tanggung jawab:

- laporan PDF
- laporan SQL
- ekspor data

### notifications

Tanggung jawab:

- notifikasi in-app
- alert stok rendah
- alert kedaluwarsa
- notifikasi status pesanan

### monitoring

Tanggung jawab:

- health check
- runtime metrics
- resource monitoring

### audit-logs

Tanggung jawab:

- catat aksi penting user

### error-logs

Tanggung jawab:

- catat error aplikasi
- severity
- notifikasi ke admin

## Urutan Implementasi

1. auth
2. users
3. categories, suppliers, medicines
4. customers
5. inventory
6. prescriptions
7. orders
8. payments
9. dashboard, reports
10. notifications, audit-logs, error-logs, monitoring
11. import, migration, cutover, UAT evidence
