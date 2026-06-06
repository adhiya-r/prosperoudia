# Debugging Report

Dokumen ini mencatat temuan audit codebase per `2026-06-06`. Ini bukan klaim bahwa seluruh defect sudah diperbaiki.

| ID | Temuan | Dampak | Status / Tindakan |
|---|---|---|---|
| DBG-01 | Dokumentasi menyebut hashing bcrypt/Argon2 terpenuhi, tetapi code memakai `scrypt` | klaim kepatuhan tidak akurat | Dokumentasi dikoreksi; perubahan algoritma masih backlog |
| DBG-02 | Dokumen WBS/checklist tertinggal dari CRUD dan dashboard terbaru | asesor mendapat status salah | Dokumen diperbarui |
| DBG-03 | Artefak donor warehouse bercampur dengan domain apotek | route/istilah dapat membingungkan demo | Dinyatakan sebagai donor; rencana internal dipindah ke `docs/dev/` |
| DBG-04 | Job import/report dicatat, tetapi pemrosesan synchronous | UI dapat lambat pada file besar | Dilabeli simulasi; worker masih backlog |
| DBG-05 | SSE utama hanya menjamin connected/heartbeat | klaim real-time berlebihan | Dokumentasi dikoreksi; wiring event bisnis masih backlog |
| DBG-06 | `git diff --check` menemukan whitespace pada file kerja yang bukan perubahan dokumentasi | quality gate belum bersih | Tidak diubah agar tidak menimpa pekerjaan user; perlu dibersihkan sebelum commit |
| DBG-07 | Test registrasi mencetak pelanggaran FK `audit_logs_user_id_foreign`, tetapi test tetap lulus | kegagalan audit dapat tersembunyi | Perlu perbaiki fixture/mocking dan tambahkan assertion audit log tersimpan |
| DBG-08 | Upload bukti pembayaran pelanggan sempat gagal CSRF karena form multipart dibaca setelah middleware CSRF | pelanggan tidak bisa mengirim bukti bayar dari `/orders` | Token dikirim via query pada form upload bukti pembayaran |
| DBG-09 | Notifikasi hover dan halaman `/notifications` dashboard sempat membaca sumber berbeda | Kasir/Apoteker/Admin melihat badge tetapi daftar dashboard kosong | Dashboard notification disambungkan ke service notifikasi aplikasi |
| DBG-10 | Bukti pembayaran dan resep sulit dicek dari dashboard approval | kasir/admin/apoteker harus mencari file manual | Detail order/resep menampilkan tombol dan preview inline untuk file valid |
| DBG-11 | Link `Buka File Penuh` resep dapat mengarah ke `/prescriptions/{teks}` bila `image_path` berisi nilai invalid | route review resep menerima string sebagai bigint dan memunculkan error SQL | Ditambahkan normalisasi file reference, guard `prescriptionId`, UI fallback, dan regression test |
| DBG-12 | `src/dashboard` donor menyimpan `.env`, nested `.git`, `node_modules`, package standalone, docs, database migration/seed, tests, dan generated upload/report | repo GitHub dapat membengkak dan clone baru tetap bergantung pada artefak ignored | Artefak donor dibersihkan; file runtime donor yang masih dipakai dipindah menjadi file yang dapat di-track root repo |

## Metode Debugging

- inspeksi route, controller, service, repository, migration, seed, dan test
- perbandingan requirement PDF dengan implementasi
- `git diff --check` untuk mendeteksi whitespace
- `npm test` sebagai regression test otomatis

## Hasil Test Otomatis

Perintah `npm test` pada `2026-06-06` menghasilkan `48` test lulus, `0` gagal, dengan durasi sekitar `32 detik`.

Sebelum cleanup donor, test runner lokal pernah menjalankan tambahan test dari `src/dashboard/tests`. Folder tersebut berada di area donor yang ignored dan tidak menjadi bagian repo utama yang akan dipush. Setelah artefak donor dibersihkan, angka test final mengikuti test yang benar-benar berada pada project root.

Suite lulus, tetapi DBG-07 tetap harus ditangani karena error tercetak dan ditelan oleh flow aplikasi/test.
