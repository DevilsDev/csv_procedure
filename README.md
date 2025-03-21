# 🧾 Excel-to-CSV Converter API

A secure and clean-code-based Node.js application to upload Excel files (`.xlsx`), clean and sanitize their data (removing sensitive patient information), and convert them to CSV format.

---

## 🚀 Features

- Upload `.xlsx` Excel files
- Clean messy formatting (empty rows, extra whitespace, duplicate headers)
- Automatically detect and remove **sensitive fields** like:
  - Full Name
  - Email
  - Phone Numbers
  - Date of Birth (supports multiple formats)
  - National ID or SSN
- Export as a clean `.csv` file to local directory
- Includes **unit tests** for core data-cleaning logic
- Built with Clean Code and Code Complete principles

---

## ⚙️ Tech Stack

- [Node.js](https://nodejs.org/)
- [Express.js](https://expressjs.com/)
- [Multer](https://github.com/expressjs/multer) (file upload handling)
- [XLSX](https://www.npmjs.com/package/xlsx) (Excel parsing)
- [Moment.js](https://momentjs.com/) (date parsing)
- [Jest](https://jestjs.io/) (unit testing)

---

## 📦 Installation

```bash
git clone https://github.com/yourusername/excel-to-csv.git
cd excel-to-csv
npm install

---

## 🔧 Run the App

```bash
npm install
npm start

The server will start on: http://localhost:3000

### 🔁 Run in Development Mode (with auto-restart using nodemon)

```bash
npm run dev

---

## 📤 API (Upload Excel File)

**Endpoint:** `POST /upload`  
**Content-Type:** `multipart/form-data`  
**Form field name:** `excel`

**Example with curl:**
```bash
curl -F "excel=@./sample.xlsx" http://localhost:3000/upload

---

## 🧪 Run Tests

```bash
npm test

Runs all unit tests using Jest for the core data-cleaning logic.

---

## 📁 Folder Structure

excel-to-csv/
├── uploads/                          # Temp Excel files (ignored in Git)
├── csvs/                             # Output cleaned CSV files
├── src/
│   ├── app.js                        # Main Express app
│   ├── routes/
│   │   └── fileUpload.js             # Handles Excel upload + conversion
│   └── utils/
│       └── cleanWorksheetData.js     # Data cleaning & sensitive info removal
├── __tests__/
│   └── cleanWorksheetData.test.js    # Jest tests for data cleaning utility
├── .gitignore
├── package.json
└── README.md

---

## 📂 File Descriptions

- **`src/app.js`**  
  Initializes the Express app, sets up file upload middleware (using Multer), registers routes, and starts the server.

- **`src/routes/fileUpload.js`**  
  Handles the `/upload` route logic: reads uploaded Excel files, cleans them, strips sensitive info, converts to CSV, and saves the output.

- **`src/utils/cleanWorksheetData.js`**  
  Pure utility function that processes worksheet data. It:
  - Removes empty rows
  - Trims cells
  - Deduplicates repeated header rows
  - Removes sensitive data like names, emails, phone numbers, national IDs, and date of birth (supports many formats)

- **`__tests__/cleanWorksheetData.test.js`**  
  Unit tests for the `cleanWorksheetData.js` utility using Jest. Ensures correctness and edge case handling.

- **`uploads/`**  
  Temporary folder to store uploaded Excel files. Auto-created and excluded from Git.

- **`csvs/`**  
  Folder to store output `.csv` files after cleaning and conversion.

- **`.gitignore`**  
  Prevents committing runtime, temp, or system files like `node_modules/`, `uploads/`, `csvs/`, and `.env`.

---

## 🧼 Clean Code Practices Used

- **Single Responsibility**: Each module does one thing and does it well  
- **Descriptive Names**: Files, variables, and functions clearly reflect their purpose  
- **Separation of Concerns**: Routing, business logic, and utilities are modularized  
- **Reusable Utility**: `cleanWorksheetData()` is testable, pure, and independent  
- **Readable Control Flow**: Logic is written top-down, clearly, and avoids deep nesting  
- **Minimal Comments, Maximum Clarity**: Code is self-explanatory with strategic inline comments  
- **Safe Handling of Input**: Uses `moment.js` to handle date validation safely across formats

---

## 🚀 Future Enhancements

- Add frontend UI (drag and drop Excel files)  
- Export to cloud storage (S3, Google Drive, etc.)  
- Add email notification after conversion  
- Store conversion logs and metadata  
- Support `.xls` and `.ods` formats  
- Internationalization (i18n) for sensitive keyword detection

---

## 👨‍💻 Author

**Ali Kahwaji**  
Clean Code Enthusiast & Node.js Developer  
GitHub: [github.com/yourusername](https://github.com/yourusername)  
LinkedIn: [linkedin.com/in/yourprofile](https://linkedin.com/in/yourprofile)
