---
id: examples
title: API Examples
---

# API Examples

Working examples for the `/upload` endpoint. Replace `localhost:3000` with your deployment URL and `$CLINISYNC_API_KEY` with the configured key (omit the header entirely if the server is running without auth).

## Basic upload (cURL)

```bash
curl -F "excel=@./case-mix-sample.xlsx" \
     -H "Authorization: Bearer $CLINISYNC_API_KEY" \
     http://localhost:3000/upload
```

Successful response (`200`):

```json
{
  "message": "Upload and transformation completed successfully.",
  "files": [
    "converted-case_mix_sample-1700000000000-1-sheet1.csv",
    "converted-case_mix_sample-1700000000050-2-sheet2.csv"
  ],
  "manifest": "manifest-case_mix_sample-1700000000100-3.json",
  "sheets": [
    {
      "sheetName": "Sheet1",
      "fileName": "converted-case_mix_sample-1700000000000-1-sheet1.csv",
      "rowsProcessed": 2,
      "duplicatesRemoved": 0,
      "invalidDobCount": 0,
      "missingNhiCount": 0
    },
    {
      "sheetName": "Sheet2",
      "fileName": "converted-case_mix_sample-1700000000050-2-sheet2.csv",
      "rowsProcessed": 2,
      "duplicatesRemoved": 0,
      "invalidDobCount": 0,
      "missingNhiCount": 0
    }
  ],
  "sheetsProcessed": 2,
  "rowsProcessed": 4,
  "duplicatesRemoved": 0,
  "invalidDobCount": 0,
  "missingNhiCount": 0
}
```

## Rejected upload — wrong extension

```bash
curl -F "excel=@./notes.txt" http://localhost:3000/upload
```

```json
{ "error": "Unsupported file format." }
```

## Rejected upload — over 5 MB

```bash
curl -F "excel=@./huge.xlsx" http://localhost:3000/upload
```

```json
{ "error": "File exceeds the maximum size of 5MB." }
```

## Rejected upload — missing API key

When the server has `CLINISYNC_API_KEY` set:

```bash
curl -F "excel=@./sample.xlsx" http://localhost:3000/upload
```

```json
{ "error": "Invalid or missing API key." }
```

## Rate-limited

After exceeding 30 requests / minute from the same IP:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 47
Content-Type: application/json

{ "error": "Too many requests. Please retry shortly." }
```

## Node.js (axios)

```js
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

async function uploadWorkbook(filePath) {
  const form = new FormData();
  form.append('excel', fs.createReadStream(filePath));

  const { data } = await axios.post('http://localhost:3000/upload', form, {
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${process.env.CLINISYNC_API_KEY}`,
    },
    maxBodyLength: 5 * 1024 * 1024,
  });

  return data;
}
```

## Reading the manifest

The `manifest` filename in the response points to a JSON document beside the generated CSVs in the `csvs/` directory:

```json
{
  "sourceFileName": "case-mix-sample.xlsx",
  "generatedAt": "2026-05-06T10:30:00.000Z",
  "sheetsProcessed": 2,
  "rowsProcessed": 4,
  "duplicatesRemoved": 0,
  "invalidDobCount": 0,
  "missingNhiCount": 0,
  "files": ["converted-...sheet1.csv", "converted-...sheet2.csv"],
  "sheets": [ /* same per-sheet stats as in the response */ ]
}
```

The manifest is the canonical record of the run — keep it alongside the CSVs if you need to reconcile counts later.
