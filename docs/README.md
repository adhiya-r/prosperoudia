# Indeks Dokumentasi Prosperoudia

Dokumen di folder ini dibagi berdasarkan kegunaannya agar bukti asesmen tidak bercampur dengan catatan pengembangan.

## Dokumen Utama FR.IA.04A

| Area | Dokumen |
|---|---|
| Audit kebutuhan | [Requirement Checklist](./REQUIREMENT_CHECKLIST.md) |
| Arsitektur dan server | [Architecture Topology](./ARCHITECTURE_TOPOLOGY.md), [Server Specification](./SERVER_SPECIFICATION.md) |
| Tools dan komponen | [Tools Framework Analysis](./TOOLS_FRAMEWORK_ANALYSIS.md), [Third Party Components](./THIRD_PARTY_COMPONENTS.md) |
| Skalabilitas dan keamanan | [Scalability Analysis](./SCALABILITY_ANALYSIS.md), [Security Risk Analysis](./SECURITY_RISK_ANALYSIS.md) |
| Migrasi dan cutover | [Migration Strategy](./MIGRATION_STRATEGY.md), [Data Mapping](./DATA_MAPPING.md), [Post Migration Validation](./POST_MIGRATION_VALIDATION.md), [Rollback Plan](./ROLLBACK_PLAN.md), [Cutover Plan](./CUTOVER_PLAN.md) |
| Update dan dampak | [Software Update Simulation](./SOFTWARE_UPDATE_SIMULATION.md), [Impact Analysis](./IMPACT_ANALYSIS.md) |
| Dokumentasi pelanggan | [User Guide](./USER_GUIDE.md), [FAQ](./FAQ.md), [API Documentation](./API_DOCUMENTATION.md), [Troubleshooting Guide](./TROUBLESHOOTING_GUIDE.md) |

## Dokumen Pendukung

- [Project Charter](./PROJECT_CHARTER.md)
- [WBS and Scope](./WBS_SCOPE.md)
- [Initial ERD](./ERD_INITIAL.md)
- [UAT Scenario and Result](./UAT_SCENARIO_RESULT.md)
- [Debugging Report](./DEBUGGING_REPORT.md)
- [Quality Checklist](./QUALITY_CHECKLIST.md)

## Dokumen Pengembangan Internal

Rencana schema, backlog, seed, keputusan, dan riwayat integrasi dipindahkan ke [`docs/dev/`](./dev/README.md). Dokumen tersebut berguna untuk pengembangan, tetapi bukan bukti utama yang diminta langsung oleh studi kasus.

## Kondisi Terkini Prototype

Per `2026-06-06`, alur utama demo sudah mencakup checkout obat resep, upload bukti pembayaran opsional, review resep oleh Admin/Apoteker, verifikasi pembayaran oleh Kasir/Admin, notifikasi per-user, dan preview file resep/bukti pembayaran pada dashboard approval. Payment gateway, email verification, worker queue, dan expiry alert otomatis tetap dilabeli simulasi/gap.

## Aturan Status

- `Terpenuhi`: implementasi atau dokumen dapat didemokan.
- `Parsial`: fondasi tersedia, tetapi requirement belum lengkap.
- `Simulasi`: alur sengaja disederhanakan untuk prototype.
- `Belum`: belum ada implementasi yang memadai.
