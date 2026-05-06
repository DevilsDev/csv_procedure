---
id: duplicates
title: Duplicates
---

# Duplicate removal

Within each sheet, after all column rewrites have been applied (NHI → ID, DOB → Age, drop Address/Contact/unnamed/Column*), Clinisync drops exact-duplicate rows.

## How it works

For every transformed row, the pipeline computes a key with `JSON.stringify(cleanedRow)` and tracks seen keys in a `Set`. The first occurrence is kept; subsequent matches are discarded and the per-sheet `duplicatesRemoved` counter increments.

Why `JSON.stringify` and not a `cells.join('|')` join: pipe characters inside values would create false collisions (`["a|b","c"]` and `["a","b|c"]` would join to the same string). `JSON.stringify` is unambiguous for the value types this pipeline produces (strings, numbers, the empty string).

## What counts as a duplicate

- Two rows are duplicates **after** transformation. Two source rows with the same `NHI` and `DOB` will share the same anonymized `ID` and computed `Age`, so they collapse into one if the rest of their cells also match.
- Two source rows that differ only in a column that has been dropped (e.g. one had a `Contact` value, the other was blank) **do** become duplicates after transformation, by design.
- Two rows that differ only in case or whitespace are **not** duplicates today. The transformer doesn't normalize string content beyond the header.

## What is **not** dedupped

- Rows are not deduplicated **across sheets** — each sheet runs through `transformSheetWithStats` separately. The shared `idMapper` keeps `ID` values consistent between sheets, but a row that appears in both Sheet1 and Sheet2 will appear in both output CSVs.
- Columns are not deduplicated. If the source workbook genuinely has two `Weight` columns, both survive transformation.

## Where to find it in the code

Implementation: [src/etl/transform.js](https://github.com/DevilsDev/csv_procedure/blob/main/src/etl/transform.js) — the `seen` set inside `transformSheetWithStats`.
