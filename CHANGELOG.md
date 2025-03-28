# 🧾 CHANGELOG

All notable changes to the Clinisync project will be documented in this file.

---

## [2.4.1] - 2025-03-26
### 🧹 Final Polish: Version File & Docs

- Added `VERSION` file for CLI & release automation
- Committed `CHANGELOG.md` tracking all historical milestones
- Verified test suite, folder structure, and naming alignment
- Marked official release point for GitHub and internal registry

---

## [2.4.0] - 2025-03-26
### 🔁 Major Refactor: ETL Pipeline

- Introduced modular ETL architecture:
  - `extract.js`: loads all sheets from uploaded Excel file
  - `transform.js`: anonymizes, deduplicates, standardizes data (NHI → ID, DOB → Age)
  - `load.js`: outputs cleaned CSV per sheet
  - `idMapper.js`: consistent ID mapping across all sheets per file
- Fully refactored `/upload` route to use ETL pipeline
- JSON response includes list of generated outputs
- Removed deprecated `cleanWorksheetData.js` and its test
- Created unit tests: `transform.test.js`, `idMapper.test.js`
- Test suite fully updated, all checks passed

---

## [2.3.0] - 2025-03-24
### 📁 Docs Infrastructure

- Added full Docusaurus documentation site
- Markdown docs:
  - `index.md`, `getting-started.md`, `api-upload.md`, `cleaning-rules.md`, `testing.md`
- GitHub Pages ready (custom deploy script)
- Added Algolia search placeholder, dark/light logo, favicon
- Custom homepage branding with logo and landing page
- Added `README.md` to `docs/` with contributor guide

---

## [2.2.0] - 2025-03-20
### 🧪 Test & Lint Suite

- Integrated ESLint v9 flat config (`eslint.config.mjs`)
- Polyfilled JSDOM for frontend unit test coverage
- Created test coverage artifacts (HTML reports)
- Added GitHub Actions workflow for CI:
  - Lint, test, upload artifacts
- Refined ESLint config for CommonJS + browser compatibility

---

## [2.1.0] - 2025-03-18
### 🎨 Frontend Enhancements

- Added drag-and-drop UI (`public/js/upload.js`)
- DOM simulation test added for upload logic
- File size and type validations with `alert` handling
- Uploaded file preview and delete option in UI

---

## [2.0.0] - 2025-03-14
### 📦 MVP Launch

- Backend setup with Express.js
- `/upload` endpoint with file handling via `multer`
- Excel parsing using `xlsx`
- Cleaned single-sheet Excel files:
  - Removed `Contact`, `Address`
  - Converted `DOB → Age`
  - Replaced `NHI → ID`
- Saved cleaned CSV to `/csvs/`
- Upload log metadata recorded
- Initial unit test: `cleanWorksheetData.test.js`

---

## [1.0.0] - 2025-03-12
### 🛠 Project Bootstrap

- Initialized Node.js project
- Project folder structure created
- ESLint, Nodemon, Jest configured
- Initial fileUpload route + file size/type validations
