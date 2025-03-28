# Clinisync

[![Build Status](https://img.shields.io/github/actions/workflow/status/DevilsDev/csv_procedure/ci.yml?branch=main)](https://github.com/DevilsDev/csv_procedure/actions)
[![License](https://img.shields.io/github/license/DevilsDev/csv_procedure)](LICENSE)
[![Documentation](https://img.shields.io/badge/docs-online-blue)](https://devilsdev.github.io/csv_procedure/)

Clinisync is a modular, extensible ETL platform designed to securely clean and transform healthcare data from spreadsheet files into standardized, de-identified CSVs.

Built with Node.js and Express, it provides both API and CLI interfaces and supports multi-sheet Excel processing with full privacy compliance, unit tests, CI/CD integration, and documentation powered by Docusaurus.

---

## 🚀 Getting Started

### Install & Run

```bash
npm install
npm run dev
```

### Upload Files via API

```bash
curl -F "excel=@path/to/input.xlsx" http://localhost:3000/upload
```

Returns a JSON response with a list of generated cleaned CSV files.

---

## 🧼 Cleaning Rules

- `NHI` → anonymized `ID-001`, `ID-002`, etc.
- `DOB` → `Age` (accurate, format-tolerant)
- Removes: `Address`, `Contact`, unnamed columns
- Applies rules consistently across all sheets

---

## 📁 Project Structure

```
csv_procedure/
├── src/
│   ├── etl/                # ETL modules: extract, transform, load, idMapper
│   └── routes/             # Express upload route
├── __tests__/              # Jest test suite
├── docs/                   # Docusaurus site (see /docs/README.md)
├── VERSION                 # Current release version
├── CHANGELOG.md            # Project changelog
└── README.md
```

---

## 🧪 Testing

```bash
npm test
```

Includes full unit and integration coverage with Jest.

---

## 📝 Documentation

Full docs available at:  
**https://devilsdev.github.io/csv_procedure/**

To run locally:

```bash
cd docs
npm install
npm run start
```

To deploy:

```bash
./deploy-gh-pages.sh
```

---

## 📦 Release History

See [`CHANGELOG.md`](./CHANGELOG.md)

---

## 📄 License

Licensed under the MIT License.  
(c) Ali Kahwaji, 2025
