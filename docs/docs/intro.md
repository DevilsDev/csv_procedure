---
id: intro
title: Welcome
---

# Welcome to Thresh

Thresh is a small, opinionated ETL service that takes spreadsheet exports of structured data and returns de-identified CSVs ready for analysis. It runs as an Express server with a `POST /upload` endpoint and a thin browser UI, and ships with a fully in-browser demo on GitHub Pages that processes files locally without any server round-trip.

The cleaning rules ship with healthcare-friendly defaults (NHI anonymization, DOB → Age, drop Address/Contact) but the underlying engine is general-purpose — the rules are a small, testable module you can extend or replace for any tabular-data cleaning workflow.

It is **not** a general-purpose data warehouse, a HIPAA-certified product, or a managed service — it is the cleaning layer that sits in front of one.

:::tip Try it without installing anything
A self-contained version of the cleaner — same rules, no server — runs entirely in your browser at **[/tool/](pathname:///csv_procedure/tool/)**. The workbook never leaves your machine.
:::

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
| Try it in your browser | [/tool/](pathname:///csv_procedure/tool/) |
| Call the API | [API - Upload Endpoint](/api-upload), [API Examples](/api/examples) |
| Understand the cleaning rules | [Data Cleaning Rules](/cleaning-rules), [Field details](/cleaning/fields) |
| Run it locally | [Project Scope](/about/project-scope), [Technology](/about/technology) |
| Understand the architecture | [ETL Design](/mission/etl-design), [Security model](/mission/security) |
