# 🧾 Clinisync

A clean, privacy-first Node.js and Express.js application that transforms messy healthcare Excel files into secure, standardized CSVs. Built for automation, extensibility, and clarity — with clean code, automated testing, and intelligent data handling at its core.

## 📊 Project Status

[![Local CI](https://img.shields.io/badge/tests-passing-brightgreen)](#)
[![Coverage](https://img.shields.io/badge/coverage-90%25-yellowgreen)](#)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node Version](https://img.shields.io/badge/node-18%2B-blue.svg)](https://nodejs.org/)
[![Version](https://img.shields.io/badge/version-2.2.1-blue.svg)](./CHANGELOG.md)


## 🚀 Key Features

- 🧾 Drag-and-drop frontend upload UI
- 🧼 Cleans Excel data (`.xlsx`, `.xls`, `.ods`)
- 🔐 Strips sensitive information (DOB → Age, NHI → anonymized ID, Contact, Address)
- 🧠 Intelligent per-file cleaning rules (case-mix, holistic, etc.)
- 🧪 Robust unit + integration tests using Jest & Supertest
- 📤 Exports cleaned CSVs to `/csvs/` directory
- 🧹 Follows clean code & Code Complete principles
- 🔄 Detects available port and auto-starts
- ⚙️ Production-safe `.env` support and logs
- 🗂️ Modular and scalable folder structure

## 🛠 Technology Stack

| Category       | Stack                      |
|----------------|-----------------------------|
| Backend        | Node.js, Express.js         |
| File Uploads   | Multer                      |
| Excel Parsing  | xlsx                        |
| Date Handling  | moment.js                   |
| Port Detection | detect-port                 |
| Testing        | Jest, Supertest, jsdom      |

## 📦 Installation

```bash
git clone https://github.com/DevilsDev/csv_procedure.git
cd csv_procedure
npm install
```

## 🔧 Running the App

Start the app in development mode with auto-restart:

```bash
npm run dev
```

The server will start at the first available port (default is `3000`):

```
http://localhost:3000
```

## 📤 Upload API

**Endpoint:** `POST /upload`  
**Content-Type:** `multipart/form-data`  
**Form field name:** `excel`

**cURL Example:**

```bash
curl -F "excel=@./path/to/sample.xlsx" http://localhost:3000/upload
```

## 📄 Output Example

Cleaned files will be saved in the `/csvs/` directory:

```bash
/csvs/converted-1695568721231.csv
```

## 🧪 Run Tests

```bash
npm test
```

- Runs unit tests for `cleanWorksheetData`
- Includes integration tests for `/upload`
- Simulates frontend logic via jsdom

## 📂 Project Structure

```bash
csv_procedure/
├── public/                 # Frontend UI (index.html, upload.js)
├── src/
│   ├── app.js              # Express app entry point
│   ├── routes/
│   │   └── fileUpload.js   # Upload route + cleaning logic
│   └── utils/
│       └── cleanWorksheetData.js  # Data sanitizer
├── __tests__/              # Unit and integration tests
│   ├── cleanWorksheetData.test.js
│   ├── upload.test.js
│   └── uploadRoute.test.js
├── uploads/                # Temporary Excel files
├── csvs/                   # Cleaned CSV output
├── .env                    # Optional environment variables
├── .gitignore              # Ignore uploads, csvs, node_modules, etc.
├── jest.config.js          # Custom test environment config
├── jest.setup.js           # Polyfills (TextEncoder, window.alert)
└── README.md
```

## 🧠 File-Based Cleaning Logic

| File Name Contains | Type        | Special Logic                     |
|--------------------|-------------|-----------------------------------|
| `case-mix`         | Case-mix    | Replace NHI → ID, DOB → Age       |
| `fare-up`          | Fare-up     | Remove Contact/Address            |
| `holistic`         | Holistic    | Retain only holistic fields       |
| `outpatient`       | Outpatient  | Custom parsing logic (future)     |

## 🔒 Data Privacy Rules

- ✅ Replaces `NHI` with anonymized `ID-XXX`
- ✅ Converts `DOB` to `Age` (multi-format parsing)
- ✅ Removes `Contact`, `Address`, duplicate headers
- ✅ Filters empty or redundant rows
- ✅ Cleans whitespace and standardizes structure

## 🔄 Intelligent Workflow

```text
1. Upload via UI or API
2. File saved to /uploads/
3. Identifier auto-detected (case-mix, holistic, etc.)
4. Data cleaned with general + custom rules
5. Cleaned CSV written to /csvs/
6. UI/API returns download path or message
```

## 🧼 Clean Code Practices Followed

- ✅ Modular architecture with separation of concerns
- ✅ Descriptive variable & function naming
- ✅ Defensive programming (try/catch, fallbacks)
- ✅ Error-safe upload handling
- ✅ Readable top-down logic (Code Complete)
- ✅ Fully testable utilities and APIs

## 🔮 Upcoming Enhancements

- ☁️ Export to cloud storage (S3, Drive, etc.)
- 📧 Email notification on successful upload
- 🗂️ Output sorting by type/date
- 📝 Conversion logs with metadata (rows cleaned, time)
- 🧩 Support for `.ods`, `.xls` (legacy formats)
- 🌍 i18n for multilingual data field detection
- 🧪 CLI support for batch Excel processing

## 👨‍💻 Author

**Ali Kahwaji**  
Clean Code Enthusiast & Node.js Developer  
[📂 GitHub](https://github.com/alikahwaji) • [🔗 LinkedIn](https://www.linkedin.com/in/ali-kahwaji-5b4619137)
