/**
 * Version: 2.5.4
 * Description: Initializes and exports the Express app with static serving, upload handling, and centralized error management.
 * Author: Ali Kahwaji
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const fileUploadRoute = require('./routes/fileUpload');
const downloadsRoute = require('./routes/downloads');
const rateLimit = require('./middleware/rateLimit');
const apiKey = require('./middleware/apiKey');
const virusScan = require('./middleware/virusScan');
const { createRedisStore } = require('./middleware/redisRateLimitStore');

const app = express();
const ALLOWED_EXTENSIONS = new Set(['.xlsx', '.xls', '.ods']);
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');
const CSVS_DIR = path.resolve(__dirname, '..', 'csvs');

[UPLOADS_DIR, CSVS_DIR].forEach(dirPath => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

app.use(express.static(path.resolve(__dirname, '../public')));

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
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

function buildRateLimitStore() {
  if (!process.env.REDIS_URL) return undefined;
  try {
    const store = createRedisStore({ url: process.env.REDIS_URL });
    console.log('[rateLimit] using Redis-backed store at', process.env.REDIS_URL);
    return store;
  } catch (err) {
    console.warn('[rateLimit] failed to init Redis store, falling back to in-memory:', err.message);
    return undefined;
  }
}

const uploadLimiter = rateLimit({ windowMs: 60_000, max: 30, store: buildRateLimitStore() });

app.use('/upload', uploadLimiter, uploadExcel, apiKey(), virusScan(), fileUploadRoute);
app.use('/downloads', apiKey(), downloadsRoute);

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File exceeds the maximum size of 5MB.' });
  }

  console.error('Server Error:', err.message);
  return res.status(500).send('Something went wrong on the server.');
});

module.exports = app;
