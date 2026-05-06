---
id: project-scope
title: Project Scope
---

# Project Scope

Clinisync exists to solve one narrow problem: clinical teams routinely receive spreadsheet exports that mix patient identifiers, demographics, and outcomes in inconsistent shapes, and they need them in a clean, de-identified, per-sheet CSV form before any analysis.

## In scope

- Multi-sheet `.xlsx` / `.xls` / `.ods` ingestion (uploads ≤ 5 MB).
- Deterministic per-upload anonymization of `NHI` values to sequential IDs that align across sheets.
- DOB → Age conversion with format-tolerant date parsing.
- Removal of obvious PHI columns (`Contact`, `Address`) and empty / unnamed columns.
- Row-level dedup after transformation.
- Per-upload manifest with sheet-by-sheet stats: rows processed, duplicates removed, invalid DOB count, missing NHI count.
- Optional defenses on the upload path: API-key auth, per-IP rate limit, virus scan.

## Out of scope

- Long-term storage of patient data. Cleaned CSVs land in a local `csvs/` directory and are swept by a TTL sweeper (`CLINISYNC_CSV_TTL_HOURS`, default 24 h). The intended pattern is "download immediately, then forget."
- HIPAA / GDPR / GxP certification. The service follows privacy-conscious defaults but does not implement audit logging, access roles, encryption at rest, or BAA-grade controls. Use it inside a controlled environment, not as your compliance layer.
- Free-text NLP, schema inference, or row-level validation rules. Cleaning is rule-based and intentionally small.
- A graphical workflow builder. The cleaning pipeline is fixed in code; new rules are PRs, not configuration.

## Running it

```bash
git clone https://github.com/DevilsDev/csv_procedure.git
cd csv_procedure
npm install
npm run setup           # creates uploads/, csvs/, and test fixtures
npm test                # 30 tests; all passing on main
npm run dev             # starts on http://localhost:3000
```

For deployment knobs (`CLINISYNC_API_KEY`, `CLINISYNC_CSV_TTL_HOURS`, `REDIS_URL`, `CLAMAV_TCP_HOST`) see [`.env.example`](https://github.com/DevilsDev/csv_procedure/blob/main/.env.example) in the repo.
