# 🧾Clinisync API

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
git clone https://github.com/DevilsDev/csv_procedure.git
cd csv_procedure
```

```bash
npm install
```

---

## 🔧 Run the App

Install dependencies:

```bash
npm install
```

The server will start on: http://localhost:3000

---

### 🔁 Run in Development Mode (with auto-restart using nodemon)

```bash
npm run dev
```

---

## 📤 API (Upload Excel File)

**Endpoint:** `POST /upload`
**Content-Type:** `multipart/form-data`
**Form field name:** `excel`

**Example with curl:**

```bash
curl -F "excel=@./sample.xlsx" http://localhost:3000/upload
```

---

## 🧪 Run Tests

```bash
npm test
```

Runs all unit tests using Jest for the core data-cleaning logic.

---

## 📂 Folder Structure

```bash
excel-to-csv/
├── uploads/                 # Temp Excel files (ignored in Git)
├── csvs/                    # Output cleaned CSV files
├── src/                     # Source code
│   ├── app.js               # Main Express app
│   ├── routes/              # Route handlers
│   │   └── fileUpload.js    # Handles Excel upload + conversion
│   ├── utils/               # Utility functions
│   │   └── cleanWorksheetData.js  # Data cleaning & sensitive info removal
├── tests/                   # Unit tests
│   └── cleanWorksheetData.test.js  # Jest tests for data cleaning utility
├── .gitignore               # Ignore runtime and dependency files
├── package.json             # Project metadata and dependencies
└── README.md                # Project documentation
```

---

## 📂 File Descriptions

- **`src/app.js`**Initializes the Express app, sets up file upload middleware (using Multer), registers routes, and starts the server.
- **`src/routes/fileUpload.js`**Handles the `/upload` route logic: reads uploaded Excel files, cleans them, strips sensitive info, converts to CSV, and saves the output.
- **`src/utils/cleanWorksheetData.js`**Pure utility function that processes worksheet data. It:

  - Removes empty rows
  - Trims cells
  - Deduplicates repeated header rows
  - Removes sensitive data like names, emails, phone numbers, national IDs, and date of birth (supports many formats)
- **`__tests__/cleanWorksheetData.test.js`**Unit tests for the `cleanWorksheetData.js` utility using Jest. Ensures correctness and edge case handling.
- **`uploads/`**Temporary folder to store uploaded Excel files. Auto-created and excluded from Git.
- **`csvs/`**Folder to store output `.csv` files after cleaning and conversion.
- **`.gitignore`**
  Prevents committing runtime, temp, or system files like `node_modules/`, `uploads/`, `csvs/`, and `.env`.

---

## 🧹 File-Specific Cleaning Rules (Smart Data Normalization)

The app intelligently cleans different types of health Excel files based on filename (e.g. `case-mix.xlsx`, `fare-up.xlsx`, etc.).

### 🧠 Logic Based on File Identifier

| File Name Contains | Treated As |
| ------------------ | ---------- |
| `case-mix`       | Case-mix   |
| `fare-up`        | Fare-up    |
| `holistic`       | Holistic   |
| `outpatient`     | Outpatient |

These identifiers are auto-detected and used to apply file-specific cleaning logic.

---

### 🔒 Privacy Rules Applied

- `NHI` is replaced with a consistent anonymized `ID` (e.g. `ID-001`)
- `DOB` is converted to `Age` (in years) using various date formats
- Sensitive columns `Contact` and `Address` are removed
- Unnamed columns (e.g. `Column1`, empty headers) are removed
- Duplicate columns and rows are deduplicated
- Empty rows are filtered out

---

### 🧪 Updated Unit Tests

Tests are included for:

- ID replacement logic
- Age conversion from various DOB formats
- Custom headers in Holistic file
- Handling of missing data or invalid files

Run tests using:

```bash
npm test
```

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

## 🚀 Features & Enhancements

### ✅ Implemented Features

- **🧾 Drag-and-Drop Frontend UI**A user-friendly web interface to upload `.xlsx` files with:

  - Drag-and-drop support
  - File input fallback
  - "Remove file" button
  - Upload progress and feedback
- **📤 File-Type-Specific Cleaning**Each uploaded file is cleaned based on its identity:

  - `Case-mix`, `Fare-up`, `Holistic`, `Outpatient`
  - Consistent patient ID mapping (NHI → ID)
  - DOB → Age (with multiple date format support)
  - Removal of sensitive data (Contact, Address)
  - Removal of duplicate/unnamed columns and rows
- **📁 CSV Output Generation**Cleaned files are saved in `/csvs/` with timestamped names.
- **📦 Express API for Uploading**`POST /upload` route supports file upload and routes logic accordingly.
- **🧪 Robust Unit Testing**Covers:

  - Data trimming and cleaning
  - DOB to Age logic
  - ID mapping consistency
  - File-type-specific handling
- **🧠 Clean Code + Scalable Architecture**All code is modular, testable, and follows *Code Complete* principles:

  - Single responsibility
  - Meaningful naming
  - Defensive programming
  - Descriptive commit history

---

### 🔮 Upcoming / Future Enhancements

- **☁️ Export to Cloud Storage**

  - Support for S3, Google Drive, or Azure Blob
  - Allow output files to be synced securely
- **📧 Email Notification After Upload**

  - Email the user once the file is processed and saved
  - Include a link to download the CSV
- **📝 Conversion Logs and Metadata**

  - Track:
    - Who uploaded what
    - When
    - How many rows/columns were cleaned
    - Output file details
- **🧩 Format Expansion**

  - Add support for:
    - `.xls` (older Excel files)
    - `.ods` (OpenDocument Spreadsheet)
    - Auto-detection of file type using MIME headers
- **🌍 Internationalization (i18n)**

  - Localized keyword detection for sensitive data (e.g., address equivalents in other languages)
  - Language-aware header parsing
  - Multilingual UI
- **🗃️ Output Organization**

  - Auto-sort exported CSVs into subfolders by file type
  - Option to customize output naming

---

✅ With the foundation you've built, these enhancements can be added with minimal friction while maintaining clarity, safety, and scalability.

---

## 🛠 How to Test the App with `test_data.xlsx`

Follow these steps to verify that the **Excel-to-CSV Converter App** processes data correctly.

### 📁 Step 1: Place the File in the Correct Directory

- **Option 1:** Keep the file in your **Downloads** folder and provide the full path during upload.
- **Option 2:** Move `test_data.xlsx` to your project root for easier access:

  C:\Users\\user_nameworkspace\csv_procedure\

---

### 🔧 Step 2: Install Dependencies and Start the App

Make sure all required packages are installed:

```bash
npm install
```

---

### 📤 Step 3: Upload the Excel File via API

Since this app supports  **file uploads** , use one of these methods:

#### ✅ **Option 1: Use cURL (Command Line)**

Run the following command in  **Terminal/Command Prompt** , replacing `path/to/test_data.xlsx` with the actual file path:

```bash
curl -X POST -F "excel=@path/to/test_data.xlsx" http://localhost:3000/upload
```

Example for Windows (assuming the file is in your project root):

```bash
curl -X POST -F "excel=@C:\Users\alika\workspace\csv_procedure\test_data.xlsx" http://localhost:3000/upload
```

---

### 📄 Step 4: Check the Response

If successful, the API will return:

```bash
✅ CSV saved at: /path/to/csvs/converted.csv
```

* If an error occurs:
  * 400 Bad Request: No file uploaded or incorrect format.
  * 500 Internal Server Error: Unexpected issue in processing.

---

### 📂 Step 5: Verify the Generated CSV

1. Navigate to the `csvs/` folder in your project.
2. Open the generated `.csv` file.
3. Confirm that:

   * ✅ Empty rows are  **removed** .
   * ✅ Duplicate headers are  **removed** .
   * ✅ Extra whitespace is  **trimmed** .
   * ✅ **Sensitive fields** (Name, Email, Phone, DOB, ID) are  **removed** .
   * ✅ Data is  **correctly formatted** .

   ---

   ### 🔄 Step 6: Debugging Issues

   If the app  **fails or crashes** , check the following:


   * **Check the terminal logs** (`npm run dev` provides live logs).
   * **Ensure dependencies are installed** (`npm list multer xlsx express`).
   * **Verify the correct file path** in the upload request.
   * **Manually open `test_data.xlsx`** to check formatting.

   ---

## 👨‍💻 Author

**Ali Kahwaji**
Clean Code Enthusiast & Node.js Developer
GitHub: [github.com/alikahwaji](https://github.com/alikahwaji)
LinkedIn: [linkedin.com/in/alikahwaji](https://www.linkedin.com/in/ali-kahwaji-5b4619137?lipi=urn%3Ali%3Apage%3Ad_flagship3_profile_view_base_contact_details%3BONXl6kobT3yNfR%2FWGdO%2Fgg%3D%3D)
