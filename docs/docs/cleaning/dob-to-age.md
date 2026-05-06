---
id: dob-to-age
title: DOB to Age
---

# DOB → Age conversion

Any column whose header (case-insensitively, after trimming) equals `dob` is replaced in the output with a column called `Age`.

## Algorithm

1. The cell value is passed to `new Date(...)`. Anything `Date` can parse — ISO strings, US- and EU-style formatted strings, Excel-numeric serials surfaced as strings — is accepted.
2. If parsing yields `Invalid Date`, the row's `Age` cell becomes empty (`""`) and the per-sheet `invalidDobCount` increments.
3. Otherwise, age is computed in whole years from "today" (server clock), with a real **birthday-not-yet-passed-this-year** check that subtracts one year if the birthday hasn't happened yet.
4. The result is sanity-clamped to `0 ≤ age < 130`. Anything outside that range is treated as an invalid DOB and replaced with `""`.

The implementation is in [`calculateAgeFromDOB`](https://github.com/DevilsDev/csv_procedure/blob/main/src/etl/transform.js) — it's the source of truth.

## What you get

| Input cell | Output `Age` |
| --- | --- |
| `1990-01-15` | `35` (or `34`, depending on today's date relative to Jan 15) |
| `15/01/1990` | Same — the `Date` constructor handles common formats. |
| `not-a-date` | `""` and `invalidDobCount` += 1 |
| empty | `""` (no penalty — empty cells are not "invalid") |
| `1820-01-01` | `""` — age would exceed 130, treated as invalid. |

## Why "Age" and not "DOB"

DOB is a quasi-identifier — combined with postcode and gender it's enough to re-identify a sizeable fraction of a population. Age in whole years is far less revealing while preserving the clinical signal most analyses actually need.

## Caveats

- The age is computed at upload time using the server's local clock. The same workbook re-uploaded in a later year will yield older ages. If you need a stable snapshot age, persist the manifest and the CSVs together — the manifest's `generatedAt` timestamp tells you when the ages were computed.
- There is no support for fractional ages (months) or for clinical "decimal age" conventions used in pediatric work. Add those as a follow-up rule if needed.
