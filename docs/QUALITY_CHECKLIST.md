# Quality Checklist

Checklist final sebelum demo atau submission.

| Pemeriksaan | Status |
|---|---|
| Migration dan seed dapat dijalankan dari database bersih | Perlu verifikasi final |
| Empat akun demo dapat login | Perlu verifikasi final |
| Route role guard menolak akses yang tidak sah | Sebagian tercakup test |
| Cart, checkout, bukti pembayaran, review resep, order selesai, FIFO berjalan berurutan | Sebagian tercakup test |
| Import dan report gagal dengan pesan aman | Perlu UAT final |
| Audit/error log tercatat pada aksi penting | Parsial |
| Tidak ada secret production di repository | Perlu review final |
| Upload dibatasi tipe dan ukuran | Tersedia, perlu security review |
| Link file resep/bukti bayar hanya memakai path valid | Tercakup test dan service guard |
| Dokumentasi sesuai implementasi | Diperbarui `2026-06-06` |
| Seluruh test otomatis lulus | `48/48` lulus pada `2026-06-06`; residual error DBG-07 masih ada |
| `git diff --check` bersih | Belum, ada whitespace pada working tree |
| Batasan simulasi dijelaskan saat demo | Tersedia di README/checklist |
