---
id: endpoints
title: API Endpoints
---

# API Endpoints

The HTTP surface is intentionally small — Clinisync exposes one upload endpoint and serves the static frontend.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/upload` | Accept a multipart spreadsheet upload and return JSON describing the cleaned per-sheet CSVs and manifest. See [Upload Endpoint](/api-upload). |
| `GET` | `/` (and any other static file) | Serves the browser UI from `public/` — drag-and-drop form, optional API key field, JSON-aware result rendering. |

There is no `GET /logs`, no list endpoint for past uploads, and no individual download endpoint. Cleaned CSVs and the manifest are returned by filename in the `/upload` response and can be retrieved out-of-band from the `csvs/` directory while they exist (see retention below).

## Status codes

| Code | Returned for |
| --- | --- |
| `200` | Successful upload — body is JSON with `files`, `manifest`, `sheets`, and aggregate stats. |
| `400` | No file, unsupported extension (anything outside `.xlsx`, `.xls`, `.ods`), or file larger than 5 MB. |
| `401` | `CLINISYNC_API_KEY` is set on the server and the request did not include a matching `Authorization: Bearer` or `X-API-Key` header. |
| `422` | Virus scanner detected malware in the uploaded file (only when `CLAMAV_TCP_HOST` is configured). |
| `429` | Rate limit exceeded — `Retry-After` header tells you how long to wait. Default: 30 requests / 60 s per IP. |
| `500` | Internal error during ETL. The uploaded file is removed in the `finally` handler regardless. |
| `503` | Virus scanner was configured but unreachable; uploads are rejected rather than silently bypassing the scanner. |

## Retention

Cleaned files are not kept indefinitely. Every successful `/upload` triggers a sweep of the `csvs/` directory that deletes anything older than `CLINISYNC_CSV_TTL_HOURS` (default 24 h). Plan to download the files referenced in the response within that window.

## Auth, rate limit, virus scan

All three are off by default and gate themselves on environment variables:

- `CLINISYNC_API_KEY` — when set, every request must carry the key. Comparison is `crypto.timingSafeEqual`.
- `REDIS_URL` — when set, the per-IP rate limiter swaps its in-memory store for Redis (atomic `INCR`+`PEXPIRE NX`).
- `CLAMAV_TCP_HOST` — when set, the upload is scanned via clamd before reaching the ETL pipeline.

See [`.env.example`](https://github.com/DevilsDev/csv_procedure/blob/main/.env.example) for the full list.
