---
id: intro
title: Welcome
---

# Welcome to Clinisync

Clinisync is a small, opinionated ETL service that takes spreadsheet exports of clinical data and returns de-identified CSVs ready for analysis. It runs as an Express server with a `POST /upload` endpoint and a thin browser UI.

It is **not** a general-purpose data warehouse, a HIPAA-certified product, or a managed service — it is the cleaning layer that sits in front of one.

## What it does today

- Accepts `.xlsx`, `.xls`, and `.ods` uploads up to 5 MB.
- Walks every sheet in the workbook and applies a fixed set of cleaning rules:
  - Replaces the `NHI` column with sequential anonymized IDs (`ID-001`, `ID-002`, …) shared across all sheets in the same upload.
  - Converts `DOB` to a calculated `Age`.
  - Drops `Address` and `Contact` columns.
  - Removes empty rows, columns whose header looks like `Column1`, and exact-duplicate rows.
- Writes one CSV per sheet plus a JSON manifest summarizing what was processed.
- Optional: API-key auth, IP rate-limiting, and a virus-scan hook (ClamAV).

## What it does not do

- No persistence beyond on-disk CSV outputs (which are swept after `CLINISYNC_CSV_TTL_HOURS`, default 24 h).
- No HIPAA controls: no audit log, no access roles, no encryption at rest.
- No `.csv` input or cloud-storage destinations.
- No CLI beyond a version banner — the API is the supported surface.

## Where to go next

| You want to… | Read |
| --- | --- |
| Call the API | [API - Upload Endpoint](/api-upload), [API Examples](/api/examples) |
| Understand the cleaning rules | [Data Cleaning Rules](/cleaning-rules), [Field details](/cleaning/fields) |
| Run it locally | [Project Scope](/about/project-scope), [Technology](/about/technology) |
| Understand the architecture | [ETL Design](/mission/etl-design), [Security model](/mission/security) |
