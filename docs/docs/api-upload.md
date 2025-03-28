---
id: api-upload
title: API - Upload Endpoint
description: Documentation for the `/upload` endpoint in Clinisync.
---

# API - Upload Endpoint

The `POST /upload` endpoint allows users to upload `.xlsx`, `.xls`, or `.ods` files for real-time cleaning and transformation.

## 🔐 Authentication
No authentication is required for local testing. For production, we recommend implementing secure tokens or key-based access.

## 📥 Request
**Endpoint:** `/upload`  
**Method:** `POST`  
**Content-Type:** `multipart/form-data`  
**Field Name:** `excel`  
**Query Param (optional):** `fileIdentifier=case-mix`

### Example using cURL:
```bash
curl -F "excel=@/path/to/file.xlsx" http://localhost:3000/upload?fileIdentifier=case-mix --output cleaned.csv
```

## 📤 Response
- **Content-Type:** `text/csv`
- Returns: Cleaned CSV file
