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

// Create essential directories if missing
['uploads', 'csvs'].forEach(dir => {
  const dirPath = path.resolve(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Serve static assets from /public directory
app.use(express.static(path.resolve(__dirname, '../public')));

// Configure Multer for Excel file uploads
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, callback) => {
    const safeName = file.originalname.replace(/\s+/g, '_');
    const timestampedName = `${Date.now()}-${safeName}`;
    callback(null, timestampedName);
  }
});
const upload = multer({ storage });

// File upload route
app.use('/upload', upload.single('excel'), fileUploadRoute);

// Centralized error handling middleware
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('❌ Server Error:', err.message);
  res.status(500).send('Something went wrong on the server.');
});

module.exports = app;
