---
id: cli-usage
title: CLI Usage
---

# CLI Usage

Thresh ships a real CLI as `thresh` (and as `clinisync` for backwards compatibility) — installable globally, runnable via `npx`, or available as `node bin/clinisync.js` from a clone.

```bash
$ thresh
Thresh — privacy-first spreadsheet ETL.

Usage:
  thresh <command> [args] [options]

Commands:
  clean      Clean a workbook and write outputs to a directory.
  preview    Dry-run: produce a JSON report without writing files.
  serve      Run the HTTP server.
  version    Print the installed version.
  help [cmd] Show this help, or detailed help for a single command.
```

## `thresh clean <file>`

Run the ETL pipeline on a workbook and write per-sheet CSVs plus a manifest to a directory.

```bash
thresh clean ./case-mix.xlsx -o ./out
```

Options:

| Option | Default | Behavior |
| --- | --- | --- |
| `-o`, `--output <dir>` | `./out` | Output directory; created if missing. |
| `--rules <path>` | bundled defaults | JSON rule set — see [Field cleaning](/cleaning/fields) for the schema. |
| `--quiet` | off | Suppress the human-readable summary; emit a single line of JSON to stdout instead. Pipe-friendly. |

In default (non-quiet) mode the CLI prints what it wrote to stderr and a summary block at the end:

```
  wrote converted-case_mix-sheet1.csv  (2 rows)
  wrote converted-case_mix-sheet2.csv  (2 rows)
  wrote manifest-case_mix.json

Summary:
  sheets             2
  rows processed     4
  duplicates removed 0
  invalid DOB        0
  missing NHI        0
  redacted cells     0
  output dir         out
```

In `--quiet` mode the only stdout line is JSON, ready for `jq`:

```bash
$ thresh clean ./case-mix.xlsx -o ./out --quiet | jq .sheetsProcessed
2
```

## `thresh preview <file>`

Identical pipeline to `clean`, but writes nothing — emits a JSON dry-run report to stdout. Useful for verifying that a custom rule set does what you expect before running it for real.

```bash
thresh preview ./case-mix.xlsx --rules ./my-rules.json --limit 50
```

Options:

| Option | Default | Behavior |
| --- | --- | --- |
| `--rules <path>` | bundled defaults | Same as `clean`. |
| `--limit <n>` | `25` | Max rows to include in each sheet's preview block. The full file would be too big for a JSON response on a real workbook. |

The output is the same structured JSON the `POST /preview` HTTP endpoint emits, with each sheet carrying a `previewRows` 2-D array plus stats.

## `thresh serve`

Start the HTTP server. Honors all the runtime env vars from [.env.example](https://github.com/DevilsDev/csv_procedure/blob/main/.env.example) (`CLINISYNC_API_KEY`, `CLINISYNC_CSV_TTL_HOURS`, `CLINISYNC_RULES_PATH`, `REDIS_URL`, `CLAMAV_TCP_HOST`).

```bash
thresh serve --port 8080
```

`--port` overrides the `PORT` environment variable.

## `thresh version` / `thresh help`

Print the version (read from `VERSION`) or the top-level / per-command help respectively. `thresh help clean` shows the full clean help block; same for preview and serve.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success. |
| `1` | Recoverable error (missing input file, invalid rule set, ETL failure). The error message goes to stderr. |
| `2` | Unknown subcommand. Run `thresh help` for valid options. |
