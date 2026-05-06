---
id: team
title: Team
---

# Team

Clinisync is an open-source project authored and maintained by **[Ali Kahwaji](https://github.com/alikahwaji)** with contributions from the wider community via GitHub.

## Contributing

The project is small and scoped — contributions are welcome on:

- Cleaning rules: edge cases in DOB parsing, additional sensitive-data column patterns, locale-aware header normalization.
- Reliability: streaming the CSV writer for inputs above the current 5 MB cap, more aggressive backpressure on multipart parsing.
- Observability: structured logs, request IDs threaded through ETL, Prometheus-friendly counters.
- Adapters: a Redis-backed rate-limit store implementation lives in [src/middleware/redisRateLimitStore.js](https://github.com/DevilsDev/csv_procedure/blob/main/src/middleware/redisRateLimitStore.js) — virus scan, retention, and rate limit are all designed as pluggable surfaces.

If you're filing a bug or proposing a change, please run `npm test` and `npm run lint` locally first; both must stay green for CI to pass.

## Reporting issues

- Bugs and features → [GitHub Issues](https://github.com/DevilsDev/csv_procedure/issues)
- Security concerns → please report privately rather than via a public issue.
