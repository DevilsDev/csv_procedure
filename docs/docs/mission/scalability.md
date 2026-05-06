---
id: scalability
title: Scalability
---

# Scalability

Clinisync is single-process Express with on-disk artifacts. That's deliberate — it's the right shape for a clinic-internal cleaning utility — but it sets concrete limits, and the pieces that need to stretch are designed to swap out.

## Current limits

| Constraint | Value | Where it lives |
| --- | --- | --- |
| Per-upload size | 5 MB | `MAX_SIZE_BYTES` in [src/app.js](https://github.com/DevilsDev/csv_procedure/blob/main/src/app.js) |
| Per-IP rate | 30 requests / 60 s | `rateLimit({ windowMs: 60_000, max: 30 })` in `src/app.js` |
| Output retention | 24 h (configurable) | `CLINISYNC_CSV_TTL_HOURS` |
| Concurrent uploads | Whatever the Node event loop and your multer disk space tolerate | — |

## What scales today

- **Per-request memory.** The 5 MB cap means a workbook plus its CSV serialization comfortably fits in memory. CSV writes are async (`fs.promises`), so a single slow disk doesn't stall the event loop.
- **Concurrent uploads** within one process. The `idMapper` is per-request — concurrent uploads cannot cross-contaminate IDs. The output filename includes an epoch timestamp and a per-process counter, so two uploads writing simultaneously cannot collide.
- **Per-IP rate limiting in one process.** The default in-memory bucket is sufficient for a single Node instance.

## What needs to be swapped to scale further

| To handle… | Swap |
| --- | --- |
| Workbooks larger than 5 MB | Replace `xlsx.readFile` with a streaming parser (e.g. [`exceljs`](https://github.com/exceljs/exceljs)) and stream CSV output with `fs.createWriteStream`. The `MAX_SIZE_BYTES` cap exists to keep the current sync-in-memory path safe. |
| Multiple Node processes behind a load balancer | Set `REDIS_URL`. The rate limiter automatically switches to a Redis-backed store ([src/middleware/redisRateLimitStore.js](https://github.com/DevilsDev/csv_procedure/blob/main/src/middleware/redisRateLimitStore.js)) using atomic `INCR` + `PEXPIRE NX`, so per-IP limits are coordinated across instances. |
| Output files served from object storage | The load step writes through `fs.promises`. Replace it with an S3 / GCS client; the route already treats the returned path as an opaque token. |
| Real malware scanning | Set `CLAMAV_TCP_HOST`. The virus-scan middleware lazy-loads `clamscan` and rejects infected uploads with `422` before the ETL pipeline runs. |
| Long-running scans or jobs | Move the ETL out of the request lifecycle into a worker queue (BullMQ, SQS) and return `202` with a job ID. The current synchronous response shape was kept because the whole pipeline finishes in tens of milliseconds for files under the cap. |

## What is **not** designed to scale here

- **Long-term storage.** The retention sweeper is meant to run frequently and delete things. If you need durable storage of cleaned outputs, copy them out of `csvs/` into your warehouse before the TTL expires.
- **Cross-upload identity.** ID-001 in one upload is not the same patient as ID-001 in another upload. If you need stable de-identification across runs, you need a separate registry — that is intentionally out of scope.
- **Multi-tenant isolation.** There is no notion of "tenant" in this codebase. If you need that, run one process per tenant, or layer it on top.
