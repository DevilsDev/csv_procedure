/**
 * Version: 2.3.0
 * Description: Exported Express app for testing and modular startup
 * Author: Ali Kahwaji
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const fileUploadRoute = require('./routes/fileUpload');

const app = express();

// Ensure necessary directories exist
['uploads', 'csvs'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

// Serve static frontend from /public directory
app.use(express.static(path.join(__dirname, '../public')));

// Multer config for custom file naming
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, callback) => {
    const safeName = file.originalname.replace(/\s+/g, '_');
    const timestampedName = `${Date.now()}-${safeName}`;
    callback(null, timestampedName);
  }
});
const upload = multer({ storage });

// Upload route
app.use('/upload', upload.single('excel'), fileUploadRoute);

// Global error handler
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('❌ Server Error:', err.message);
  res.status(500).send('Something went wrong on the server.');
});

module.exports = app;
