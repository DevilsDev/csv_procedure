# Thresh

![CI](https://github.com/DevilsDev/csv_procedure/actions/workflows/ci.yml/badge.svg)
[![Build Status](https://img.shields.io/github/actions/workflow/status/DevilsDev/csv_procedure/ci.yml?branch=main)](https://github.com/DevilsDev/csv_procedure/actions)
[![License](https://img.shields.io/github/license/DevilsDev/csv_procedure)](LICENSE)
[![Documentation](https://img.shields.io/badge/docs-online-blue)](https://devilsdev.github.io/csv_procedure/)
[![Try in browser](https://img.shields.io/badge/try-in_browser-2563eb)](https://devilsdev.github.io/csv_procedure/tool/)

> Spreadsheet de-identification, in your browser. Privacy-first ETL for tabular data.

Thresh takes spreadsheet exports of structured data — Excel workbooks across multiple sheets — and returns de-identified, analysis-ready CSVs. The cleaning rules ship with healthcare-friendly defaults (anonymize `NHI`, convert `DOB` to `Age`, drop `Address` and `Contact`, dedupe rows) but the underlying engine is general-purpose: rules are a small, testable module you can extend or replace.

The project ships in two flavors:

- **An Express server** with a `POST /upload` endpoint and a thin browser UI — for backend integrations, scripted pipelines, and self-hosted deployments.
- **A self-contained in-browser version** at <https://devilsdev.github.io/csv_procedure/tool/> that runs the same cleaning rules locally on your machine. No server, no upload, no data ever leaves the page.

> The npm package and GitHub repo are still named `csv_procedure` for historical reasons; the product is **Thresh**.

---

## Try it without installing anything

Open <https://devilsdev.github.io/csv_procedure/tool/> in any modern browser. Click **Try with a sample workbook** to see the full flow end-to-end, or drop in your own file. Everything runs locally.

---

## Run the server locally

```bash
git clone https://github.com/DevilsDev/csv_procedure.git
cd csv_procedure
npm install
npm run setup           # creates uploads/, csvs/, and demo fixtures
npm run dev             # http://localhost:3000
```

Upload via cURL:

```bash
curl -F "excel=@path/to/input.xlsx" \
     -H "Authorization: Bearer $CLINISYNC_API_KEY" \
     http://localhost:3000/upload
```

Returns JSON with the per-sheet stats, output CSV filenames, and the manifest filename. Files can then be retrieved at `GET /downloads/<filename>` (gated on the same key).

See [.env.example](./.env.example) for the runtime configuration knobs (`CLINISYNC_API_KEY`, `CLINISYNC_CSV_TTL_HOURS`, `REDIS_URL`, `CLAMAV_TCP_HOST`).

---

## Default cleaning rules

| Rule | Behavior |
| --- | --- |
| `NHI` → `ID` | Replaced with sequential anonymized IDs (`ID-001`, `ID-002`, …) shared across sheets in the same upload. |
| `DOB` → `Age` | Converted to whole-year age, clamped to `0..130`. Invalid dates become empty. |
| `Address` / `Contact` | Columns matching exactly are dropped. |
| Empty / unnamed columns | Skipped. Headers starting with `Column` are treated as auto-generated and dropped. |
| Duplicate rows | After all rewrites, exact-duplicate rows are removed. |

The rules apply consistently across every sheet in the workbook. They are implemented in `src/etl/transform.js` and `src/etl/idMapper.js` — those are the source of truth, and the in-browser tool ships a hand-maintained mirror with a parity test guarding against drift.

---

## Project layout

```
csv_procedure/
├── src/
│   ├── etl/                # extract, transform, load, idMapper, retention
│   ├── middleware/         # apiKey, rateLimit, virusScan, redis store
│   └── routes/             # Express upload + downloads routes
├── __tests__/              # Jest suite (54 tests, parity test included)
├── public/                 # Server-served frontend
├── docs/
│   ├── docs/               # Docusaurus content
│   └── static/tool/        # In-browser cleaner (deployed to GitHub Pages)
├── scripts/                # setup, generate-public-sample
├── .env.example            # documented runtime knobs
└── README.md
```

---

## Testing

```bash
npm test
```

54 tests across 8 suites covering: ETL (transform / idMapper / load), the upload route (auth, validation, virus scan), the downloads route (path traversal defense), the in-browser ETL bundle (with a parity test against the server), and the DOM logic.

---

## Documentation

Full docs at <https://devilsdev.github.io/csv_procedure/>. Run locally:

```bash
cd docs
npm install
npm run start
```

The docs site (Docusaurus) is built and deployed by `.github/workflows/docs.yml` on every push to `main` that touches `docs/`. The in-browser tool ships alongside the docs at `/csv_procedure/tool/`.

---

## Release History

See [`CHANGELOG.md`](./CHANGELOG.md).

---

## License

Licensed under the MIT License. © Ali Kahwaji, 2025–present.
