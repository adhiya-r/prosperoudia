# Analisis Risiko Keamanan Informasi

Audit per `2026-06-06`. Dokumen ini menilai prototype saat ini, bukan mengklaim kesiapan produksi.

## Kontrol yang Sudah Ada

- autentikasi session dan backend role guard
- hashing password `scrypt` dan validasi kekuatan password
- CSRF token untuk request state-changing
- Knex parameterized query untuk mengurangi risiko SQL injection
- Helmet security headers dasar dan escaping default EJS
- validasi tipe/ukuran upload dengan Multer
- normalisasi referensi file upload agar UI hanya membuka `/uploads/...` atau URL `http/https`
- audit log, error log, dan notifikasi Admin dasar
- transaksi database untuk perubahan lifecycle order dan FIFO

## Matriks Risiko

| Risiko | Dampak | Level | Kontrol Saat Ini | Mitigasi Berikutnya |
|---|---|---|---|---|
| Brute-force login | akun diambil alih | Tinggi | password policy | rate limit, lockout sementara, MFA Admin |
| Session dicuri | akses tidak sah | Tinggi | httpOnly, timeout, secure configurable | wajib HTTPS/secure cookie di production, rotasi session saat login |
| Otorisasi route terlewat | data internal terbuka | Tinggi | `requireAuth` dan `requireRole` | automated authorization test seluruh route |
| SQL injection | data bocor/rusak | Tinggi | Knex parameterized query | review raw query dan least-privilege DB user |
| XSS | session/data user terekspos | Tinggi | escaping EJS, Helmet | aktifkan CSP, sanitasi rich text, larang output `<%-` tanpa review |
| CSRF | aksi tanpa persetujuan user | Tinggi | CSRF middleware | regression test seluruh form dan JSON endpoint |
| Upload berbahaya | malware/storage abuse | Tinggi | MIME/extension/size limit | content sniffing, antivirus scan, storage private |
| File report/upload publik | kebocoran data | Tinggi | path aplikasi terpisah dan guard path file di UI | authorization download, signed URL, retention policy |
| Manipulasi stok/order oleh user sah | stok dan laporan salah | Tinggi | role guard, transaksi, audit dasar | approval perubahan sensitif dan audit seluruh CRUD |
| Import spreadsheet buruk | katalog/stok rusak | Tinggi | validasi file/row dan import job | dry-run, template resmi, batas baris, rollback import |
| Error detail bocor | informasi sistem terekspos | Sedang | halaman error generik | matikan stack trace response dan klasifikasi log |
| Kehilangan audit/error log | bukti insiden hilang | Sedang | tabel log PostgreSQL | backup, retensi, akses read-only untuk auditor |

## Gap terhadap PDF

- PDF menyebut bcrypt/Argon2; implementasi saat ini menggunakan `scrypt`. Secara teknis kuat, tetapi perlu diganti atau dijelaskan kepada asesor.
- CSP masih dinonaktifkan di konfigurasi Helmet agar donor UI tetap berjalan.
- Session store default lokal masih memory; production harus memakai PostgreSQL/Redis.
- Belum ada rate limiting, email verification, antivirus upload, dan authorization download. File upload masih berada pada storage publik prototype.

## Prioritas Mitigasi

1. Terapkan Argon2/bcrypt, rate limiting login, dan rotasi session.
2. Aktifkan CSP setelah inventaris script/style inline selesai.
3. Lindungi file report, resep, avatar, dan gambar sesuai klasifikasi data.
4. Lengkapi audit log seluruh aksi CRUD/import/report.
5. Tetapkan backup, retention, dan prosedur respons insiden.

## Kesimpulan

Kontrol dasar memadai untuk demo asesmen. Sistem belum production-grade karena hardening login, file storage, CSP, logging governance, dan security testing belum lengkap.
