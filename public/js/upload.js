/**
 * Version: 2.5.5
 * Description: Handles file selection, drag-and-drop, validation, API-key forwarding,
 *              and JSON-aware response rendering.
 * Author: Ali Kahwaji
 */

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadButton = document.getElementById('uploadBtn');
const removeButton = document.getElementById('removeBtn');
const responseDisplay = document.getElementById('response');
const apiKeyInput = document.getElementById('apiKeyInput');

let selectedFile = null;

// UI Events

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropZone.classList.remove('dragover');
  const file = event.dataTransfer.files[0];
  handleFileSelection(file);
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  handleFileSelection(file);
});

/**
 * Validates and stores the selected file
 */
function handleFileSelection(file) {
  if (!file || !file.name.match(/\.(xlsx|xls|ods)$/i)) {
    alert('⚠️ Please upload a valid Excel file (.xlsx, .xls, .ods).');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert('❌ File is too large. Maximum allowed size is 5MB.');
    return;
  }

  selectedFile = file;
  dropZone.innerHTML = `<p>📄 Selected: ${file.name}</p>`;
  removeButton.style.display = 'inline-block';
  responseDisplay.textContent = '';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderSuccess(payload) {
  const files = Array.isArray(payload.files) ? payload.files : [];
  const fileItems = files.map(name => `<li>${escapeHtml(name)}</li>`).join('');
  responseDisplay.innerHTML = `
    <div class="summary">
      <strong>✅ ${escapeHtml(payload.message || 'Upload completed')}</strong>
      <div>Sheets processed: ${Number(payload.sheetsProcessed) || 0}</div>
      <div>Rows processed: ${Number(payload.rowsProcessed) || 0}</div>
      <div>Duplicates removed: ${Number(payload.duplicatesRemoved) || 0}</div>
      <div>Invalid DOB: ${Number(payload.invalidDobCount) || 0}</div>
      <div>Missing NHI: ${Number(payload.missingNhiCount) || 0}</div>
      <div>Files: <ul>${fileItems}</ul></div>
      ${payload.manifest ? `<div>Manifest: ${escapeHtml(payload.manifest)}</div>` : ''}
    </div>
  `;
}

function renderError(message) {
  responseDisplay.textContent = `❌ ${message}`;
}

/**
 * Sends the file to the backend API
 */
async function uploadFile() {
  if (!selectedFile) {
    alert('⚠️ No file selected!');
    return;
  }

  const formData = new FormData();
  formData.append('excel', selectedFile);
  responseDisplay.textContent = 'Uploading...';

  const headers = {};
  const apiKey = apiKeyInput && apiKeyInput.value.trim();
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch('/upload', {
      method: 'POST',
      body: formData,
      headers,
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await response.json() : await response.text();

    if (response.ok && isJson) {
      renderSuccess(payload);
      return;
    }

    const message = isJson
      ? (payload.error || 'Upload failed')
      : (payload || `HTTP ${response.status}`);
    renderError(message);
  } catch (error) {
    console.error('Upload Error:', error);
    renderError('Error uploading file.');
  }
}

/**
 * Clears the selected file from the UI and resets state
 */
function removeSelectedFile() {
  selectedFile = null;
  fileInput.value = '';
  dropZone.innerHTML = '<p>Drag & drop an Excel file here, or click to upload</p>';
  removeButton.style.display = 'none';
  responseDisplay.textContent = '';
}

uploadButton.addEventListener('click', uploadFile);
removeButton.addEventListener('click', removeSelectedFile);
