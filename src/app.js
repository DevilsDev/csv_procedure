/**
 * Version: 2.4.0
 * Description: Initializes and exports the Express app with static serving, upload handling, and centralized error management.
 * Author: Ali Kahwaji
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const fileUploadRoute = require('./routes/fileUpload');

const app = express();
const ALLOWED_EXTENSIONS = new Set(['.xlsx', '.xls', '.ods']);
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

['uploads', 'csvs'].forEach(dir => {
  const dirPath = path.resolve(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

app.use(express.static(path.resolve(__dirname, '../public')));

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, callback) => {
    const safeName = file.originalname.replace(/\s+/g, '_');
    const timestampedName = `${Date.now()}-${safeName}`;
    callback(null, timestampedName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_SIZE_BYTES
  },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(extension)) {
      req.fileValidationError = 'Unsupported file format.';
      return callback(null, false);
    }

    return callback(null, true);
  }
});

function uploadExcel(req, res, next) {
  upload.single('excel')(req, res, (err) => {
    if (err) {
      return next(err);
    }

    if (req.fileValidationError) {
      return res.status(400).json({ error: req.fileValidationError });
    }

    return next();
  });
}

app.use('/upload', uploadExcel, fileUploadRoute);

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File exceeds the maximum size of 5MB.' });
  }

  console.error('Server Error:', err.message);
  return res.status(500).send('Something went wrong on the server.');
});

module.exports = app;
