/**
 * Version: 1.2.0
 * Description: Initializes Express app, handles static frontend serving and file upload endpoint.
 * Author: Ali Kahwaji
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fileUploadRoute = require('./routes/fileUpload');

const app = express();
const PORT = 3000;

// Serve static frontend from /public directory
app.use(express.static(path.join(__dirname, '../public')));

// Configure multer to store uploaded Excel files
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, callback) => {
    const safeName = file.originalname.replace(/\s+/g, '_');
    const timestampedName = `${Date.now()}-${safeName}`;
    callback(null, timestampedName);
  }
});
const upload = multer({ storage });

// Upload endpoint with middleware
app.use('/upload', upload.single('excel'), fileUploadRoute);

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message);
  res.status(500).send('Something went wrong on the server.');
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});
