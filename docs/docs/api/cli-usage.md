---
id: cli-usage
title: CLI Usage
---

# CLI Usage

Clinisync's primary surface is the `POST /upload` HTTP endpoint, not a CLI. The package does ship a `clinisync` binary, but at the moment it only prints a version banner — it is reserved for future commands.

```bash
$ npx clinisync

Clinisync CLI v2.5.3

Usage: npm run dev OR POST /upload with Excel files
More CLI commands coming soon...
```

## Local scripts that exist today

The interesting workflows are exposed as `npm` scripts in the repo:

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Express server on port 3000 with nodemon. |
| `npm start` | Start the server without nodemon (production). |
| `npm run setup` | Create runtime directories (`uploads/`, `csvs/`) and regenerate test fixtures. |
| `npm test` | Run the full Jest suite with coverage. |
| `npm run lint` | Run ESLint over `src/`. |
| `npm run generate:fixtures` | Regenerate `__tests__/fixtures/` only. |

## Calling the API from the shell

Until the CLI grows, the supported way to drive the service from a script is `curl` against `/upload`:

```bash
curl -F "excel=@./input.xlsx" \
     -H "Authorization: Bearer $CLINISYNC_API_KEY" \
     http://localhost:3000/upload \
  | jq .
```

See [API Examples](/api/examples) for richer cases and error responses.

## Roadmap

If you want to contribute, a real CLI would likely cover:

- `clinisync upload <file>` — POST to a configured server URL, print the manifest.
- `clinisync clean <file>` — run the same ETL locally without an HTTP round-trip and write CSVs to a directory.
- `clinisync sweep` — manual invocation of the retention sweeper.

Open an issue if you'd like to take this on.
