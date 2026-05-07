---
id: fields
title: Field cleaning
---

# Field cleaning

Header normalization happens once per sheet, before any row processing. Every header cell is trimmed, lower-cased, and matched against the active **rule set** (see *Custom rules* below). The default rule set ships these mappings:

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

If you need any of the above, you can override the rule set without forking — see *Custom rules* below.

## Custom rules

The default rule set lives in [src/etl/rules.js](https://github.com/DevilsDev/csv_procedure/blob/main/src/etl/rules.js) as `DEFAULT_RULE_SET`. You can replace it three ways:

- **Server**: set the `CLINISYNC_RULES_PATH` env var to a JSON file. It's loaded once at startup and applied to every `/upload` and `/preview` request.
- **CLI**: `thresh clean ./input.xlsx --rules ./my-rules.json` (and the same flag on `thresh preview`).
- **In-browser tool**: open the *Custom rules* panel on [/tool/](pathname:///csv_procedure/tool/), paste your JSON, and click Validate. Subsequent runs use it for that browser tab.

### Schema

```json
{
  "version": "1",
  "rules": [
    { "match": { "empty": true },          "action": "drop" },
    { "match": { "startsWith": "column" }, "action": "drop" },
    { "match": { "equals": "nhi" },        "action": "anonymize",   "outputName": "ID" },
    { "match": { "equals": "dob" },        "action": "ageFromDate", "outputName": "Age" },
    { "match": { "equals": "contact" },    "action": "drop" },
    { "match": { "equals": "address" },    "action": "drop" },
    { "match": { "regex": "^internal_" }, "action": "drop" },
    { "match": { "equals": "phone" },      "action": "redact",      "replaceWith": "***" },
    { "match": { "equals": "employee_id" },"action": "rename",      "outputName": "EmployeeID" }
  ]
}
```

| Match clause | Behavior |
| --- | --- |
| `equals: <string>` | Exact match (case-insensitive after trim). |
| `startsWith: <string>` | Prefix match. |
| `contains: <string>` | Substring match. |
| `regex: <string>` | Case-insensitive regex (string form, not literal). |
| `empty: true` | Match empty / whitespace headers. |

| Action | Required fields | Behavior |
| --- | --- | --- |
| `drop` | — | Column removed. |
| `keep` | — | Column passes through (implicit default for unmatched headers). |
| `rename` | `outputName` | Column renamed; values unchanged. |
| `redact` | `replaceWith` | Every value replaced with the fixed string. Each non-empty replaced cell increments `redactedCellCount`. |
| `anonymize` | `outputName` | Sequential ID via the per-request mapper. Empty cells increment `missingNhiCount`. |
| `ageFromDate` | `outputName` | Value parsed as a date and replaced with whole-year age. Unparseable cells increment `invalidDobCount`. |

Rules are evaluated **in order — first match wins**. Headers that match no rule are kept as-is.

### Validation

The rule set is validated whenever it loads (server startup, CLI run, in-browser Validate button) and rejected with a clear error if it's malformed: unknown action, multiple match keys, missing `outputName` / `replaceWith`, or invalid regex. The same validator runs on the server (`src/etl/rules.js`) and in the browser (`docs/static/tool/etl.js`) — they're hand-mirrored and a parity test in the Jest suite catches drift.
