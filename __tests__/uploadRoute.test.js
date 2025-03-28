/**
 * Version: 1.0.0
 * Description: Integration test for the /upload route using supertest and a sample Excel file.
 * Author: Ali Kahwaji
 */

const request = require('supertest');
const express = require('express');
const multer = require('multer');
const fileUploadRoute = require('../src/routes/fileUpload');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use('/upload', upload.single('excel'), fileUploadRoute);

describe('POST /upload', () => {
  it('should return a CSV file for valid .xlsx upload', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('excel', path.join(__dirname, 'fixtures', 'case-mix-sample.xlsx'));

      expect(res.statusCode).toBe(200);
      expect(res.header['content-type']).toContain('application/json');
      expect(res.body).toHaveProperty('outputs');
      expect(Array.isArray(res.body.outputs)).toBe(true);
      
  });

  it('should reject unsupported file types', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('excel', path.join(__dirname, 'fixtures', 'invalid.txt'));

    expect(res.statusCode).toBe(400);
    expect(res.text).toMatch(/unsupported file/i);
  });
});
