---
id: fields
title: Field cleaning
---

# Field cleaning

Header normalization happens once per sheet, before any row processing. Every header cell is trimmed and lower-cased, then matched against this fixed table:

| Source header (lower-cased, trimmed) | Result | Notes |
| --- | --- | --- |
| `nhi` | Renamed to `ID`; values are anonymized via the per-upload [ID mapper](/cleaning/sensitive-data) |
| `dob` | Renamed to `Age`; values are converted to whole-year ages — see [DOB → Age](/cleaning/dob-to-age) |
| `contact` | Column dropped entirely |
| `address` | Column dropped entirely |
| Empty string | Column dropped — unnamed columns don't survive |
| Starts with `column` (e.g. `Column1`, `column 7`) | Column dropped — these are usually Excel's auto-generated placeholders for empty header cells |
| Anything else | Kept as-is, including original case (the *output* header preserves the source's casing; only the matching is case-insensitive) |

The match for `contact` and `address` is **exact**. Columns called `Emergency Contact Date` or `Address Verified Flag` are kept — earlier substring matching was a known false-positive source and was tightened in [src/etl/transform.js](https://github.com/DevilsDev/csv_procedure/blob/main/src/etl/transform.js).

## Row-level filtering

Rows that satisfy any of these are dropped silently:

- The cell array isn't an array (defensive — shouldn't happen for valid Excel input).
- Every cell in the row is "blank": `null`, `undefined`, or empty string.

Critically, a row whose only non-empty cell is the number `0` is **not** considered blank — that was a real bug fixed earlier (the original `every(cell => !cell)` check incorrectly treated `0` as empty).

## What is **not** done

- No type coercion on retained columns. Numeric cells stay numeric; date-typed cells (other than DOB) stay as whatever `xlsx` returned.
- No header alias dictionary. `Patient ID`, `MRN`, `Patient Code` are all kept as separate columns under their original names — they are not collapsed into a canonical one.
- No locale-aware normalization. Headers like `D.O.B.`, `dob_v2`, or `Date of Birth` are **not** matched as DOB today. Only the literal token `dob` (case-insensitively, trimmed) is recognized.
- No formatting rules for weight, height, or any other clinical field. The transformer is intentionally conservative — it removes and renames, it doesn't reshape values.

If you need any of the above, the cleaning logic is centralized in `transformSheetWithStats` and is straightforward to extend.
