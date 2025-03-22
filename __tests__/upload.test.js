/**
 * Version: 1.3.0
 * Description: Final working DOM test for upload.js using JSDOM
 * Author: Ali Kahwaji
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('upload.js DOM interaction', () => {
  let window, document;

  beforeEach(() => {
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="dropZone"></div>
          <input type="file" id="fileInput" />
          <button id="uploadBtn">Upload</button>
          <button id="removeBtn" style="display:none;">Remove</button>
          <div id="response"></div>
        </body>
      </html>
    `, {
      url: 'http://localhost',
      runScripts: 'dangerously',
      resources: 'usable'
    });

    window = dom.window;
    document = window.document;

    // Mock alert before script is evaluated
    window.alert = jest.fn();

    // Make alert available globally
    global.window = window;
    global.document = document;
    global.alert = window.alert;

    // Inject upload.js code into window context
    const uploadScript = fs.readFileSync(path.resolve(__dirname, '../public/js/upload.js'), 'utf8');
    const scriptEl = document.createElement('script');
    scriptEl.textContent = uploadScript;
    document.body.appendChild(scriptEl);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete global.window;
    delete global.document;
    delete global.alert;
  });

  it('should initialize DOM elements correctly', () => {
    expect(document.getElementById('fileInput')).toBeTruthy();
    expect(document.getElementById('uploadBtn')).toBeTruthy();
    expect(document.getElementById('removeBtn')).toBeTruthy();
    expect(document.getElementById('dropZone')).toBeTruthy();
    expect(document.getElementById('response')).toBeTruthy();
  });

  it('should alert if file exceeds 5MB on upload', () => {
    const file = new window.File(['a'.repeat(6 * 1024 * 1024)], 'big.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const fileInput = document.getElementById('fileInput');

    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false
    });

    // Simulate change event
    fileInput.dispatchEvent(new window.Event('change'));

    // Simulate click event
    document.getElementById('uploadBtn').click();

    expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/too large/i));
  });
});
