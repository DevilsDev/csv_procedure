---
id: getting-started
title: Getting Started
---

# 🚀 Getting Started

## Install & Run Locally

```bash
git clone https://github.com/DevilsDev/csv_procedure.git
cd csv_procedure
npm install
npm run dev
```

The app will start at `http://localhost:3000` or the next available port.

## Uploading Excel Files

Drag and drop Excel files into the UI or use:

```bash
curl -F "excel=@path/to/file.xlsx" http://localhost:3000/upload
```
