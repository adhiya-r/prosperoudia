# Impact Analysis

Dokumen ini menganalisis dampak perubahan pada satu modul terhadap modul lain.

## Tujuan

- membantu memprediksi efek samping perubahan
- mencegah perubahan kecil merusak fitur lama
- menjadi bukti bahwa pengembangan dilakukan terkontrol

## Prinsip

- setiap perubahan modul harus dicek terhadap schema, service, UI, test, dan dokumen
- perubahan requirement bisnis harus dilihat lintas modul

## Matriks Dampak Utama

### 1. Perubahan pada Medicines

Modul terdampak:

- `inventory`
- `orders`
- `reports`
- `home/storefront`

Dampak:

- stok harus tetap terkait ke obat yang benar
- order item snapshot harus tetap valid
- katalog publik ikut berubah
- laporan penjualan per obat ikut berubah

### 2. Perubahan pada Inventory

Modul terdampak:

- `orders`
- `dashboard`
- `notifications`
- `reports`

Dampak:

- checkout dan konfirmasi order bisa berubah
- dashboard stok harus mengikuti
- alert stok rendah dan expiry ikut berubah
- laporan stok ikut berubah

### 3. Perubahan pada Orders

Modul terdampak:

- `payments`
- `prescriptions`
- `inventory`
- `notifications`
- `dashboard`

Dampak:

- status order memengaruhi pembayaran
- order obat resep harus sinkron dengan verifikasi resep
- bukti pembayaran harus tersedia untuk dashboard kasir/admin dan notifikasi terkait
- stok berkurang atau dikunci sesuai rule order
- notifikasi status pelanggan berubah

### 4. Perubahan pada Prescriptions

Modul terdampak:

- `orders`
- `notifications`
- `dashboard`

Dampak:

- order obat resep tidak bisa diproses tanpa logika baru
- referensi file resep harus valid agar preview/dashboard tidak membuka route yang salah
- notifikasi apoteker/pelanggan bisa berubah
- dashboard review resep ikut berubah

### 5. Perubahan pada Notifications

Modul terdampak:

- `orders`
- `prescriptions`
- dashboard internal
- header pelanggan

Dampak:

- item notifikasi harus membawa target yang dapat dibuka
- klik item harus menandai notifikasi sebagai sudah dibaca
- role Admin, Apoteker, Kasir, dan Pelanggan harus melihat daftar sesuai user masing-masing
- perubahan entity target memengaruhi redirect dari `/notifications/:notificationId/open`

### 6. Perubahan pada Auth / Role

Modul terdampak:

- semua halaman internal
- dashboard
- audit log

Dampak:

- permission bisa rusak
- route guard harus diuji ulang
- akses pelanggan dan internal harus dipisah jelas

## Tipe Dampak yang Harus Dicek

Untuk setiap perubahan, cek:

- dampak ke database schema
- dampak ke route/controller/service
- dampak ke UI
- dampak ke seed/demo data
- dampak ke tests
- dampak ke dokumen

## Template Analisis Perubahan

Sebelum implementasi perubahan, isi:

- perubahan apa
- modul utama yang berubah
- modul samping yang terdampak
- schema berubah atau tidak
- test yang wajib diulang
- dokumen yang wajib diperbarui

## Contoh

Contoh perubahan:

- menambahkan `medicine image upload`

Potensi dampak:

- schema obat atau storage path berubah
- halaman katalog dan detail produk berubah
- validasi upload dibutuhkan
- dokumentasi user guide berubah

## Kesimpulan

Impact analysis dipakai agar setiap perubahan fitur tetap terkendali. Untuk asesmen, dokumen ini membantu menjelaskan bahwa update modul tidak dilakukan secara sembarangan.
