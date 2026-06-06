# UAT Scenario and Result

Dokumen ini adalah bukti User Acceptance Test untuk prototype. Status `Belum dieksekusi` tidak boleh dianggap lulus sampai user bisnis/simulator menjalankan skenario.

| ID | Role | Skenario | Hasil Diharapkan | Status |
|---|---|---|---|---|
| UAT-01 | Pelanggan | registrasi dan login | akun dibuat dan session aktif | Belum dieksekusi |
| UAT-02 | Pelanggan | cari obat dan buka detail | obat relevan dan stok tampil | Belum dieksekusi |
| UAT-03 | Pelanggan | cart dan checkout non-resep | order terbuat dan konfirmasi tampil | Belum dieksekusi |
| UAT-04 | Pelanggan | checkout obat resep | resep terunggah dan order menunggu review | Belum dieksekusi |
| UAT-05 | Apoteker | approve/reject resep | status resep/order berubah valid | Belum dieksekusi |
| UAT-06 | Pelanggan | upload bukti pembayaran setelah checkout | file tersimpan dan kasir/admin menerima notifikasi | Dijalankan informal; bug CSRF sudah diperbaiki |
| UAT-07 | Apoteker | preview file resep dan buka order terkait | file terlihat/terbuka dan link order valid | Dijalankan informal; bug file ref invalid sudah diperbaiki |
| UAT-08 | Kasir | cek bukti pembayaran dan selesaikan order paid | bukti terlihat, order selesai, stok FIFO berkurang | Belum formal |
| UAT-09 | Admin | CRUD obat/kategori/supplier | perubahan tersimpan dan tampil | Belum dieksekusi |
| UAT-10 | Admin | import CSV/XLSX | job dan hasil per baris tercatat | Belum dieksekusi |
| UAT-11 | Admin | export PDF | PDF visual dan report job tersedia | Belum dieksekusi |
| UAT-12 | Admin | monitoring/dashboard | metric, chart, log, dan status tampil | Belum dieksekusi |
| UAT-13 | Semua role login | notifikasi hover/dashboard | item bisa dibuka, otomatis terbaca, dan tandai semua baca aktif | Dijalankan informal |

## Kriteria Penerimaan

- tidak ada blocker pada alur UAT-01 sampai UAT-08
- stok tidak negatif dan order resep tidak melewati review
- role yang tidak berhak menerima akses ditolak
- file resep dan bukti pembayaran hanya membuka path valid
- kegagalan import/report tercatat tanpa merusak data inti

## Bukti yang Harus Dikumpulkan

- nama penguji dan tanggal
- screenshot sebelum/sesudah
- data input dan ID order/job
- hasil aktual, status lulus/gagal, dan catatan perbaikan
