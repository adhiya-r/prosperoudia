# Architecture and Topology

Dokumen ini menjelaskan arsitektur perangkat keras dan topologi logis yang direkomendasikan untuk prototype e-commerce apotek Klinik Makmur Jaya.

## Tujuan

Topologi ini dirancang untuk:

- mudah dijelaskan saat asesmen
- cukup realistis untuk volume 150-200 pasien per hari
- bisa ditingkatkan secara bertahap bila jumlah transaksi naik

## Arsitektur yang Direkomendasikan

Untuk fase prototype dan demo asesmen, arsitektur yang disarankan adalah:

- `1 web/application server`
- `1 database server`
- `1 jaringan internal/admin access`
- `1 akses publik untuk pelanggan`

Arsitektur ini sengaja sederhana agar:

- alur request mudah dipahami
- deployment lebih mudah
- troubleshooting lebih cepat
- biaya infrastruktur tetap masuk akal

## Diagram Topologi Logis

```txt
Pelanggan / Browser Publik
          |
          v
   Internet / HTTPS
          |
          v
 Reverse Proxy / Web Server
 (Nginx atau sejenisnya)
          |
          v
 Node.js + Express App Server
          |
          +----------------------+
          |                      |
          v                      v
 PostgreSQL Database       File Storage Lokal / Upload
 (master data, transaksi,  (gambar obat, file resep,
 stok, order, log)         export sementara)

Admin / Apoteker / Kasir
akses dari jaringan internal
atau browser dengan login role-based
```

## Komponen Utama

### 1. Client Layer

Terdiri dari:

- browser pelanggan
- browser admin
- browser apoteker
- browser kasir

Fungsi:

- menampilkan storefront
- menerima input transaksi
- mengakses dashboard internal berdasarkan role

### 2. Reverse Proxy / Web Server

Fungsi:

- menerima request HTTP/HTTPS
- meneruskan request ke aplikasi Node.js
- melayani file statis
- menjadi titik terminasi SSL bila dipakai

Contoh:

- `Nginx`

### 3. Application Server

Fungsi:

- menjalankan Express.js
- mengelola auth, session, business logic, render EJS
- memproses order, resep, stok, notifikasi, dan laporan

### 4. Database Server

Fungsi:

- menyimpan data user, role, obat, supplier, pelanggan, batch stok, order, resep, audit log, dan error log

DBMS:

- `PostgreSQL`

### 5. File Storage

Fungsi:

- menyimpan gambar obat
- menyimpan file resep
- menyimpan file export/report sementara

Catatan:

- untuk prototype, file storage lokal masih dapat diterima
- untuk peningkatan produksi, storage dapat dipindah ke object storage

## Topologi Fisik Minimum

### Opsi Prototype Sederhana

```txt
1 VM / 1 Server Aplikasi
  - Node.js app
  - Nginx

1 VM / 1 Server Database
  - PostgreSQL

Client
  - browser internal dan eksternal
```

Alasan:

- lebih aman daripada menaruh DB dan app dalam satu host bila dipresentasikan sebagai arsitektur target
- masih sederhana untuk dijelaskan

### Opsi Demo Lokal

Untuk demo di laptop:

- app server dan database bisa berjalan di mesin yang sama

Catatan:

- ini diterima untuk kebutuhan pengembangan dan demo
- pada dokumen arsitektur tetap lebih baik menunjukkan pemisahan logis app dan database

## Alur Data Singkat

### 1. Login

- user membuka halaman
- request masuk ke web/app server
- app memeriksa data user di PostgreSQL
- session dibuat bila kredensial valid

### 2. Pembelian Online

- pelanggan mencari obat
- pelanggan menambahkan item ke cart
- pelanggan checkout
- jika obat memerlukan resep, order menunggu verifikasi apoteker
- app mengupdate order dan stok ke database

### 3. Monitoring dan Logging

- aktivitas penting dicatat ke audit log
- error aplikasi dicatat ke error log
- status order dan stok dapat dipakai untuk notifikasi

## Pertimbangan Keamanan Dasar

- akses publik hanya ke web/app server
- database tidak dibuka langsung ke internet
- role-based access untuk halaman internal
- password di-hash
- upload file dibatasi dan divalidasi
- backup database harus terjadwal

## Pertimbangan Skalabilitas Dasar

Jika beban meningkat, urutan scale-up yang paling masuk akal:

1. tambah resource app server
2. optimalkan query database dan index
3. pindahkan session store ke PostgreSQL/Redis
4. pindahkan background job ke worker terpisah
5. tambahkan load balancer bila aplikasi sudah multi-instance

## Kesimpulan

Topologi `single app server + single database server` adalah pilihan paling tepat untuk fase asesmen karena cukup realistis, mudah dijelaskan, dan masih bisa berkembang tanpa mengganti arsitektur secara total.
