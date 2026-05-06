---
id: etl-design
title: ETL Design
---

# ETL Design

The pipeline is split into three small modules that pass plain JavaScript values between each other. Each one does one thing.

```
multipart upload  ─►  extract  ─►  transform  ─►  load  ─►  manifest
                       (xlsx)      (rules)        (CSV)
```

## Extract — `src/etl/extract.js`

`extractSheets(filePath)` opens the uploaded file with `xlsx.readFile` and converts each sheet to a 2-D array of cells using `sheet_to_json` with `{ header: 1, defval: '' }`. Empty sheets are skipped; everything else is returned as `[{ name, rows }]`.

Why array-of-rows rather than array-of-objects: header row processing is easier when the header is just `rows[0]`, and the cleaning rules below are intentionally header-aware.

## Transform — `src/etl/transform.js`

`transformSheetWithStats(rows, idMapper)` is the heart of the pipeline. It does two passes:

1. **Header pass.** Each header cell is normalized (trim + lower-case) and matched against a fixed table to produce a per-column action: rename to `ID`, rename to `Age`, drop, or keep as-is. The result is a `columnMap` of the same length as the source row.
2. **Row pass.** For every data row, blank rows are skipped, columns are projected through `columnMap`, NHI cells are routed through the per-upload `idMapper`, DOB cells are routed through `calculateAgeFromDOB`, and the resulting row is added to a `seen` `Set` keyed by `JSON.stringify(row)` to drop exact duplicates.

The function returns `{ rows, stats }` where `stats` is `{ rowsProcessed, duplicatesRemoved, invalidDobCount, missingNhiCount }`.

The whole transformer is pure given an injected `idMapper` — no globals, no module state. The route creates one mapper per request and threads it through every sheet so anonymized IDs stay consistent across the workbook without leaking across requests.

## Load — `src/etl/load.js`

`writeCsvOutput(baseName, sheetName, data)` and `writeManifestOutput(baseName, manifestData)` write the cleaned CSVs and the per-upload manifest. Both are async — they use `xlsx.utils.sheet_to_csv` (in-memory; the 5 MB upload cap keeps this bounded) followed by `fs.promises.writeFile`. CSV serialization is sync, but the I/O never blocks the event loop.

Filenames embed a sanitized base name, an epoch timestamp, and a monotonically increasing counter so concurrent requests cannot collide.

## Route — `src/routes/fileUpload.js`

The `/upload` route stitches it all together:

1. Reject if no file (returned by multer).
2. Run the retention sweeper to drop stale files in `csvs/`.
3. Build a fresh `idMapper` for this request.
4. Extract sheets, run each through the transformer with the shared mapper, write each as CSV, accumulate stats.
5. Write the manifest with the aggregate stats and per-sheet breakdown.
6. Respond `200` with the JSON manifest body.
7. In `finally`, remove the uploaded multipart temp file regardless of outcome.

## Pluggable surfaces

Three concerns sit at the edge of the pipeline as middleware so they can be replaced without touching the ETL code:

- **Auth** ([src/middleware/apiKey.js](https://github.com/DevilsDev/csv_procedure/blob/main/src/middleware/apiKey.js)) — gates the route on a configured key.
- **Rate limit** ([src/middleware/rateLimit.js](https://github.com/DevilsDev/csv_procedure/blob/main/src/middleware/rateLimit.js)) — pluggable store; the in-memory default is single-process, the Redis adapter is multi-process.
- **Virus scan** ([src/middleware/virusScan.js](https://github.com/DevilsDev/csv_procedure/blob/main/src/middleware/virusScan.js)) — pluggable scanner; the default is a noop with a startup warning, the ClamAV adapter scans against clamd.

All three are activated by environment variables and are off by default.

## What's deliberately missing

- **Streaming.** The whole spreadsheet is loaded into memory. The 5 MB upload cap exists precisely so that's safe; lifting the cap would mean swapping `xlsx.readFile` for a streaming parser like [`exceljs`](https://github.com/exceljs/exceljs) and writing CSV with `fs.createWriteStream`.
- **Persistence.** There is no DB. The output CSVs and manifest are the entire trace.
- **Schema validation.** The pipeline does not assert that, e.g., `Age` is between 0 and 130 in the *source* — it only clamps DOB-derived ages. If you need column-level validators, add them as a post-transform step.
