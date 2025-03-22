/**
 * Version: 2.2.1
 * Description: Express app with auto-port fallback and error-safe middleware
 * Author: Ali Kahwaji
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const detect = require('detect-port').default;
require('dotenv').config();

const fileUploadRoute = require('./routes/fileUpload');

const app = express();
const DEFAULT_PORT = process.env.PORT || 3000;

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

// Start server on available port
detect(DEFAULT_PORT)
  .then(port => {
    if (port !== Number(DEFAULT_PORT)) {
      console.warn(`⚠️ Port ${DEFAULT_PORT} is in use. Falling back to ${port}...`);
    } else {
      console.log(`✅ Starting server on port ${port}...`);
    }

    app.listen(port, () => {
      console.log(`🚀 Server running at http://localhost:${port}`);
    });
  })
  .catch(err => {
    console.error('❌ Failed to detect port:', err);
    process.exit(1);
  });
