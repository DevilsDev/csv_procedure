---
id: technology
title: Technology
---

# Technology

Clinisync is intentionally boring on the dependency side — every runtime piece is a well-understood Node module and the codebase is plain CommonJS.

## Runtime stack

| Concern | Library |
| --- | --- |
| HTTP server | [Express 4](https://expressjs.com/) |
| Multipart upload | [multer](https://github.com/expressjs/multer) (disk storage, 5 MB cap, allowlisted extensions) |
| Spreadsheet parsing | [SheetJS / xlsx](https://github.com/SheetJS/sheetjs) — `readFile` for input, `sheet_to_csv` for output |
| Date math | [moment](https://momentjs.com/) (only as a transitive helper; the DOB-to-age math is hand-rolled in [src/etl/transform.js](https://github.com/DevilsDev/csv_procedure/blob/main/src/etl/transform.js)) |
| Env loading | [dotenv](https://github.com/motdotla/dotenv) |

## Optional adapters

These are loaded lazily and only activate when the corresponding environment variable is set, so vanilla `npm install` does not pull them:

| Feature | Activated by | Adapter |
| --- | --- | --- |
| Multi-process rate-limit store | `REDIS_URL` | `ioredis` (peer-installed) |
| Virus scanning | `CLAMAV_TCP_HOST` | `clamscan` (peer-installed), backed by a clamd daemon over TCP |

## Dev / CI tooling

| Concern | Library |
| --- | --- |
| Tests | [Jest 29](https://jestjs.io/) with [supertest](https://github.com/ladjs/supertest) for the HTTP route |
| DOM tests | [jsdom](https://github.com/jsdom/jsdom) (for `public/js/upload.js`) |
| Lint | [ESLint 9](https://eslint.org/) flat config |
| Hooks | [husky](https://typicode.github.io/husky/) — pre-commit runs `npm test` |
| CI | GitHub Actions — `ci.yml` runs lint + tests on every push/PR |
| Docs | [Docusaurus 3.10](https://docusaurus.io/) — built and deployed by `docs.yml` whenever `docs/**` changes on `main` |

## Layout

```
src/
  app.js                       # Express wiring; multer + middlewares + upload route
  routes/fileUpload.js         # /upload handler: ETL pipeline + manifest
  etl/
    extract.js                 # xlsx → array-of-rows per sheet
    transform.js               # header normalization, NHI→ID, DOB→Age, dedup, stats
    load.js                    # async CSV + manifest writers
    idMapper.js                # createIdMapper() factory + singleton API
    retention.js               # csvs/ TTL sweeper
  middleware/
    apiKey.js                  # CLINISYNC_API_KEY gate
    rateLimit.js               # in-memory store by default
    redisRateLimitStore.js     # opt-in distributed store
    virusScan.js               # noop by default
    clamavScanner.js           # opt-in clamd adapter
  utils/
    cleanWorkSheetData.js      # public wrapper around transformSheet
    generateFixtures.js        # produces __tests__/fixtures/*
public/                        # tiny vanilla-JS frontend
__tests__/                     # 30 unit + integration tests
docs/                          # this site
```
