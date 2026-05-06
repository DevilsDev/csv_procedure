---
id: upload
title: API - Upload Endpoint
slug: /api-upload
---

# API - Upload Endpoint

The `POST /upload` endpoint allows users to upload `.xlsx`, `.xls`, or `.ods` files for real-time cleaning and transformation.

## 🔐 Authentication

When the server is started with the `CLINISYNC_API_KEY` environment variable set, every request to `/upload` must include the key in either an `Authorization: Bearer <key>` or `X-API-Key: <key>` header. When the variable is unset (development only), the endpoint is unauthenticated and the server logs a startup warning.

## 📥 Request

- **Endpoint:** `/upload`
- **Method:** `POST`
- **Content-Type:** `multipart/form-data`
- **Field Name:** `excel`

### Example using cURL

```bash
curl -F "excel=@/path/to/file.xlsx" \
     -H "Authorization: Bearer $CLINISYNC_API_KEY" \
     http://localhost:3000/upload
```

## 📤 Response

- **Content-Type:** `application/json`
- Returns a JSON document describing every generated CSV plus a manifest:

```json
{
  "message": "Upload and transformation completed successfully.",
  "files": ["converted-case_mix-1700000000000-1-sheet1.csv"],
  "manifest": "manifest-case_mix-1700000000000-2.json",
  "sheets": [
    {
      "sheetName": "Sheet1",
      "fileName": "converted-case_mix-1700000000000-1-sheet1.csv",
      "rowsProcessed": 10,
      "duplicatesRemoved": 1,
      "invalidDobCount": 0,
      "missingNhiCount": 0
    }
  ],
  "sheetsProcessed": 1,
  "rowsProcessed": 10,
  "duplicatesRemoved": 1,
  "invalidDobCount": 0,
  "missingNhiCount": 0
}
```

## Error responses

| Status | Cause |
| --- | --- |
| `400` | No file uploaded, unsupported extension, or file > 5 MB |
| `401` | Missing or invalid API key (when `CLINISYNC_API_KEY` is set) |
| `422` | Virus scan rejected the upload |
| `429` | Rate limit exceeded — see `Retry-After` header |
| `503` | Virus scanner unreachable |
