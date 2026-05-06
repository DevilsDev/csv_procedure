---
id: security
title: Security
---

# Security

This page describes what Clinisync **does** for security, and — equally important — what it **does not**.

## What the code does

### Input validation

- File extension is allowlisted to `.xlsx`, `.xls`, `.ods` before multer accepts the body. Anything else is rejected with `400` and never reaches disk.
- File size is capped at 5 MB (`MAX_SIZE_BYTES`). Multer surfaces a `LIMIT_FILE_SIZE` error which the centralized error handler turns into a `400` JSON response.
- The uploaded filename is sanitized (whitespace → underscore, prefixed with epoch) before being written to `uploads/`, so the original name cannot escape the upload directory.

### De-identification by default

- `NHI` is replaced with sequential per-upload IDs.
- `DOB` is replaced with whole-year `Age`, sanity-clamped to `0 ≤ age < 130`.
- `Address` and `Contact` columns are dropped.

The default code path produces an output that does not contain those quasi-identifiers — the most common operator mistake (forgetting to scrub a column) is prevented by the pipeline rather than by procedure.

### Authentication

- `CLINISYNC_API_KEY`, when set, gates `/upload` on a matching `Authorization: Bearer` or `X-API-Key` header.
- Comparison uses `crypto.timingSafeEqual` to avoid leaking the key through response-time differences.
- Rejected requests have their multipart upload removed in the same code path, so a 401 doesn't leave orphan files in `uploads/`.

When the env var is unset, the server logs a one-shot startup warning making it clear the endpoint is open. Keep it set in any environment that's not a developer laptop.

### Rate limiting

A per-IP fixed-window limiter caps `/upload` at 30 requests per minute by default. With `REDIS_URL` set, the store becomes Redis-backed (atomic `INCR` + `PEXPIRE NX`) so multiple processes share state. Exceeding the cap returns `429` with a `Retry-After` header.

### Optional virus scanning

Set `CLAMAV_TCP_HOST` and install the `clamscan` package to route every upload through a clamd daemon before it reaches the ETL pipeline. Infected files trigger `422` and the temp file is deleted; scanner errors trigger `503` rather than silently bypassing the scan.

### Cleanup discipline

- The multipart temp file is deleted in a `finally` block regardless of outcome — successful response, ETL error, auth failure, virus detection — so failures cannot leak the source spreadsheet to disk.
- The `csvs/` directory is swept on every successful upload; files older than `CLINISYNC_CSV_TTL_HOURS` (default 24 h) are deleted.

## What the code does **not** do

This is the half of the page that matters most.

- **Not HIPAA-certified.** There is no audit trail of access, no role-based access control, no encryption at rest, no Business Associate Agreement, and no formal threat model. If you're operating under HIPAA, GDPR, or any other regulated regime, Clinisync is something you embed inside a compliant environment — it is not the compliant environment itself.
- **No transport security on its own.** The Express server listens on plain HTTP. Front it with a TLS-terminating reverse proxy (nginx, Caddy, your cloud LB) before it sees real data.
- **No request-level authorization beyond a shared key.** The `CLINISYNC_API_KEY` is a single secret. There is no per-user identity, no scoped tokens, and no user-level audit log.
- **No content scanning of the spreadsheet payload.** Names, free-text notes, and any column that isn't `NHI`/`DOB`/`Contact`/`Address` flow through unchanged. If your source workbooks contain other PHI, either scrub it upstream or extend the column rules.
- **No protection against deliberate Excel-engine attacks** (formulas, embedded objects, OLE links). The parser uses `xlsx.readFile` which is mostly defensive but is not a security boundary. Treat uploads as untrusted: enable the virus scan, run the process under a low-privilege user, and don't open the produced files in a desktop Excel client without checking them first.
- **No replay protection.** A captured upload request can be re-sent. If that matters to you, terminate at a gateway that can sign or short-TTL the request.

## Reporting a vulnerability

Please report security issues privately to the maintainer rather than via a public GitHub issue.
