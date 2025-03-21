/**
 * Version: 1.0.0
 * Description: Initializes the Express application, configures middleware, and routes.
 * Author: Ali Kahwaji
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fileUploadRoute = require('./routes/fileUpload');

const app = express();
const PORT = 3000;

// Configure file upload storage location and filename pattern
const excelStorage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, callback) => {
    const timestampedFilename = `${Date.now()}-${file.originalname}`;
    callback(null, timestampedFilename);
  }
});

const uploadExcelFile = multer({ storage: excelStorage });

// Route for file upload and conversion
app.use('/upload', uploadExcelFile.single('excel'), fileUploadRoute);

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
