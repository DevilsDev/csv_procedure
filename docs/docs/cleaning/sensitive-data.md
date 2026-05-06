---
id: sensitive-data
title: Sensitive data
---

# Sensitive data handling

The cleaning pipeline removes or de-identifies three categories of cells. Everything else is passed through unchanged.

## NHI → anonymized ID

Any column whose header is `NHI` (case-insensitive, trimmed) is renamed to `ID`. The values in that column are replaced by sequential, zero-padded anonymized identifiers: `ID-001`, `ID-002`, `ID-003`, …

Mapping rules:

- The same source NHI always maps to the same anonymized ID **within a single upload**. This means cross-sheet joins on `ID` continue to work — if patient `AB-12345` shows up in Sheet1 and Sheet2 of the same workbook, both sheets get `ID-001` (or whichever number was assigned first).
- A new upload starts a fresh mapping. There is no cross-upload identity. This is intentional: the system holds no patient registry, and "ID-001 in Monday's upload" is not necessarily the same patient as "ID-001 in Tuesday's upload."
- Empty / non-string NHI cells are not consumed: the cell becomes empty in the output and `missingNhiCount` increments for the sheet. This avoids burning IDs on rows that don't have a real patient code.
- Whitespace is trimmed before lookup, so `" AB-12345 "` and `"AB-12345"` resolve to the same ID.

The implementation is the `createIdMapper()` factory in [src/etl/idMapper.js](https://github.com/DevilsDev/csv_procedure/blob/main/src/etl/idMapper.js). One mapper instance is created per request — concurrent uploads cannot collide.

## DOB → Age

See [DOB → Age](/cleaning/dob-to-age) for the algorithm and edge cases. The short version: DOB is replaced with whole-year age, and the original DOB value never appears in the output.

## Dropped columns

Columns whose lower-cased header is exactly `contact` or exactly `address` are dropped entirely. No portion of those values appears in the output CSVs or in the manifest.

This is exact-match by design. `Emergency Contact Date` and `Address Verified Flag` survive — see [Field cleaning](/cleaning/fields) for the full header rules.

## What is **not** removed

- Names. The pipeline keeps any column called `Name`, `First Name`, `Surname`, etc. If your source data has those, you need to either remove them upstream or extend the rules. The dropper only knows about `contact` and `address`.
- Free-text notes. There is no NLP de-identification step.
- Postcodes / ZIP codes. Combined with age and sex, these can re-identify individuals. If your source data includes them and your downstream use case is sensitive, treat them as PHI and either drop the column upstream or add it to the dropper's exact-match list.
- IDs assigned by the source EMR (e.g. `MRN`, `Encounter ID`). Only the literal `NHI` column is anonymized.

If you have a column you'd like dropped or de-identified by default, the change is a one-liner in `transformSheetWithStats`.

## Operational notes

- The anonymized IDs in the output CSVs are not random — they are sequential. They reveal upload-order information (e.g. how many distinct patients appeared earlier in the workbook). For most analytical use cases this is fine; if it isn't, swap the counter for a UUID.
- The mapping itself is held only in memory for the duration of the request and then discarded. There is no on-disk anonymization registry.
