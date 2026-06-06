# Cutover Plan

Dokumen ini mendefinisikan langkah peralihan dari sistem manual/spreadsheet ke sistem e-commerce apotek.

## Tujuan

- memastikan transisi ke sistem baru berjalan terkontrol
- meminimalkan gangguan operasional
- menyediakan checklist yang bisa dipresentasikan saat asesmen

## Asumsi Cutover

Asumsi untuk prototype:

- cutover dilakukan dalam mode `planned offline cutover`
- input manual dihentikan sementara saat data final dipindahkan
- setelah validasi lolos, sistem baru dijadikan sumber operasional utama

## Ruang Lingkup Cutover

Yang tercakup:

- final data extraction dari spreadsheet/manual
- import data akhir ke sistem baru
- validasi pasca-import
- verifikasi login, master data, stok, dan transaksi dasar

Yang tidak tercakup:

- integrasi pihak ketiga production
- high-availability switching
- zero-downtime cutover enterprise

## Timeline Tingkat Tinggi

### H-3 sampai H-1

- finalisasi data sumber
- cleansing terakhir
- backup sistem dan file sumber
- final check migrasi script/import template

### Hari H

- hentikan input manual sementara
- lakukan import final
- jalankan validasi pasca-migrasi
- verifikasi modul inti
- buka akses sistem baru

### H+1

- monitoring error
- cek feedback user internal
- review issue pasca-cutover

## Checklist Pra-Cutover

- backup database tersedia
- salinan spreadsheet sumber tersedia
- template import final disetujui
- akun demo dan akun operasional siap
- migration database sudah up to date
- seed dasar tidak bentrok dengan data final
- tim admin/apoteker/kasir siap untuk verifikasi
- rollback plan siap dipakai

## Langkah Cutover

### 1. Freeze Input Lama

- hentikan pencatatan manual baru sementara
- catat waktu freeze

### 2. Backup

- backup database sistem baru sebelum import final
- backup file sumber final

### 3. Import Final

Urutan:

1. kategori
2. supplier
3. obat
4. pelanggan
5. stok batch

### 4. Validasi Teknis

- cek jumlah record
- cek relasi inti
- cek field wajib
- cek stok total

### 5. Validasi Bisnis

- admin cek master data
- apoteker cek obat resep dan batch
- kasir cek stok dan harga jual

### 6. Go-Live Internal

- aktifkan penggunaan sistem baru untuk operasi uji
- catat issue yang muncul

## Verifikasi Pasca-Cutover

Minimal harus lolos:

- login berhasil
- kategori tampil
- supplier tampil
- obat tampil
- stok awal tersedia
- satu transaksi uji bisa dibuat
- error kritis tidak muncul

## Kriteria Sukses Cutover

Cutover dianggap sukses bila:

- data inti berhasil dimuat
- validasi teknis dan bisnis diterima
- user internal bisa login dan memakai modul inti
- tidak ada error blocker untuk operasional dasar

## Rencana Jika Gagal

Jika ada kegagalan besar:

- hentikan penggunaan sistem baru
- jalankan rollback sesuai `docs/ROLLBACK_PLAN.md`
- kembali sementara ke pencatatan lama/manual

## Catatan Asesmen

Untuk kebutuhan asesmen, cutover boleh bersifat `simulated cutover` selama:

- timeline jelas
- checklist jelas
- bukti validasi dan rollback tersedia

Namun harus dijelaskan jujur bahwa ini simulasi prototype, bukan cutover produksi penuh.
